import { createMiddleware } from 'hono/factory';
import type { Env, AuthVariables, AdapterVariables } from '../types';

/**
 * Admin middleware — requires the authenticated user to be an admin.
 * Must be used after requireAuth.
 */
export const requireAdmin = createMiddleware<{
  Bindings: Env;
  Variables: AdapterVariables & AuthVariables;
}>(async (c, next) => {
  const user = c.get('user');
  if (!user?.isAdmin) {
    return c.json({ error: 'Admin access required' }, 403);
  }
  await next();
});
