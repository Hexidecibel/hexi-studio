import { config } from 'dotenv';
config({ path: '.env.local' });

import { serve } from '@hono/node-server';
import { app } from './app';

const port = parseInt(process.env.PORT || '8787');

console.log(`Starting Hexi Gallery API on port ${port}...`);
console.log(`Runtime mode: ${process.env.RUNTIME_MODE || 'cloudflare'}`);

if (process.env.RUNTIME_MODE === 'local') {
  console.log(`Storage path: ${process.env.STORAGE_PATH}`);
  console.log(`Database path: ${process.env.DATABASE_PATH}`);
}

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Hexi Gallery API running at http://localhost:${info.port}`);
});
