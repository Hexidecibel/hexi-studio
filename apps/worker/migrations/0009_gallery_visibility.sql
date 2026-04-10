ALTER TABLE galleries ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private';
CREATE UNIQUE INDEX idx_galleries_public_slug ON galleries(slug) WHERE visibility = 'public' AND deleted_at IS NULL;
