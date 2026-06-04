-- ============================================================
-- PARTIAL PAYMENTS AND DYNAMIC COMMISSION SYSTEM MIGRATION
-- ============================================================

-- 1. Create sale_payments table
CREATE TABLE IF NOT EXISTS public.sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0.00),
    status public.sale_status NOT NULL DEFAULT 'pending_approval'::public.sale_status,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add payment_id column to commissions table
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.sale_payments(id) ON DELETE CASCADE;

-- 3. Enable RLS on sale_payments and add policies
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_payments_select_policy" ON public.sale_payments;
CREATE POLICY "sale_payments_select_policy" ON public.sale_payments
  FOR SELECT TO authenticated
  USING (
    (SELECT seller_id FROM public.sales WHERE id = sale_id) = auth.uid() OR
    public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN')
  );

DROP POLICY IF EXISTS "sale_payments_insert_policy" ON public.sale_payments;
CREATE POLICY "sale_payments_insert_policy" ON public.sale_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT seller_id FROM public.sales WHERE id = sale_id) = auth.uid() AND
    status = 'pending_approval'::public.sale_status
  );

DROP POLICY IF EXISTS "sale_payments_admin_policy" ON public.sale_payments;
CREATE POLICY "sale_payments_admin_policy" ON public.sale_payments
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- 4. Create payment personal incentive credit function
CREATE OR REPLACE FUNCTION public.payment_incentive_credit(payment_record public.sale_payments)
RETURNS VOID AS $$
DECLARE
  seller_id_var UUID;
  seller_promo_lvl INTEGER;
  incentive_pct NUMERIC;
  incentive_amount NUMERIC;
BEGIN
  -- Retrieve seller_id from sales
  SELECT seller_id INTO seller_id_var FROM public.sales WHERE id = payment_record.sale_id;

  -- Fetch current promotion level of seller
  SELECT promotion_level INTO seller_promo_lvl 
  FROM public.profiles 
  WHERE id = seller_id_var;

  -- Fetch the corresponding incentive percentage
  SELECT personal_sale_incentive INTO incentive_pct 
  FROM public.promotion_levels 
  WHERE level = seller_promo_lvl;

  -- Calculate and insert commission record in pending status
  IF incentive_pct > 0.00 THEN
    incentive_amount := payment_record.amount * (incentive_pct / 100.00);

    INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at, payment_id)
    VALUES (payment_record.sale_id, seller_id_var, 0, incentive_pct, incentive_amount, 'pending'::public.commission_status, NULL, NULL, payment_record.id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recreate recalculate_sales_and_promotions() trigger function without single-sale incentive calculation
-- (Incentives are now calculated per payment, not per sale)
CREATE OR REPLACE FUNCTION public.recalculate_sales_and_promotions()
RETURNS TRIGGER AS $$
DECLARE
  upline_id_var UUID;
  d_sales INTEGER;
  g_sales INTEGER;
BEGIN
  -- Only execute when status transitions to approved or from approved to rejected
  IF (NEW.status = 'approved'::public.sale_status AND OLD.status != 'approved'::public.sale_status) OR 
     (NEW.status = 'rejected'::public.sale_status AND OLD.status = 'approved'::public.sale_status) THEN
     
     -- 1. Recalculate seller sales counts
     SELECT COUNT(*) INTO d_sales 
     FROM public.sales 
     WHERE seller_id = NEW.seller_id AND status = 'approved'::public.sale_status;

     SELECT COUNT(*) INTO g_sales 
     FROM public.sales s
     JOIN public.get_downline_network(NEW.seller_id) d ON s.seller_id = d.id
     WHERE s.status = 'approved'::public.sale_status AND d.id != NEW.seller_id;

     -- Update seller profile counters
     UPDATE public.profiles 
     SET direct_sales_count = d_sales,
         group_sales_count = g_sales
     WHERE id = NEW.seller_id;

     -- 2. Recalculate group sales counts for all uplines recursively
     SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = NEW.seller_id;
     
     WHILE upline_id_var IS NOT NULL LOOP
       SELECT COUNT(*) INTO g_sales 
       FROM public.sales s
       JOIN public.get_downline_network(upline_id_var) d ON s.seller_id = d.id
       WHERE s.status = 'approved'::public.sale_status AND d.id != upline_id_var;

       UPDATE public.profiles 
       SET group_sales_count = g_sales
       WHERE id = upline_id_var;

       SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = upline_id_var;
     END LOOP;

     -- 3. Run sequential promotion checks for approved sales
     IF NEW.status = 'approved'::public.sale_status THEN
       -- Check promotions for seller
       PERFORM public.promotion_eligibility_check(NEW.seller_id);

       -- Check promotions for uplines recursively
       SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = NEW.seller_id;
       WHILE upline_id_var IS NOT NULL LOOP
         PERFORM public.promotion_eligibility_check(upline_id_var);
         SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = upline_id_var;
       END LOOP;
     END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Disable the old sales-approval commission distribution trigger
DROP TRIGGER IF EXISTS on_sale_approved_distribution ON public.sales;

-- 7. Create calculate_payment_commissions() trigger function on sale_payments
CREATE OR REPLACE FUNCTION public.calculate_payment_commissions()
RETURNS TRIGGER AS $$
DECLARE
  sale_record RECORD;
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
  -- Trigger only when payment status changes to 'approved'
  IF NEW.status = 'approved'::public.sale_status AND OLD.status != 'approved'::public.sale_status THEN
    
    -- Fetch the parent sale record
    SELECT * INTO sale_record FROM public.sales WHERE id = NEW.sale_id;
    -- Fetch the property details
    SELECT * INTO prop_record FROM public.properties WHERE id = sale_record.property_id;
    
    -- 1. Calculate Total Commission Pool based on current Payment Amount
    comm_pool := NEW.amount * (prop_record.total_commission_percent / 100.00);
    
    -- 2. Calculate Direct Commission for Seller (Level 0)
    direct_comm := comm_pool * (prop_record.seller_percent / 100.00);
    
    IF direct_comm > 0.00 THEN
      INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at, payment_id)
      VALUES (NEW.sale_id, sale_record.seller_id, 0, prop_record.seller_percent, direct_comm, 'pending'::public.commission_status, NULL, NULL, NEW.id);
    END IF;

    -- 3. Distribute Upline Override Commissions (Levels 1 to 10)
    SELECT upline_id INTO curr_upline_id FROM public.profiles WHERE id = sale_record.seller_id;
    
    FOR i IN 1..10 LOOP
      EXIT WHEN curr_upline_id IS NULL;
      
      SELECT is_active, upline_id INTO upline_active, next_upline_id 
      FROM public.profiles 
      WHERE id = curr_upline_id;
      
      IF upline_active THEN
        -- Get override percent for level i
        lvl_pct := public.get_property_level_percent(sale_record.property_id, i);
        
        IF lvl_pct > 0.00 THEN
          upline_comm := comm_pool * (lvl_pct / 100.00);
          
          INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at, payment_id)
          VALUES (NEW.sale_id, curr_upline_id, i, lvl_pct, upline_comm, 'pending'::public.commission_status, NULL, NULL, NEW.id);
        END IF;
      END IF;

      curr_upline_id := next_upline_id;
    END LOOP;

    -- 4. Credit Career Personal Rank-Based Incentive
    PERFORM public.payment_incentive_credit(NEW);

    -- 5. If this is the FIRST approved payment for this sale:
    --    Mark sale as approved, increment direct sales, check career growth ranks, and mark property as sold.
    IF NOT EXISTS (
      SELECT 1 FROM public.sale_payments 
      WHERE sale_id = NEW.sale_id AND status = 'approved'::public.sale_status AND id != NEW.id
    ) THEN
      
      -- Update overall parent sale status to approved
      UPDATE public.sales 
      SET status = 'approved'::public.sale_status,
          approved_by = NEW.approved_by,
          approved_at = NEW.approved_at
      WHERE id = NEW.sale_id;

      -- Update property status to sold
      UPDATE public.properties 
      SET status = 'sold'::public.property_status 
      WHERE id = sale_record.property_id;
      
      -- Recalculation logic trigger (via updating status to approved) will run and update sales count and promotions.
    END IF;

  -- Handle rejection / transition back of payment
  ELSIF NEW.status = 'rejected'::public.sale_status AND OLD.status = 'approved'::public.sale_status THEN
    
    -- Reject commissions associated with this payment
    UPDATE public.commissions 
    SET status = 'rejected'::public.commission_status, 
        approved_by = NEW.approved_by, 
        approved_at = NEW.approved_at
    WHERE payment_id = NEW.id;

    -- Fetch parent sale record
    SELECT * INTO sale_record FROM public.sales WHERE id = NEW.sale_id;

    -- If this was the ONLY approved payment, revert the sale status and property status
    IF NOT EXISTS (
      SELECT 1 FROM public.sale_payments 
      WHERE sale_id = NEW.sale_id AND status = 'approved'::public.sale_status AND id != NEW.id
    ) THEN
      
      -- Revert parent sale status
      UPDATE public.sales 
      SET status = 'pending_approval'::public.sale_status,
          approved_by = NULL,
          approved_at = NULL
      WHERE id = NEW.sale_id;

      -- Revert property status back to available
      UPDATE public.properties 
      SET status = 'available'::public.property_status 
      WHERE id = sale_record.property_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Bind trigger to sale_payments
DROP TRIGGER IF EXISTS on_payment_approved_distribution ON public.sale_payments;
CREATE TRIGGER on_payment_approved_distribution
  AFTER UPDATE OF status ON public.sale_payments
  FOR EACH ROW EXECUTE FUNCTION public.calculate_payment_commissions();
