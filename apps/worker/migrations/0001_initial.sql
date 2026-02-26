-- Users (tenants)
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  name                TEXT,
  plan                TEXT NOT NULL DEFAULT 'free',
  storage_used_bytes  INTEGER NOT NULL DEFAULT 0,
  storage_limit_bytes INTEGER NOT NULL DEFAULT 104857600,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Magic link tokens
CREATE TABLE magic_link_tokens (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Sessions
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Galleries
CREATE TABLE galleries (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  config      TEXT NOT NULL DEFAULT '{}',
  published   INTEGER NOT NULL DEFAULT 0,
  deleted_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(user_id, slug)
);

-- Media items
CREATE TABLE media (
  id              TEXT PRIMARY KEY,
  gallery_id      TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  file_size       INTEGER NOT NULL,
  r2_key          TEXT NOT NULL,
  media_type      TEXT NOT NULL DEFAULT 'image',
  width           INTEGER,
  height          INTEGER,
  alt             TEXT NOT NULL DEFAULT '',
  title           TEXT,
  description     TEXT,
  duration        REAL,
  poster_r2_key   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  blur_data_url   TEXT,
  metadata        TEXT DEFAULT '{}',
  deleted_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_galleries_user_id ON galleries(user_id);
CREATE INDEX idx_galleries_slug ON galleries(user_id, slug);
CREATE INDEX idx_media_gallery_id ON media(gallery_id);
CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_media_sort_order ON media(gallery_id, sort_order);
