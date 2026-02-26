import { Hono } from 'hono';
import type { Env } from '../types';
import type { AuthVariables } from '../middleware/auth';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { generateId } from '../utils/crypto';
import { isAllowedMediaType, getMediaType, getFileExtension } from '../utils/validation';

const library = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// All library routes require auth
library.use('*', requireAuth);

// POST /library/upload - Get upload URL for library media
library.post('/upload', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }), async (c) => {
  const user = c.get('user');
  const { filename, contentType, fileSize } = await c.req.json<{
    filename: string;
    contentType: string;
    fileSize: number;
  }>();

  if (!filename || !contentType || !fileSize) {
    return c.json({ error: 'Missing required fields: filename, contentType, fileSize' }, 400);
  }

  if (!isAllowedMediaType(contentType)) {
    return c.json({ error: 'Unsupported file type' }, 400);
  }

  const maxSize = contentType.startsWith('image/') ? 50 * 1024 * 1024 : 500 * 1024 * 1024;
  if (fileSize > maxSize) {
    return c.json({ error: `File too large. Max ${maxSize / 1024 / 1024}MB` }, 400);
  }

  // Check storage limit
  if (user.storageUsedBytes + fileSize > user.storageLimitBytes) {
    return c.json({ error: 'Storage limit exceeded' }, 400);
  }

  const mediaId = generateId();
  const ext = getFileExtension(filename);
  const r2Key = `tenants/${user.id}/library/${mediaId}/original.${ext}`;
  const mediaType = getMediaType(contentType);

  // Create pending record
  await c.env.DB.prepare(
    `INSERT INTO library_media (id, user_id, filename, content_type, file_size, r2_key, media_type, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).bind(mediaId, user.id, filename, contentType, fileSize, r2Key, mediaType).run();

  return c.json({
    data: {
      mediaId,
      r2Key,
      contentType,
      maxSize,
    }
  }, 201);
});

// PUT /library/:mediaId/upload - Upload file binary
library.put('/:mediaId/upload', async (c) => {
  const user = c.get('user');
  const mediaId = c.req.param('mediaId');

  const record = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(mediaId, user.id).first();

  if (!record) {
    return c.json({ error: 'Media not found' }, 404);
  }

  const body = await c.req.arrayBuffer();
  await c.env.MEDIA_BUCKET.put(record.r2_key as string, body, {
    httpMetadata: { contentType: record.content_type as string },
  });

  // Update status and storage
  await c.env.DB.prepare(
    "UPDATE library_media SET status = 'ready', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  ).bind(mediaId).run();

  await c.env.DB.prepare(
    'UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?'
  ).bind(record.file_size, user.id).run();

  return c.json({ data: { id: mediaId, status: 'ready' } });
});

// POST /library/confirm - Confirm upload with metadata
library.post('/confirm', async (c) => {
  const user = c.get('user');
  const { mediaId, width, height, alt, title, description, tags } = await c.req.json<{
    mediaId: string;
    width?: number;
    height?: number;
    alt?: string;
    title?: string;
    description?: string;
    tags?: string[];
  }>();

  if (!mediaId) {
    return c.json({ error: 'Missing mediaId' }, 400);
  }

  const record = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(mediaId, user.id).first();

  if (!record) {
    return c.json({ error: 'Media not found' }, 404);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (width !== undefined) { updates.push('width = ?'); values.push(width); }
  if (height !== undefined) { updates.push('height = ?'); values.push(height); }
  if (alt !== undefined) { updates.push('alt = ?'); values.push(alt); }
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }

  if (updates.length > 0) {
    updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
    const sql = `UPDATE library_media SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
    values.push(mediaId, user.id);
    await c.env.DB.prepare(sql).bind(...values).run();
  }

  const updated = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ?'
  ).bind(mediaId, user.id).first();

  return c.json({ data: updated });
});

// GET /library - List library media (paginated, filterable by tags)
library.get('/', async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100);
  const tag = c.req.query('tag');
  const offset = (page - 1) * limit;

  let countSql = "SELECT COUNT(*) as total FROM library_media WHERE user_id = ? AND status = 'ready' AND deleted_at IS NULL";
  let listSql = "SELECT * FROM library_media WHERE user_id = ? AND status = 'ready' AND deleted_at IS NULL";
  const bindings: unknown[] = [user.id];

  if (tag) {
    const tagFilter = ` AND tags LIKE ?`;
    countSql += tagFilter;
    listSql += tagFilter;
    bindings.push(`%"${tag}"%`);
  }

  listSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

  const countResult = await c.env.DB.prepare(countSql).bind(...bindings).first();
  const total = (countResult?.total as number) || 0;

  const listBindings = [...bindings, limit, offset];
  const items = await c.env.DB.prepare(listSql).bind(...listBindings).all();

  return c.json({
    data: items.results,
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    }
  });
});

// GET /library/:id - Get single library item
library.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const item = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(id, user.id).first();

  if (!item) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ data: item });
});

// PATCH /library/:id - Update library item metadata
library.patch('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<{
    alt?: string;
    title?: string;
    description?: string;
    tags?: string[];
  }>();

  const item = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(id, user.id).first();

  if (!item) {
    return c.json({ error: 'Not found' }, 404);
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.alt !== undefined) { updates.push('alt = ?'); values.push(body.alt); }
  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(body.tags)); }

  if (updates.length === 0) {
    return c.json({ data: item });
  }

  updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  const sql = `UPDATE library_media SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`;
  values.push(id, user.id);
  await c.env.DB.prepare(sql).bind(...values).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).first();

  return c.json({ data: updated });
});

// DELETE /library/:id - Soft-delete library item
library.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const item = await c.env.DB.prepare(
    'SELECT * FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  ).bind(id, user.id).first();

  if (!item) {
    return c.json({ error: 'Not found' }, 404);
  }

  // Soft-delete
  await c.env.DB.prepare(
    "UPDATE library_media SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  ).bind(id).run();

  // Delete from R2
  try {
    await c.env.MEDIA_BUCKET.delete(item.r2_key as string);
  } catch (err) {
    console.error('Failed to delete from R2:', err);
  }

  // Reduce storage
  await c.env.DB.prepare(
    'UPDATE users SET storage_used_bytes = MAX(0, storage_used_bytes - ?) WHERE id = ?'
  ).bind(item.file_size, user.id).run();

  return c.json({ message: 'Media deleted' });
});

export { library as libraryRoutes };
