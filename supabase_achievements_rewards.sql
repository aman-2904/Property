-- ============================================================
-- ACHIEVEMENTS & REWARDS SYSTEM SCHEMA AND MIGRATION
-- ============================================================

-- 1. Create Reward Categories Table
CREATE TABLE IF NOT EXISTS public.reward_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on categories
ALTER TABLE public.reward_categories ENABLE ROW LEVEL SECURITY;

-- 2. Create Achievement Rules Table
CREATE TABLE IF NOT EXISTS public.achievement_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category_id UUID REFERENCES public.reward_categories(id) ON DELETE SET NULL,
    required_direct_sales INTEGER NOT NULL DEFAULT 0 CHECK (required_direct_sales >= 0),
    required_group_sales INTEGER NOT NULL DEFAULT 0 CHECK (required_group_sales >= 0),
    min_promotion_level INTEGER REFERENCES public.promotion_levels(level) ON DELETE SET NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('Physical Gift', 'Cash', 'Vehicle', 'Other')),
    reward_value TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    display_order INTEGER DEFAULT 0,
    description TEXT,
    different_legs_required BOOLEAN DEFAULT FALSE,
    max_claims_per_user INTEGER DEFAULT 1 CHECK (max_claims_per_user >= 1),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on rules
ALTER TABLE public.achievement_rules ENABLE ROW LEVEL SECURITY;

-- 3. Create Reward History (Eligible / Unlocked Rewards)
CREATE TABLE IF NOT EXISTS public.reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.achievement_rules(id) ON DELETE CASCADE,
    eligible_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'pending', 'claimed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_rule_qualification UNIQUE (user_id, rule_id)
);

-- Enable RLS on history
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;

-- 4. Create Reward Claims Table (Submitted Requests)
CREATE TABLE IF NOT EXISTS public.reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.achievement_rules(id) ON DELETE CASCADE,
    history_id UUID REFERENCES public.reward_history(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    request_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    approval_date TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on claims
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

-- 5. Create Reward Notifications Audit Table
CREATE TABLE IF NOT EXISTS public.reward_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES public.achievement_rules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on reward notifications
ALTER TABLE public.reward_notifications ENABLE ROW LEVEL SECURITY;

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reward_history_user ON public.reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON public.reward_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_claims_status ON public.reward_claims(status);
CREATE INDEX IF NOT EXISTS idx_ach_rules_cat ON public.achievement_rules(category_id);

-- 6. Setup Row-Level Security Policies

-- Categories Policies
DROP POLICY IF EXISTS "reward_categories_select_policy" ON public.reward_categories;
CREATE POLICY "reward_categories_select_policy" ON public.reward_categories
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "reward_categories_admin_policy" ON public.reward_categories;
CREATE POLICY "reward_categories_admin_policy" ON public.reward_categories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Rules Policies
DROP POLICY IF EXISTS "achievement_rules_select_policy" ON public.achievement_rules;
CREATE POLICY "achievement_rules_select_policy" ON public.achievement_rules
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "achievement_rules_admin_policy" ON public.achievement_rules;
CREATE POLICY "achievement_rules_admin_policy" ON public.achievement_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Reward History Policies
DROP POLICY IF EXISTS "reward_history_select_policy" ON public.reward_history;
CREATE POLICY "reward_history_select_policy" ON public.reward_history
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "reward_history_admin_policy" ON public.reward_history;
CREATE POLICY "reward_history_admin_policy" ON public.reward_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Reward Claims Policies
DROP POLICY IF EXISTS "reward_claims_select_policy" ON public.reward_claims;
CREATE POLICY "reward_claims_select_policy" ON public.reward_claims
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "reward_claims_insert_policy" ON public.reward_claims;
CREATE POLICY "reward_claims_insert_policy" ON public.reward_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "reward_claims_admin_policy" ON public.reward_claims;
CREATE POLICY "reward_claims_admin_policy" ON public.reward_claims
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "reward_claims_admin_all" ON public.reward_claims;
CREATE POLICY "reward_claims_admin_all" ON public.reward_claims
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Reward Notifications Policies
DROP POLICY IF EXISTS "reward_notifications_select_policy" ON public.reward_notifications;
CREATE POLICY "reward_notifications_select_policy" ON public.reward_notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "reward_notifications_admin_policy" ON public.reward_notifications;
CREATE POLICY "reward_notifications_admin_policy" ON public.reward_notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- 7. Create Reward Eligibility Evaluation Function
CREATE OR REPLACE FUNCTION public.check_reward_eligibility(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_direct INTEGER;
  current_group INTEGER;
  current_promo_lvl INTEGER;
  rule RECORD;
  contributing_legs INTEGER;
  has_qualified BOOLEAN;
BEGIN
  -- Retrieve current sales counts and rank
  SELECT direct_sales_count, group_sales_count, promotion_level 
  INTO current_direct, current_group, current_promo_lvl 
  FROM public.profiles 
  WHERE id = target_user_id;

  -- Loop through active rules within active contest periods
  FOR rule IN 
    SELECT * FROM public.achievement_rules 
    WHERE status = 'active'
      AND (start_date IS NULL OR now() >= start_date)
      AND (end_date IS NULL OR now() <= end_date)
  LOOP
    -- A. Check direct & group sales thresholds
    IF current_direct < rule.required_direct_sales OR current_group < rule.required_group_sales THEN
      CONTINUE;
    END IF;

    -- B. Check promotion rank requirement
    IF rule.min_promotion_level IS NOT NULL AND current_promo_lvl < rule.min_promotion_level THEN
      CONTINUE;
    END IF;

    -- C. Check different legs rule
    IF rule.different_legs_required THEN
      SELECT COUNT(*) INTO contributing_legs
      FROM (
        SELECT p.id
        FROM public.profiles p
        WHERE p.upline_id = target_user_id
          AND EXISTS (
            SELECT 1 
            FROM public.sales s
            JOIN public.get_downline_network(p.id) d ON s.seller_id = d.id
            WHERE s.status = 'approved'::public.sale_status
          )
      ) legs;

      IF contributing_legs < 2 THEN
        CONTINUE;
      END IF;
    END IF;

    -- D. Check if they already qualified
    SELECT EXISTS (
      SELECT 1 FROM public.reward_history 
      WHERE user_id = target_user_id AND rule_id = rule.id
    ) INTO has_qualified;

    IF NOT has_qualified THEN
      -- Mark reward as eligible
      INSERT INTO public.reward_history (user_id, rule_id, eligible_date, status)
      VALUES (target_user_id, rule.id, now(), 'unclaimed');

      -- Insert notification into user's normal notifications feed
      INSERT INTO public.notifications (user_id, title, message)
      VALUES (
        target_user_id,
        '🎉 Congratulations!',
        jsonb_build_object(
          'module', '/agent/rewards',
          'text', 'You have qualified for the reward: ' || rule.name || '! Click here to claim your reward.'
        )::text
      );

      -- Audit in reward_notifications
      INSERT INTO public.reward_notifications (user_id, rule_id, title, message)
      VALUES (
        target_user_id,
        rule.id,
        '🎉 Congratulations!',
        'You have qualified for the reward: ' || rule.name || '! Click here to claim your reward.'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Redefine recalculate_sales_and_promotions() to run reward checks after promotion checks
CREATE OR REPLACE FUNCTION public.recalculate_sales_and_promotions()
RETURNS TRIGGER AS $$
DECLARE
  upline_id_var UUID;
  d_sales INTEGER;
  g_sales INTEGER;
  seller_promo_lvl INTEGER;
  promo_title TEXT;
  incentive_amount NUMERIC;
  wallet_id_var UUID;
  txn_rec RECORD;
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
       -- Post Income calculation based on seller's current promotion level BEFORE promotion check
       SELECT p.promotion_level, pl.title, pl.personal_sale_incentive 
       INTO seller_promo_lvl, promo_title, incentive_amount
       FROM public.profiles p
       LEFT JOIN public.promotion_levels pl ON p.promotion_level = pl.level
       WHERE p.id = NEW.seller_id;

       IF incentive_amount IS NOT NULL AND incentive_amount > 0.00 THEN
         -- Ensure wallet exists
         INSERT INTO public.promotion_wallet (user_id)
         VALUES (NEW.seller_id)
         ON CONFLICT (user_id) DO NOTHING;

         SELECT id INTO wallet_id_var FROM public.promotion_wallet WHERE user_id = NEW.seller_id;

         -- Insert pending post-income transaction
         INSERT INTO public.promotion_wallet_transactions (wallet_id, user_id, sale_id, customer_name, property_title, booking_amount, promotion_title, per_sale_incentive, status)
         VALUES (
           wallet_id_var,
           NEW.seller_id,
           NEW.id,
           NEW.buyer_name,
           (SELECT title FROM public.properties WHERE id = NEW.property_id),
           NEW.booking_amount,
           promo_title,
           incentive_amount,
           'pending'
         );

         -- Update wallet pending balance
         UPDATE public.promotion_wallet
         SET pending_income = pending_income + incentive_amount
         WHERE id = wallet_id_var;
       END IF;

       -- Check promotions for seller
       PERFORM public.promotion_eligibility_check(NEW.seller_id);

       -- Check rewards for seller
       PERFORM public.check_reward_eligibility(NEW.seller_id);

       -- Check promotions & rewards for uplines recursively
       SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = NEW.seller_id;
       WHILE upline_id_var IS NOT NULL LOOP
         PERFORM public.promotion_eligibility_check(upline_id_var);
         PERFORM public.check_reward_eligibility(upline_id_var);
         SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = upline_id_var;
       END LOOP;

     ELSIF NEW.status = 'rejected'::public.sale_status AND OLD.status = 'approved'::public.sale_status THEN
       -- Revert Post Income if it was credited
       SELECT id, per_sale_incentive, status 
       INTO txn_rec 
       FROM public.promotion_wallet_transactions 
       WHERE sale_id = NEW.id;

       IF FOUND THEN
         IF txn_rec.status = 'pending' THEN
           UPDATE public.promotion_wallet_transactions SET status = 'rejected' WHERE id = txn_rec.id;
           UPDATE public.promotion_wallet SET pending_income = GREATEST(0.00, pending_income - txn_rec.per_sale_incentive) WHERE user_id = NEW.seller_id;
         ELSIF txn_rec.status = 'approved' OR txn_rec.status = 'paid' THEN
           UPDATE public.promotion_wallet_transactions SET status = 'rejected' WHERE id = txn_rec.id;
           -- Revert balances in promotion wallet
           UPDATE public.promotion_wallet
           SET balance = GREATEST(0.00, balance - txn_rec.per_sale_incentive),
               lifetime_income = GREATEST(0.00, lifetime_income - txn_rec.per_sale_incentive),
               monthly_income = GREATEST(0.00, monthly_income - txn_rec.per_sale_incentive)
           WHERE user_id = NEW.seller_id;

           -- Revert from main wallets as well
           UPDATE public.wallets
           SET balance = GREATEST(0.00, balance - txn_rec.per_sale_incentive),
               approved_balance = GREATEST(0.00, approved_balance - txn_rec.per_sale_incentive)
           WHERE user_id = NEW.seller_id;
         END IF;
       END IF;
     END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind trigger to sales table
DROP TRIGGER IF EXISTS on_sale_approved_recalculate_promotions ON public.sales;
CREATE TRIGGER on_sale_approved_recalculate_promotions
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_sales_and_promotions();

-- 9. Seed Default Reward Categories
INSERT INTO public.reward_categories (name, display_order)
VALUES 
('Associates', 0),
('Manager', 1),
('Senior Manager', 2),
('AGM', 3),
('GM', 4),
('SGM', 5),
('CGM', 6),
('SCGM', 7)
ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order;

-- 10. Seed Some Mock/Default Achievement Rules
INSERT INTO public.achievement_rules (name, category_id, required_direct_sales, required_group_sales, min_promotion_level, reward_type, reward_value, status, display_order, description, different_legs_required)
VALUES
(
  'Mobile Phone',
  (SELECT id FROM public.reward_categories WHERE name = 'Associates'),
  2, 0, 0, 'Physical Gift', '₹8,000', 'active', 0, 'Qualify for a Mobile Phone worth ₹8,000 by making 2 direct sales.', FALSE
),
(
  'Gold Coin',
  (SELECT id FROM public.reward_categories WHERE name = 'Associates'),
  8, 0, 0, 'Physical Gift', '5 Gram Gold Coin', 'active', 1, 'Earn a 5 Gram Gold Coin by registering 8 direct sales.', FALSE
),
(
  'Hero Passion Bike',
  (SELECT id FROM public.reward_categories WHERE name = 'Associates'),
  12, 0, 0, 'Vehicle', 'Hero Passion Bike', 'active', 2, 'Win a Hero Passion Bike by achieving 12 direct sales.', FALSE
),
(
  'Bullet Bike',
  (SELECT id FROM public.reward_categories WHERE name = 'Manager'),
  3, 60, 1, 'Vehicle', 'Royal Enfield Bullet Bike', 'active', 3, 'Get a Bullet Bike as a Manager with 3 direct and 60 group sales.', FALSE
),
(
  'Baleno Car',
  (SELECT id FROM public.reward_categories WHERE name = 'AGM'),
  4, 180, 3, 'Vehicle', 'Maruti Suzuki Baleno', 'active', 4, 'Achieve a Baleno Car as an AGM with 4 direct and 180 group sales spread across legs.', TRUE
)
ON CONFLICT (name) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    min_promotion_level = EXCLUDED.min_promotion_level,
    reward_type = EXCLUDED.reward_type,
    reward_value = EXCLUDED.reward_value,
    status = EXCLUDED.status,
    display_order = EXCLUDED.display_order,
    description = EXCLUDED.description,
    different_legs_required = EXCLUDED.different_legs_required;

-- 11. Run check_reward_eligibility retroactively for all existing profiles
DO $$
DECLARE
  profile_rec RECORD;
BEGIN
  FOR profile_rec IN SELECT id FROM public.profiles LOOP
    PERFORM public.check_reward_eligibility(profile_rec.id);
  END LOOP;
END;
$$;
