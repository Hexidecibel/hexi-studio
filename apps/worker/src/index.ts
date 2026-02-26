import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types';
import { authRoutes } from './routes/auth';
import { galleryRoutes } from './routes/galleries';
import { libraryRoutes } from './routes/library';
import { mediaRoutes } from './routes/media';
import { publicRoutes } from './routes/public';
import { cdnRoutes } from './routes/cdn';

const app = new Hono<{ Bindings: Env }>();

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
app.route('/api/v1/galleries', galleryRoutes);
app.route('/api/v1/library', libraryRoutes);
app.route('/api/v1/cdn', cdnRoutes);
app.route('/api/v1/public', publicRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    { error: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal server error' },
    500
  );
});

export default app;
