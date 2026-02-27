import { createMiddleware } from 'hono/factory';
import type { Env, AuthVariables, AdapterVariables, ApiKeyTenant } from '../types';
import { hashToken } from '../utils/crypto';

/**
 * API key authentication middleware — extracts X-API-Key header,
 * verifies it against the api_keys table, and populates c.var.apiTenant
 */
export const requireApiKey = createMiddleware<{
  Bindings: Env;
  Variables: AdapterVariables & AuthVariables;
}>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) {
    return c.json({ error: 'Invalid or missing API key' }, 401);
  }

  const tokenHash = await hashToken(apiKey);

  const record = await c.get('db').prepare(
    `SELECT ak.id, ak.user_id
     FROM api_keys ak
     JOIN users u ON ak.user_id = u.id
     WHERE ak.token_hash = ? AND u.deleted_at IS NULL`
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string }>();

  if (!record) {
    return c.json({ error: 'Invalid or missing API key' }, 401);
  }

  const tenant: ApiKeyTenant = { id: record.id, userId: record.user_id };
  c.set('apiTenant', tenant);

  // Update last_used_at fire-and-forget
  c.get('db').prepare(
    "UPDATE api_keys SET last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?"
  ).bind(record.id).run();

  await next();
});
