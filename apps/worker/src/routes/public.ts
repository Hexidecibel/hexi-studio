import { Hono } from 'hono';
import type { Env, AdapterVariables } from '../types';
import type { AuthVariables } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';
import { requireApiKey } from '../middleware/apiKey';

export const publicRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// Rate limit public reads: 200 per minute
publicRoutes.use('*', rateLimit({ windowMs: 60 * 1000, maxRequests: 200 }));

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
    // Thumbnail
    item.thumbnail = `${base}/w_400,q_75,f_auto`;

    // Responsive srcSet
    item.srcSet = [400, 800, 1200, 1600]
      .map((w) => `${base}/w_${w},q_80,f_auto ${w}w`)
      .join(', ');
  }

  if (mediaType === 'video') {
    if (row.duration) item.duration = row.duration as number;
    if (row.poster_r2_key) {
      // Poster uses the same CDN pattern
      item.poster = `${base}/original`; // poster would need its own key mapping in production
    }
  }

  return item;
}

// Authenticated preview — works even when gallery is unpublished
publicRoutes.get('/preview/galleries/:id', requireAuth, async (c) => {
  const galleryId = c.req.param('id');
  const user = c.get('user') as { id: string };

  const gallery = await c.get('db').prepare(
    `SELECT id, user_id, name, slug, config
     FROM galleries
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL
     LIMIT 1`
  )
    .bind(galleryId, user.id)
    .first<{ id: string; user_id: string; name: string; slug: string; config: string }>();

  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';
  const limit = 200;

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

// Public single media info (for library items)
publicRoutes.get('/media/:id', requireApiKey, async (c) => {
  const id = c.req.param('id');
  const { userId } = c.get('apiTenant');

  const item = await c.get('db').prepare(
    "SELECT id, user_id, width, height, alt, title, description, media_type, content_type, metadata FROM library_media WHERE id = ? AND user_id = ? AND status = 'ready' AND deleted_at IS NULL"
  ).bind(id, userId).first();

  if (!item) {
    return c.json({ error: 'Not found' }, 404);
  }

  const tenantId = item.user_id as string;
  const mediaId = item.id as string;

  const src = `/api/v1/cdn/${tenantId}/${mediaId}/original`;
  const thumbnail = item.media_type === 'image'
    ? `/api/v1/cdn/${tenantId}/${mediaId}/w_400,q_75,f_auto`
    : undefined;

  const srcSet = item.media_type === 'image'
    ? [400, 800, 1200, 1600].map(w => `/api/v1/cdn/${tenantId}/${mediaId}/w_${w},q_75,f_auto ${w}w`).join(', ')
    : undefined;

  return c.json({
    id: mediaId,
    src,
    alt: item.alt || '',
    width: item.width,
    height: item.height,
    thumbnail,
    srcSet,
    title: item.title,
    description: item.description,
    type: item.media_type,
  });
});

// GET /public/galleries/:slug — Public gallery config + first page of media
publicRoutes.get('/galleries/:slug', requireApiKey, async (c) => {
  const slug = c.req.param('slug');
  const { userId } = c.get('apiTenant');

  if (!slug) {
    return c.json({ error: 'Gallery slug is required' }, 400);
  }

  // Find published gallery by slug scoped to the API key's tenant
  const gallery = await c.get('db').prepare(
    `SELECT g.id, g.user_id, g.name, g.slug, g.config
     FROM galleries g
     WHERE g.slug = ? AND g.user_id = ? AND g.published = 1 AND g.deleted_at IS NULL
     LIMIT 1`
  )
    .bind(slug, userId)
    .first<{ id: string; user_id: string; name: string; slug: string; config: string }>();

  if (!gallery) {
    return c.json({ error: 'Gallery not found' }, 404);
  }

  const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';
  const limit = 50;

  // Fetch first page of media
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

// GET /public/galleries/:slug/media — Public media pagination
publicRoutes.get('/galleries/:slug/media', requireApiKey, async (c) => {
  const slug = c.req.param('slug');
  const { userId } = c.get('apiTenant');

  if (!slug) {
    return c.json({ error: 'Gallery slug is required' }, 400);
  }

  const gallery = await c.get('db').prepare(
    `SELECT id, user_id FROM galleries
     WHERE slug = ? AND user_id = ? AND published = 1 AND deleted_at IS NULL
     LIMIT 1`
  )
    .bind(slug, userId)
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
