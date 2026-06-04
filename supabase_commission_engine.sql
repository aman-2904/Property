-- ============================================================
-- SALES AND COMMISSION ENGINE MIGRATION
-- ============================================================

-- 1. Alter commission_status enum to add 'rejected' if not already present
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
ALTER TYPE public.commission_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2. Create calculate_commissions() trigger function
CREATE OR REPLACE FUNCTION public.calculate_commissions()
RETURNS TRIGGER AS $$
DECLARE
  prop_record RECORD;
  comm_pool numeric;
  direct_comm numeric;
  upline_comm numeric;
  lvl_pct numeric;
  curr_upline_id uuid;
  next_upline_id uuid;
  upline_active boolean;
  i integer;
BEGIN
  -- Trigger only when status changes to 'approved'
  IF NEW.status = 'approved'::public.sale_status AND OLD.status != 'approved'::public.sale_status THEN
    
    -- 1. Fetch property details
    SELECT * INTO prop_record FROM public.properties WHERE id = NEW.property_id;
    
    -- 2. Calculate Total Commission Pool
    comm_pool := NEW.sale_amount * (prop_record.total_commission_percent / 100.00);
    
    -- 3. Calculate Direct Commission for Seller (Level 0)
    direct_comm := comm_pool * (prop_record.seller_percent / 100.00);
    
    IF direct_comm > 0.00 THEN
      INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at)
      VALUES (NEW.id, NEW.seller_id, 0, prop_record.seller_percent, direct_comm, 'pending'::public.commission_status, NULL, NULL);
    END IF;

    -- Increment direct sales count for seller
    UPDATE public.profiles 
    SET direct_sales_count = direct_sales_count + 1 
    WHERE id = NEW.seller_id;
    
    -- Check promotions for seller
    PERFORM public.check_and_promote_user(NEW.seller_id);

    -- 4. Distribute Upline Override Commissions (Levels 1 to 10)
    SELECT upline_id INTO curr_upline_id FROM public.profiles WHERE id = NEW.seller_id;
    
    FOR i IN 1..10 LOOP
      EXIT WHEN curr_upline_id IS NULL;
      
      SELECT is_active, upline_id INTO upline_active, next_upline_id 
      FROM public.profiles 
      WHERE id = curr_upline_id;
      
      IF upline_active THEN
        -- Get override percent for level i
        lvl_pct := public.get_property_level_percent(NEW.property_id, i);
        
        IF lvl_pct > 0.00 THEN
          upline_comm := comm_pool * (lvl_pct / 100.00);
          
          INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at)
          VALUES (NEW.id, curr_upline_id, i, lvl_pct, upline_comm, 'pending'::public.commission_status, NULL, NULL);
        END IF;
      END IF;

      -- Increment group sales count for uplines
      UPDATE public.profiles 
      SET group_sales_count = group_sales_count + 1 
      WHERE id = curr_upline_id;
      
      -- Check promotions for upline
      PERFORM public.check_and_promote_user(curr_upline_id);

      curr_upline_id := next_upline_id;
    END LOOP;

    -- Update property status to sold
    UPDATE public.properties 
    SET status = 'sold'::public.property_status 
    WHERE id = NEW.property_id;

  -- Handle transition back / cancellation / rejection of the sale
  ELSIF NEW.status = 'rejected'::public.sale_status AND OLD.status = 'approved'::public.sale_status THEN
    -- Cancel/reject commissions
    UPDATE public.commissions 
    SET status = 'rejected'::public.commission_status, 
        approved_by = NEW.approved_by, 
        approved_at = NEW.approved_at
    WHERE sale_id = NEW.id;

    -- Decrement direct sales count
    UPDATE public.profiles 
    SET direct_sales_count = GREATEST(0, direct_sales_count - 1) 
    WHERE id = NEW.seller_id;

    -- Decrement group sales counts recursively
    SELECT upline_id INTO curr_upline_id FROM public.profiles WHERE id = NEW.seller_id;
    WHILE curr_upline_id IS NOT NULL LOOP
      UPDATE public.profiles 
      SET group_sales_count = GREATEST(0, group_sales_count - 1) 
      WHERE id = curr_upline_id;

      SELECT upline_id INTO curr_upline_id FROM public.profiles WHERE id = curr_upline_id;
    END LOOP;

    -- Revert property status back to available
    UPDATE public.properties 
    SET status = 'available'::public.property_status 
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create process_commission_status_change() trigger function
CREATE OR REPLACE FUNCTION public.process_commission_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending'::public.commission_status THEN
      UPDATE public.wallets 
      SET pending_balance = pending_balance + NEW.amount 
      WHERE user_id = NEW.recipient_id;
    ELSIF NEW.status = 'approved'::public.commission_status THEN
      UPDATE public.wallets 
      SET approved_balance = approved_balance + NEW.amount,
          balance = balance + NEW.amount 
      WHERE user_id = NEW.recipient_id;
    END IF;
  
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Scenario 1: Transition from pending to approved
    IF OLD.status = 'pending'::public.commission_status AND NEW.status = 'approved'::public.commission_status THEN
      UPDATE public.wallets 
      SET pending_balance = GREATEST(0.00, pending_balance - NEW.amount),
          approved_balance = approved_balance + NEW.amount,
          balance = balance + NEW.amount 
      WHERE user_id = NEW.recipient_id;
    
    -- Scenario 2: Transition from pending to rejected or cancelled
    ELSIF OLD.status = 'pending'::public.commission_status AND (NEW.status = 'rejected'::public.commission_status OR NEW.status = 'cancelled'::public.commission_status) THEN
      UPDATE public.wallets 
      SET pending_balance = GREATEST(0.00, pending_balance - OLD.amount) 
      WHERE user_id = OLD.recipient_id;

    -- Scenario 3: Transition from approved to rejected or cancelled
    ELSIF OLD.status = 'approved'::public.commission_status AND (NEW.status = 'rejected'::public.commission_status OR NEW.status = 'cancelled'::public.commission_status) THEN
      UPDATE public.wallets 
      SET approved_balance = GREATEST(0.00, approved_balance - OLD.amount),
          balance = GREATEST(0.00, balance - OLD.amount) 
      WHERE user_id = OLD.recipient_id;
    END IF;

  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'pending'::public.commission_status THEN
      UPDATE public.wallets 
      SET pending_balance = GREATEST(0.00, pending_balance - OLD.amount) 
      WHERE user_id = OLD.recipient_id;
    ELSIF OLD.status = 'approved'::public.commission_status THEN
      UPDATE public.wallets 
      SET approved_balance = GREATEST(0.00, approved_balance - OLD.amount),
          balance = GREATEST(0.00, balance - OLD.amount) 
      WHERE user_id = OLD.recipient_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate triggers on sales and commissions tables
DROP TRIGGER IF EXISTS on_sale_approved_distribution ON public.sales;
CREATE TRIGGER on_sale_approved_distribution
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.calculate_commissions();

DROP TRIGGER IF EXISTS on_commission_balance_sync ON public.commissions;
CREATE TRIGGER on_commission_balance_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.process_commission_status_change();
