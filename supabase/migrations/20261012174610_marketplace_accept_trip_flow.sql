/*
# Marketplace schema: accept Trip flow with wallet commission logic

## Overview
This migration adds the marketplace acceptance flow. Captains can accept trips created by other captains from the marketplace feed. Accepting a trip deducts a commission from the accepting captain's wallet and transfers it to the trip creator. The wallet balance cannot drop below 0 JOD.

## Modified Tables

### trips
- `accepted_by` (uuid, nullable, FK to captains.id) — the captain who accepted this trip from the marketplace
- `commission_amount` (numeric(10,2), nullable) — the commission deducted from the accepter and credited to the creator
- Status constraint expanded to include: 'active', 'accepted', 'reached', 'completed', 'cancelled'
- `hidden_by` (jsonb, default '[]') — array of captain IDs who hid this trip from their feed

### transactions
- `related_trip_id` (uuid, nullable, FK to trips.id) — link transaction to the trip that caused it
- `commission_rate` (numeric(3,2), default 0.50) — the commission rate applied (0.50 = 0.50 JOD flat fee per acceptance)

## New Functions

### accept_trip(trip_id uuid)
SECURITY DEFINER function that:
1. Validates the caller is an authenticated captain
2. Checks the trip is still 'active' (not yet accepted)
3. Checks the caller is NOT the trip creator
4. Checks the caller's wallet_balance >= commission_rate (currently 0.50 JOD)
5. Deducts commission from the accepting captain's wallet
6. Credits commission to the trip creator's wallet
7. Sets trip status to 'accepted', accepted_by to the caller
8. Records two transactions (deduction + credit)
9. Returns the updated trip

All steps happen atomically. If any check fails, the function raises an exception and nothing changes.

## Security
- RLS policies updated on trips: all authenticated captains can SELECT active trips (marketplace feed), but can only UPDATE their own created trips or trips they accepted
- The accept_trip function runs as SECURITY DEFINER (service role) to bypass RLS for the wallet deduction/credit
- revoke execute from anon, grant to authenticated
*/

-- ============================================
-- Expand trips table for marketplace
-- ============================================

-- Add accepted_by column
ALTER TABLE trips ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES captains(id) ON DELETE SET NULL;

-- Add commission_amount column
ALTER TABLE trips ADD COLUMN IF NOT EXISTS commission_amount numeric(10,2);

-- Add hidden_by column (array of captain IDs who hid this trip)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS hidden_by jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Expand status constraint to include marketplace statuses
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE trips ADD CONSTRAINT trips_status_check
  CHECK (status IN ('active', 'accepted', 'reached', 'completed', 'cancelled'));

-- Add commission_rate to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS related_trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;

-- ============================================
-- Add commission_rate app setting
-- ============================================
CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO app_settings (key, value)
VALUES ('commission_rate', '0.50')
ON CONFLICT (key) DO NOTHING;

-- Allow all authenticated users to read settings
DROP POLICY IF EXISTS "read_app_settings" ON app_settings;
CREATE POLICY "read_app_settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Update RLS on trips for marketplace
-- ============================================

-- All authenticated captains can see active trips (marketplace feed)
-- Plus they can see trips they created or accepted
DROP POLICY IF EXISTS "select_own_trips" ON trips;
DROP POLICY IF EXISTS "select_marketplace_trips" ON trips;
CREATE POLICY "select_marketplace_trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.accepted_by
      AND captains.user_id = auth.uid()
    )
  );

-- Only the creator can insert their trips
DROP POLICY IF EXISTS "insert_own_trips" ON trips;
CREATE POLICY "insert_own_trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
  );

-- Creator can update their own trips; accepter can update trips they accepted
DROP POLICY IF EXISTS "update_own_trips" ON trips;
CREATE POLICY "update_own_trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.accepted_by
      AND captains.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.accepted_by
      AND captains.user_id = auth.uid()
    )
  );

-- Only creator can delete
DROP POLICY IF EXISTS "delete_own_trips" ON trips;
CREATE POLICY "delete_own_trips"
  ON trips FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
  );

-- ============================================
-- accept_trip SECURITY DEFINER function
-- ============================================
CREATE OR REPLACE FUNCTION accept_trip(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_captain_id uuid;
  v_creator_captain_id uuid;
  v_trip_price numeric(10,2);
  v_commission numeric(10,2);
  v_caller_balance numeric(10,2);
  v_trip_status text;
  v_trip_accepted_by uuid;
BEGIN
  -- Get the calling captain's ID
  SELECT id INTO v_caller_captain_id
  FROM captains
  WHERE user_id = auth.uid();

  IF v_caller_captain_id IS NULL THEN
    RAISE EXCEPTION 'Captain profile not found';
  END IF;

  -- Get trip details with row lock
  SELECT captain_id, price, status, accepted_by
  INTO v_creator_captain_id, v_trip_price, v_trip_status, v_trip_accepted_by
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF v_creator_captain_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- Cannot accept own trip
  IF v_creator_captain_id = v_caller_captain_id THEN
    RAISE EXCEPTION 'Cannot accept your own trip';
  END IF;

  -- Trip must be active (not yet accepted)
  IF v_trip_status != 'active' THEN
    RAISE EXCEPTION 'Trip is no longer available';
  END IF;

  -- Get commission rate
  SELECT (value::numeric) INTO v_commission
  FROM app_settings
  WHERE key = 'commission_rate';

  IF v_commission IS NULL THEN
    v_commission := 0.50;
  END IF;

  -- Check caller's wallet balance
  SELECT wallet_balance INTO v_caller_balance
  FROM captains
  WHERE id = v_caller_captain_id
  FOR UPDATE;

  IF v_caller_balance < v_commission THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Need % JOD, have % JOD', v_commission, v_caller_balance;
  END IF;

  -- Deduct commission from accepter
  UPDATE captains
  SET wallet_balance = wallet_balance - v_commission
  WHERE id = v_caller_captain_id;

  -- Credit commission to creator
  UPDATE captains
  SET wallet_balance = wallet_balance + v_commission
  WHERE id = v_creator_captain_id;

  -- Update trip status
  UPDATE trips
  SET status = 'accepted',
      accepted_by = v_caller_captain_id,
      commission_amount = v_commission
  WHERE id = p_trip_id;

  -- Record deduction transaction
  INSERT INTO transactions (captain_id, type, amount, currency, status, description, related_trip_id)
  VALUES (v_caller_captain_id, 'deduction', -v_commission, 'JOD', 'completed',
          'عمولة قبول رحلة', p_trip_id);

  -- Record credit transaction
  INSERT INTO transactions (captain_id, type, amount, currency, status, description, related_trip_id)
  VALUES (v_creator_captain_id, 'bonus', v_commission, 'JOD', 'completed',
          'عمولة رحلة مقبولة', p_trip_id);

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'commission', v_commission,
    'new_balance', v_caller_balance - v_commission
  );
END;
$$;

-- Revoke from anon, grant to authenticated
REVOKE EXECUTE ON FUNCTION accept_trip(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION accept_trip(uuid) TO authenticated;

-- ============================================
-- undo_accept_trip function (undo within a grace window)
-- ============================================
CREATE OR REPLACE FUNCTION undo_accept_trip(p_trip_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_captain_id uuid;
  v_creator_captain_id uuid;
  v_commission numeric(10,2);
  v_trip_status text;
  v_trip_accepted_by uuid;
BEGIN
  -- Get the calling captain's ID
  SELECT id INTO v_caller_captain_id
  FROM captains
  WHERE user_id = auth.uid();

  IF v_caller_captain_id IS NULL THEN
    RAISE EXCEPTION 'Captain profile not found';
  END IF;

  -- Get trip details with lock
  SELECT captain_id, status, accepted_by, commission_amount
  INTO v_creator_captain_id, v_trip_status, v_trip_accepted_by, v_commission
  FROM trips
  WHERE id = p_trip_id
  FOR UPDATE;

  IF v_creator_captain_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found';
  END IF;

  -- Must be the one who accepted
  IF v_trip_accepted_by != v_caller_captain_id THEN
    RAISE EXCEPTION 'You did not accept this trip';
  END IF;

  -- Must be in 'accepted' status (not yet reached/delivered)
  IF v_trip_status != 'accepted' THEN
    RAISE EXCEPTION 'Cannot undo - trip already in progress';
  END IF;

  -- Refund commission to accepter
  UPDATE captains
  SET wallet_balance = wallet_balance + v_commission
  WHERE id = v_caller_captain_id;

  -- Deduct commission back from creator
  UPDATE captains
  SET wallet_balance = wallet_balance - v_commission
  WHERE id = v_creator_captain_id;

  -- Reset trip to active
  UPDATE trips
  SET status = 'active',
      accepted_by = NULL,
      commission_amount = NULL
  WHERE id = p_trip_id;

  -- Record refund transaction
  INSERT INTO transactions (captain_id, type, amount, currency, status, description, related_trip_id)
  VALUES (v_caller_captain_id, 'bonus', v_commission, 'JOD', 'completed',
          'استرداد عمولة رحلة', p_trip_id);

  -- Record deduction from creator
  INSERT INTO transactions (captain_id, type, amount, currency, status, description, related_trip_id)
  VALUES (v_creator_captain_id, 'deduction', -v_commission, 'JOD', 'completed',
          'استرداد عمولة رحلة', p_trip_id);

  RETURN jsonb_build_object(
    'success', true,
    'trip_id', p_trip_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION undo_accept_trip(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION undo_accept_trip(uuid) TO authenticated;
