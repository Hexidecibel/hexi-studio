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
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGIN || '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// Public CORS (any origin)
app.use('/api/v1/public/*', cors({ origin: '*' }));
app.use('/api/v1/cdn/*', cors({ origin: '*' }));

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/admin', adminRoutes);
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
