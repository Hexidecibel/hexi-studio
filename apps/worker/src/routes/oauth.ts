import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import type { DatabaseAdapter } from '../adapters/database';
import { createSession } from './auth';
import { generateToken, generateId } from '../utils/crypto';

const oauth = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// --- Helper: Find or create user from OAuth ---

async function findOrCreateOAuthUser(
  db: DatabaseAdapter,
  provider: string,
  providerUserId: string,
  email: string
): Promise<string> {
  // Check for existing OAuth account link
  const existing = await db.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
  ).bind(provider, providerUserId).first<{ user_id: string }>();

  if (existing) {
    return existing.user_id;
  }

  // Check if a user with this email already exists
  const user = await db.prepare(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL'
  ).bind(email).first<{ id: string }>();

  const userId = user ? user.id : generateId();

  if (!user) {
    await db.prepare(
      'INSERT INTO users (id, email, storage_limit_bytes, created_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, email, 20971520, new Date().toISOString()).run();
  }

  // Link OAuth account to user
  await db.prepare(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(generateId(), userId, provider, providerUserId, new Date().toISOString()).run();

  return userId;
}

// --- Helper: Base64url encode ---

function base64url(data: Uint8Array | string): string {
  const input = typeof data === 'string'
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Helper: Generate Apple client secret JWT ---

async function generateAppleClientSecret(
  teamId: string,
  clientId: string,
  keyId: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 180 * 24 * 60 * 60,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  }));

  const signingInput = new TextEncoder().encode(`${header}.${payload}`);

  // Import the PKCS8 private key
  const pemBody = privateKey
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const keyData = Uint8Array.from(atob(pemBody), (ch) => ch.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput)
  );

  // Web Crypto ECDSA returns IEEE P1363 format (r||s), which is what JWT ES256 expects
  return `${header}.${payload}.${base64url(signature)}`;
}

// --- GET /providers --- Which OAuth providers are configured

oauth.get('/providers', (c) => {
  const google = !!(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET);
  const apple = !!(c.env.APPLE_CLIENT_ID && c.env.APPLE_TEAM_ID && c.env.APPLE_KEY_ID && c.env.APPLE_PRIVATE_KEY);
  return c.json({ google, apple });
});

// --- GET /:provider --- Initiate OAuth flow

oauth.get('/:provider', async (c) => {
  const provider = c.req.param('provider');
  const db = c.get('db');

  const state = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await db.prepare(
    'INSERT INTO oauth_states (state, provider, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(state, provider, new Date().toISOString(), expiresAt).run();

  if (provider === 'google') {
    if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
      return c.json({ error: 'Google OAuth not configured' }, 400);
    }
    const params = new URLSearchParams({
      client_id: c.env.GOOGLE_CLIENT_ID,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI || `${new URL(c.req.url).origin}/api/v1/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  if (provider === 'apple') {
    if (!c.env.APPLE_CLIENT_ID || !c.env.APPLE_TEAM_ID) {
      return c.json({ error: 'Apple OAuth not configured' }, 400);
    }
    const params = new URLSearchParams({
      client_id: c.env.APPLE_CLIENT_ID,
      redirect_uri: c.env.APPLE_REDIRECT_URI || `${new URL(c.req.url).origin}/api/v1/auth/oauth/apple/callback`,
      response_type: 'code',
      scope: 'name email',
      state,
      response_mode: 'form_post',
    });
    return c.redirect(`https://appleid.apple.com/auth/authorize?${params}`);
  }

  return c.json({ error: 'Unknown provider' }, 400);
});

// --- GET /google/callback --- Google OAuth callback

oauth.get('/google/callback', async (c) => {
  const db = c.get('db');
  const { code, state, error } = c.req.query();
  const dashboardUrl = c.env.DASHBOARD_URL || new URL(c.req.url).origin;

  if (error) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=missing_params`);
  }

  const stateRow = await db.prepare(
    "SELECT state FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > datetime('now')"
  ).bind(state, 'google').first();

  await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

  if (!stateRow) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=invalid_state`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID!,
      client_secret: c.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: c.env.GOOGLE_REDIRECT_URI || `${new URL(c.req.url).origin}/api/v1/auth/oauth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json() as { id_token?: string };
  if (!tokenData.id_token) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=no_id_token`);
  }

  const payload = JSON.parse(
    atob(tokenData.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
  ) as { sub: string; email?: string };

  if (!payload.email) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=no_email`);
  }

  const userId = await findOrCreateOAuthUser(db, 'google', payload.sub, payload.email);
  const session = await createSession(db, userId);

  return c.redirect(`${dashboardUrl}/auth/oauth-complete?token=${session.token}`);
});

// --- POST /apple/callback --- Apple OAuth callback (form_post)

oauth.post('/apple/callback', async (c) => {
  const db = c.get('db');
  const body = await c.req.parseBody();
  const code = body.code as string;
  const state = body.state as string;
  const errorParam = body.error as string;
  const userStr = body.user as string | undefined;

  const dashboardUrl = c.env.DASHBOARD_URL || new URL(c.req.url).origin;

  if (errorParam) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code || !state) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=missing_params`);
  }

  const stateRow = await db.prepare(
    "SELECT state FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > datetime('now')"
  ).bind(state, 'apple').first();

  await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

  if (!stateRow) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=invalid_state`);
  }

  const clientSecret = await generateAppleClientSecret(
    c.env.APPLE_TEAM_ID!,
    c.env.APPLE_CLIENT_ID!,
    c.env.APPLE_KEY_ID!,
    c.env.APPLE_PRIVATE_KEY!
  );

  const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      redirect_uri: c.env.APPLE_REDIRECT_URI || `${new URL(c.req.url).origin}/api/v1/auth/oauth/apple/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json() as { id_token?: string };
  if (!tokenData.id_token) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=no_id_token`);
  }

  const payload = JSON.parse(
    atob(tokenData.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
  ) as { sub: string; email?: string };

  let resolvedEmail = payload.email;

  if (!resolvedEmail && userStr) {
    try {
      const userData = JSON.parse(userStr);
      resolvedEmail = userData.email;
    } catch {
      // Apple user JSON could not be parsed
    }
  }

  if (!resolvedEmail) {
    // Subsequent Apple logins may not include email — look up existing link
    const existing = await db.prepare(
      'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
    ).bind('apple', payload.sub).first<{ user_id: string }>();

    if (!existing) {
      return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=no_email`);
    }

    const session = await createSession(db, existing.user_id);
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?token=${session.token}`);
  }

  const userId = await findOrCreateOAuthUser(db, 'apple', payload.sub, resolvedEmail);
  const session = await createSession(db, userId);

  return c.redirect(`${dashboardUrl}/auth/oauth-complete?token=${session.token}`);
});

export default oauth;
