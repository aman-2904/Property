-- Migration: Add booking_amount to sales and base MLM commissions on it

-- 1. Add booking_amount column to sales table if not exists
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS booking_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (booking_amount >= 0.00);

-- 2. Populate booking_amount for existing sales records (fallback to sale_amount)
UPDATE public.sales SET booking_amount = sale_amount WHERE booking_amount = 0.00;

-- 3. Recreate public.calculate_commissions() to use booking_amount as base
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
    
    -- 2. Calculate Total Commission Pool based on Booking Amount
    comm_pool := NEW.booking_amount * (prop_record.total_commission_percent / 100.00);
    
    -- 3. Calculate Direct Commission for Seller (Level 0)
    direct_comm := comm_pool * (prop_record.seller_percent / 100.00);
    
    INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at)
    VALUES (NEW.id, NEW.seller_id, 0, prop_record.seller_percent, direct_comm, 'pending'::public.commission_status, NULL, NULL);

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

-- 4. Recreate public.sale_incentive_credit() to use booking_amount as base
CREATE OR REPLACE FUNCTION public.sale_incentive_credit(sale_record public.sales)
RETURNS VOID AS $$
DECLARE
  seller_promo_lvl INTEGER;
  incentive_pct NUMERIC;
  incentive_amount NUMERIC;
BEGIN
  -- 1. Fetch current promotion level of seller
  SELECT promotion_level INTO seller_promo_lvl 
  FROM public.profiles 
  WHERE id = sale_record.seller_id;

  -- 2. Fetch the corresponding incentive percentage
  SELECT personal_sale_incentive INTO incentive_pct 
  FROM public.promotion_levels 
  WHERE level = seller_promo_lvl;

  -- 3. Calculate and insert commission record in pending status
  IF incentive_pct > 0.00 THEN
    incentive_amount := sale_record.booking_amount * (incentive_pct / 100.00);

    INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at)
    VALUES (sale_record.id, sale_record.seller_id, 0, incentive_pct, incentive_amount, 'pending'::public.commission_status, NULL, NULL);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
