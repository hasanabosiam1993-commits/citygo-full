-- Fix: is_admin() function should also check captains table, not just JWT
-- The JWT's app_metadata may not be refreshed after manual updates
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean,
    false
  ) OR EXISTS (
    SELECT 1 FROM public.captains
    WHERE captains.user_id = auth.uid()
    AND captains.is_admin = true
  );
$$;

-- Update captains SELECT policy to use the improved is_admin()
DROP POLICY IF EXISTS select_all_captains_admin ON public.captains;
CREATE POLICY select_all_captains_admin
  ON public.captains FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Update captains UPDATE policy for admin
DROP POLICY IF EXISTS update_captain_admin ON public.captains;
CREATE POLICY update_captain_admin
  ON public.captains FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ensure admin can see all recharges
DROP POLICY IF EXISTS select_all_recharges_admin ON public.recharges;
CREATE POLICY select_all_recharges_admin
  ON public.recharges FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Ensure admin can see all withdrawals
DROP POLICY IF EXISTS select_all_withdrawals_admin ON public.withdrawals;
CREATE POLICY select_all_withdrawals_admin
  ON public.withdrawals FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Ensure admin can update recharges and withdrawals (approve/reject)
DROP POLICY IF EXISTS update_all_recharges_admin ON public.recharges;
CREATE POLICY update_all_recharges_admin
  ON public.recharges FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS update_all_withdrawals_admin ON public.withdrawals;
CREATE POLICY update_all_withdrawals_admin
  ON public.withdrawals FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ensure admin can see all support conversations
DROP POLICY IF EXISTS select_all_support_conversations_admin ON public.support_conversations;
CREATE POLICY select_all_support_conversations_admin
  ON public.support_conversations FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Ensure admin can see all support messages
DROP POLICY IF EXISTS select_all_support_messages_admin ON public.support_messages;
CREATE POLICY select_all_support_messages_admin
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Ensure admin can insert support messages
DROP POLICY IF EXISTS insert_support_messages_admin ON public.support_messages;
CREATE POLICY insert_support_messages_admin
  ON public.support_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Ensure admin can update support conversations (close them)
DROP POLICY IF EXISTS update_support_conversations_admin ON public.support_conversations;
CREATE POLICY update_support_conversations_admin
  ON public.support_conversations FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Ensure admin can see all trips
DROP POLICY IF EXISTS select_all_trips_admin ON public.trips;
CREATE POLICY select_all_trips_admin
  ON public.trips FOR SELECT
  TO authenticated
  USING (public.is_admin());
