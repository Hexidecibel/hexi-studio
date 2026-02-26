import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyFn?: (c: { req: { header: (name: string) => string | undefined } }) => string;
}

// Simple in-memory rate limiter (resets on worker restart, per-isolate)
// For production, consider Cloudflare Rate Limiting or Durable Objects
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(config: RateLimitConfig) {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const key = config.keyFn
      ? config.keyFn(c)
      : c.req.header('CF-Connecting-IP')
        || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim()
        || c.req.header('X-Real-IP')
        || 'unknown';

    const now = Date.now();
    const windowKey = `${key}:${config.windowMs}`;
    const window = windows.get(windowKey);

    if (!window || now > window.resetAt) {
      windows.set(windowKey, { count: 1, resetAt: now + config.windowMs });
    } else if (window.count >= config.maxRequests) {
      const retryAfter = Math.ceil((window.resetAt - now) / 1000);
      return c.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    } else {
      window.count++;
    }

    await next();
  });
}
