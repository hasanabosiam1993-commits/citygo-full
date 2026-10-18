/*
# Create trips table and add wallet_balance to captains

## Overview
This migration adds a `trips` table for captain-created trips/orders and a `wallet_balance` column to `captains` for the live wallet widget.

## Modified Tables

### captains
- `wallet_balance` (numeric(10,2), default 5.00) — captain's current wallet balance in JOD. Defaults to 5.00 JOD as a starting bonus.

## New Tables

### trips
Stores trips/orders created by captains with pricing, route, capacity, scheduling, and customer info.
- `id` (uuid, primary key)
- `captain_id` (uuid, FK to captains.id, not null) — the captain who created this trip
- `price` (numeric(10,2), not null) — trip price in JOD
- `origin_governorate` (text, not null) — origin governorate (Jordan)
- `origin_area` (text, not null) — origin area/neighborhood
- `destination_governorate` (text, not null) — destination governorate
- `destination_area` (text, not null) — destination area/neighborhood
- `capacity_type` (text, not null) — '1_passenger', '2_passengers', '3_passengers', 'full_car', 'orders'
- `time_type` (text, not null) — 'urgent' or 'scheduled'
- `scheduled_date` (date, nullable) — date for scheduled trips
- `scheduled_time` (time, nullable) — time for scheduled trips
- `customer_phone` (text, not null) — customer's phone number
- `location_link` (text, nullable) — Google Maps or other location link
- `status` (text, default 'active') — 'active', 'completed', 'cancelled'
- `created_at` (timestamptz, default now())

## Indexes
- `idx_trips_captain_id` — index on trips.captain_id
- `idx_trips_status` — index on trips.status
- `idx_trips_created_at` — index on trips.created_at DESC

## Security (RLS)
- RLS enabled on `trips`.
- Authenticated users can CRUD only their own trips (via captain ownership check, same pattern as transactions).
*/

-- Add wallet_balance to captains (default 5.00 JOD starting bonus)
ALTER TABLE captains ADD COLUMN IF NOT EXISTS wallet_balance numeric(10,2) NOT NULL DEFAULT 5.00;

-- ============================================
-- trips table
-- ============================================
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id uuid NOT NULL REFERENCES captains(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  origin_governorate text NOT NULL,
  origin_area text NOT NULL,
  destination_governorate text NOT NULL,
  destination_area text NOT NULL,
  capacity_type text NOT NULL CHECK (capacity_type IN ('1_passenger', '2_passengers', '3_passengers', 'full_car', 'orders')),
  time_type text NOT NULL CHECK (time_type IN ('urgent', 'scheduled')),
  scheduled_date date,
  scheduled_time time,
  customer_phone text NOT NULL,
  location_link text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trips_captain_id ON trips(captain_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

-- RLS Policies for trips (ownership via captain subquery)
DROP POLICY IF EXISTS "select_own_trips" ON trips;
CREATE POLICY "select_own_trips"
  ON trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
  );

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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captains
      WHERE captains.id = trips.captain_id
      AND captains.user_id = auth.uid()
    )
  );

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
