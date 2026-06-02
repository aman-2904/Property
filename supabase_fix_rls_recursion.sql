-- SQL Migration Script to Fix RLS Infinite Recursion (V4 - Policies Dropped First)
-- Targets: profiles, wallets, properties, sales, commissions, withdrawals, visits, promotions, notifications, activity_logs

-- ----------------------------------------------------
-- 1. DYNAMICALLY WIPE ALL PREVIOUS POLICIES
-- ----------------------------------------------------
-- This block automatically finds and drops all policies on target tables.
-- It MUST run before dropping functions so that any RLS dependencies on the functions are cleared first.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('profiles', 'wallets', 'properties', 'sales', 'commissions', 'withdrawals', 'visits', 'promotions', 'notifications', 'activity_logs')
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END;
$$;


-- ----------------------------------------------------
-- 2. DROP AND RECREATE ROLE CHECKING FUNCTIONS
-- ----------------------------------------------------
-- Now that RLS policy dependencies are cleared, we can safely drop these functions.
DROP FUNCTION IF EXISTS public.is_admin(UUID);
DROP FUNCTION IF EXISTS public.get_auth_user_role();

-- Function to check if a user is SUPER_ADMIN or ADMIN
-- Defined as SECURITY DEFINER so it runs with database owner (superuser) privileges, 
-- which bypasses RLS and prevents RLS evaluation on profiles (avoiding recursion).
-- SET search_path is set for security to prevent search-path hijacking.
-- Uses `role::text` to be immune to missing custom enum type errors.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role::text IN ('SUPER_ADMIN', 'ADMIN', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Function to fetch the user's role securely (returns text to avoid enum type dependencies)
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------
-- 3. APPLY NEW RECURSION-PROOF RLS POLICIES
-- ----------------------------------------------------

-- 1. PROFILES POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view profiles (needed for upline/downline info)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Users can update only their own profile, but cannot change their role unless they are admin
CREATE POLICY "profiles_update_owner_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND (
      (role::text = 'AGENT') OR public.is_admin(auth.uid())
    )
  );

-- Admins can insert, update, and delete any profile details
CREATE POLICY "profiles_admin_insert_policy" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "profiles_admin_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "profiles_admin_delete_policy" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));


-- 2. WALLETS POLICIES
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_policy" ON public.wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "wallets_admin_policy" ON public.wallets
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 3. PROPERTIES POLICIES
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_select_policy" ON public.properties
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "properties_admin_policy" ON public.properties
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 4. SALES POLICIES
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_select_policy" ON public.sales
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid() OR public.is_admin(auth.uid()));

-- Uses status::text to avoid enum type dependencies
CREATE POLICY "sales_insert_policy" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND status::text = 'pending_approval');

CREATE POLICY "sales_admin_policy" ON public.sales
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 5. COMMISSIONS POLICIES
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commissions_select_policy" ON public.commissions
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "commissions_admin_policy" ON public.commissions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 6. WITHDRAWALS POLICIES
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "withdrawals_select_policy" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Uses status::text to avoid enum type dependencies
CREATE POLICY "withdrawals_insert_policy" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status::text = 'pending');

CREATE POLICY "withdrawals_admin_policy" ON public.withdrawals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 7. VISITS POLICIES
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits_select_policy" ON public.visits
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "visits_insert_policy" ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

CREATE POLICY "visits_admin_policy" ON public.visits
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 8. PROMOTIONS POLICIES
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promotions_select_policy" ON public.promotions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "promotions_admin_policy" ON public.promotions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 9. NOTIFICATIONS POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_admin_policy" ON public.notifications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- 10. ACTIVITY LOGS POLICIES
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_select_policy" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());
