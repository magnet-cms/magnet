-- Magnet CMS Initial Schema for PostgreSQL
-- Run this script to create the required tables

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  "group" VARCHAR(100) DEFAULT 'general',
  type VARCHAR(50) DEFAULT 'string',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (for Magnet CMS admin users, not Supabase Auth users)
-- Note: User schema has versioning: false, i18n: false, so no document columns
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- History table (for document versioning)
CREATE TABLE IF NOT EXISTS histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(36) NOT NULL,
  locale VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP,
  collection VARCHAR(255) NOT NULL,
  content_id VARCHAR(36) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data JSONB,
  created_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, locale, status)
);

-- Media table (for file uploads)
-- Note: Media schema has versioning: false, i18n: false, so no document columns
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL UNIQUE,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size DOUBLE PRECISION NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  folder VARCHAR(255),
  tags JSONB DEFAULT '[]'::jsonb,
  alt VARCHAR(255),
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  custom_fields JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by VARCHAR(255)
);

-- Articles table (example content type for supabase-example)
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id VARCHAR(36) NOT NULL,
  locale VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP,
  title TEXT,
  slug VARCHAR(255),
  content TEXT,
  summary TEXT,
  cover_image TEXT,
  author_id VARCHAR(36),
  category VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb,
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, locale, status)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_histories_content_id ON histories(content_id);
CREATE INDEX IF NOT EXISTS idx_histories_collection ON histories(collection);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
CREATE INDEX IF NOT EXISTS idx_media_folder ON media(folder);
CREATE INDEX IF NOT EXISTS idx_articles_document_id ON articles(document_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);

-- Insert default settings
INSERT INTO settings (key, value, "group", type) VALUES
  ('defaultLocale', 'en', 'i18n', 'string'),
  ('maxVersions', '10', 'versioning', 'number'),
  ('environments', '["draft", "published"]', 'content', 'json')
ON CONFLICT (key) DO NOTHING;
