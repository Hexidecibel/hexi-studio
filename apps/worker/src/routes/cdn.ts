import { Hono } from 'hono';
import type { Env } from '../types';

export const cdnRoutes = new Hono<{ Bindings: Env }>();

/**
 * Parse variant string into Cloudflare Image Resizing options.
 *
 * Supported variant formats:
 *   - "original" — serve as-is from R2
 *   - "w_400" — width 400
 *   - "w_400,h_300" — width 400, height 300
 *   - "w_400,q_75" — width 400, quality 75
 *   - "w_400,q_75,f_auto" — width 400, quality 75, auto format
 *   - "w_400,q_80,f_webp" — width 400, quality 80, webp format
 *   - "thumb" — preset: w_200, h_200, fit cover, quality 60
 */
function parseVariant(variant: string): {
  isOriginal: boolean;
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
  fit?: string;
} {
  if (variant === 'original') {
    return { isOriginal: true };
  }

  if (variant === 'thumb') {
    return { isOriginal: false, width: 200, height: 200, quality: 60, fit: 'cover' };
  }

  const params: Record<string, string> = {};
  for (const part of variant.split(',')) {
    const [key, value] = part.split('_');
    if (key && value) {
      params[key] = value;
    }
  }

  return {
    isOriginal: false,
    width: params.w ? parseInt(params.w) : undefined,
    height: params.h ? parseInt(params.h) : undefined,
    quality: params.q ? parseInt(params.q) : undefined,
    format: params.f || undefined,
    fit: params.fit || 'scale-down',
  };
}

// GET /cdn/:tenantId/:mediaId/:variant — Image serving with transforms
cdnRoutes.get('/:tenantId/:mediaId/:variant', async (c) => {
  const tenantId = c.req.param('tenantId');
  const mediaId = c.req.param('mediaId');
  const variant = c.req.param('variant');

  if (!tenantId || !mediaId || !variant) {
    return c.json({ error: 'Invalid CDN path' }, 400);
  }

  // Look up the media record to find the R2 key (check both media and library_media tables)
  let media = await c.env.DB.prepare(
    'SELECT r2_key, content_type FROM media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  )
    .bind(mediaId, tenantId)
    .first<{ r2_key: string; content_type: string }>();

  if (!media) {
    media = await c.env.DB.prepare(
      'SELECT r2_key, content_type FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    )
      .bind(mediaId, tenantId)
      .first<{ r2_key: string; content_type: string }>();
  }

  if (!media) {
    return c.json({ error: 'Not found' }, 404);
  }

  const variantOpts = parseVariant(variant);

  // Fetch from R2
  const object = await c.env.MEDIA_BUCKET.get(media.r2_key);
  if (!object) {
    return c.json({ error: 'Object not found in storage' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', media.content_type);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.etag);

  // Check if-none-match for conditional requests
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === object.etag) {
    return new Response(null, { status: 304, headers });
  }

  // For original variant or non-image types, serve directly from R2
  if (variantOpts.isOriginal || !media.content_type.startsWith('image/')) {
    return new Response(object.body as ReadableStream, { headers });
  }

  // For image transforms, we need to use Cloudflare Image Resizing.
  // Image Resizing works by fetching the image through a subrequest with cf.image options.
  // However, this only works when the image is accessible via a URL.
  //
  // Since R2 objects aren't directly URL-accessible without public bucket or custom domain,
  // we'll serve the R2 object directly with appropriate headers.
  // In production with a custom domain and public R2 bucket, you'd use:
  //   fetch(imageUrl, { cf: { image: { width, height, quality, format, fit } } })
  //
  // For now, serve the original with cache headers and let the client handle sizing via srcSet.
  // When deployed with a public R2 bucket + custom domain, replace this with Image Resizing.

  return new Response(object.body as ReadableStream, { headers });
});

// Also handle requests without variant (default to original)
cdnRoutes.get('/:tenantId/:mediaId', async (c) => {
  const tenantId = c.req.param('tenantId');
  const mediaId = c.req.param('mediaId');

  let media = await c.env.DB.prepare(
    'SELECT r2_key, content_type FROM media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
  )
    .bind(mediaId, tenantId)
    .first<{ r2_key: string; content_type: string }>();

  if (!media) {
    media = await c.env.DB.prepare(
      'SELECT r2_key, content_type FROM library_media WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
    )
      .bind(mediaId, tenantId)
      .first<{ r2_key: string; content_type: string }>();
  }

  if (!media) {
    return c.json({ error: 'Not found' }, 404);
  }

  const object = await c.env.MEDIA_BUCKET.get(media.r2_key);
  if (!object) {
    return c.json({ error: 'Object not found in storage' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', media.content_type);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.etag);

  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === object.etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body as ReadableStream, { headers });
});
