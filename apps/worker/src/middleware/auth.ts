import { createMiddleware } from 'hono/factory';
import type { Env, AuthUser, AuthVariables, AdapterVariables } from '../types';
import { hashToken } from '../utils/crypto';

/**
 * Authentication middleware — accepts either:
 * 1. Authorization: Bearer <session_token>
 * 2. X-API-Key: <api_key>
 * Verifies against DB and populates c.var.user
 */
export const requireAuth = createMiddleware<{
  Bindings: Env;
  Variables: AdapterVariables & AuthVariables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = c.req.header('X-API-Key');

  let userId: string | null = null;
  let email: string | null = null;
  let name: string | null = null;
  let plan: string | null = null;
  let storageUsedBytes = 0;
  let storageLimitBytes = 0;

  if (authHeader?.startsWith('Bearer ')) {
    // Session token auth
    const token = authHeader.slice(7);
    if (!token) {
      return c.json({ error: 'Missing session token' }, 401);
    }

    const tokenHash = await hashToken(token);
    const session = await c.get('db').prepare(
      `SELECT s.user_id, s.expires_at, u.id, u.email, u.name, u.plan, u.storage_used_bytes, u.storage_limit_bytes
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.deleted_at IS NULL`
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

    userId = session.user_id;
    email = session.email;
    name = session.name;
    plan = session.plan;
    storageUsedBytes = session.storage_used_bytes;
    storageLimitBytes = session.storage_limit_bytes;
  } else if (apiKey) {
    // API key auth fallback
    const tokenHash = await hashToken(apiKey);
    const record = await c.get('db').prepare(
      `SELECT ak.id, ak.user_id, u.email, u.name, u.plan, u.storage_used_bytes, u.storage_limit_bytes
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.token_hash = ? AND u.deleted_at IS NULL`
    )
      .bind(tokenHash)
      .first<{
        id: string;
        user_id: string;
        email: string;
        name: string | null;
        plan: string;
        storage_used_bytes: number;
        storage_limit_bytes: number;
      }>();

    if (!record) {
      return c.json({ error: 'Invalid or missing API key' }, 401);
    }

    userId = record.user_id;
    email = record.email;
    name = record.name;
    plan = record.plan;
    storageUsedBytes = record.storage_used_bytes;
    storageLimitBytes = record.storage_limit_bytes;

    // Update last_used_at fire-and-forget
    c.get('db').prepare(
      "UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
    ).bind(record.id).run();
  } else {
    return c.json({ error: 'Missing authentication' }, 401);
  }

  const user: AuthUser = {
    id: userId,
    email: email!,
    name,
    plan: plan!,
    storageUsedBytes,
    storageLimitBytes,
    isAdmin: !!c.env.ADMIN_EMAIL && email === c.env.ADMIN_EMAIL,
  };

  c.set('user', user);
  await next();
});
