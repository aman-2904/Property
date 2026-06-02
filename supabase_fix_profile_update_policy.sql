-- ============================================================
-- SQL Migration: Fix profiles update policy
-- ============================================================

-- Drop the old policy
DROP POLICY IF EXISTS "profiles_update_owner_policy" ON public.profiles;

-- Create the new non-recursive policy
CREATE POLICY "profiles_update_owner_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND (
      (role::text = 'AGENT') OR public.is_admin(auth.uid())
    )
  );
