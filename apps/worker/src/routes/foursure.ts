import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import type { DatabaseAdapter } from '../adapters/database';
import { createSession } from './auth';
import { generateToken, generateId } from '../utils/crypto';

// Use the same Hono type as oauth.ts
const foursure = new Hono<{ Bindings: Env; Variables: AdapterVariables & AuthVariables }>();

// --- Helper: find or create user from 4sure userinfo ---
async function findOrCreateUser(
  db: DatabaseAdapter,
  foursureUserId: string,
  email: string
): Promise<string> {
  // Check oauth_accounts for existing 4sure link
  const existing = await db.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
  ).bind('4sure', foursureUserId).first<{ user_id: string }>();

  if (existing) return existing.user_id;

  // Check if user exists by email
  const user = await db.prepare(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL'
  ).bind(email).first<{ id: string }>();

  const userId = user ? user.id : generateId();

  if (!user) {
    await db.prepare(
      'INSERT INTO users (id, email, storage_limit_bytes, created_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, email, 1073741824, new Date().toISOString()).run();
  }

  // Link 4sure account
  await db.prepare(
    'INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, email, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), userId, '4sure', foursureUserId, email, new Date().toISOString()).run();

  return userId;
}

// --- Helper: Generate PKCE code verifier and challenge ---
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const verifier = generateToken() + generateToken(); // long random string
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

// GET /config
foursure.get('/config', (c) => {
  return c.json({
    enabled: !!(c.env.FOURSURE_CLIENT_ID && c.env.FOURSURE_CLIENT_SECRET),
  });
});

// GET / — initiate OIDC flow
foursure.get('/', async (c) => {
  if (!c.env.FOURSURE_CLIENT_ID || !c.env.FOURSURE_CLIENT_SECRET) {
    return c.json({ error: '4sure not configured' }, 400);
  }

  const db = c.get('db');
  const issuer = c.env.FOURSURE_ISSUER || 'https://4sure.example.com';

  const state = generateToken();
  const { verifier, challenge } = await generatePKCE();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store state + code_verifier in oauth_states
  await db.prepare(
    'INSERT INTO oauth_states (state, provider, code_verifier, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(state, '4sure', verifier, new Date().toISOString(), expiresAt).run();

  const baseUrl = c.env.DASHBOARD_URL || new URL(c.req.url).origin;
  const redirectUri = `${baseUrl}/api/v1/auth/4sure/callback`;

  const params = new URLSearchParams({
    client_id: c.env.FOURSURE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email assurance',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return c.redirect(`${issuer}/oauth/authorize?${params}`);
});

// GET /callback — handle OIDC callback
foursure.get('/callback', async (c) => {
  const db = c.get('db');
  const { code, state, error } = c.req.query();
  const dashboardUrl = c.env.DASHBOARD_URL || new URL(c.req.url).origin;
  const issuer = c.env.FOURSURE_ISSUER || 'https://4sure.example.com';

  if (error) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=missing_params`);
  }

  // Verify state and retrieve code_verifier
  const stateRow = await db.prepare(
    "SELECT state, code_verifier FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > datetime('now')"
  ).bind(state, '4sure').first<{ state: string; code_verifier: string }>();

  await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

  if (!stateRow) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=invalid_state`);
  }

  const redirectUri = `${dashboardUrl}/api/v1/auth/4sure/callback`;

  // Exchange code for tokens (client_secret_post: form-urlencoded)
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: c.env.FOURSURE_CLIENT_ID!,
    client_secret: c.env.FOURSURE_CLIENT_SECRET!,
    code_verifier: stateRow.code_verifier,
  });

  const tokenRes = await fetch(`${issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });

  if (!tokenRes.ok) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=token_exchange_failed`);
  }

  const { access_token } = await tokenRes.json() as { access_token: string; id_token?: string };

  // Get user info
  const userinfoRes = await fetch(`${issuer}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userinfoRes.ok) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=userinfo_failed`);
  }

  const userInfo = await userinfoRes.json() as {
    sub: string;
    email: string;
    name?: string;
    assurance_level?: number;
  };

  if (!userInfo.email) {
    return c.redirect(`${dashboardUrl}/auth/oauth-complete?error=no_email`);
  }

  // Find or create user
  const userId = await findOrCreateUser(db, userInfo.sub, userInfo.email);

  // Create local session
  const session = await createSession(db, userId);

  return c.redirect(`${dashboardUrl}/auth/oauth-complete?token=${session.token}`);
});

export default foursure;
