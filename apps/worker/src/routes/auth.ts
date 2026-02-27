import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import type { DatabaseAdapter } from '../adapters/database';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { rateLimit } from '../middleware/rateLimit';
import { generateToken, hashToken, generateId } from '../utils/crypto';
import { isValidEmail } from '../utils/validation';
import { sendEmail, buildMagicLinkEmail } from '../services/email';

export async function createSession(db: DatabaseAdapter, userId: string): Promise<{ token: string; expiresAt: string }> {
  const sessionToken = generateToken();
  const sessionHash = await hashToken(sessionToken);
  const sessionId = generateId();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.prepare(
    'INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(sessionId, userId, sessionHash, expiresAt).run();

  return { token: sessionToken, expiresAt };
}

export const authRoutes = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// Rate limit magic link requests: 5 per 15 minutes
authRoutes.use('/magic-link', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 }));

// POST /auth/magic-link — Send magic link email
authRoutes.post('/magic-link', async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({} as { email?: string }));
  const email = body.email?.toLowerCase().trim();

  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'Valid email is required' }, 400);
  }

  // Only allow existing users to log in
  const existingUser = await c.get('db').prepare(
    `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`
  ).bind(email).first<{ id: string }>();

  if (!existingUser) {
    return c.json({ error: 'Account not found. Contact your administrator.' }, 403);
  }

  // Generate magic link token
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const id = generateId();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Store token hash in D1
  await c.get('db').prepare(
    `INSERT INTO magic_link_tokens (id, email, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  )
    .bind(id, email, tokenHash, expiresAt)
    .run();

  // Build verify URL
  const baseUrl = c.env.MAGIC_LINK_BASE_URL || c.env.CORS_ORIGIN || 'http://localhost:5173';
  const verifyUrl = `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

  // Send email
  const emailHtml = buildMagicLinkEmail(verifyUrl);
  await sendEmail(c.env, {
    to: email,
    subject: 'Sign in to Hexi Gallery',
    html: emailHtml,
  });

  // Always return success (don't leak whether email exists)
  return c.json({ message: 'If an account exists, a magic link has been sent.' });
});

// GET /auth/verify — Verify magic link token and create session
authRoutes.get('/verify', async (c) => {
  const token = c.req.query('token');
  const email = c.req.query('email')?.toLowerCase().trim();

  if (!token || !email) {
    return c.json({ error: 'Token and email are required' }, 400);
  }

  const tokenHash = await hashToken(token);

  // Find and validate the magic link token
  const magicLink = await c.get('db').prepare(
    `SELECT id, email, expires_at, used_at FROM magic_link_tokens
     WHERE token_hash = ? AND email = ? AND used_at IS NULL AND expires_at > datetime('now')`
  )
    .bind(tokenHash, email)
    .first<{ id: string; email: string; expires_at: string; used_at: string | null }>();

  if (!magicLink) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Mark token as used
  await c.get('db').prepare(
    `UPDATE magic_link_tokens SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  )
    .bind(magicLink.id)
    .run();

  // Look up existing user — only pre-created accounts can log in
  const user = await c.get('db').prepare(
    `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL`
  ).bind(email).first<{ id: string }>();

  if (!user) {
    return c.json({ error: 'Account not found. Contact your administrator.' }, 403);
  }

  // Create session (30 day expiry)
  const session = await createSession(c.get('db'), user.id);

  return c.json(session);
});

// GET /auth/storage-breakdown — Get storage usage breakdown (requires auth)
authRoutes.get('/storage-breakdown', requireAuth, async (c) => {
  const user = c.get('user');
  const db = c.get('db');

  const [galleryResult, libraryResult] = await Promise.all([
    db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as totalBytes FROM media WHERE user_id = ? AND deleted_at IS NULL'
    ).bind(user.id).first<{ count: number; totalBytes: number }>(),
    db.prepare(
      'SELECT COUNT(*) as count, COALESCE(SUM(file_size), 0) as totalBytes FROM library_media WHERE user_id = ? AND deleted_at IS NULL'
    ).bind(user.id).first<{ count: number; totalBytes: number }>(),
  ]);

  const gallery = { count: galleryResult?.count ?? 0, totalBytes: galleryResult?.totalBytes ?? 0 };
  const library = { count: libraryResult?.count ?? 0, totalBytes: libraryResult?.totalBytes ?? 0 };

  return c.json({
    gallery,
    library,
    total: {
      count: gallery.count + library.count,
      totalBytes: gallery.totalBytes + library.totalBytes,
    },
    storageUsedBytes: user.storageUsedBytes,
    storageLimitBytes: user.storageLimitBytes,
  });
});

// POST /auth/logout — End session (requires auth)
authRoutes.post('/logout', requireAuth, async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader!.slice(7);
  const tokenHash = await hashToken(token);

  await c.get('db').prepare(`DELETE FROM sessions WHERE token_hash = ?`)
    .bind(tokenHash)
    .run();

  return c.json({ message: 'Logged out' });
});

// GET /auth/me — Get current user (requires auth)
authRoutes.get('/me', requireAuth, async (c) => {
  const user = c.get('user');
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    storageUsedBytes: user.storageUsedBytes,
    storageLimitBytes: user.storageLimitBytes,
    isAdmin: user.isAdmin,
  });
});

// POST /auth/auto-login-tokens — Generate a new auto-login token (requires auth + admin)
authRoutes.post('/auto-login-tokens', requireAuth, requireAdmin, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ label?: string; expiresInDays?: number }>();

  const label = body.label || '';
  const expiresInDays = body.expiresInDays ?? 365; // default 1 year

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const id = generateId();

  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await c.get('db').prepare(
    'INSERT INTO auto_login_tokens (id, user_id, token_hash, label, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, user.id, tokenHash, label, expiresAt).run();

  return c.json({
    data: {
      id,
      label,
      token, // plaintext - only returned once
      expiresAt,
      createdAt: new Date().toISOString(),
    }
  }, 201);
});

// GET /auth/auto-login-tokens — List tokens (requires auth + admin)
authRoutes.get('/auto-login-tokens', requireAuth, requireAdmin, async (c) => {
  const user = c.get('user');

  const tokens = await c.get('db').prepare(
    'SELECT id, label, expires_at, last_used_at, created_at FROM auto_login_tokens WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();

  return c.json({ data: tokens.results });
});

// DELETE /auth/auto-login-tokens/:id — Revoke a token (requires auth + admin)
authRoutes.delete('/auto-login-tokens/:id', requireAuth, requireAdmin, async (c) => {
  const user = c.get('user');
  const tokenId = c.req.param('id');

  const result = await c.get('db').prepare(
    'DELETE FROM auto_login_tokens WHERE id = ? AND user_id = ?'
  ).bind(tokenId, user.id).run();

  if (result.meta.changes === 0) {
    return c.json({ error: 'Token not found' }, 404);
  }

  return c.json({ message: 'Token revoked' });
});

// GET /auth/auto — Validate auto-login token and create session (public, rate limited)
authRoutes.get('/auto', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 10 }), async (c) => {
  const token = c.req.query('token');

  if (!token) {
    return c.json({ error: 'Missing token' }, 400);
  }

  const tokenHash = await hashToken(token);

  const record = await c.get('db').prepare(
    `SELECT alt.id, alt.user_id, alt.expires_at
     FROM auto_login_tokens alt
     WHERE alt.token_hash = ?
       AND (alt.expires_at IS NULL OR alt.expires_at > datetime('now'))`
  ).bind(tokenHash).first();

  if (!record) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Verify the user exists and is not soft-deleted
  const user = await c.get('db').prepare(
    'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL'
  ).bind(record.user_id).first();

  if (!user) {
    return c.json({ error: 'User not found' }, 401);
  }

  // Update last_used_at
  await c.get('db').prepare(
    'UPDATE auto_login_tokens SET last_used_at = datetime(\'now\') WHERE id = ?'
  ).bind(record.id).run();

  // Create session using the shared helper
  const session = await createSession(c.get('db'), record.user_id as string);

  return c.json(session);
});
