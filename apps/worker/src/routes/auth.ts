import { Hono } from 'hono';
import type { Env, AuthVariables } from '../types';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { generateToken, hashToken, generateId } from '../utils/crypto';
import { isValidEmail } from '../utils/validation';
import { sendEmail, buildMagicLinkEmail } from '../services/email';

export const authRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Rate limit magic link requests: 5 per 15 minutes
authRoutes.use('/magic-link', rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 }));

// POST /auth/magic-link — Send magic link email
authRoutes.post('/magic-link', async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({} as { email?: string }));
  const email = body.email?.toLowerCase().trim();

  if (!email || !isValidEmail(email)) {
    return c.json({ error: 'Valid email is required' }, 400);
  }

  // Generate magic link token
  const token = generateToken();
  const tokenHash = await hashToken(token);
  const id = generateId();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Store token hash in D1
  await c.env.DB.prepare(
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
  const magicLink = await c.env.DB.prepare(
    `SELECT id, email, expires_at, used_at FROM magic_link_tokens
     WHERE token_hash = ? AND email = ? AND used_at IS NULL AND expires_at > datetime('now')`
  )
    .bind(tokenHash, email)
    .first<{ id: string; email: string; expires_at: string; used_at: string | null }>();

  if (!magicLink) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Mark token as used
  await c.env.DB.prepare(
    `UPDATE magic_link_tokens SET used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  )
    .bind(magicLink.id)
    .run();

  // Find or create user
  let user = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
    .bind(email)
    .first<{ id: string }>();

  if (!user) {
    const userId = generateId();
    await c.env.DB.prepare(`INSERT INTO users (id, email) VALUES (?, ?)`)
      .bind(userId, email)
      .run();
    user = { id: userId };
  }

  // Create session (30 day expiry)
  const sessionToken = generateToken();
  const sessionTokenHash = await hashToken(sessionToken);
  const sessionId = generateId();
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  )
    .bind(sessionId, user.id, sessionTokenHash, sessionExpiry)
    .run();

  return c.json({
    token: sessionToken,
    expiresAt: sessionExpiry,
  });
});

// POST /auth/logout — End session (requires auth)
authRoutes.post('/logout', requireAuth, async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader!.slice(7);
  const tokenHash = await hashToken(token);

  await c.env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`)
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
  });
});
