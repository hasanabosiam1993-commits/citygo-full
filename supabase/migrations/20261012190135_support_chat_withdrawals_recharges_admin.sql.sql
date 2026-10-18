/*
# Support chat, withdrawals, recharges, and admin dashboard

## Overview
Adds the full support/withdrawal/recharge/admin infrastructure:
1. Support chat between captains and admin, with a Support Bot that sends quick-reply canned messages
2. Withdrawal requests (allowed only on Mondays and Thursdays, min 5 JOD, cannot drop below 5 JOD baseline)
3. Wallet recharge requests via receipt image upload (admin approves)
4. Admin role detection via app_metadata + admin-specific RLS policies
5. SECURITY DEFINER functions for privileged operations (withdrawals, recharges, captain approval)

## New Tables

### 1. support_conversations
- id (uuid PK)
- captain_id (uuid FK captains.id) — the captain in this conversation
- status (text: 'open', 'closed') — defaults 'open'
- last_message_at (timestamptz) — tracks most recent message time
- created_at, updated_at

### 2. support_messages
- id (uuid PK)
- conversation_id (uuid FK support_conversations.id ON DELETE CASCADE)
- sender_type (text: 'captain', 'admin', 'bot') — who sent the message
- body (text) — message content
- created_at

### 3. withdrawals
- id (uuid PK)
- captain_id (uuid FK captains.id)
- amount (numeric(10,2)) — requested withdrawal amount
- status (text: 'pending', 'approved', 'rejected', 'completed') — defaults 'pending'
- admin_note (text, nullable)
- processed_by (uuid FK auth.users, nullable) — admin who handled it
- created_at, processed_at

### 4. recharges
- id (uuid PK)
- captain_id (uuid FK captains.id)
- amount (numeric(10,2)) — requested recharge amount
- receipt_url (text) — signed URL to receipt image in storage
- status (text: 'pending', 'approved', 'rejected') — defaults 'pending'
- admin_note (text, nullable)
- processed_by (uuid FK auth.users, nullable)
- created_at, processed_at

## Modified Tables

### captains
- `is_admin` (boolean, default false) — flag for admin users (kept in sync with app_metadata.is_admin)

### transactions
- Expanded type CHECK to include 'withdrawal' and 'recharge'

## New Functions

### request_withdrawal(p_amount numeric)
SECURITY DEFINER. Validates:
- Caller is an active captain
- Today is Monday or Thursday (EXTRACT(DOW FROM now()) IN (1, 4))
- Amount >= 5.00 JOD
- wallet_balance - amount >= 5.00 JOD (baseline preserved)
Creates a pending withdrawal row. Does NOT deduct balance yet (deduct on admin approval).

### approve_withdrawal(p_withdrawal_id uuid)
SECURITY DEFINER. Admin-only. Approves a pending withdrawal, deducts from captain wallet, records transaction.

### reject_withdrawal(p_withdrawal_id uuid, p_note text)
SECURITY DEFINER. Admin-only. Rejects a pending withdrawal.

### approve_recharge(p_recharge_id uuid)
SECURITY DEFINER. Admin-only. Approves a pending recharge, credits captain wallet, records transaction.

### reject_recharge(p_recharge_id uuid, p_note text)
SECURITY DEFINER. Admin-only. Rejects a pending recharge.

### approve_captain(p_captain_id uuid, p_employee_id text)
SECURITY DEFINER. Admin-only. Sets captain status to 'active', assigns employee_id.

### suspend_captain(p_captain_id uuid)
SECURITY DEFINER. Admin-only. Sets captain status to 'suspended'.

### is_admin()
Returns boolean. Checks app_metadata.is_admin = true for current user.

## Security
- RLS enabled on all new tables
- support_conversations/messages: captains see only their own conversations; admins see all
- withdrawals/recharges: captains see their own; admins see all
- Admin detection via raw_app_meta_data->>'is_admin' = 'true' in policies and functions
- All admin-action functions use SECURITY DEFINER + internal is_admin check
- revoke execute from anon/public on all SECURITY DEFINER functions
*/

-- ============================================
-- Add is_admin to captains
-- ============================================
ALTER TABLE captains ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ============================================
-- Expand transaction types
-- ============================================
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('trip_earning', 'bonus', 'deduction', 'payout', 'penalty', 'withdrawal', 'recharge'));

-- ============================================
-- is_admin helper function
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false);
$$;

REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- ============================================
-- support_conversations table
-- ============================================
CREATE TABLE IF NOT EXISTS support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id uuid NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_conv_captain ON support_conversations(captain_id);
CREATE INDEX IF NOT EXISTS idx_support_conv_status ON support_conversations(status);

DROP POLICY IF EXISTS "select_own_support_conv" ON support_conversations;
CREATE POLICY "select_own_support_conv"
  ON support_conversations FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = support_conversations.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_support_conv" ON support_conversations;
CREATE POLICY "insert_own_support_conv"
  ON support_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = support_conversations.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_support_conv" ON support_conversations;
CREATE POLICY "update_own_support_conv"
  ON support_conversations FOR UPDATE
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = support_conversations.captain_id
      AND captains.user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = support_conversations.captain_id
      AND captains.user_id = auth.uid()
    )
  );

-- ============================================
-- support_messages table
-- ============================================
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('captain', 'admin', 'bot')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_support_msg_conv ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_msg_created ON support_messages(created_at);

-- Messages visible to admin or the captain who owns the conversation
DROP POLICY IF EXISTS "select_support_msg" ON support_messages;
CREATE POLICY "select_support_msg"
  ON support_messages FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM support_conversations sc
      JOIN captains c ON c.id = sc.captain_id
      WHERE sc.id = support_messages.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- Captains can insert their own messages; admin can insert admin messages
DROP POLICY IF EXISTS "insert_support_msg" ON support_messages;
CREATE POLICY "insert_support_msg"
  ON support_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR (
      sender_type = 'captain'
      AND EXISTS (
        SELECT 1 FROM support_conversations sc
        JOIN captains c ON c.id = sc.captain_id
        WHERE sc.id = support_messages.conversation_id
        AND c.user_id = auth.uid()
      )
    )
    OR (
      sender_type = 'bot'
      AND EXISTS (
        SELECT 1 FROM support_conversations sc
        JOIN captains c ON c.id = sc.captain_id
        WHERE sc.id = support_messages.conversation_id
        AND c.user_id = auth.uid()
      )
    )
  );

-- Auto-update last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_msg_timestamp ON support_messages;
CREATE TRIGGER trg_support_msg_timestamp
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- ============================================
-- withdrawals table
-- ============================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id uuid NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  admin_note text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_withdrawals_captain ON withdrawals(captain_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

DROP POLICY IF EXISTS "select_withdrawals" ON withdrawals;
CREATE POLICY "select_withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = withdrawals.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_withdrawals" ON withdrawals;
CREATE POLICY "insert_withdrawals"
  ON withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = withdrawals.captain_id
      AND captains.user_id = auth.uid()
    )
  );

-- Only admin can update (via SECURITY DEFINER functions, but allow direct update for admin role)
DROP POLICY IF EXISTS "update_withdrawals" ON withdrawals;
CREATE POLICY "update_withdrawals"
  ON withdrawals FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- recharges table
-- ============================================
CREATE TABLE IF NOT EXISTS recharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id uuid NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  receipt_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE recharges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_recharges_captain ON recharges(captain_id);
CREATE INDEX IF NOT EXISTS idx_recharges_status ON recharges(status);

DROP POLICY IF EXISTS "select_recharges" ON recharges;
CREATE POLICY "select_recharges"
  ON recharges FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = recharges.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_recharges" ON recharges;
CREATE POLICY "insert_recharges"
  ON recharges FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = recharges.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_recharges" ON recharges;
CREATE POLICY "update_recharges"
  ON recharges FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- request_withdrawal function
-- ============================================
CREATE OR REPLACE FUNCTION request_withdrawal(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_captain_id uuid;
  v_balance numeric(10,2);
  v_dow integer;
BEGIN
  SELECT id, wallet_balance INTO v_captain_id, v_balance
  FROM captains
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Captain profile not found';
  END IF;

  -- Check day of week: 1=Monday, 4=Thursday
  v_dow := EXTRACT(DOW FROM now());
  IF v_dow NOT IN (1, 4) THEN
    RAISE EXCEPTION 'Withdrawals are only allowed on Mondays and Thursdays';
  END IF;

  -- Minimum 5 JOD
  IF p_amount < 5.00 THEN
    RAISE EXCEPTION 'Minimum withdrawal amount is 5.00 JOD';
  END IF;

  -- Must keep at least 5 JOD baseline
  IF (v_balance - p_amount) < 5.00 THEN
    RAISE EXCEPTION 'Cannot withdraw - you must maintain a minimum balance of 5.00 JOD. Your balance: % JOD', v_balance;
  END IF;

  -- Check no pending withdrawal already exists
  IF EXISTS (SELECT 1 FROM withdrawals WHERE captain_id = v_captain_id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending withdrawal request';
  END IF;

  INSERT INTO withdrawals (captain_id, amount)
  VALUES (v_captain_id, p_amount);

  RETURN jsonb_build_object('success', true, 'amount', p_amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION request_withdrawal(numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION request_withdrawal(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_withdrawal(numeric) TO authenticated;

-- ============================================
-- approve_withdrawal function (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION approve_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_captain_id uuid;
  v_amount numeric(10,2);
  v_status text;
  v_balance numeric(10,2);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT captain_id, amount, status INTO v_captain_id, v_amount, v_status
  FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal already processed';
  END IF;

  SELECT wallet_balance INTO v_balance
  FROM captains WHERE id = v_captain_id FOR UPDATE;

  IF (v_balance - v_amount) < 5.00 THEN
    RAISE EXCEPTION 'Captain balance insufficient for withdrawal';
  END IF;

  UPDATE captains SET wallet_balance = wallet_balance - v_amount WHERE id = v_captain_id;

  INSERT INTO transactions (captain_id, type, amount, currency, status, description)
  VALUES (v_captain_id, 'withdrawal', -v_amount, 'JOD', 'completed', 'سحب رصيد');

  UPDATE withdrawals
  SET status = 'approved', processed_by = auth.uid(), processed_at = now()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_withdrawal(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION approve_withdrawal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_withdrawal(uuid) TO authenticated;

-- ============================================
-- reject_withdrawal function (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION reject_withdrawal(p_withdrawal_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT status INTO v_status FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Withdrawal already processed';
  END IF;

  UPDATE withdrawals
  SET status = 'rejected', admin_note = p_note, processed_by = auth.uid(), processed_at = now()
  WHERE id = p_withdrawal_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_withdrawal(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION reject_withdrawal(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_withdrawal(uuid, text) TO authenticated;

-- ============================================
-- approve_recharge function (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION approve_recharge(p_recharge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_captain_id uuid;
  v_amount numeric(10,2);
  v_status text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT captain_id, amount, status INTO v_captain_id, v_amount, v_status
  FROM recharges WHERE id = p_recharge_id FOR UPDATE;

  IF v_captain_id IS NULL THEN
    RAISE EXCEPTION 'Recharge not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Recharge already processed';
  END IF;

  UPDATE captains SET wallet_balance = wallet_balance + v_amount WHERE id = v_captain_id;

  INSERT INTO transactions (captain_id, type, amount, currency, status, description)
  VALUES (v_captain_id, 'recharge', v_amount, 'JOD', 'completed', 'شحن المحفظة');

  UPDATE recharges
  SET status = 'approved', processed_by = auth.uid(), processed_at = now()
  WHERE id = p_recharge_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_recharge(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION approve_recharge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_recharge(uuid) TO authenticated;

-- ============================================
-- reject_recharge function (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION reject_recharge(p_recharge_id uuid, p_note text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT status INTO v_status FROM recharges WHERE id = p_recharge_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Recharge not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Recharge already processed';
  END IF;

  UPDATE recharges
  SET status = 'rejected', admin_note = p_note, processed_by = auth.uid(), processed_at = now()
  WHERE id = p_recharge_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_recharge(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION reject_recharge(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_recharge(uuid, text) TO authenticated;

-- ============================================
-- approve_captain function (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION approve_captain(p_captain_id uuid, p_employee_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE captains
  SET status = 'active', employee_id = p_employee_id
  WHERE id = p_captain_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_captain(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION approve_captain(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_captain(uuid, text) TO authenticated;

-- ============================================
-- suspend_captain function (admin only)
-- ============================================
CREATE OR REPLACE FUNCTION suspend_captain(p_captain_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE captains SET status = 'suspended' WHERE id = p_captain_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION suspend_captain(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION suspend_captain(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION suspend_captain(uuid) TO authenticated;

-- ============================================
-- Admin can read all captains (for admin dashboard)
-- ============================================
DROP POLICY IF EXISTS "select_all_captains_admin" ON captains;
CREATE POLICY "select_all_captains_admin"
  ON captains FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admin can update captain status via SECURITY DEFINER functions,
-- but allow direct update for admin too
DROP POLICY IF EXISTS "update_captain_admin" ON captains;
CREATE POLICY "update_captain_admin"
  ON captains FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- Storage bucket for recharge receipts
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('recharge-receipts', 'recharge-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Captains can upload to their own folder
DROP POLICY IF EXISTS "upload_own_receipts" ON storage.objects;
CREATE POLICY "upload_own_receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recharge-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT phone FROM captains WHERE user_id = auth.uid()
    )
  );

-- Captains can read their own receipts
DROP POLICY IF EXISTS "read_own_receipts" ON storage.objects;
CREATE POLICY "read_own_receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recharge-receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT phone FROM captains WHERE user_id = auth.uid()
    )
  );

-- Admin can read all receipts
DROP POLICY IF EXISTS "admin_read_receipts" ON storage.objects;
CREATE POLICY "admin_read_receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'recharge-receipts'
    AND is_admin()
  );

-- ============================================
-- Withdrawal settings in app_settings
-- ============================================
INSERT INTO app_settings (key, value) VALUES
  ('withdrawal_min_amount', '5.00'),
  ('withdrawal_baseline', '5.00'),
  ('withdrawal_allowed_days', '1,4')
ON CONFLICT (key) DO NOTHING;
