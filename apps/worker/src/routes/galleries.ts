import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId } from '../utils/crypto';
import { isValidSlug, sanitizeSlug } from '../utils/validation';
import { mediaRoutes } from './media';

export const galleryRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// All gallery routes require auth
galleryRoutes.use('*', requireAuth);

// POST /galleries — Create gallery
galleryRoutes.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name?: string; slug?: string; config?: Record<string, unknown> }>().catch(() => ({} as { name?: string; slug?: string; config?: Record<string, unknown> }));

  const name = body.name?.trim();
  if (!name || name.length < 1 || name.length > 128) {
    return c.json({ error: 'Name is required (1-128 characters)' }, 400);
  }

  // Generate slug from name if not provided
  let slug = body.slug?.trim() || sanitizeSlug(name);
  if (!isValidSlug(slug)) {
    return c.json({ error: 'Invalid slug. Use lowercase letters, numbers, and hyphens.' }, 400);
  }

  // Check for slug uniqueness within user's galleries
  const existing = await c.get('db').prepare(
    `SELECT id FROM galleries WHERE user_id = ? AND slug = ? AND deleted_at IS NULL`
  )
    .bind(user.id, slug)
    .first();

  if (existing) {
    return c.json({ error: 'A gallery with this slug already exists' }, 409);
  }

  const id = generateId();
  const config = JSON.stringify(body.config || {});

  await c.get('db').prepare(
    `INSERT INTO galleries (id, user_id, name, slug, config) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, name, slug, config)
    .run();

  const gallery = await c.get('db').prepare(
    `SELECT id, name, slug, config, published, created_at, updated_at FROM galleries WHERE id = ?`
  )
    .bind(id)
    .first();

  return c.json({ data: { ...gallery, config: JSON.parse(gallery!.config as string) } }, 201);
});

// GET /galleries — List user's galleries
galleryRoutes.get('/', async (c) => {
  const user = c.get('user');
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
  const offset = (page - 1) * limit;

  const [galleries, countResult] = await Promise.all([
    c.get('db').prepare(
      `SELECT g.id, g.name, g.slug, g.config, g.published, g.created_at, g.updated_at,
              (SELECT COUNT(*) FROM media m WHERE m.gallery_id = g.id AND m.deleted_at IS NULL) as media_count
       FROM galleries g
       WHERE g.user_id = ? AND g.deleted_at IS NULL
       ORDER BY g.updated_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(user.id, limit, offset)
      .all(),
    c.get('db').prepare(
      `SELECT COUNT(*) as total FROM galleries WHERE user_id = ? AND deleted_at IS NULL`
    )
      .bind(user.id)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;
  const items = (galleries.results || []).map((g: Record<string, unknown>) => ({
    ...g,
    config: JSON.parse(g.config as string),
  }));

  return c.json({
    data: items,
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    },
  });
});

// GET /galleries/:id — Get single gallery
galleryRoutes.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const gallery = await c.get('db').prepare(
    `SELECT g.id, g.name, g.slug, g.config, g.published, g.created_at, g.updated_at,
            (SELECT COUNT(*) FROM media m WHERE m.gallery_id = g.id AND m.deleted_at IS NULL) as media_count
     FROM galleries g
     WHERE g.id = ? AND g.user_id = ? AND g.deleted_at IS NULL`
  )
    .bind(id, user.id)
    .first();

  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  return c.json({ data: { ...gallery, config: JSON.parse(gallery.config as string) } });
});

// PATCH /galleries/:id — Update gallery
galleryRoutes.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    slug?: string;
    config?: Record<string, unknown>;
    published?: boolean;
  }>().catch(() => ({} as { name?: string; slug?: string; config?: Record<string, unknown>; published?: boolean }));

  // Verify gallery exists and belongs to user
  const existing = await c.get('db').prepare(
    `SELECT id FROM galleries WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
  )
    .bind(id, user.id)
    .first();

  if (!existing) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  // Build dynamic update
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 1 || name.length > 128) {
      return c.json({ error: 'Name must be 1-128 characters' }, 400);
    }
    updates.push('name = ?');
    values.push(name);
  }

  if (body.slug !== undefined) {
    const slug = body.slug.trim();
    if (!isValidSlug(slug)) {
      return c.json({ error: 'Invalid slug' }, 400);
    }
    // Check uniqueness (excluding self)
    const slugConflict = await c.get('db').prepare(
      `SELECT id FROM galleries WHERE user_id = ? AND slug = ? AND id != ? AND deleted_at IS NULL`
    )
      .bind(user.id, slug, id)
      .first();
    if (slugConflict) {
      return c.json({ error: 'A gallery with this slug already exists' }, 409);
    }
    updates.push('slug = ?');
    values.push(slug);
  }

  if (body.config !== undefined) {
    updates.push('config = ?');
    values.push(JSON.stringify(body.config));
  }

  if (body.published !== undefined) {
    updates.push('published = ?');
    values.push(body.published ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  values.push(id, user.id);

  await c.get('db').prepare(
    `UPDATE galleries SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  // Fetch and return updated gallery
  const gallery = await c.get('db').prepare(
    `SELECT g.id, g.name, g.slug, g.config, g.published, g.created_at, g.updated_at,
            (SELECT COUNT(*) FROM media m WHERE m.gallery_id = g.id AND m.deleted_at IS NULL) as media_count
     FROM galleries g
     WHERE g.id = ? AND g.user_id = ?`
  )
    .bind(id, user.id)
    .first();

  return c.json({ data: { ...gallery, config: JSON.parse(gallery!.config as string) } });
});

// DELETE /galleries/:id — Soft-delete gallery
galleryRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const existing = await c.get('db').prepare(
    `SELECT id FROM galleries WHERE id = ? AND user_id = ? AND deleted_at IS NULL`
  )
    .bind(id, user.id)
    .first();

  if (!existing) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  await c.get('db').prepare(
    `UPDATE galleries SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  )
    .bind(id)
    .run();

  return c.json({ message: 'Gallery deleted' });
});

// Mount media routes under galleries
galleryRoutes.route('/:id/media', mediaRoutes);
