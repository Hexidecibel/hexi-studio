import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, AdapterVariables } from './types';
import { createAdapters } from './adapters';
import { authRoutes } from './routes/auth';
import { galleryRoutes } from './routes/galleries';
import { mediaRoutes } from './routes/media';
import { libraryRoutes } from './routes/library';
import { publicRoutes } from './routes/public';
import { cdnRoutes } from './routes/cdn';
import { adminRoutes } from './routes/admin';
import { apiKeyRoutes } from './routes/api-keys';
import oauth from './routes/oauth';
import foursure from './routes/foursure';

export const app = new Hono<{ Bindings: Env; Variables: AdapterVariables }>();

// Populate c.env from process.env in local/Node.js mode
app.use('*', async (c, next) => {
  if (typeof process !== 'undefined' && process.env?.RUNTIME_MODE === 'local') {
    // @ts-expect-error -- populating env for local mode
    c.env = { ...process.env };
  }
  await next();
});

// Adapter initialization — makes db, storage, imageTransformer available via c.get()
app.use('*', async (c, next) => {
  const adapters = await createAdapters(c.env as unknown as Record<string, unknown>);
  c.set('storage', adapters.storage);
  c.set('db', adapters.db);
  c.set('imageTransformer', adapters.imageTransformer);
  await next();
});

// Global middleware
app.use('*', logger());
app.use('/api/v1/*', async (c, next) => {
  // Public and CDN routes have their own permissive CORS — skip global CORS for them
  const path = c.req.path;
  if (path.startsWith('/api/v1/public/') || path.startsWith('/api/v1/cdn/')) {
    return next();
  }
  const configuredOrigin = c.env.CORS_ORIGIN || '*';
  // When origin is '*', reflect the requesting origin back so credentials work.
  // Browsers reject wildcard Access-Control-Allow-Origin with credentials: true.
  let origin: string | string[] | ((requestOrigin: string) => string | undefined | null);
  if (configuredOrigin === '*') {
    origin = (requestOrigin: string) => requestOrigin || '*';
  } else if (configuredOrigin.includes(',')) {
    // Support comma-separated origins, including wildcard patterns like *.example.com
    const origins = configuredOrigin.split(',').map((o: string) => o.trim());
    const exactOrigins = origins.filter((o: string) => !o.includes('*'));
    const wildcardPatterns = origins
      .filter((o: string) => o.includes('*'))
      .map((o: string) => new RegExp('^' + o.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'));
    origin = (requestOrigin: string) => {
      if (exactOrigins.includes(requestOrigin)) return requestOrigin;
      if (wildcardPatterns.some((re: RegExp) => re.test(requestOrigin))) return requestOrigin;
      return null as unknown as string;
    };
  } else {
    origin = configuredOrigin;
  }
  const corsMiddleware = cors({
    origin,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// Public CORS (any origin)
app.use('/api/v1/public/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'X-API-Key'] }));
app.use('/api/v1/cdn/*', cors({ origin: '*' }));

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/auth/oauth', oauth);
app.route('/api/v1/auth/4sure', foursure);
app.route('/api/v1/admin', adminRoutes);
app.route('/api/v1/api-keys', apiKeyRoutes);
app.route('/api/v1/galleries', galleryRoutes);
app.route('/api/v1/library', libraryRoutes);
app.route('/api/v1/cdn', cdnRoutes);
app.route('/api/v1/public', publicRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API 404 — non-API routes fall through to static serving in server.ts
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal server error' },
    500
  );
});
