import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser, AuthVariables, AdapterVariables } from '../types';
import { hashToken } from '../utils/crypto';

/**
 * Authentication middleware — extracts session token from Authorization header,
 * verifies it against D1, and populates c.var.user
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AdapterVariables & AuthVariables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  if (!token) {
    return c.json({ error: 'Missing session token' }, 401);
  }

  const tokenHash = await hashToken(token);

  const session = await c.get('db').prepare(
    `SELECT s.user_id, s.expires_at, u.id, u.email, u.name, u.plan, u.storage_used_bytes, u.storage_limit_bytes
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
  )
    .bind(tokenHash)
    .first<{
      user_id: string;
      email: string;
      name: string | null;
      plan: string;
      storage_used_bytes: number;
      storage_limit_bytes: number;
    }>();

  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }

  const user: AuthUser = {
    id: session.user_id,
    email: session.email,
    name: session.name,
    plan: session.plan,
    storageUsedBytes: session.storage_used_bytes,
    storageLimitBytes: session.storage_limit_bytes,
  };

  c.set('user', user);
  await next();
});
