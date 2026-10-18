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
