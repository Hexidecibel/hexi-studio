import { Hono } from 'hono';
import type { Env, AuthVariables, AdapterVariables } from '../types';
import { requireAuth } from '../middleware/auth';
import { generateId, hashToken } from '../utils/crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAppSetting(db: any, key: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

async function getGoogleCredentials(
  db: any,
): Promise<{ clientId: string; clientSecret: string; redirectUri: string } | null> {
  const [clientId, clientSecret, redirectUri] = await Promise.all([
    getAppSetting(db, 'google_photos_client_id'),
    getAppSetting(db, 'google_photos_client_secret'),
    getAppSetting(db, 'google_photos_redirect_uri'),
  ]);
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

async function getValidAccessToken(db: any, userId: string): Promise<string | null> {
  const token = await db
    .prepare(
      'SELECT id, access_token, refresh_token, expires_at FROM google_photos_tokens WHERE user_id = ?',
    )
    .bind(userId)
    .first<{
      id: string;
      access_token: string;
      refresh_token: string | null;
      expires_at: string;
    }>();

  if (!token) return null;

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(token.expires_at).getTime();
  const now = Date.now();

  if (expiresAt - now > 5 * 60 * 1000) {
    return token.access_token;
  }

  // Try to refresh
  if (!token.refresh_token) return null;

  const creds = await getGoogleCredentials(db);
  if (!creds) return null;

  try {
    const resp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as { access_token: string; expires_in: number };
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await db
      .prepare(
        "UPDATE google_photos_tokens SET access_token = ?, expires_at = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      )
      .bind(data.access_token, newExpiresAt, token.id)
      .run();

    return data.access_token;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Content hash helper
// ---------------------------------------------------------------------------

async function computeContentHash(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Background import: shared album
// ---------------------------------------------------------------------------

async function processSharedImport(
  db: any,
  storage: any,
  transformer: any,
  user: { id: string },
  importId: string,
  imageUrls: Array<{ url: string; width: number | null; height: number | null }>,
  galleryId: string | null,
  targetType: 'gallery' | 'library',
): Promise<void> {
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  // Get current max sort_order
  let maxSortOrder = 0;
  if (targetType === 'gallery' && galleryId) {
    const maxResult = await db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM media WHERE gallery_id = ? AND deleted_at IS NULL',
      )
      .bind(galleryId)
      .first<{ max_order: number | null }>();
    maxSortOrder = maxResult?.max_order ?? 0;
  } else {
    const maxResult = await db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM library_media WHERE user_id = ? AND deleted_at IS NULL',
      )
      .bind(user.id)
      .first<{ max_order: number | null }>();
    maxSortOrder = maxResult?.max_order ?? 0;
  }

  for (let i = 0; i < imageUrls.length; i++) {
    const item = imageUrls[i];
    try {
      // Download original quality
      const downloadUrl = `${item.url}=d`;
      const photoResp = await fetch(downloadUrl);

      if (!photoResp.ok) {
        failed++;
        continue;
      }

      const photoBody = await photoResp.arrayBuffer();
      const contentType = photoResp.headers.get('Content-Type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const filename = `photo-${i + 1}.${ext}`;

      // Deduplication via content hash
      const contentHash = await computeContentHash(photoBody);
      const existingMedia =
        targetType === 'gallery'
          ? await db
              .prepare(
                "SELECT id FROM media WHERE user_id = ? AND metadata LIKE ? AND deleted_at IS NULL",
              )
              .bind(user.id, `%"contentHash":"${contentHash}"%`)
              .first()
          : await db
              .prepare(
                "SELECT id FROM library_media WHERE user_id = ? AND metadata LIKE ? AND deleted_at IS NULL",
              )
              .bind(user.id, `%"contentHash":"${contentHash}"%`)
              .first();

      if (existingMedia) {
        skipped++;
        continue;
      }

      // Run quality analysis (non-fatal)
      const metadataObj: Record<string, unknown> = { contentHash };
      if (contentType.startsWith('image/') && transformer.analyze) {
        try {
          const analysis = await transformer.analyze(photoBody);
          if (analysis) {
            metadataObj.qualityScore = analysis.qualityScore;
            metadataObj.entropy = analysis.entropy;
          }
        } catch (err) {
          console.error('Image analysis failed during import:', err);
        }
      }
      const metadata = JSON.stringify(metadataObj);

      const mediaId = generateId();
      maxSortOrder++;

      if (targetType === 'gallery' && galleryId) {
        const r2Key = `tenants/${user.id}/media/${mediaId}/original.${ext}`;
        await storage.put(r2Key, photoBody, { contentType });

        await db
          .prepare(
            `INSERT INTO media (id, gallery_id, user_id, filename, content_type, file_size, r2_key, media_type, alt, sort_order, status, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
          )
          .bind(
            mediaId,
            galleryId,
            user.id,
            filename,
            contentType,
            photoBody.byteLength,
            r2Key,
            'image',
            filename.replace(/\.[^.]+$/, ''),
            maxSortOrder,
            metadata,
          )
          .run();
      } else {
        const r2Key = `tenants/${user.id}/library/${mediaId}/original.${ext}`;
        await storage.put(r2Key, photoBody, { contentType });

        await db
          .prepare(
            `INSERT INTO library_media (id, user_id, filename, content_type, file_size, r2_key, media_type, alt, sort_order, status, tags, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', '[]', ?)`,
          )
          .bind(
            mediaId,
            user.id,
            filename,
            contentType,
            photoBody.byteLength,
            r2Key,
            'image',
            filename.replace(/\.[^.]+$/, ''),
            maxSortOrder,
            metadata,
          )
          .run();
      }

      // Update user storage
      await db
        .prepare('UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?')
        .bind(photoBody.byteLength, user.id)
        .run();

      imported++;

      // Update progress every 5 items
      if (imported % 5 === 0 || imported + failed + skipped === imageUrls.length) {
        await db
          .prepare(
            "UPDATE google_photos_imports SET imported_items = ?, failed_items = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
          )
          .bind(imported, failed, importId)
          .run();
      }
    } catch (err) {
      console.error(`Failed to import shared album photo ${i}:`, err);
      failed++;
    }
  }

  // Mark complete
  const finalStatus = failed === imageUrls.length ? 'failed' : 'completed';
  await db
    .prepare(
      "UPDATE google_photos_imports SET status = ?, imported_items = ?, failed_items = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    )
    .bind(finalStatus, imported, failed, importId)
    .run();

  console.log(
    `Shared import ${importId} complete: ${imported} imported, ${failed} failed, ${skipped} skipped`,
  );
}

// ---------------------------------------------------------------------------
// Background import: album via API
// ---------------------------------------------------------------------------

async function processAlbumImport(
  db: any,
  storage: any,
  transformer: any,
  user: { id: string },
  importId: string,
  imageItems: Array<{
    id: string;
    mimeType: string;
    baseUrl: string;
    filename: string;
    mediaMetadata?: { width?: string; height?: string };
  }>,
  galleryId: string | null,
  targetType: 'gallery' | 'library',
): Promise<void> {
  let imported = 0;
  let failed = 0;
  let skipped = 0;

  // Get current max sort_order
  let maxSortOrder = 0;
  if (targetType === 'gallery' && galleryId) {
    const maxResult = await db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM media WHERE gallery_id = ? AND deleted_at IS NULL',
      )
      .bind(galleryId)
      .first<{ max_order: number | null }>();
    maxSortOrder = maxResult?.max_order ?? 0;
  } else {
    const maxResult = await db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM library_media WHERE user_id = ? AND deleted_at IS NULL',
      )
      .bind(user.id)
      .first<{ max_order: number | null }>();
    maxSortOrder = maxResult?.max_order ?? 0;
  }

  for (const item of imageItems) {
    try {
      // Download original from Google Photos
      const downloadUrl = `${item.baseUrl}=d`;
      const photoResp = await fetch(downloadUrl);

      if (!photoResp.ok) {
        failed++;
        continue;
      }

      const photoBody = await photoResp.arrayBuffer();
      const contentType = item.mimeType || 'image/jpeg';
      const filename = item.filename || `google-photo-${item.id}.jpg`;
      const ext = filename.split('.').pop() || 'jpg';

      // Deduplication via content hash
      const contentHash = await computeContentHash(photoBody);
      const existingMedia =
        targetType === 'gallery'
          ? await db
              .prepare(
                "SELECT id FROM media WHERE user_id = ? AND metadata LIKE ? AND deleted_at IS NULL",
              )
              .bind(user.id, `%"contentHash":"${contentHash}"%`)
              .first()
          : await db
              .prepare(
                "SELECT id FROM library_media WHERE user_id = ? AND metadata LIKE ? AND deleted_at IS NULL",
              )
              .bind(user.id, `%"contentHash":"${contentHash}"%`)
              .first();

      if (existingMedia) {
        skipped++;
        continue;
      }

      // Run quality analysis (non-fatal)
      const metadataObj: Record<string, unknown> = { contentHash };
      if (contentType.startsWith('image/') && transformer.analyze) {
        try {
          const analysis = await transformer.analyze(photoBody);
          if (analysis) {
            metadataObj.qualityScore = analysis.qualityScore;
            metadataObj.entropy = analysis.entropy;
          }
        } catch (err) {
          console.error('Image analysis failed during import:', err);
        }
      }
      const metadata = JSON.stringify(metadataObj);

      // Get dimensions from Google metadata
      const width = item.mediaMetadata?.width ? parseInt(item.mediaMetadata.width, 10) : null;
      const height = item.mediaMetadata?.height ? parseInt(item.mediaMetadata.height, 10) : null;

      const mediaId = generateId();
      maxSortOrder++;

      if (targetType === 'gallery' && galleryId) {
        const r2Key = `tenants/${user.id}/media/${mediaId}/original.${ext}`;

        await storage.put(r2Key, photoBody, { contentType });

        await db
          .prepare(
            `INSERT INTO media (id, gallery_id, user_id, filename, content_type, file_size, r2_key, media_type, alt, sort_order, status, metadata, width, height)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)`,
          )
          .bind(
            mediaId,
            galleryId,
            user.id,
            filename,
            contentType,
            photoBody.byteLength,
            r2Key,
            'image',
            filename.replace(/\.[^.]+$/, ''),
            maxSortOrder,
            metadata,
            width,
            height,
          )
          .run();
      } else {
        const r2Key = `tenants/${user.id}/library/${mediaId}/original.${ext}`;

        await storage.put(r2Key, photoBody, { contentType });

        await db
          .prepare(
            `INSERT INTO library_media (id, user_id, filename, content_type, file_size, r2_key, media_type, alt, sort_order, status, tags, metadata, width, height)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', '[]', ?, ?, ?)`,
          )
          .bind(
            mediaId,
            user.id,
            filename,
            contentType,
            photoBody.byteLength,
            r2Key,
            'image',
            filename.replace(/\.[^.]+$/, ''),
            maxSortOrder,
            metadata,
            width,
            height,
          )
          .run();
      }

      // Update user storage
      await db
        .prepare('UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?')
        .bind(photoBody.byteLength, user.id)
        .run();

      imported++;

      // Update progress every 5 items
      if (imported % 5 === 0 || imported + failed + skipped === imageItems.length) {
        await db
          .prepare(
            "UPDATE google_photos_imports SET imported_items = ?, failed_items = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
          )
          .bind(imported, failed, importId)
          .run();
      }
    } catch (err) {
      console.error(`Failed to import album item ${item.id}:`, err);
      failed++;
    }
  }

  // Mark complete
  const finalStatus = failed === imageItems.length ? 'failed' : 'completed';
  await db
    .prepare(
      "UPDATE google_photos_imports SET status = ?, imported_items = ?, failed_items = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    )
    .bind(finalStatus, imported, failed, importId)
    .run();

  console.log(
    `Album import ${importId} complete: ${imported} imported, ${failed} failed, ${skipped} skipped`,
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const googlePhotosRoutes = new Hono<{
  Bindings: Env;
  Variables: AdapterVariables & AuthVariables;
}>();

// Auth middleware for all routes except callback and connect.
// Callback is called by Google redirect — no auth token available.
// Connect is a browser navigation — auth token is passed via query param.
googlePhotosRoutes.use('*', async (c, next) => {
  if (c.req.path.endsWith('/callback') || c.req.path.endsWith('/connect')) {
    return next();
  }
  return requireAuth(c, next);
});

// ---------------------------------------------------------------------------
// GET /connect — Initiate Google OAuth flow
// ---------------------------------------------------------------------------

googlePhotosRoutes.get('/connect', async (c) => {
  const db = c.get('db');

  // Auth via query param (browser navigation, no Authorization header)
  const token = c.req.query('_auth');
  if (!token) {
    return c.json({ error: 'Missing authentication' }, 401);
  }

  const tokenHash = await hashToken(token);
  const session = await db
    .prepare(
      `SELECT s.user_id, u.email, u.name, u.plan, u.storage_used_bytes, u.storage_limit_bytes
       FROM sessions s JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND u.deleted_at IS NULL`,
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

  const user = {
    id: session.user_id,
    email: session.email,
    name: session.name,
    plan: session.plan,
    storageUsedBytes: session.storage_used_bytes,
    storageLimitBytes: session.storage_limit_bytes,
    isAdmin: false,
  };

  const creds = await getGoogleCredentials(db);

  if (!creds) {
    return c.json(
      { error: 'Google Photos integration is not configured. Ask your admin to set it up.' },
      400,
    );
  }

  // Encode user ID in state for the callback
  const state = generateId() + ':' + user.id;

  // Store the state for validation
  await db
    .prepare(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    )
    .bind(
      `gphotos_state_${state.split(':')[0]}`,
      JSON.stringify({ userId: user.id, createdAt: new Date().toISOString() }),
    )
    .run();

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly https://www.googleapis.com/auth/photoslibrary.readonly',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ---------------------------------------------------------------------------
// GET /callback — OAuth callback (no auth required)
// ---------------------------------------------------------------------------

googlePhotosRoutes.get('/callback', async (c) => {
  const db = c.get('db');
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    const dashboardUrl = c.env.DASHBOARD_URL || '';
    return c.redirect(`${dashboardUrl}/account?gphotos=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400);
  }

  // Validate state and extract user ID
  const stateId = state.split(':')[0];
  const userId = state.split(':')[1];

  if (!userId) {
    return c.json({ error: 'Invalid state' }, 400);
  }

  // Clean up state
  await db.prepare('DELETE FROM app_settings WHERE key = ?').bind(`gphotos_state_${stateId}`).run();

  const creds = await getGoogleCredentials(db);
  if (!creds) {
    return c.json({ error: 'Google Photos not configured' }, 500);
  }

  // Exchange code for tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: creds.redirectUri,
    }),
  });

  if (!tokenResp.ok) {
    const errBody = await tokenResp.text();
    console.error('Google token exchange failed:', errBody);
    const dashboardUrl = c.env.DASHBOARD_URL || '';
    return c.redirect(`${dashboardUrl}/account?gphotos=error&reason=token_exchange_failed`);
  }

  const tokenData = (await tokenResp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
  const id = generateId();

  // Upsert token (one per user)
  await db
    .prepare(
      `INSERT INTO google_photos_tokens (id, user_id, access_token, refresh_token, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = COALESCE(excluded.refresh_token, google_photos_tokens.refresh_token),
       expires_at = excluded.expires_at,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    )
    .bind(id, userId, tokenData.access_token, tokenData.refresh_token || null, expiresAt)
    .run();

  const dashboardUrl = c.env.DASHBOARD_URL || '';
  return c.redirect(`${dashboardUrl}/account?gphotos=connected`);
});

// ---------------------------------------------------------------------------
// GET /status — Check connection status
// ---------------------------------------------------------------------------

googlePhotosRoutes.get('/status', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const token = await db
    .prepare(
      'SELECT id, expires_at, updated_at FROM google_photos_tokens WHERE user_id = ?',
    )
    .bind(user.id)
    .first<{ id: string; expires_at: string; updated_at: string }>();

  if (!token) {
    return c.json({ connected: false });
  }

  return c.json({
    connected: true,
    expiresAt: token.expires_at,
    updatedAt: token.updated_at,
  });
});

// ---------------------------------------------------------------------------
// POST /disconnect — Remove tokens
// ---------------------------------------------------------------------------

googlePhotosRoutes.post('/disconnect', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  await db.prepare('DELETE FROM google_photos_tokens WHERE user_id = ?').bind(user.id).run();

  return c.json({ message: 'Disconnected from Google Photos' });
});

// ---------------------------------------------------------------------------
// POST /picker-session — Create a Google Photos Picker session
// ---------------------------------------------------------------------------

googlePhotosRoutes.post('/picker-session', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const accessToken = await getValidAccessToken(db, user.id);
  if (!accessToken) {
    return c.json({ error: 'Not connected to Google Photos. Please connect first.' }, 401);
  }

  const resp = await fetch('https://photospicker.googleapis.com/v1/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Failed to create picker session:', errText);
    if (resp.status === 401) {
      return c.json({ error: 'Google Photos authorization expired. Please reconnect.' }, 401);
    }
    return c.json({ error: 'Failed to create picker session' }, 500);
  }

  const session = (await resp.json()) as {
    id: string;
    pickerUri: string;
    pollingConfig: { pollInterval: string; timeoutIn: string };
  };

  return c.json({
    sessionId: session.id,
    pickerUri: session.pickerUri,
    pollingConfig: session.pollingConfig,
  });
});

// ---------------------------------------------------------------------------
// GET /picker-session/:id — Poll a picker session for selected items
// ---------------------------------------------------------------------------

googlePhotosRoutes.get('/picker-session/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const sessionId = c.req.param('id');

  const accessToken = await getValidAccessToken(db, user.id);
  if (!accessToken) {
    return c.json({ error: 'Not connected to Google Photos' }, 401);
  }

  const resp = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Failed to poll picker session:', errText);
    return c.json({ error: 'Failed to poll picker session' }, 500);
  }

  const session = (await resp.json()) as {
    id: string;
    pickerUri: string;
    pollingConfig: { pollInterval: string; timeoutIn: string };
    mediaItemsSet?: boolean;
  };

  // If the user has confirmed their selection, fetch the chosen items
  let mediaItems: Array<{
    id: string;
    mimeType: string;
    mediaFile: { baseUrl: string; mimeType: string; filename: string };
  }> = [];

  if (session.mediaItemsSet) {
    let pageToken: string | undefined;
    do {
      const itemsUrl = new URL(
        `https://photospicker.googleapis.com/v1/sessions/${sessionId}/mediaItems`,
      );
      if (pageToken) itemsUrl.searchParams.set('pageToken', pageToken);

      const itemsResp = await fetch(itemsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (itemsResp.ok) {
        const itemsData = (await itemsResp.json()) as {
          mediaItems?: Array<{
            id: string;
            mimeType: string;
            mediaFile: { baseUrl: string; mimeType: string; filename: string };
          }>;
          nextPageToken?: string;
        };
        if (itemsData.mediaItems) {
          mediaItems = mediaItems.concat(itemsData.mediaItems);
        }
        pageToken = itemsData.nextPageToken;
      } else {
        break;
      }
    } while (pageToken);
  }

  return c.json({
    sessionId: session.id,
    pickerUri: session.pickerUri,
    mediaItemsSet: session.mediaItemsSet || false,
    mediaItems,
  });
});

// ---------------------------------------------------------------------------
// POST /import — Download selected Google Photos into gallery or library
// ---------------------------------------------------------------------------

googlePhotosRoutes.post('/import', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const storage = c.get('storage');

  const body = await c
    .req.json<{
      sessionId: string;
      galleryId?: string;
      targetType?: 'gallery' | 'library';
      mediaItems: Array<{
        id: string;
        mimeType: string;
        mediaFile: { baseUrl: string; mimeType: string; filename: string };
      }>;
    }>()
    .catch(() => null);

  if (!body || !body.mediaItems || body.mediaItems.length === 0) {
    return c.json({ error: 'No media items to import' }, 400);
  }

  const targetType = body.targetType || 'gallery';

  if (targetType === 'gallery' && !body.galleryId) {
    return c.json({ error: 'galleryId is required for gallery imports' }, 400);
  }

  // Verify gallery exists and belongs to user
  if (body.galleryId) {
    const gallery = await db
      .prepare('SELECT id FROM galleries WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .bind(body.galleryId, user.id)
      .first();
    if (!gallery) {
      return c.json({ error: 'Gallery not found' }, 404);
    }
  }

  const accessToken = await getValidAccessToken(db, user.id);
  if (!accessToken) {
    return c.json({ error: 'Google Photos authorization expired. Please reconnect.' }, 401);
  }

  // Create import record
  const importId = generateId();
  await db
    .prepare(
      'INSERT INTO google_photos_imports (id, user_id, gallery_id, target_type, status, total_items) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(importId, user.id, body.galleryId || null, targetType, 'processing', body.mediaItems.length)
    .run();

  // Process items synchronously — works in both Workers and local mode.
  // The frontend shows a loading state while this request is in flight.
  let imported = 0;
  let failed = 0;

  // Get current max sort_order
  let maxSortOrder = 0;
  if (targetType === 'gallery' && body.galleryId) {
    const maxResult = await db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM media WHERE gallery_id = ? AND deleted_at IS NULL',
      )
      .bind(body.galleryId)
      .first<{ max_order: number | null }>();
    maxSortOrder = maxResult?.max_order ?? 0;
  } else {
    const maxResult = await db
      .prepare(
        'SELECT MAX(sort_order) as max_order FROM library_media WHERE user_id = ? AND deleted_at IS NULL',
      )
      .bind(user.id)
      .first<{ max_order: number | null }>();
    maxSortOrder = maxResult?.max_order ?? 0;
  }

  for (const item of body.mediaItems) {
    try {
      // Download from Google Photos (append =d for download)
      const downloadUrl = item.mediaFile.baseUrl.includes('=')
        ? item.mediaFile.baseUrl + '-d'
        : item.mediaFile.baseUrl + '=d';

      const photoResp = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!photoResp.ok) {
        failed++;
        continue;
      }

      const photoBody = await photoResp.arrayBuffer();
      const contentType = item.mediaFile.mimeType || item.mimeType || 'image/jpeg';
      const filename = item.mediaFile.filename || `google-photo-${item.id}.jpg`;
      const ext = filename.split('.').pop() || 'jpg';

      const mediaId = generateId();
      maxSortOrder++;

      if (targetType === 'gallery' && body.galleryId) {
        const r2Key = `tenants/${user.id}/media/${mediaId}/original.${ext}`;

        await storage.put(r2Key, photoBody, { contentType });

        await db
          .prepare(
            `INSERT INTO media (id, gallery_id, user_id, filename, content_type, file_size, r2_key, media_type, alt, sort_order, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')`,
          )
          .bind(
            mediaId,
            body.galleryId,
            user.id,
            filename,
            contentType,
            photoBody.byteLength,
            r2Key,
            'image',
            filename.replace(/\.[^.]+$/, ''),
            maxSortOrder,
          )
          .run();

        await db
          .prepare('UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?')
          .bind(photoBody.byteLength, user.id)
          .run();
      } else {
        const r2Key = `tenants/${user.id}/library/${mediaId}/original.${ext}`;

        await storage.put(r2Key, photoBody, { contentType });

        await db
          .prepare(
            `INSERT INTO library_media (id, user_id, filename, content_type, file_size, r2_key, media_type, alt, sort_order, status, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', '[]')`,
          )
          .bind(
            mediaId,
            user.id,
            filename,
            contentType,
            photoBody.byteLength,
            r2Key,
            'image',
            filename.replace(/\.[^.]+$/, ''),
            maxSortOrder,
          )
          .run();

        await db
          .prepare('UPDATE users SET storage_used_bytes = storage_used_bytes + ? WHERE id = ?')
          .bind(photoBody.byteLength, user.id)
          .run();
      }

      imported++;

      // Update progress
      await db
        .prepare(
          "UPDATE google_photos_imports SET imported_items = ?, failed_items = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
        )
        .bind(imported, failed, importId)
        .run();
    } catch (err) {
      console.error(`Failed to import Google Photos item ${item.id}:`, err);
      failed++;
    }
  }

  // Mark complete
  const finalStatus = failed === body.mediaItems.length ? 'failed' : 'completed';
  await db
    .prepare(
      "UPDATE google_photos_imports SET status = ?, imported_items = ?, failed_items = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    )
    .bind(finalStatus, imported, failed, importId)
    .run();

  return c.json({
    importId,
    totalItems: body.mediaItems.length,
    importedItems: imported,
    failedItems: failed,
    status: finalStatus,
  });
});

// ---------------------------------------------------------------------------
// GET /albums — List Google Photos albums
// ---------------------------------------------------------------------------

googlePhotosRoutes.get('/albums', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const accessToken = await getValidAccessToken(db, user.id);
  if (!accessToken) {
    return c.json({ error: 'Not connected to Google Photos. Please connect first.' }, 401);
  }

  const pageToken = c.req.query('pageToken') || undefined;
  const pageSize = 50;

  const url = new URL('https://photoslibrary.googleapis.com/v1/albums');
  url.searchParams.set('pageSize', String(pageSize));
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('Failed to list albums:', errText);
    if (resp.status === 401) {
      return c.json({ error: 'Google Photos authorization expired. Please reconnect.' }, 401);
    }
    if (resp.status === 403) {
      return c.json({ error: 'Album access not granted. Please reconnect Google Photos to grant album permissions.' }, 403);
    }
    return c.json({ error: 'Failed to list albums' }, 500);
  }

  const data = (await resp.json()) as {
    albums?: Array<{
      id: string;
      title: string;
      productUrl: string;
      mediaItemsCount: string;
      coverPhotoBaseUrl: string;
      coverPhotoMediaItemId: string;
    }>;
    nextPageToken?: string;
  };

  return c.json({
    albums: (data.albums || []).map((a) => ({
      id: a.id,
      title: a.title,
      itemCount: parseInt(a.mediaItemsCount || '0', 10),
      coverUrl: a.coverPhotoBaseUrl ? `${a.coverPhotoBaseUrl}=w300-h200-c` : null,
    })),
    nextPageToken: data.nextPageToken || null,
  });
});

// ---------------------------------------------------------------------------
// POST /import-album — Import all photos from a Google Photos album
// ---------------------------------------------------------------------------

googlePhotosRoutes.post('/import-album', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const storage = c.get('storage');

  const body = await c
    .req.json<{
      albumId: string;
      galleryId?: string;
      targetType?: 'gallery' | 'library';
    }>()
    .catch(() => null);

  if (!body || !body.albumId) {
    return c.json({ error: 'albumId is required' }, 400);
  }

  const targetType = body.targetType || 'gallery';

  if (targetType === 'gallery' && !body.galleryId) {
    return c.json({ error: 'galleryId is required for gallery imports' }, 400);
  }

  // Verify gallery exists and belongs to user
  if (body.galleryId) {
    const gallery = await db
      .prepare('SELECT id FROM galleries WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .bind(body.galleryId, user.id)
      .first();
    if (!gallery) {
      return c.json({ error: 'Gallery not found' }, 404);
    }
  }

  const accessToken = await getValidAccessToken(db, user.id);
  if (!accessToken) {
    return c.json({ error: 'Google Photos authorization expired. Please reconnect.' }, 401);
  }

  // Fetch all media items from the album (paginated)
  let allMediaItems: Array<{
    id: string;
    mimeType: string;
    baseUrl: string;
    filename: string;
    mediaMetadata?: { width?: string; height?: string };
  }> = [];

  let pageToken: string | undefined;
  do {
    const searchResp = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        albumId: body.albumId,
        pageSize: 100,
        ...(pageToken ? { pageToken } : {}),
      }),
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      console.error('Failed to list album media:', errText);
      if (searchResp.status === 401) {
        return c.json({ error: 'Google Photos authorization expired. Please reconnect.' }, 401);
      }
      return c.json({ error: 'Failed to fetch album contents' }, 500);
    }

    const searchData = (await searchResp.json()) as {
      mediaItems?: Array<{
        id: string;
        mimeType: string;
        baseUrl: string;
        filename: string;
        mediaMetadata?: { width?: string; height?: string };
      }>;
      nextPageToken?: string;
    };

    if (searchData.mediaItems) {
      allMediaItems = allMediaItems.concat(searchData.mediaItems);
    }
    pageToken = searchData.nextPageToken;
  } while (pageToken);

  if (allMediaItems.length === 0) {
    return c.json({ error: 'Album is empty' }, 400);
  }

  // Only import images (skip videos for now)
  const imageItems = allMediaItems.filter((item) => item.mimeType.startsWith('image/'));

  // Create import record
  const importId = generateId();
  await db
    .prepare(
      'INSERT INTO google_photos_imports (id, user_id, gallery_id, target_type, status, total_items) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(importId, user.id, body.galleryId || null, targetType, 'processing', imageItems.length)
    .run();

  // Get image transformer for quality scoring
  const transformer = c.get('imageTransformer');

  // Return immediately
  const response = c.json({
    importId,
    totalItems: imageItems.length,
    importedItems: 0,
    failedItems: 0,
    status: 'processing',
  });

  // Process in background (don't await)
  processAlbumImport(
    db,
    storage,
    transformer,
    { id: user.id },
    importId,
    imageItems,
    body.galleryId || null,
    targetType,
  ).catch((err) => {
    console.error('Background album import failed:', err);
  });

  return response;
});

// ---------------------------------------------------------------------------
// POST /import-shared — Import from a shared Google Photos album URL
// ---------------------------------------------------------------------------

googlePhotosRoutes.post('/import-shared', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const storage = c.get('storage');

  const body = await c
    .req.json<{
      url: string;
      galleryId?: string;
      targetType?: 'gallery' | 'library';
    }>()
    .catch(() => null);

  if (!body || !body.url) {
    return c.json({ error: 'Shared album URL is required' }, 400);
  }

  const targetType = body.targetType || 'gallery';

  if (targetType === 'gallery' && !body.galleryId) {
    return c.json({ error: 'galleryId is required for gallery imports' }, 400);
  }

  // Verify gallery exists and belongs to user
  if (body.galleryId) {
    const gallery = await db
      .prepare('SELECT id FROM galleries WHERE id = ? AND user_id = ? AND deleted_at IS NULL')
      .bind(body.galleryId, user.id)
      .first();
    if (!gallery) {
      return c.json({ error: 'Gallery not found' }, 404);
    }
  }

  // Fetch the shared album page (follow redirects for short links)
  let pageHtml: string;
  try {
    const resp = await fetch(body.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HexiGallery/1.0)',
      },
      redirect: 'follow',
    });
    if (!resp.ok) {
      return c.json({ error: `Failed to fetch album page (${resp.status})` }, 400);
    }
    pageHtml = await resp.text();
  } catch (err) {
    console.error('Failed to fetch shared album:', err);
    return c.json({ error: 'Failed to fetch shared album URL' }, 400);
  }

  // Extract image URLs from the page
  // Google Photos embeds data in AF_initDataCallback blocks
  // Image URLs are lh3.googleusercontent.com URLs
  const imageUrls: Array<{ url: string; width: number | null; height: number | null }> = [];

  // Method 1: Extract from AF_initDataCallback data blocks
  const callbackRegex = /AF_initDataCallback\(\{[^}]*data:(\[[\s\S]*?\])\s*\}\s*\)/g;
  let match;
  while ((match = callbackRegex.exec(pageHtml)) !== null) {
    try {
      // This is a JS array literal, not strict JSON - but image URLs are plain strings
      const dataStr = match[1];
      // Extract all lh3.googleusercontent.com URLs from the data
      const urlRegex = /(https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\-\/]+)/g;
      let urlMatch;
      const seenUrls = new Set<string>();
      while ((urlMatch = urlRegex.exec(dataStr)) !== null) {
        const url = urlMatch[1];
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          imageUrls.push({ url, width: null, height: null });
        }
      }
    } catch {
      // Skip unparseable blocks
    }
  }

  // Method 2: Fallback - extract all lh3 URLs from the entire page
  if (imageUrls.length === 0) {
    const urlRegex = /(https:\/\/lh3\.googleusercontent\.com\/[a-zA-Z0-9_\-\/]+)/g;
    let urlMatch;
    const seenUrls = new Set<string>();
    while ((urlMatch = urlRegex.exec(pageHtml)) !== null) {
      const url = urlMatch[1];
      if (!seenUrls.has(url) && url.length > 60) {
        seenUrls.add(url);
        imageUrls.push({ url, width: null, height: null });
      }
    }
  }

  if (imageUrls.length === 0) {
    return c.json({ error: 'No photos found in the shared album. Make sure the link is a valid shared Google Photos album.' }, 400);
  }

  // Create import record
  const importId = generateId();
  await db
    .prepare(
      'INSERT INTO google_photos_imports (id, user_id, gallery_id, target_type, status, total_items) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(importId, user.id, body.galleryId || null, targetType, 'processing', imageUrls.length)
    .run();

  // Get image transformer for quality scoring
  const transformer = c.get('imageTransformer');

  // Return immediately
  const response = c.json({
    importId,
    totalItems: imageUrls.length,
    importedItems: 0,
    failedItems: 0,
    status: 'processing',
  });

  // Process in background (don't await)
  processSharedImport(
    db,
    storage,
    transformer,
    { id: user.id },
    importId,
    imageUrls,
    body.galleryId || null,
    targetType,
  ).catch((err) => {
    console.error('Background shared import failed:', err);
  });

  return response;
});

// ---------------------------------------------------------------------------
// GET /imports/:id — Poll import progress
// ---------------------------------------------------------------------------

googlePhotosRoutes.get('/imports/:id', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const importId = c.req.param('id');

  const importJob = await db
    .prepare(
      'SELECT id, gallery_id, target_type, status, total_items, imported_items, failed_items, error, created_at, updated_at FROM google_photos_imports WHERE id = ? AND user_id = ?',
    )
    .bind(importId, user.id)
    .first();

  if (!importJob) {
    return c.json({ error: 'Import not found' }, 404);
  }

  return c.json({ data: importJob });
});
