-- ============================================================
-- PROMOTION & POST INCOME SYSTEM CONFIGURATION AND MIGRATION
-- ============================================================

-- 1. Alter public.promotion_levels to support custom qualification rules
ALTER TABLE public.promotion_levels ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE public.promotion_levels ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled'));
ALTER TABLE public.promotion_levels ADD COLUMN IF NOT EXISTS required_prev_promotion_level INTEGER REFERENCES public.promotion_levels(level) ON DELETE SET NULL;
ALTER TABLE public.promotion_levels ADD COLUMN IF NOT EXISTS required_prev_promotion_count INTEGER DEFAULT 0;
ALTER TABLE public.promotion_levels ADD COLUMN IF NOT EXISTS different_legs_required BOOLEAN DEFAULT FALSE;

-- 2. Alter public.promotions to track rich history details
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS previous_promotion_level INTEGER REFERENCES public.promotion_levels(level) ON DELETE SET NULL;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS direct_sales INTEGER DEFAULT 0;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS group_sales INTEGER DEFAULT 0;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS qualified_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS trigger_reason TEXT DEFAULT 'Automatically Promoted';

-- 3. Create public.promotion_wallet to track promotion-based earnings
CREATE TABLE IF NOT EXISTS public.promotion_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    lifetime_income NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (lifetime_income >= 0.00),
    monthly_income NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_income >= 0.00),
    pending_income NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (pending_income >= 0.00),
    paid_income NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (paid_income >= 0.00),
    withdrawn_income NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (withdrawn_income >= 0.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on public.promotion_wallet
ALTER TABLE public.promotion_wallet ENABLE ROW LEVEL SECURITY;

-- 4. Create public.promotion_wallet_transactions to store promotion ledger
CREATE TABLE IF NOT EXISTS public.promotion_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.promotion_wallet(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_name TEXT,
    property_title TEXT,
    booking_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    promotion_title TEXT NOT NULL,
    per_sale_incentive NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on public.promotion_wallet_transactions
ALTER TABLE public.promotion_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_promotion_wallet_user ON public.promotion_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_wallet_tx_wallet ON public.promotion_wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_promotion_wallet_tx_user ON public.promotion_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_promotions_prev_lvl ON public.promotions(previous_promotion_level);

-- 5. Trigger function to auto-create promotion wallet for new profile
CREATE OR REPLACE FUNCTION public.handle_new_profile_promotion_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.promotion_wallet (user_id, balance, lifetime_income, monthly_income, pending_income, paid_income, withdrawn_income)
  VALUES (NEW.id, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_promotion_wallet ON public.profiles;
CREATE TRIGGER on_profile_created_promotion_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_promotion_wallet();

-- Backfill wallets for existing profiles
INSERT INTO public.promotion_wallet (user_id, balance, lifetime_income, monthly_income, pending_income, paid_income, withdrawn_income)
SELECT id, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 6. Setup Row-Level Security Policies

-- Promotion Levels Policies
DROP POLICY IF EXISTS "promotion_levels_select_policy" ON public.promotion_levels;
CREATE POLICY "promotion_levels_select_policy" ON public.promotion_levels
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "promotion_levels_admin_policy" ON public.promotion_levels;
CREATE POLICY "promotion_levels_admin_policy" ON public.promotion_levels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Promotion History/Promotions Policies
DROP POLICY IF EXISTS "promotions_select_policy_v2" ON public.promotions;
CREATE POLICY "promotions_select_policy_v2" ON public.promotions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Promotion Wallet Policies
DROP POLICY IF EXISTS "promotion_wallet_select_policy" ON public.promotion_wallet;
CREATE POLICY "promotion_wallet_select_policy" ON public.promotion_wallet
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "promotion_wallet_admin_policy" ON public.promotion_wallet;
CREATE POLICY "promotion_wallet_admin_policy" ON public.promotion_wallet
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- Promotion Wallet Transactions Policies
DROP POLICY IF EXISTS "promotion_wallet_tx_select_policy" ON public.promotion_wallet_transactions;
CREATE POLICY "promotion_wallet_tx_select_policy" ON public.promotion_wallet_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

DROP POLICY IF EXISTS "promotion_wallet_tx_admin_policy" ON public.promotion_wallet_transactions;
CREATE POLICY "promotion_wallet_tx_admin_policy" ON public.promotion_wallet_transactions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
    )
  );

-- 7. Rewrite promotion_eligibility_check function to check direct, group, and legs rules sequentially
CREATE OR REPLACE FUNCTION public.promotion_eligibility_check(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_direct INTEGER;
  current_group INTEGER;
  current_promo_lvl INTEGER;
  next_lvl RECORD;
  total_qualified INTEGER;
  total_qualified_legs INTEGER;
  qualified_members_json JSONB;
BEGIN
  -- Retrieve current sales counts and rank
  SELECT direct_sales_count, group_sales_count, promotion_level 
  INTO current_direct, current_group, current_promo_lvl 
  FROM public.profiles 
  WHERE id = target_user_id;

  -- Loop for sequential promotion check
  LOOP
    -- Find next active promotion level sorted by level
    SELECT * INTO next_lvl 
    FROM public.promotion_levels 
    WHERE level = current_promo_lvl + 1 AND status = 'active';

    IF NOT FOUND THEN
      EXIT;
    END IF;

    -- Check direct sales and group sales
    IF current_direct < next_lvl.required_direct_sales OR current_group < next_lvl.required_group_sales THEN
      EXIT;
    END IF;

    -- Check qualification rules
    IF next_lvl.required_prev_promotion_level IS NOT NULL THEN
      -- Count total qualified downline members (excluding root)
      SELECT COUNT(*) INTO total_qualified
      FROM public.get_downline_network(target_user_id) d
      WHERE d.id != target_user_id AND d.promotion_level >= next_lvl.required_prev_promotion_level;

      -- Count total qualified downline legs (direct downlines having at least one qualified member)
      SELECT COUNT(*) INTO total_qualified_legs
      FROM (
        SELECT p.id
        FROM public.profiles p
        WHERE p.upline_id = target_user_id
          AND EXISTS (
            SELECT 1 
            FROM public.get_downline_network(p.id) d
            WHERE d.promotion_level >= next_lvl.required_prev_promotion_level
          )
      ) legs;

      -- Check leg qualification rule
      IF next_lvl.different_legs_required THEN
        IF total_qualified_legs < next_lvl.required_prev_promotion_count THEN
          EXIT;
        END IF;
      ELSE
        IF total_qualified < next_lvl.required_prev_promotion_count THEN
          EXIT;
        END IF;
      END IF;

      -- Build the list of qualified members to save in history
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'promotion_level', d.promotion_level)), '[]'::jsonb)
      INTO qualified_members_json
      FROM public.get_downline_network(target_user_id) d
      WHERE d.id != target_user_id AND d.promotion_level >= next_lvl.required_prev_promotion_level;
    ELSE
      qualified_members_json := '[]'::jsonb;
    END IF;

    -- Update rank
    UPDATE public.profiles 
    SET promotion_level = next_lvl.level 
    WHERE id = target_user_id;

    -- Insert approved promotion record
    INSERT INTO public.promotions (user_id, promotion_level, reward_amount, is_claimed, status, previous_promotion_level, direct_sales, group_sales, qualified_members, trigger_reason)
    VALUES (
      target_user_id, 
      next_lvl.level, 
      next_lvl.reward_amount, 
      FALSE, 
      'approved'::public.promotion_status,
      current_promo_lvl,
      current_direct,
      current_group,
      qualified_members_json,
      'Automatically Promoted'
    );

    -- Add notification record
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      target_user_id, 
      '🎉 Congratulations!', 
      jsonb_build_object(
        'module', '/agent/promotions',
        'text', 'You have been promoted to ' || next_lvl.title || '!'
      )::text
    );

    current_promo_lvl := next_lvl.level;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Rewrite recalculate_sales_and_promotions to handle sales counts, post-income transactions, and eligibility
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

       -- Check promotions for uplines recursively
       SELECT upline_id INTO upline_id_var FROM public.profiles WHERE id = NEW.seller_id;
       WHILE upline_id_var IS NOT NULL LOOP
         PERFORM public.promotion_eligibility_check(upline_id_var);
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

-- Bind trigger to sales table
DROP TRIGGER IF EXISTS on_sale_approved_recalculate_promotions ON public.sales;
CREATE TRIGGER on_sale_approved_recalculate_promotions
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_sales_and_promotions();

-- 9. Seed promotion levels from the user requirements
-- Level 0: Agent
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive, display_order, status, required_prev_promotion_level, required_prev_promotion_count, different_legs_required)
VALUES (0, 'Agent', 0, 0, 0.00, 0.00, 0, 'active', NULL, 0, FALSE)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    required_prev_promotion_level = EXCLUDED.required_prev_promotion_level,
    required_prev_promotion_count = EXCLUDED.required_prev_promotion_count,
    different_legs_required = EXCLUDED.different_legs_required;

-- Level 1: Manager
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive, display_order, status, required_prev_promotion_level, required_prev_promotion_count, different_legs_required)
VALUES (1, 'Manager', 2, 8, 0.00, 5000.00, 1, 'active', NULL, 0, FALSE)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    required_prev_promotion_level = EXCLUDED.required_prev_promotion_level,
    required_prev_promotion_count = EXCLUDED.required_prev_promotion_count,
    different_legs_required = EXCLUDED.different_legs_required;

-- Level 2: Sr. Manager
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive, display_order, status, required_prev_promotion_level, required_prev_promotion_count, different_legs_required)
VALUES (2, 'Sr. Manager', 4, 26, 0.00, 3000.00, 2, 'active', 1, 1, FALSE)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    required_prev_promotion_level = EXCLUDED.required_prev_promotion_level,
    required_prev_promotion_count = EXCLUDED.required_prev_promotion_count,
    different_legs_required = EXCLUDED.different_legs_required;

-- Level 3: AGM
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive, display_order, status, required_prev_promotion_level, required_prev_promotion_count, different_legs_required)
VALUES (3, 'AGM', 5, 66, 0.00, 2000.00, 3, 'active', 2, 2, TRUE)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    required_prev_promotion_level = EXCLUDED.required_prev_promotion_level,
    required_prev_promotion_count = EXCLUDED.required_prev_promotion_count,
    different_legs_required = EXCLUDED.different_legs_required;

-- Level 4: GM
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive, display_order, status, required_prev_promotion_level, required_prev_promotion_count, different_legs_required)
VALUES (4, 'GM', 5, 126, 0.00, 1000.00, 4, 'active', 3, 2, TRUE)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    required_prev_promotion_level = EXCLUDED.required_prev_promotion_level,
    required_prev_promotion_count = EXCLUDED.required_prev_promotion_count,
    different_legs_required = EXCLUDED.different_legs_required;

-- Level 5: SGM
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive, display_order, status, required_prev_promotion_level, required_prev_promotion_count, different_legs_required)
VALUES (5, 'SGM', 5, 176, 0.00, 500.00, 5, 'active', 4, 2, TRUE)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    required_prev_promotion_level = EXCLUDED.required_prev_promotion_level,
    required_prev_promotion_count = EXCLUDED.required_prev_promotion_count,
    different_legs_required = EXCLUDED.different_legs_required;

-- Delete any levels above level 5 to match seed specification
DELETE FROM public.promotion_levels WHERE level > 5;


-- 10. Helper functions for Server Action updates of promotion_wallet (called via RPC)

CREATE OR REPLACE FUNCTION public.credit_main_wallet(target_user_id UUID, credit_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.wallets
  SET approved_balance = approved_balance + credit_amount,
      balance = balance + credit_amount
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.debit_main_wallet(target_user_id UUID, debit_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.wallets
  SET approved_balance = GREATEST(0.00, approved_balance - debit_amount),
      balance = GREATEST(0.00, balance - debit_amount)
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_promotion_wallet_on_approval(target_user_id UUID, incentive_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_wallet
  SET pending_income = GREATEST(0.00, pending_income - incentive_amount),
      balance = balance + incentive_amount,
      lifetime_income = lifetime_income + incentive_amount,
      monthly_income = monthly_income + incentive_amount,
      updated_at = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_promotion_wallet_on_paid(target_user_id UUID, incentive_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_wallet
  SET balance = GREATEST(0.00, balance - incentive_amount),
      paid_income = paid_income + incentive_amount,
      withdrawn_income = withdrawn_income + incentive_amount,
      updated_at = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_promotion_wallet_on_direct_paid(target_user_id UUID, incentive_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_wallet
  SET pending_income = GREATEST(0.00, pending_income - incentive_amount),
      paid_income = paid_income + incentive_amount,
      withdrawn_income = withdrawn_income + incentive_amount,
      lifetime_income = lifetime_income + incentive_amount,
      monthly_income = monthly_income + incentive_amount,
      updated_at = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_promotion_wallet_on_rejection(target_user_id UUID, incentive_amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.promotion_wallet
  SET pending_income = GREATEST(0.00, pending_income - incentive_amount),
      updated_at = now()
  WHERE user_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.revert_promotion_wallet_on_rejection(target_user_id UUID, incentive_amount NUMERIC, was_paid BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF was_paid THEN
    UPDATE public.promotion_wallet
    SET paid_income = GREATEST(0.00, paid_income - incentive_amount),
        withdrawn_income = GREATEST(0.00, withdrawn_income - incentive_amount),
        lifetime_income = GREATEST(0.00, lifetime_income - incentive_amount),
        monthly_income = GREATEST(0.00, monthly_income - incentive_amount),
        updated_at = now()
    WHERE user_id = target_user_id;
  ELSE
    UPDATE public.promotion_wallet
    SET balance = GREATEST(0.00, balance - incentive_amount),
        lifetime_income = GREATEST(0.00, lifetime_income - incentive_amount),
        monthly_income = GREATEST(0.00, monthly_income - incentive_amount),
        updated_at = now()
    WHERE user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
