import { config } from 'dotenv';
config({ path: '.env.local' });

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync, readFileSync } from 'fs';
import { app } from './app';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Serve dashboard SPA in production (Docker builds copy dashboard dist → ./public)
if (existsSync('./public')) {
  // Cache the index.html template for OG injection
  const indexHtml = readFileSync('./public/index.html', 'utf-8');

  // OG meta injection for public gallery pages
  app.get('/g/:slug', async (c) => {
    try {
      const slug = c.req.param('slug');
      const db = c.get('db');

      const gallery = await db.prepare(
        `SELECT g.name, g.slug, g.user_id,
                (SELECT COUNT(*) FROM media m WHERE m.gallery_id = g.id AND m.status = 'ready' AND m.deleted_at IS NULL) as media_count
         FROM galleries g
         WHERE g.slug = ? AND g.visibility = 'public' AND g.published = 1 AND g.deleted_at IS NULL
         LIMIT 1`
      ).bind(slug).first<{ name: string; slug: string; user_id: string; media_count: number }>();

      if (!gallery) {
        return c.html(indexHtml);
      }

      // Get first image for og:image
      const firstMedia = await db.prepare(
        `SELECT m.id FROM media m
         JOIN galleries g ON m.gallery_id = g.id
         WHERE g.slug = ? AND g.visibility = 'public' AND m.status = 'ready' AND m.deleted_at IS NULL
         ORDER BY m.sort_order ASC, m.created_at ASC
         LIMIT 1`
      ).bind(slug).first<{ id: string }>();

      const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';
      const origin = new URL(c.req.url).origin;
      const ogImage = firstMedia
        ? `${origin}${cdnBase}/${gallery.user_id}/${firstMedia.id}/w_1200,q_80,f_auto`
        : '';
      const ogUrl = `${origin}/g/${gallery.slug}`;
      const description = `${gallery.media_count} photo${gallery.media_count !== 1 ? 's' : ''} in ${gallery.name}`;

      const metaTags = `
    <meta property="og:title" content="${escapeHtml(gallery.name)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:type" content="website" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
    <meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${escapeHtml(gallery.name)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}" />` : ''}`;

      const html = indexHtml.replace('</head>', `${metaTags}\n  </head>`);
      return c.html(html);
    } catch {
      return c.html(indexHtml);
    }
  });

  // OG meta injection for single photo pages
  app.get('/g/:slug/photo/:id', async (c) => {
    try {
      const slug = c.req.param('slug');
      const photoId = c.req.param('id');
      const db = c.get('db');

      const gallery = await db.prepare(
        `SELECT g.id, g.name, g.slug, g.user_id
         FROM galleries g
         WHERE g.slug = ? AND g.visibility = 'public' AND g.published = 1 AND g.deleted_at IS NULL
         LIMIT 1`
      ).bind(slug).first<{ id: string; name: string; slug: string; user_id: string }>();

      if (!gallery) {
        return c.html(indexHtml);
      }

      const photo = await db.prepare(
        `SELECT id, title, alt, description, media_type, width, height
         FROM media
         WHERE id = ? AND gallery_id = ? AND status = 'ready' AND deleted_at IS NULL
         LIMIT 1`
      ).bind(photoId, gallery.id).first<{ id: string; title: string; alt: string; description: string; media_type: string; width: number; height: number }>();

      if (!photo) {
        return c.html(indexHtml);
      }

      const cdnBase = c.env.CDN_BASE_URL || '/api/v1/cdn';
      const origin = new URL(c.req.url).origin;
      const ogImage = `${origin}${cdnBase}/${gallery.user_id}/${photo.id}/w_1200,q_80,f_auto`;
      const ogUrl = `${origin}/g/${gallery.slug}/photo/${photo.id}`;
      const title = photo.title || photo.alt || gallery.name;
      const description = photo.description || `Photo from ${gallery.name}`;

      const metaTags = `
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:image" content="${ogImage}" />
    ${photo.width ? `<meta property="og:image:width" content="${photo.width}" />` : ''}
    ${photo.height ? `<meta property="og:image:height" content="${photo.height}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${ogImage}" />`;

      const html = indexHtml.replace('</head>', `${metaTags}\n  </head>`);
      return c.html(html);
    } catch {
      return c.html(indexHtml);
    }
  });

  // SPA static serving + fallback
  app.use('*', serveStatic({ root: './public' }));
  app.get('*', serveStatic({ root: './public', path: 'index.html' }));
  console.log('Serving dashboard from ./public');
}

// Final 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = parseInt(process.env.PORT || '4100');

console.log(`Starting Hexi Gallery API on port ${port}...`);
console.log(`Runtime mode: ${process.env.RUNTIME_MODE || 'cloudflare'}`);

if (process.env.RUNTIME_MODE === 'local') {
  console.log(`Storage path: ${process.env.STORAGE_PATH}`);
  console.log(`Database path: ${process.env.DATABASE_PATH}`);
}

const hostname = process.env.HOST || '0.0.0.0';

serve({
  fetch: app.fetch,
  port,
  hostname,
}, (info) => {
  console.log(`Hexi Gallery API running at http://${hostname}:${info.port}`);
});
