-- App-level settings (key-value store for admin config)
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Google Photos OAuth tokens per user
CREATE TABLE IF NOT EXISTS google_photos_tokens (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL UNIQUE REFERENCES users(id),
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Google Photos import jobs
CREATE TABLE IF NOT EXISTS google_photos_imports (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  gallery_id      TEXT REFERENCES galleries(id) ON DELETE SET NULL,
  target_type     TEXT NOT NULL DEFAULT 'gallery',
  status          TEXT NOT NULL DEFAULT 'pending',
  total_items     INTEGER NOT NULL DEFAULT 0,
  imported_items  INTEGER NOT NULL DEFAULT 0,
  failed_items    INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
