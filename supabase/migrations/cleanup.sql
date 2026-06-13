-- ============================================================
-- DATABASE CLEANUP SCRIPT
-- Drops everything created by migrations/final_schema.sql
-- and deletes all users, so you can rebuild from scratch.
--
-- WARNING: This is destructive. All tickets, replies,
-- profiles, and user accounts will be permanently deleted.
--
-- Usage:
--   1. Run this file in the Supabase SQL Editor
--   2. Empty the "ticket-images" bucket via the dashboard
--      (Storage > ticket-images > select all > delete);
--      direct SQL deletes on storage tables are not allowed
--   3. Re-run migrations/final_schema.sql to rebuild
-- ============================================================

-- Drop app tables (CASCADE removes their policies, triggers, and indexes)
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS severity_level;
DROP TYPE IF EXISTS ticket_status;

-- Drop the updated_at trigger function
DROP FUNCTION IF EXISTS handle_updated_at();

-- Drop storage policies (these live on storage.objects, not app tables)
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- Delete all auth users (including orphaned ones from failed registrations)
DELETE FROM auth.users;

-- Refresh the API schema cache
NOTIFY pgrst, 'reload schema';
