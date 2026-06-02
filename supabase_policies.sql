-- Supabase PostgreSQL RLS Policies for MLM Property Commission System V2
-- Roles: SUPER_ADMIN, ADMIN, AGENT

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

----------------------------------------------------
-- 1. PROFILES POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_policy" ON public.profiles;

-- Agents can view all active agents (needed to build trees / browse sponsor networks)
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- Agents can update only their own profile details
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- SUPER_ADMIN and ADMIN have full access to manage profiles
CREATE POLICY "profiles_admin_policy" ON public.profiles
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 2. WALLETS POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "wallets_select_policy" ON public.wallets;
DROP POLICY IF EXISTS "wallets_admin_policy" ON public.wallets;

-- Agents can read only their own wallet ledger
CREATE POLICY "wallets_select_policy" ON public.wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- SUPER_ADMIN has full access, ADMIN can read wallets
CREATE POLICY "wallets_admin_policy" ON public.wallets
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() = 'SUPER_ADMIN');

----------------------------------------------------
-- 3. PROPERTIES POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "properties_select_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_admin_policy" ON public.properties;

-- Agents can read all properties
CREATE POLICY "properties_select_policy" ON public.properties
  FOR SELECT TO authenticated
  USING (true);

-- SUPER_ADMIN and ADMIN can create, update, delete properties
CREATE POLICY "properties_admin_policy" ON public.properties
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 4. SALES POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_admin_policy" ON public.sales;

-- Agents can read their own registered sales
CREATE POLICY "sales_select_policy" ON public.sales
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- Agents can insert sales with 'pending_approval' status
CREATE POLICY "sales_insert_policy" ON public.sales
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND status = 'pending_approval'::public.sale_status);

-- SUPER_ADMIN and ADMIN can manage all sales transactions (approve/reject/edit)
CREATE POLICY "sales_admin_policy" ON public.sales
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 5. COMMISSIONS POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "commissions_select_policy" ON public.commissions;
DROP POLICY IF EXISTS "commissions_admin_policy" ON public.commissions;

-- Agents can view their own earned commissions (direct and indirect overrides)
CREATE POLICY "commissions_select_policy" ON public.commissions
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- SUPER_ADMIN and ADMIN can select/insert/update/delete all commission records
CREATE POLICY "commissions_admin_policy" ON public.commissions
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 6. WITHDRAWALS (PAYOUTS) POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "withdrawals_select_policy" ON public.withdrawals;
DROP POLICY IF EXISTS "withdrawals_insert_policy" ON public.withdrawals;
DROP POLICY IF EXISTS "withdrawals_admin_policy" ON public.withdrawals;

-- Agents can select their own cashout history
CREATE POLICY "withdrawals_select_policy" ON public.withdrawals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Agents can create withdrawal requests (status must default to pending)
CREATE POLICY "withdrawals_insert_policy" ON public.withdrawals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending'::public.withdrawal_status);

-- SUPER_ADMIN and ADMIN can process withdrawal requests (approve/reject/reference hash updates)
CREATE POLICY "withdrawals_admin_policy" ON public.withdrawals
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 7. VISITS POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "visits_select_policy" ON public.visits;
DROP POLICY IF EXISTS "visits_insert_policy" ON public.visits;
DROP POLICY IF EXISTS "visits_admin_policy" ON public.visits;

-- Agents can read their own client visit history
CREATE POLICY "visits_select_policy" ON public.visits
  FOR SELECT TO authenticated
  USING (agent_id = auth.uid());

-- Agents can insert visits for customer tracking
CREATE POLICY "visits_insert_policy" ON public.visits
  FOR INSERT TO authenticated
  WITH CHECK (agent_id = auth.uid());

-- SUPER_ADMIN and ADMIN can manage/read all property visits
CREATE POLICY "visits_admin_policy" ON public.visits
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 8. PROMOTIONS POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "promotions_select_policy" ON public.promotions;
DROP POLICY IF EXISTS "promotions_admin_policy" ON public.promotions;

-- Agents can read their own promotion reward records
CREATE POLICY "promotions_select_policy" ON public.promotions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- SUPER_ADMIN and ADMIN have full control over promotions
CREATE POLICY "promotions_admin_policy" ON public.promotions
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 9. NOTIFICATIONS POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_policy" ON public.notifications;

-- Users can read their own notifications
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update (mark as read) their own notifications
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can create notifications for any user
CREATE POLICY "notifications_admin_policy" ON public.notifications
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'))
  WITH CHECK (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

----------------------------------------------------
-- 10. ACTIVITY LOGS POLICIES
----------------------------------------------------
DROP POLICY IF EXISTS "logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "logs_insert_policy" ON public.activity_logs;

-- SUPER_ADMIN can view all activity logs, ADMIN can view logs
CREATE POLICY "logs_select_policy" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.get_auth_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- Agents and other users can write to activity logs (to record actions)
CREATE POLICY "logs_insert_policy" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
