-- ============================================================
-- PROMOTION AND CAREER GROWTH SYSTEM MIGRATION
-- ============================================================

-- 1. Alter promotion_levels to add personal_sale_incentive column
ALTER TABLE public.promotion_levels ADD COLUMN IF NOT EXISTS personal_sale_incentive NUMERIC(15, 2) DEFAULT 0.00 CHECK (personal_sale_incentive >= 0.00);

-- 2. Seed Promotion Levels 0 to 7
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive)
VALUES 
(0, 'Agent', 0, 0, 0.00, 1.00),         -- Level 0: 1% personal sale incentive
(1, 'Level 1', 5, 20, 1000.00, 1.50),    -- Level 1: 1.5% personal sale incentive
(2, 'Level 2', 15, 100, 5000.00, 2.00),  -- Level 2: 2.0% personal sale incentive
(3, 'Level 3', 50, 500, 25000.00, 2.50), -- Level 3: 2.5% personal sale incentive
(4, 'Level 4', 100, 1500, 50000.00, 3.00), -- Level 4: 3.0% personal sale incentive
(5, 'Level 5', 200, 4000, 100000.00, 3.50), -- Level 5: 3.5% personal sale incentive
(6, 'Level 6', 400, 10000, 250000.00, 4.00), -- Level 6: 4.0% personal sale incentive
(7, 'Level 7', 800, 25000, 500000.00, 5.00)  -- Level 7: 5.0% personal sale incentive
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive;

-- 3. Create sale_incentive_credit() function
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
    incentive_amount := sale_record.sale_amount * (incentive_pct / 100.00);

    INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at)
    VALUES (sale_record.id, sale_record.seller_id, 0, incentive_pct, incentive_amount, 'pending'::public.commission_status, NULL, NULL);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create promotion_eligibility_check() function for sequential promotions
CREATE OR REPLACE FUNCTION public.promotion_eligibility_check(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_direct INTEGER;
  current_group INTEGER;
  current_promo_lvl INTEGER;
  next_lvl RECORD;
BEGIN
  -- Retrieve current sales counts and rank
  SELECT direct_sales_count, group_sales_count, promotion_level 
  INTO current_direct, current_group, current_promo_lvl 
  FROM public.profiles 
  WHERE id = target_user_id;

  -- Loop for sequential promotion check
  LOOP
    SELECT * INTO next_lvl 
    FROM public.promotion_levels 
    WHERE level = current_promo_lvl + 1;

    IF FOUND AND current_direct >= next_lvl.required_direct_sales AND current_group >= next_lvl.required_group_sales THEN
      current_promo_lvl := next_lvl.level;
      
      -- Update rank
      UPDATE public.profiles 
      SET promotion_level = current_promo_lvl 
      WHERE id = target_user_id;

      -- Insert approved promotion record (which will automatically award the reward_amount to wallet balance)
      INSERT INTO public.promotions (user_id, promotion_level, reward_amount, is_claimed, status)
      VALUES (target_user_id, current_promo_lvl, next_lvl.reward_amount, FALSE, 'approved'::public.promotion_status);

      -- Add notification record
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        target_user_id, 
        'Congratulations on your promotion!', 
        'You have been promoted to ' || next_lvl.title || ' and awarded a promotion bonus of $' || next_lvl.reward_amount || '.'
      );
    ELSE
      EXIT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create recalculate_sales_and_promotions() trigger function
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

     -- 3. Run sequential promotion checks & credits for approved sales
     IF NEW.status = 'approved'::public.sale_status THEN
       -- Check promotions for seller
       PERFORM public.promotion_eligibility_check(NEW.seller_id);

       -- Check promotions for uplines recursively
       SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = NEW.seller_id;
       WHILE upline_id_var IS NOT NULL LOOP
         PERFORM public.promotion_eligibility_check(upline_id_var);
         SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = upline_id_var;
       END LOOP;

       -- 4. Credit personal sale incentive to seller
       PERFORM public.sale_incentive_credit(NEW);
     END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to sales table
DROP TRIGGER IF EXISTS on_sale_approved_recalculate_promotions ON public.sales;
CREATE TRIGGER on_sale_approved_recalculate_promotions
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_sales_and_promotions();
