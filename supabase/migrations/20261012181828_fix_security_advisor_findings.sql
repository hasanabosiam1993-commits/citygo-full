/*
# Fix security advisor findings

## Overview
Fixes four security issues flagged by the database advisor:
1. `update_captain_updated_at` has a mutable search_path — add `SET search_path = public`
2. `accept_trip` executable by anon — revoke from PUBLIC, grant only to authenticated
3. `undo_accept_trip` executable by anon — same fix
4. Both functions flagged as SECURITY DEFINER callable by authenticated — this is intentional (the app calls them via RPC with authenticated sessions). Internal `auth.uid()` checks already guard against unauthorized use. No change needed on that front, but we ensure only authenticated can call them.

## Changes
- Recreate `update_captain_updated_at` with `SET search_path = public`
- `REVOKE EXECUTE ... FROM PUBLIC` on both trip functions (removes anon + any other role)
- `GRANT EXECUTE ... TO authenticated` only (the app's frontend calls these with an authenticated session)
*/

-- ============================================
-- Fix mutable search_path on update_captain_updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_captain_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- Lock down accept_trip: revoke from PUBLIC (covers anon), grant only authenticated
-- ============================================
REVOKE EXECUTE ON FUNCTION accept_trip(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_trip(uuid) TO authenticated;

-- ============================================
-- Lock down undo_accept_trip: same treatment
-- ============================================
REVOKE EXECUTE ON FUNCTION undo_accept_trip(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION undo_accept_trip(uuid) TO authenticated;
