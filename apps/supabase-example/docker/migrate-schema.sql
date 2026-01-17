-- Migration script to fix media and users tables to match schema definitions

-- Fix media table: remove document columns, add missing columns
ALTER TABLE IF EXISTS media
  DROP COLUMN IF EXISTS document_id,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS published_at,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS caption;

-- Add missing columns to media table if they don't exist
ALTER TABLE IF EXISTS media
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS size DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS path TEXT,
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS folder VARCHAR(255),
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS alt VARCHAR(255),
  ADD COLUMN IF NOT EXISTS width DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Update existing media rows to have required fields (if any exist)
UPDATE media SET
  original_filename = COALESCE(original_filename, filename),
  mime_type = COALESCE(mime_type, 'application/octet-stream'),
  size = COALESCE(size, 0),
  path = COALESCE(path, ''),
  url = COALESCE(url, '')
WHERE original_filename = '' OR mime_type IS NULL OR size IS NULL OR path IS NULL OR url IS NULL;

-- Make required columns NOT NULL after setting defaults
ALTER TABLE IF EXISTS media
  ALTER COLUMN original_filename SET NOT NULL,
  ALTER COLUMN mime_type SET NOT NULL,
  ALTER COLUMN size SET NOT NULL,
  ALTER COLUMN path SET NOT NULL,
  ALTER COLUMN url SET NOT NULL;

-- Fix users table: remove document columns
ALTER TABLE IF EXISTS users
  DROP COLUMN IF EXISTS document_id,
  DROP COLUMN IF EXISTS locale,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS published_at;

-- Ensure users table has correct column types
ALTER TABLE IF EXISTS users
  ALTER COLUMN password SET DATA TYPE TEXT,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Drop old indexes that reference removed columns
DROP INDEX IF EXISTS idx_media_document_id;
DROP INDEX IF EXISTS idx_users_document_id;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);

-- Remove unique constraint on document_id, locale, status from media if exists
ALTER TABLE IF EXISTS media DROP CONSTRAINT IF EXISTS media_document_id_locale_status_key;

-- Fix articles.tags column: change from TEXT[] to JSONB to match Drizzle array mapping
ALTER TABLE IF EXISTS articles DROP COLUMN IF EXISTS tags;
ALTER TABLE IF EXISTS articles ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
