import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import { rateLimit } from '../middleware/rateLimit';
import { generateId } from '../utils/crypto';
import { isAllowedMediaType, getMediaType, getFileExtension } from '../utils/validation';
import type { DatabaseAdapter } from '../adapters/database';

export const mediaRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// Rate limit uploads: 30 per minute
mediaRoutes.use('/upload-url', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }));

/**
 * Helper to get gallery ID and verify ownership.
 */
async function getGalleryForUser(
  db: DatabaseAdapter,
  galleryId: string,
  userId: string
): Promise<{ id: string } | null> {
  return db
    .prepare('SELECT id FROM galleries WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
    .bind(galleryId, userId)
    .first<{ id: string }>();
}

/**
 * Extract gallery ID from the URL path.
 * URL pattern: /api/v1/galleries/{galleryId}/media/...
 */
function extractGalleryId(url: string): string | null {
  const pathname = new URL(url).pathname;
  const pathParts = pathname.split('/');
  const galleriesIdx = pathParts.indexOf('galleries');
  if (galleriesIdx === -1 || galleriesIdx + 1 >= pathParts.length) {
    return null;
  }
  return pathParts[galleriesIdx + 1] || null;
}

// POST /galleries/:id/media/upload-url — Get R2 upload details
mediaRoutes.post('/upload-url', async (c) => {
  const user = c.get('user');
  const galleryId = extractGalleryId(c.req.url);

  if (!galleryId) {
    return c.json({ error: 'Gallery ID is required' }, 400);
  }

  const gallery = await getGalleryForUser(c.get('db'), galleryId, user.id);
  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const body = await c.req.json<{
    filename?: string;
    contentType?: string;
    fileSize?: number;
  }>().catch(() => ({} as Record<string, undefined>));

  const { filename, contentType, fileSize } = body;

  if (!filename || !contentType || !fileSize) {
    return c.json({ error: 'filename, contentType, and fileSize are required' }, 400);
  }

  if (!isAllowedMediaType(contentType)) {
    return c.json({ error: 'Unsupported media type' }, 400);
  }

  // Check storage limit
  if (user.storageUsedBytes + fileSize > user.storageLimitBytes) {
    return c.json({ error: 'Storage limit exceeded' }, 413);
  }

  // File size limits: 50MB for images, 500MB for videos
  const mediaType = getMediaType(contentType);
  const maxSize = mediaType === 'video' ? 500 * 1024 * 1024 : 50 * 1024 * 1024;
  if (fileSize > maxSize) {
    return c.json({
      error: `File too large. Max ${mediaType === 'video' ? '500MB' : '50MB'} for ${mediaType}s.`,
    }, 413);
  }

  const mediaId = generateId();
  const ext = getFileExtension(filename) || 'bin';
  const r2Key = `tenants/${user.id}/media/${mediaId}/original.${ext}`;

  return c.json({
    data: {
      mediaId,
      r2Key,
      uploadUrl: `/api/v1/galleries/${galleryId}/media/${mediaId}/upload`,
      contentType,
      maxSize,
    },
  });
});

// PUT /galleries/:id/media/:mediaId/upload — Direct file upload to R2
mediaRoutes.put('/:mediaId/upload', async (c) => {
  const user = c.get('user');
  const galleryId = extractGalleryId(c.req.url);
  const mediaId = c.req.param('mediaId');

  if (!galleryId || !mediaId) {
    return c.json({ error: 'Gallery ID and media ID are required' }, 400);
  }

  const gallery = await getGalleryForUser(c.get('db'), galleryId, user.id);
  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const contentType = c.req.header('Content-Type') || 'application/octet-stream';
  if (!isAllowedMediaType(contentType)) {
    return c.json({ error: 'Unsupported media type' }, 400);
  }

  const body = await c.req.arrayBuffer();
  const fileSize = body.byteLength;

  // Check storage limit
  if (user.storageUsedBytes + fileSize > user.storageLimitBytes) {
    return c.json({ error: 'Storage limit exceeded' }, 413);
  }

  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const r2Key = `tenants/${user.id}/media/${mediaId}/original.${ext}`;

  // Upload to R2
  await c.get('storage').put(r2Key, body, {
    httpMetadata: { contentType },
  });

  // Analyze image quality (non-fatal)
  let metadata = '{}';
  if (contentType.startsWith('image/')) {
    try {
      const transformer = c.get('imageTransformer');
      if (transformer.analyze) {
        const analysis = await transformer.analyze(body);
        if (analysis) {
          metadata = JSON.stringify({
            qualityScore: analysis.qualityScore,
            entropy: analysis.entropy,
          });
        }
      }
    } catch (err) {
      console.error('Image analysis failed:', err);
    }
  }

  // Get next sort order
  const maxOrder = await c.get('db').prepare(
    'SELECT MAX(sort_order) as max_order FROM media WHERE gallery_id = ? AND deleted_at IS NULL'
  )
    .bind(galleryId)
    .first<{ max_order: number | null }>();

  const sortOrder = (maxOrder?.max_order ?? -1) + 1;

  // Insert media record
  const filename = `original.${ext}`;
  const mediaType = getMediaType(contentType);

  await c.get('db').prepare(
    `INSERT INTO media (id, gallery_id, user_id, filename, content_type, file_size, r2_key, media_type, sort_order, status, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`
  )
    .bind(mediaId, galleryId, user.id, filename, contentType, fileSize, r2Key, mediaType, sortOrder, metadata)
    .run();

  // Update user storage
  await c.get('db').prepare(
    'UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?'
  )
    .bind(fileSize, user.id)
    .run();

  const media = await c.get('db').prepare('SELECT * FROM media WHERE id = ? AND user_id = ?')
    .bind(mediaId, user.id)
    .first();

  return c.json({ data: media }, 201);
});

// POST /galleries/:id/media/confirm — Confirm upload and store metadata
mediaRoutes.post('/confirm', async (c) => {
  const user = c.get('user');
  const galleryId = extractGalleryId(c.req.url);

  if (!galleryId) {
    return c.json({ error: 'Gallery ID is required' }, 400);
  }

  const gallery = await getGalleryForUser(c.get('db'), galleryId, user.id);
  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const body = await c.req.json<{
    mediaId?: string;
    width?: number;
    height?: number;
    alt?: string;
    title?: string;
    description?: string;
    duration?: number;
  }>().catch(() => ({} as Record<string, undefined>));

  if (!body.mediaId) {
    return c.json({ error: 'mediaId is required' }, 400);
  }

  // Verify media belongs to this gallery and user
  const media = await c.get('db').prepare(
    'SELECT id, status FROM media WHERE id = ? AND gallery_id = ? AND user_id = ? AND deleted_at IS NULL'
  )
    .bind(body.mediaId, galleryId, user.id)
    .first<{ id: string; status: string }>();

  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }

  // Update media with additional metadata
  const updates: string[] = ["status = 'ready'"];
  const values: unknown[] = [];

  if (body.width !== undefined) { updates.push('width = ?'); values.push(body.width); }
  if (body.height !== undefined) { updates.push('height = ?'); values.push(body.height); }
  if (body.alt !== undefined) { updates.push('alt = ?'); values.push(body.alt); }
  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.duration !== undefined) { updates.push('duration = ?'); values.push(body.duration); }

  updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  values.push(body.mediaId);

  await c.get('db').prepare(
    `UPDATE media SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...values)
    .run();

  const updated = await c.get('db').prepare('SELECT * FROM media WHERE id = ? AND user_id = ?')
    .bind(body.mediaId, user.id)
    .first();

  return c.json({ data: updated });
});

// GET /galleries/:id/media — List media (paginated)
mediaRoutes.get('/', async (c) => {
  const user = c.get('user');
  const galleryId = extractGalleryId(c.req.url);

  if (!galleryId) {
    return c.json({ error: 'Gallery ID is required' }, 400);
  }

  const gallery = await getGalleryForUser(c.get('db'), galleryId, user.id);
  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
  const offset = (page - 1) * limit;

  const [items, countResult] = await Promise.all([
    c.get('db').prepare(
      `SELECT * FROM media
       WHERE gallery_id = ? AND user_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC
       LIMIT ? OFFSET ?`
    )
      .bind(galleryId, user.id, limit, offset)
      .all(),
    c.get('db').prepare(
      'SELECT COUNT(*) as total FROM media WHERE gallery_id = ? AND user_id = ? AND deleted_at IS NULL'
    )
      .bind(galleryId, user.id)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;

  return c.json({
    data: items.results || [],
    pagination: {
      page,
      limit,
      total,
      hasMore: offset + limit < total,
    },
  });
});

// PATCH /galleries/:id/media/:mid — Update media metadata
mediaRoutes.patch('/:mid', async (c) => {
  const user = c.get('user');
  const mid = c.req.param('mid');
  const galleryId = extractGalleryId(c.req.url);

  if (!galleryId || !mid) {
    return c.json({ error: 'Gallery ID and media ID are required' }, 400);
  }

  // Verify ownership
  const media = await c.get('db').prepare(
    'SELECT id FROM media WHERE id = ? AND gallery_id = ? AND user_id = ? AND deleted_at IS NULL'
  )
    .bind(mid, galleryId, user.id)
    .first();

  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }

  const body = await c.req.json<{
    alt?: string;
    title?: string;
    description?: string;
    width?: number;
    height?: number;
  }>().catch(() => ({} as Record<string, undefined>));

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.alt !== undefined) { updates.push('alt = ?'); values.push(body.alt); }
  if (body.title !== undefined) { updates.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { updates.push('description = ?'); values.push(body.description); }
  if (body.width !== undefined) { updates.push('width = ?'); values.push(body.width); }
  if (body.height !== undefined) { updates.push('height = ?'); values.push(body.height); }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push("updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')");
  values.push(mid, user.id);

  await c.get('db').prepare(
    `UPDATE media SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  const updated = await c.get('db').prepare('SELECT * FROM media WHERE id = ? AND user_id = ?')
    .bind(mid, user.id)
    .first();

  return c.json({ data: updated });
});

// DELETE /galleries/:id/media/:mid — Delete media
mediaRoutes.delete('/:mid', async (c) => {
  const user = c.get('user');
  const mid = c.req.param('mid');
  const galleryId = extractGalleryId(c.req.url);

  if (!galleryId || !mid) {
    return c.json({ error: 'Gallery ID and media ID are required' }, 400);
  }

  const media = await c.get('db').prepare(
    'SELECT id, r2_key, file_size FROM media WHERE id = ? AND gallery_id = ? AND user_id = ? AND deleted_at IS NULL'
  )
    .bind(mid, galleryId, user.id)
    .first<{ id: string; r2_key: string; file_size: number }>();

  if (!media) {
    return c.json({ error: 'Media not found' }, 404);
  }

  // Soft-delete the media record
  await c.get('db').prepare(
    "UPDATE media SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  )
    .bind(mid)
    .run();

  // Delete from R2
  try {
    await c.get('storage').delete(media.r2_key as string);
  } catch (err) {
    console.error('Failed to delete R2 object:', err);
  }

  // Update user storage
  await c.get('db').prepare(
    'UPDATE users SET storage_used_bytes = MAX(0, storage_used_bytes - ?) WHERE id = ?'
  )
    .bind(media.file_size, user.id)
    .run();

  return c.json({ message: 'Media deleted' });
});

// POST /galleries/:id/media/reorder — Batch reorder
mediaRoutes.post('/reorder', async (c) => {
  const user = c.get('user');
  const galleryId = extractGalleryId(c.req.url);

  if (!galleryId) {
    return c.json({ error: 'Gallery ID is required' }, 400);
  }

  const gallery = await getGalleryForUser(c.get('db'), galleryId, user.id);
  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const body = await c.req.json<{
    order?: string[];
  }>().catch(() => ({} as Record<string, undefined>));

  if (!body.order || !Array.isArray(body.order)) {
    return c.json({ error: 'order array is required' }, 400);
  }

  // Update sort_order for each media item
  const stmts = body.order.map((mediaId, index) =>
    c.get('db').prepare(
      "UPDATE media SET sort_order = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND gallery_id = ? AND user_id = ?"
    ).bind(index, mediaId, galleryId, user.id)
  );

  // Execute as batch
  if (stmts.length > 0) {
    await c.get('db').batch(stmts);
  }

  return c.json({ message: 'Reordered', count: stmts.length });
});
