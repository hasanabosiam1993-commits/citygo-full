/*
# Fix security and currency issues

## Overview
Fixes three issues found in the existing schema:
1. accept_trip and undo_accept_trip functions were still executable by anon role despite the REVOKE in the previous migration
2. app_settings table had full INSERT/UPDATE/DELETE grants to anon role
3. transactions table defaulted to 'SAR' currency instead of 'JOD'

## Changes
- Re-revoke EXECUTE on accept_trip and undo_accept_trip from anon
- Revoke INSERT/UPDATE/DELETE from anon on app_settings
- Change transactions.currency default from 'SAR' to 'JOD'
*/

-- Re-revoke function execution from anon
REVOKE EXECUTE ON FUNCTION accept_trip(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION undo_accept_trip(uuid) FROM anon;

-- Lock down app_settings: anon gets no access, authenticated gets SELECT only
REVOKE INSERT, UPDATE, DELETE ON app_settings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON app_settings FROM authenticated;

-- Fix currency default on transactions
ALTER TABLE transactions ALTER COLUMN currency SET DEFAULT 'JOD';
