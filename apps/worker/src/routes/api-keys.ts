import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateToken, hashToken, generateId } from '../utils/crypto';

export const apiKeyRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// POST / — Create a new API key (requires auth)
apiKeyRoutes.post('/', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ label?: string }>().catch(() => ({} as { label?: string }));

  const label = body.label || '';

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const id = generateId();

  await c.get('db').prepare(
    'INSERT INTO api_keys (id, user_id, token_hash, label) VALUES (?, ?, ?, ?)'
  ).bind(id, user.id, tokenHash, label).run();

  return c.json({
    id,
    key: token, // plaintext - only returned once
    label,
    created_at: new Date().toISOString(),
  }, 201);
});

// GET / — List all API keys for user (requires auth)
apiKeyRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user');

  const keys = await c.get('db').prepare(
    'SELECT id, label, last_used_at, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();

  return c.json({ apiKeys: keys.results });
});

// DELETE /:id — Delete an API key (requires auth)
apiKeyRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const keyId = c.req.param('id');

  const result = await c.get('db').prepare(
    'DELETE FROM api_keys WHERE id = ? AND user_id = ?'
  ).bind(keyId, user.id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'API key not found' }, 404);
  }

  return new Response(null, { status: 204 });
});
