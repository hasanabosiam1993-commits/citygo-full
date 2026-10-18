/*
# Create captains and transactions tables for CityGo

## Overview
This migration creates the core database schema for CityGo, a captain (driver) management PWA.
It establishes two tables: `captains` for driver profiles and `transactions` for financial records.

## New Tables

### 1. captains
Stores captain (driver) profile information including phone, status, employee ID, and vehicle details.
- `id` (uuid, primary key, defaults to gen_random_uuid())
- `user_id` (uuid, foreign key to auth.users, unique) — links to Supabase auth account
- `phone` (text, unique, not null) — captain's phone number for contact and login
- `password_hash` (text, nullable) — reserved for password hash if using custom auth (Supabase auth handles this by default)
- `employee_id` (text, unique, not null) — internal employee/contractor identifier
- `status` (text, not null, default 'pending') — captain status: 'pending', 'active', 'suspended', 'inactive'
- `first_name` (text, nullable) — captain's first name (Arabic)
- `last_name` (text, nullable) — captain's last name (Arabic)
- `vehicle_make` (text, nullable) — vehicle manufacturer (e.g., Toyota, Hyundai)
- `vehicle_model` (text, nullable) — vehicle model (e.g., Camry, Elantra)
- `vehicle_year` (integer, nullable) — vehicle manufacturing year
- `vehicle_plate` (text, nullable) — license plate number
- `vehicle_color` (text, nullable) — vehicle color (Arabic)
- `vehicle_type` (text, nullable) — vehicle type: 'sedan', 'van', 'suv', 'bus'
- `license_number` (text, nullable) — driver's license number
- `license_expiry` (date, nullable) — driver's license expiration date
- `is_online` (boolean, default false) — whether captain is currently online/available
- `rating` (numeric, default 0) — captain rating (0.0 to 5.0)
- `total_trips` (integer, default 0) — total completed trips
- `created_at` (timestamptz, default now()) — record creation timestamp
- `updated_at` (timestamptz, default now()) — record last update timestamp

### 2. transactions
Stores financial transactions for each captain (trips, bonuses, deductions, payouts).
- `id` (uuid, primary key, defaults to gen_random_uuid())
- `captain_id` (uuid, foreign key to captains.id, not null) — the captain this transaction belongs to
- `type` (text, not null) — transaction type: 'trip_earning', 'bonus', 'deduction', 'payout', 'penalty'
- `amount` (numeric(10,2), not null) — transaction amount (positive for credits, negative for debits)
- `currency` (text, default 'SAR') — currency code
- `status` (text, default 'completed') — transaction status: 'pending', 'completed', 'failed', 'cancelled'
- `description` (text, nullable) — transaction description (Arabic)
- `trip_ref` (text, nullable) — reference to external trip ID if applicable
- `metadata` (jsonb, default '{}') — additional flexible metadata
- `created_at` (timestamptz, default now()) — transaction creation timestamp

## Indexes
- `idx_captains_user_id` — index on captains.user_id for fast auth lookups
- `idx_captains_phone` — index on captains.phone for login lookups
- `idx_captains_employee_id` — index on captains.employee_id for internal lookups
- `idx_captains_status` — index on captains.status for filtering by status
- `idx_transactions_captain_id` — index on transactions.captain_id for per-captain queries
- `idx_transactions_created_at` — index on transactions.created_at for date-range queries
- `idx_transactions_type` — index on transactions.type for filtering by type

## Security (RLS)
- RLS enabled on both `captains` and `transactions`.
- `captains`: authenticated users can view, insert, update, and delete only their own captain record (matched by user_id = auth.uid()).
- `transactions`: authenticated users can view their own transactions (via captain ownership check). Insert/update/delete scoped to the captain's own user_id.

## Important Notes
1. The `captains` table links to `auth.users` via `user_id` with `DEFAULT auth.uid()` so inserts from authenticated clients work even when user_id is omitted.
2. The `transactions` table uses a subquery ownership check against `captains` to verify the requesting user owns the captain record before allowing access.
3. `updated_at` on captains is maintained via a trigger that sets it to `now()` on every UPDATE.
4. This app requires authentication — all policies are scoped to `TO authenticated`.
*/

-- ============================================
-- captains table
-- ============================================
CREATE TABLE IF NOT EXISTS captains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  phone text UNIQUE NOT NULL,
  password_hash text,
  employee_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  first_name text,
  last_name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_plate text,
  vehicle_color text,
  vehicle_type text CHECK (vehicle_type IN ('sedan', 'van', 'suv', 'bus')),
  license_number text,
  license_expiry date,
  is_online boolean NOT NULL DEFAULT false,
  rating numeric(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_trips integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE captains ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_captains_user_id ON captains(user_id);
CREATE INDEX IF NOT EXISTS idx_captains_phone ON captains(phone);
CREATE INDEX IF NOT EXISTS idx_captains_employee_id ON captains(employee_id);
CREATE INDEX IF NOT EXISTS idx_captains_status ON captains(status);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_captain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_captains_updated_at ON captains;
CREATE TRIGGER trg_captains_updated_at
  BEFORE UPDATE ON captains
  FOR EACH ROW
  EXECUTE FUNCTION update_captain_updated_at();

-- RLS Policies for captains
DROP POLICY IF EXISTS "select_own_captain" ON captains;
CREATE POLICY "select_own_captain"
  ON captains FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_captain" ON captains;
CREATE POLICY "insert_own_captain"
  ON captains FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_captain" ON captains;
CREATE POLICY "update_own_captain"
  ON captains FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_captain" ON captains;
CREATE POLICY "delete_own_captain"
  ON captains FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id uuid NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('trip_earning', 'bonus', 'deduction', 'payout', 'penalty')),
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'SAR',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  description text,
  trip_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_captain_id ON transactions(captain_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- RLS Policies for transactions (ownership via captain subquery)
DROP POLICY IF EXISTS "select_own_transactions" ON transactions;
CREATE POLICY "select_own_transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = transactions.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = transactions.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = transactions.captain_id
      AND captains.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = transactions.captain_id
      AND captains.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = transactions.captain_id
      AND captains.user_id = auth.uid()
    )
  );
