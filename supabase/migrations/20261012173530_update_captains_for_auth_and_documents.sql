/*
# Update captains schema for auth flow and document uploads

## Overview
This migration modifies the `captains` table to support the registration and approval workflow:
- Makes `employee_id` nullable (admin assigns it during approval)
- Adds document image URL columns for ID, driver license, and vehicle license uploads
- Creates a storage bucket `captain-documents` for storing document images

## Modified Tables

### captains
- `employee_id` — changed from NOT NULL to nullable (admin assigns during approval)
- `id_document_url` (text, nullable) — URL to uploaded ID document image
- `license_document_url` (text, nullable) — URL to uploaded driver license image
- `vehicle_license_document_url` (text, nullable) — URL to uploaded vehicle license image
- `full_name` (text, nullable) — captain's full name (Arabic), replaces separate first/last name entry on registration

## New Storage
- Bucket `captain-documents` — private bucket for captain document images
- Storage policies: authenticated users can upload/read/update/delete only their own documents (folder = their user_id)

## Security
- RLS policies on storage bucket scoped to authenticated users, path-based ownership check
- Existing table RLS policies remain unchanged
*/

-- Make employee_id nullable (admin assigns during approval)
ALTER TABLE captains ALTER COLUMN employee_id DROP NOT NULL;

-- Add full_name column for registration
ALTER TABLE captains ADD COLUMN IF NOT EXISTS full_name text;

-- Add document URL columns
ALTER TABLE captains ADD COLUMN IF NOT EXISTS id_document_url text;
ALTER TABLE captains ADD COLUMN IF NOT EXISTS license_document_url text;
ALTER TABLE captains ADD COLUMN IF NOT EXISTS vehicle_license_document_url text;

-- ============================================
-- Storage bucket for captain documents
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('captain-documents', 'captain-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own documents (folder = user_id)
DROP POLICY IF EXISTS "captains_upload_own_docs" ON storage.objects;
CREATE POLICY "captains_upload_own_docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'captain-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "captains_read_own_docs" ON storage.objects;
CREATE POLICY "captains_read_own_docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'captain-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "captains_update_own_docs" ON storage.objects;
CREATE POLICY "captains_update_own_docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'captain-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'captain-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "captains_delete_own_docs" ON storage.objects;
CREATE POLICY "captains_delete_own_docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'captain-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
