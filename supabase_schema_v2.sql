-- Supabase PostgreSQL MLM Property Commission System Schema V2
-- Target: Supabase Database Instance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing views/triggers if any to ensure clean deploy
DROP VIEW IF EXISTS public.downline_network_tree;
DROP VIEW IF EXISTS public.upline_sponsor_path;

-- Create Custom ENUM Types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'AGENT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sale_status') THEN
        CREATE TYPE sale_status AS ENUM ('pending_approval', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_status') THEN
        CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'cancelled', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'withdrawal_status') THEN
        CREATE TYPE withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status') THEN
        CREATE TYPE promotion_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visit_mode') THEN
        CREATE TYPE visit_mode AS ENUM ('physical', 'virtual');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
        CREATE TYPE property_status AS ENUM ('draft', 'available', 'sold');
    END IF;
END$$;

----------------------------------------------------
-- 1. PROMOTION LEVELS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotion_levels (
    level INTEGER PRIMARY KEY CHECK (level >= 0),
    title TEXT UNIQUE NOT NULL,
    required_direct_sales INTEGER NOT NULL CHECK (required_direct_sales >= 0),
    required_group_sales INTEGER NOT NULL CHECK (required_group_sales >= 0),
    reward_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (reward_amount >= 0),
    personal_sale_incentive NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (personal_sale_incentive >= 0.00)
);

-- Populate Default Promotion Levels
INSERT INTO public.promotion_levels (level, title, required_direct_sales, required_group_sales, reward_amount, personal_sale_incentive)
VALUES 
(0, 'Agent', 0, 0, 0.00, 1.00),
(1, 'Level 1', 5, 20, 1000.00, 1.50),
(2, 'Level 2', 15, 100, 5000.00, 2.00),
(3, 'Level 3', 50, 500, 25000.00, 2.50),
(4, 'Level 4', 100, 1500, 50000.00, 3.00),
(5, 'Level 5', 200, 4000, 100000.00, 3.50),
(6, 'Level 6', 400, 10000, 250000.00, 4.00),
(7, 'Level 7', 800, 25000, 500000.00, 5.00)
ON CONFLICT (level) DO UPDATE 
SET title = EXCLUDED.title,
    required_direct_sales = EXCLUDED.required_direct_sales,
    required_group_sales = EXCLUDED.required_group_sales,
    reward_amount = EXCLUDED.reward_amount,
    personal_sale_incentive = EXCLUDED.personal_sale_incentive;

----------------------------------------------------
-- 2. PROFILES TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    avatar TEXT,
    role public.user_role NOT NULL DEFAULT 'AGENT'::public.user_role,
    referral_code TEXT UNIQUE,
    upline_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    network_level INTEGER DEFAULT 1 CHECK (network_level >= 1),
    promotion_level INTEGER DEFAULT 0 REFERENCES public.promotion_levels(level) ON DELETE SET DEFAULT,
    direct_sales_count INTEGER DEFAULT 0 CHECK (direct_sales_count >= 0),
    group_sales_count INTEGER DEFAULT 0 CHECK (group_sales_count >= 0),
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_system_user BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 3. WALLETS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    pending_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0.00),
    approved_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (approved_balance >= 0.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 4. PROPERTIES TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    price NUMERIC(15, 2) NOT NULL CHECK (price >= 0.00),
    total_commission_percent NUMERIC(5, 2) NOT NULL CHECK (total_commission_percent >= 0.00 AND total_commission_percent <= 100.00),
    seller_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (seller_percent >= 0.00 AND seller_percent <= 100.00),
    level1_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (level1_percent >= 0.00 AND level1_percent <= 100.00),
    level2_percent NUMERIC(5, 2) NOT NULL DEFAULT 5.00 CHECK (level2_percent >= 0.00 AND level2_percent <= 100.00),
    level3_percent NUMERIC(5, 2) NOT NULL DEFAULT 3.00 CHECK (level3_percent >= 0.00 AND level3_percent <= 100.00),
    level4_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.00 CHECK (level4_percent >= 0.00 AND level4_percent <= 100.00),
    level5_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (level5_percent >= 0.00 AND level5_percent <= 100.00),
    level6_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.00 CHECK (level6_percent >= 0.00 AND level6_percent <= 100.00),
    level7_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (level7_percent >= 0.00 AND level7_percent <= 100.00),
    level8_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (level8_percent >= 0.00 AND level8_percent <= 100.00),
    level9_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (level9_percent >= 0.00 AND level9_percent <= 100.00),
    level10_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.50 CHECK (level10_percent >= 0.00 AND level10_percent <= 100.00),
    image_urls TEXT[],
    brochure_url TEXT,
    status public.property_status NOT NULL DEFAULT 'available'::public.property_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT sum_pct_check CHECK (
        seller_percent + level1_percent + level2_percent + level3_percent + level4_percent +
        level5_percent + level6_percent + level7_percent + level8_percent + level9_percent +
        level10_percent <= 100.00
    )
);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 5. SALES TABLE (Transactions)
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE RESTRICT,
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT NOT NULL,
    sale_amount NUMERIC(15, 2) NOT NULL CHECK (sale_amount >= 0.00),
    status public.sale_status NOT NULL DEFAULT 'pending_approval'::public.sale_status,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 6. COMMISSIONS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 10),
    percent NUMERIC(5, 2) NOT NULL CHECK (percent >= 0.00 AND percent <= 100.00),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0.00),
    status public.commission_status NOT NULL DEFAULT 'pending'::public.commission_status,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 7. WITHDRAWALS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0.00),
    status public.withdrawal_status NOT NULL DEFAULT 'pending'::public.withdrawal_status,
    remarks TEXT,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 8. VISITS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    visit_mode public.visit_mode NOT NULL DEFAULT 'physical'::public.visit_mode,
    coordinator_name TEXT,
    people_count INTEGER NOT NULL DEFAULT 1 CHECK (people_count >= 1),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 9. PROMOTIONS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    promotion_level INTEGER NOT NULL REFERENCES public.promotion_levels(level) ON DELETE RESTRICT,
    reward_amount NUMERIC(15, 2) NOT NULL CHECK (reward_amount >= 0.00),
    is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    status public.promotion_status NOT NULL DEFAULT 'pending'::public.promotion_status,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 10. NOTIFICATIONS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 11. ACTIVITY LOGS TABLE
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- INDEX OPTIMIZATIONS
----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_upline ON public.profiles(upline_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON public.sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_property ON public.sales(property_id);
CREATE INDEX IF NOT EXISTS idx_commissions_sale ON public.commissions(sale_id);
CREATE INDEX IF NOT EXISTS idx_commissions_recipient ON public.commissions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_agent ON public.visits(agent_id);
CREATE INDEX IF NOT EXISTS idx_visits_property ON public.visits(property_id);
CREATE INDEX IF NOT EXISTS idx_promotions_user ON public.promotions(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

----------------------------------------------------
-- RECURSIVE VIEWS
----------------------------------------------------

-- 1. Downline network tree
CREATE OR REPLACE VIEW public.downline_network_tree AS
WITH RECURSIVE downline_tree AS (
    SELECT 
        p.id,
        p.name,
        p.email,
        p.promotion_level,
        p.upline_id,
        1 AS level_depth,
        p.id AS root_agent_id
    FROM public.profiles p
    
    UNION ALL
    
    SELECT 
        c.id,
        c.name,
        c.email,
        c.promotion_level,
        c.upline_id,
        dt.level_depth + 1 AS level_depth,
        dt.root_agent_id
    FROM public.profiles c
    INNER JOIN downline_tree dt ON c.upline_id = dt.id
)
SELECT 
    root_agent_id,
    id AS agent_id,
    name,
    email,
    promotion_level,
    upline_id,
    level_depth
FROM downline_tree;

-- 2. Upline sponsor path
CREATE OR REPLACE VIEW public.upline_sponsor_path AS
WITH RECURSIVE upline_path AS (
    SELECT 
        p.id AS agent_id,
        p.upline_id AS sponsor_id,
        1 AS step_distance,
        p.id AS root_agent_id
    FROM public.profiles p
    
    UNION ALL
    
    SELECT 
        u.id AS agent_id,
        u.upline_id AS sponsor_id,
        up.step_distance + 1 AS step_distance,
        up.root_agent_id
    FROM public.profiles u
    INNER JOIN upline_path up ON u.id = up.sponsor_id
)
SELECT 
    root_agent_id AS agent_id,
    sponsor_id,
    step_distance
FROM upline_path
WHERE sponsor_id IS NOT NULL;

----------------------------------------------------
-- FUNCTIONS & TRIGGERS
----------------------------------------------------

-- Wallet Creation trigger on Profile Insert
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, pending_balance, approved_balance)
  VALUES (NEW.id, 0.00, 0.00, 0.00);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- Profile Creation trigger from Auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
DECLARE
    sponsor_exists BOOLEAN;
    valid_sponsor_id UUID;
    valid_network_lvl INTEGER;
    is_first_user BOOLEAN;
    default_role public.user_role;
    ref_code TEXT;
    code_exists BOOLEAN;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;
    
    IF is_first_user THEN
        default_role := 'SUPER_ADMIN'::public.user_role;
    ELSE
        default_role := 'AGENT'::public.user_role;
    END IF;

    valid_sponsor_id := NULL;
    valid_network_lvl := 1;
    IF (new.raw_user_meta_data->>'upline_id') IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = (new.raw_user_meta_data->>'upline_id')::uuid
        ) INTO sponsor_exists;
        
        IF sponsor_exists THEN
            valid_sponsor_id := (new.raw_user_meta_data->>'upline_id')::uuid;
            SELECT network_level INTO valid_network_lvl 
            FROM public.profiles 
            WHERE id = valid_sponsor_id;
            
            valid_network_lvl := valid_network_lvl + 1;
        END IF;
    END IF;

    -- Generate Unique Referral Code
    LOOP
        ref_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = ref_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;

    INSERT INTO public.profiles (
        id, email, name, phone, avatar, role, referral_code, upline_id, network_level, promotion_level, is_active, is_system_user
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', 'New Agent'),
        new.raw_user_meta_data->>'phone',
        new.raw_user_meta_data->>'avatar',
        default_role,
        ref_code,
        valid_sponsor_id,
        valid_network_lvl,
        0, -- rookie agent level
        TRUE,
        FALSE
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create on_auth_user_created for V2
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();

-- Helper to retrieve property level percentage
CREATE OR REPLACE FUNCTION public.get_property_level_percent(prop_id UUID, lvl INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  pct NUMERIC;
BEGIN
  CASE lvl
    WHEN 1 THEN SELECT level1_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 2 THEN SELECT level2_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 3 THEN SELECT level3_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 4 THEN SELECT level4_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 5 THEN SELECT level5_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 6 THEN SELECT level6_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 7 THEN SELECT level7_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 8 THEN SELECT level8_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 9 THEN SELECT level9_percent INTO pct FROM public.properties WHERE id = prop_id;
    WHEN 10 THEN SELECT level10_percent INTO pct FROM public.properties WHERE id = prop_id;
    ELSE pct := 0.00;
  END CASE;
  RETURN COALESCE(pct, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Helper to credit personal sale incentive
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

-- Helper to promote user sequentially
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

      -- Insert approved promotion record
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

-- Wallet update trigger from Commissions
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

CREATE OR REPLACE TRIGGER on_commission_balance_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.process_commission_status_change();

-- Wallet update trigger from Withdrawals
CREATE OR REPLACE FUNCTION public.process_withdrawal()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Insert (Hold balance immediately on pending cashout request)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending'::public.withdrawal_status THEN
      UPDATE public.wallets 
      SET balance = GREATEST(0.00, balance - NEW.amount) 
      WHERE user_id = NEW.user_id;
    END IF;

  -- Handle Update
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status transitioned from pending to approved (finalized)
    IF OLD.status = 'pending'::public.withdrawal_status AND NEW.status = 'approved'::public.withdrawal_status THEN
      UPDATE public.wallets 
      SET approved_balance = GREATEST(0.00, approved_balance - OLD.amount) 
      WHERE user_id = OLD.user_id;

    -- If status transitioned from pending to rejected (revert balance)
    ELSIF OLD.status = 'pending'::public.withdrawal_status AND NEW.status = 'rejected'::public.withdrawal_status THEN
      UPDATE public.wallets 
      SET balance = balance + OLD.amount 
      WHERE user_id = OLD.user_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_withdrawal_balance_sync
  AFTER INSERT OR UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.process_withdrawal();

-- Wallet update trigger from Promotions
CREATE OR REPLACE FUNCTION public.update_wallet_from_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved'::public.promotion_status AND (OLD.status IS NULL OR OLD.status != 'approved'::public.promotion_status) THEN
    UPDATE public.wallets 
    SET approved_balance = approved_balance + NEW.reward_amount,
        balance = balance + NEW.reward_amount 
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_promotion_approved
  AFTER INSERT OR UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_wallet_from_promotion();

-- Recursive MLM Commission distribution trigger on Sale Approval
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
    
    INSERT INTO public.commissions (sale_id, recipient_id, level, percent, amount, status, approved_by, approved_at)
    VALUES (NEW.id, NEW.seller_id, 0, prop_record.seller_percent, direct_comm, 'pending'::public.commission_status, NULL, NULL);

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

    -- Revert property status back to available
    UPDATE public.properties 
    SET status = 'available'::public.property_status 
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_sale_approved_distribution
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.calculate_commissions();

-- Recalculate sales statistics and handle rank promotions sequentially
CREATE OR REPLACE FUNCTION public.recalculate_sales_and_promotions()
RETURNS TRIGGER AS $$
DECLARE
  upline_id_var UUID;
  d_sales INTEGER;
  g_sales INTEGER;
  next_lvl RECORD;
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

-- Attach trigger to sales table
DROP TRIGGER IF EXISTS on_sale_approved_recalculate_promotions ON public.sales;
CREATE TRIGGER on_sale_approved_recalculate_promotions
  AFTER UPDATE OF status ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_sales_and_promotions();

----------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
----------------------------------------------------

-- 1. Profiles Policies
CREATE POLICY "Allow public read for active profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow update for owner profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow full access for super admin / admin" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 2. Wallets Policies
CREATE POLICY "Allow read for wallet owners" 
ON public.wallets FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 3. Properties Policies
CREATE POLICY "Allow read for all active properties" 
ON public.properties FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow full access for super admin / admin properties" 
ON public.properties FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 4. Sales Policies
CREATE POLICY "Allow select for seller or admins" 
ON public.sales FOR SELECT 
TO authenticated 
USING (
  seller_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

CREATE POLICY "Allow insert for sellers" 
ON public.sales FOR INSERT 
TO authenticated 
WITH CHECK (
  seller_id = auth.uid() AND status = 'pending_approval'::public.sale_status
);

CREATE POLICY "Allow full write for admins sales" 
ON public.sales FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 5. Commissions Policies
CREATE POLICY "Allow select for commission recipients or admins" 
ON public.commissions FOR SELECT 
TO authenticated 
USING (
  recipient_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

CREATE POLICY "Allow full write for admins commissions" 
ON public.commissions FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 6. Withdrawals Policies
CREATE POLICY "Allow select for withdrawal owners or admins" 
ON public.withdrawals FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

CREATE POLICY "Allow insert for withdrawal owners" 
ON public.withdrawals FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid() AND status = 'pending'::public.withdrawal_status
);

CREATE POLICY "Allow full write for admins withdrawals" 
ON public.withdrawals FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 7. Visits Policies
CREATE POLICY "Allow select for visit owner or admins" 
ON public.visits FOR SELECT 
TO authenticated 
USING (
  agent_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

CREATE POLICY "Allow insert for visit agents" 
ON public.visits FOR INSERT 
TO authenticated 
WITH CHECK (
  agent_id = auth.uid()
);

CREATE POLICY "Allow full write for admins visits" 
ON public.visits FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 8. Promotions Policies
CREATE POLICY "Allow select for promotion owners or admins" 
ON public.promotions FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

-- 9. Notifications Policies
CREATE POLICY "Allow select/update for notification owners" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "Allow update for notification owners" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 10. Activity Logs Policies
CREATE POLICY "Allow select/insert for log owners or admins" 
ON public.activity_logs FOR SELECT 
TO authenticated 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN'::public.user_role, 'ADMIN'::public.user_role)
  )
);

CREATE POLICY "Allow insert for active sessions logs" 
ON public.activity_logs FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

----------------------------------------------------
-- RECURSIVE DOWNLINE Traversal RPC Function
----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_downline_network(root_id UUID, max_depth INT DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  promotion_level INT,
  upline_id UUID,
  level_depth INT,
  is_active BOOLEAN,
  direct_sales_count INT,
  group_sales_count INT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE downline_tree AS (
      -- Anchor member: root agent (depth 0)
      SELECT 
          p.id,
          p.name,
          p.email,
          p.promotion_level,
          p.upline_id,
          0 AS depth,
          p.is_active,
          p.direct_sales_count,
          p.group_sales_count,
          p.created_at
      FROM public.profiles p
      WHERE p.id = root_id
      
      UNION ALL
      
      -- Recursive members: child nodes (depth + 1)
      SELECT 
          c.id,
          c.name,
          c.email,
          c.promotion_level,
          c.upline_id,
          dt.depth + 1 AS depth,
          c.is_active,
          c.direct_sales_count,
          c.group_sales_count,
          c.created_at
      FROM public.profiles c
      INNER JOIN downline_tree dt ON c.upline_id = dt.id
      WHERE max_depth IS NULL OR dt.depth < max_depth
  )
  SELECT dt.id, dt.name, dt.email, dt.promotion_level, dt.upline_id, dt.depth, dt.is_active, dt.direct_sales_count, dt.group_sales_count, dt.created_at
  FROM downline_tree dt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

