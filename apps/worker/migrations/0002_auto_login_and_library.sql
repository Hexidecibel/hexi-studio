-- Migration 0002: Auto-Login Tokens + Media Library
-- Adds reusable login tokens and standalone media library

-- Auto-login tokens: reusable tokens that create sessions without magic link emails
CREATE TABLE auto_login_tokens (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL DEFAULT '',
  expires_at   TEXT,
  last_used_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_auto_login_token_hash ON auto_login_tokens(token_hash);

-- Library media: standalone images/files not attached to any gallery
-- Used for artist profile photos, hero banners, logos, etc.
CREATE TABLE library_media (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  content_type  TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  r2_key        TEXT NOT NULL,
  media_type    TEXT NOT NULL DEFAULT 'image',
  width         INTEGER,
  height        INTEGER,
  alt           TEXT NOT NULL DEFAULT '',
  title         TEXT,
  description   TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'pending',
  blur_data_url TEXT,
  metadata      TEXT DEFAULT '{}',
  deleted_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_library_media_user ON library_media(user_id);
