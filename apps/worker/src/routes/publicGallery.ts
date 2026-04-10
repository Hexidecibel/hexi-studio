import { Hono } from 'hono';
import type { Env, AdapterVariables } from '../types';
import { rateLimit } from '../middleware/rateLimit';

export const publicGalleryRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables }>();

// Rate limit: 100 requests per minute
publicGalleryRoutes.use('*', rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));

interface PublicMediaItem {
  id: string;
  src: string;
  alt: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  thumbnail?: string;
  srcSet?: string;
  blurDataUrl?: string;
  title?: string;
  description?: string;
  poster?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Transform a DB media row into a public MediaItem matching @hexi/gallery's MediaItem type
 */
function toPublicMediaItem(
  row: Record<string, unknown>,
  cdnBase: string,
  userId: string
): PublicMediaItem {
  const mediaId = row.id as string;
  const mediaType = row.media_type as 'image' | 'video';
  const base = `${cdnBase}/${userId}/${mediaId}`;

  const item: PublicMediaItem = {
    id: mediaId,
    src: `${base}/original`,
    alt: (row.alt as string) || '',
    type: mediaType,
  };

  if (row.width) item.width = row.width as number;
  if (row.height) item.height = row.height as number;
  if (row.title) item.title = row.title as string;
  if (row.description) item.description = row.description as string;
  if (row.blur_data_url) item.blurDataUrl = row.blur_data_url as string;

  if (row.metadata) {
    try {
      const parsed = typeof row.metadata === 'string' ? JSON.parse(row.metadata as string) : row.metadata;
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        item.metadata = parsed as Record<string, unknown>;
      }
    } catch {}
  }

  if (mediaType === 'image') {
    item.thumbnail = `${base}/w_400,q_75,f_auto`;
    item.srcSet = [400, 800, 1200, 1600]
      .map((w) => `${base}/w_${w},q_80,f_auto ${w}w`)
      .join(', ');
  }

  if (mediaType === 'video') {
    if (row.duration) item.duration = row.duration as number;
    if (row.poster_r2_key) {
      item.poster = `${base}/original`;
    }
  }

  return item;
}

// GET /galleries/:slug — Public gallery info + first page of media
publicGalleryRoutes.get('/galleries/:slug', async (c) => {
  const slug = c.req.param('slug');

  if (!slug) {
    return c.json({ error: 'Gallery slug is required' }, 400);
  }

  const gallery = await c.get('db').prepare(
    `SELECT g.id, g.user_id, g.name, g.slug, g.config
     FROM galleries g
     WHERE g.slug = ? AND g.visibility = 'public' AND g.published = 1 AND g.deleted_at IS NULL
     LIMIT 1`
  )
    .bind(slug)
    .first<{ id: string; user_id: string; name: string; slug: string; config: string }>();

  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';
  const limit = 50;

  const [mediaResult, countResult] = await Promise.all([
    c.get('db').prepare(
      `SELECT id, media_type, width, height, alt, title, description, duration,
              poster_r2_key, blur_data_url, sort_order, metadata
       FROM media
       WHERE gallery_id = ? AND user_id = ? AND status = 'ready' AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC
       LIMIT ?`
    )
      .bind(gallery.id, gallery.user_id, limit)
      .all(),
    c.get('db').prepare(
      `SELECT COUNT(*) as total FROM media
       WHERE gallery_id = ? AND user_id = ? AND status = 'ready' AND deleted_at IS NULL`
    )
      .bind(gallery.id, gallery.user_id)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;
  const items = (mediaResult.results || []).map((row) =>
    toPublicMediaItem(row, cdnBase, gallery.user_id)
  );

  return c.json({
    gallery: {
      name: gallery.name,
      slug: gallery.slug,
      config: JSON.parse(gallery.config),
    },
    media: {
      items,
      total,
      page: 1,
      limit,
      hasMore: total > limit,
    },
  });
});

// GET /galleries/:slug/media — Paginated media for public gallery
publicGalleryRoutes.get('/galleries/:slug/media', async (c) => {
  const slug = c.req.param('slug');

  if (!slug) {
    return c.json({ error: 'Gallery slug is required' }, 400);
  }

  const gallery = await c.get('db').prepare(
    `SELECT id, user_id FROM galleries
     WHERE slug = ? AND visibility = 'public' AND published = 1 AND deleted_at IS NULL
     LIMIT 1`
  )
    .bind(slug)
    .first<{ id: string; user_id: string }>();

  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50')));
  const offset = (page - 1) * limit;

  const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';

  const [mediaResult, countResult] = await Promise.all([
    c.get('db').prepare(
      `SELECT id, media_type, width, height, alt, title, description, duration,
              poster_r2_key, blur_data_url, sort_order, metadata
       FROM media
       WHERE gallery_id = ? AND user_id = ? AND status = 'ready' AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at ASC
       LIMIT ? OFFSET ?`
    )
      .bind(gallery.id, gallery.user_id, limit, offset)
      .all(),
    c.get('db').prepare(
      `SELECT COUNT(*) as total FROM media
       WHERE gallery_id = ? AND user_id = ? AND status = 'ready' AND deleted_at IS NULL`
    )
      .bind(gallery.id, gallery.user_id)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;
  const items = (mediaResult.results || []).map((row) =>
    toPublicMediaItem(row, cdnBase, gallery.user_id)
  );

  return c.json({
    items,
    total,
    page,
    limit,
    hasMore: offset + limit < total,
  });
});

// GET /galleries/:slug/photo/:photoId — Single photo detail with prev/next navigation
publicGalleryRoutes.get('/galleries/:slug/photo/:photoId', async (c) => {
  const slug = c.req.param('slug');
  const photoId = c.req.param('photoId');

  // 1. Find the gallery
  const gallery = await c.get('db').prepare(
    `SELECT id, user_id, name, slug FROM galleries
     WHERE slug = ? AND visibility = 'public' AND published = 1 AND deleted_at IS NULL
     LIMIT 1`
  )
    .bind(slug)
    .first<{ id: string; user_id: string; name: string; slug: string }>();

  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  // 2. Find the media item
  const media = await c.get('db').prepare(
    `SELECT id, media_type, width, height, alt, title, description, duration,
            poster_r2_key, blur_data_url, sort_order, created_at, metadata
     FROM media
     WHERE id = ? AND gallery_id = ? AND status = 'ready' AND deleted_at IS NULL`
  )
    .bind(photoId, gallery.id)
    .first<Record<string, unknown>>();

  if (!media) {
    return c.json({ error: 'Photo not found' }, 404);
  }

  // 3. Get previous photo
  const prev = await c.get('db').prepare(
    `SELECT id FROM media
     WHERE gallery_id = ? AND status = 'ready' AND deleted_at IS NULL
       AND (sort_order < ? OR (sort_order = ? AND created_at < ?))
     ORDER BY sort_order DESC, created_at DESC
     LIMIT 1`
  )
    .bind(gallery.id, media.sort_order, media.sort_order, media.created_at)
    .first<{ id: string }>();

  // 4. Get next photo
  const next = await c.get('db').prepare(
    `SELECT id FROM media
     WHERE gallery_id = ? AND status = 'ready' AND deleted_at IS NULL
       AND (sort_order > ? OR (sort_order = ? AND created_at > ?))
     ORDER BY sort_order ASC, created_at ASC
     LIMIT 1`
  )
    .bind(gallery.id, media.sort_order, media.sort_order, media.created_at)
    .first<{ id: string }>();

  // 5. Transform the media item
  const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';
  const item = toPublicMediaItem(media, cdnBase, gallery.user_id);

  // 6. Return response
  return c.json({
    item,
    gallery: {
      name: gallery.name,
      slug: gallery.slug,
    },
    prev: prev?.id ?? null,
    next: next?.id ?? null,
    downloadUrl: `${cdnBase}/${gallery.user_id}/${photoId}/original`,
  });
});
