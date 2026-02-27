import { config } from 'dotenv';
config({ path: '.env.local' });

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'fs';
import { app } from './app';

// Serve dashboard SPA in production (Docker builds copy dashboard dist → ./public)
if (existsSync('./public')) {
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
