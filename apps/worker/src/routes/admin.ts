import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { generateToken, hashToken, generateId } from '../utils/crypto';
import { isValidEmail } from '../utils/validation';

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// All admin routes require auth + admin
adminRoutes.use('*', requireAuth, requireAdmin);

// GET /admin/users — List all users
adminRoutes.get('/users', async (c) => {
  const result = await c.get('db').prepare(
    'SELECT id, email, name, plan, storage_used_bytes, storage_limit_bytes, created_at FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC'
  ).all<{
    id: string;
    email: string;
    name: string | null;
    plan: string;
    storage_used_bytes: number;
    storage_limit_bytes: number;
    created_at: string;
  }>();

  return c.json({ data: result.results });
});

// POST /admin/users — Create a new user
adminRoutes.post('/users', async (c) => {
  const body = await c.req.json<{ email?: string; name?: string; plan?: string }>().catch(() => ({} as { email?: string; name?: string; plan?: string }));
  const email = body.email?.toLowerCase().trim();

  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'Valid email is required' }, 400);
  }

  // Check if user already exists
  const existing = await c.get('db').prepare(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL'
  ).bind(email).first();

  if (existing) {
    return c.json({ error: 'User with this email already exists' }, 409);
  }

  const id = generateId();
  const name = body.name || null;
  const plan = body.plan || 'free';

  await c.get('db').prepare(
    'INSERT INTO users (id, email, name, plan) VALUES (?, ?, ?, ?)'
  ).bind(id, email, name, plan).run();

  const user = await c.get('db').prepare(
    'SELECT id, email, name, plan, storage_used_bytes, storage_limit_bytes, created_at FROM users WHERE id = ?'
  ).bind(id).first<{
    id: string;
    email: string;
    name: string | null;
    plan: string;
    storage_used_bytes: number;
    storage_limit_bytes: number;
    created_at: string;
  }>();

  return c.json({ data: user }, 201);
});

// DELETE /admin/users/:userId — Soft-delete a user
adminRoutes.delete('/users/:userId', async (c) => {
  const userId = c.req.param('userId');

  const result = await c.get('db').prepare(
    "UPDATE users SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL"
  ).bind(userId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ message: 'User deleted' });
});

// POST /admin/users/:userId/tokens — Generate auto-login token for a user
adminRoutes.post('/users/:userId/tokens', async (c) => {
  const userId = c.req.param('userId');

  // Verify the target user exists
  const targetUser = await c.get('db').prepare(
    'SELECT id, email FROM users WHERE id = ? AND deleted_at IS NULL'
  ).bind(userId).first<{ id: string; email: string }>();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const body = await c.req.json<{ label?: string; expiresInDays?: number }>().catch(() => ({} as { label?: string; expiresInDays?: number }));
  const label = body.label || '';
  const expiresInDays = body.expiresInDays ?? 365;

  const plainToken = generateToken();
  const tokenHash = await hashToken(plainToken);
  const id = generateId();

  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await c.get('db').prepare(
    'INSERT INTO auto_login_tokens (id, user_id, token_hash, label, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, userId, tokenHash, label, expiresAt).run();

  const baseUrl = c.env.MAGIC_LINK_BASE_URL || new URL(c.req.url).origin;
  const autoLoginUrl = `${baseUrl}/auto-login?token=${plainToken}`;

  return c.json({
    data: {
      id,
      label,
      token: plainToken,
      autoLoginUrl,
      expiresAt,
      createdAt: new Date().toISOString(),
    }
  }, 201);
});

// GET /admin/users/:userId/tokens — List tokens for a user
adminRoutes.get('/users/:userId/tokens', async (c) => {
  const userId = c.req.param('userId');

  // Verify the target user exists
  const targetUser = await c.get('db').prepare(
    'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL'
  ).bind(userId).first();

  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404);
  }

  const tokens = await c.get('db').prepare(
    'SELECT id, label, expires_at, last_used_at, created_at FROM auto_login_tokens WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
  ).bind(userId).all();

  return c.json({ data: tokens.results });
});

// DELETE /admin/users/:userId/tokens/:tokenId — Revoke a token
adminRoutes.delete('/users/:userId/tokens/:tokenId', async (c) => {
  const userId = c.req.param('userId');
  const tokenId = c.req.param('tokenId');

  const result = await c.get('db').prepare(
    "UPDATE auto_login_tokens SET deleted_at = datetime('now') WHERE id = ? AND user_id = ? AND deleted_at IS NULL"
  ).bind(tokenId, userId).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Token not found' }, 404);
  }

  return c.json({ message: 'Token revoked' });
});
