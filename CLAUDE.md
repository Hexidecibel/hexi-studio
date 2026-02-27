# hexi-photo-gallery

A self-hosted photo gallery platform — image admin, gallery builder, and media CDN. Manages galleries and standalone media assets for multiple client sites via API. Deployable to Cloudflare (Workers + D1 + R2) or self-hostable.

## Tech Stack

- **Gallery component:** React 18 + TypeScript, published as `@hexi/gallery` npm package
- **Worker API:** Hono framework with pluggable storage adapters. Runs on Cloudflare Workers (D1 + R2) or Node.js/Bun (SQLite + local filesystem + sharp)
- **Dashboard:** React 18 SPA (Vite), manages galleries, media library, and account settings
- **Embed script:** Lightweight script for embedding galleries on any HTML page
- **Shared:** Common types/utilities shared across packages
- **Build:** Turborepo monorepo, Vite for frontend, Wrangler for worker

## Monorepo Structure

```
apps/
├── worker/              # Cloudflare Worker API
│   ├── migrations/      # D1 SQL migrations (0001_initial, 0002_auto_login_and_library)
│   └── src/
│       ├── index.ts     # Cloudflare Worker entry point (re-exports app)
│       ├── app.ts       # Shared Hono app setup (routes, middleware, adapters)
│       ├── server.ts    # Node.js/Bun entry point (local mode, dotenv, serves dashboard SPA)
│       ├── types.ts     # Env bindings, AuthUser, AuthVariables
│       ├── routes/
│       │   ├── auth.ts      # Magic link + auto-login tokens + sessions
│       │   ├── galleries.ts # Gallery CRUD
│       │   ├── media.ts     # Gallery media upload/manage
│       │   ├── library.ts   # Standalone media library (not gallery-bound)
│       │   ├── public.ts    # Public gallery + library media endpoints
│       │   └── cdn.ts       # Image serving with transforms (resize, format, quality)
│       ├── middleware/
│       │   ├── auth.ts      # requireAuth middleware (Bearer token → session lookup)
│       │   └── rateLimit.ts # In-memory rate limiting
│       ├── utils/
│       │   ├── crypto.ts    # generateToken, hashToken, generateId
│       │   └── validation.ts # Email, slug, media type validation
│       ├── adapters/
│       │   ├── index.ts             # Factory: createAdapters() selects runtime
│       │   ├── storage.ts           # StorageAdapter interface
│       │   ├── database.ts          # DatabaseAdapter interface
│       │   ├── image-transform.ts   # ImageTransformer interface
│       │   ├── r2-storage.ts        # Cloudflare R2 implementation
│       │   ├── d1-database.ts       # Cloudflare D1 implementation
│       │   ├── passthrough-transform.ts  # No-op image transform (CF mode)
│       │   ├── local-storage.ts     # Local filesystem implementation
│       │   ├── sqlite-database.ts   # better-sqlite3 implementation
│       │   └── sharp-transform.ts   # sharp image transform (local mode)
│       └── services/
│           └── email.ts     # SMTP or Resend email sending
├── dashboard/           # React SPA
│   └── src/
│       ├── App.tsx          # Routes (login, verify, auto-login, galleries, library, account)
│       ├── components/
│       │   ├── Layout.tsx   # Dashboard shell with header nav
│       │   └── MediaGrid.tsx # Upload, reorder, edit media grid
│       ├── contexts/
│       │   └── AuthContext.tsx # Auth state, login/logout, token storage
│       ├── lib/
│       │   └── api.ts       # Typed API client (auth, galleries, media, library)
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── VerifyPage.tsx
│       │   ├── AutoLoginPage.tsx    # Token-based instant login
│       │   ├── AccountPage.tsx      # User info + auto-login token management
│       │   ├── GalleryListPage.tsx
│       │   ├── GalleryEditorPage.tsx
│       │   ├── GallerySettingsPage.tsx
│       │   ├── EmbedPage.tsx
│       │   ├── PreviewPage.tsx
│       │   └── LibraryPage.tsx      # Standalone media library
│       └── styles/
│           └── global.css
└── embed/               # Embed script for HTML pages
packages/
├── gallery/             # @hexi/gallery React component (npm package)
│   └── src/             # Gallery, Lightbox, layout engines (grid, masonry, justified)
└── shared/              # @hexi/shared types and utilities
```

## Commands

- `npm run dev` — Start all dev servers (turbo)
- `npm run build` — Build all packages (turbo)
- `npm run test` — Run tests (vitest)
- `npm run lint` — Run linter

### Per-package
- `apps/worker`: `npm run dev` (wrangler), `npm run build` (wrangler deploy --dry-run)
- `apps/dashboard`: `npm run dev` (vite), `npm run build` (tsc + vite build)

### Local mode (Node.js, self-hosted)
- `apps/worker`: `npm run dev:local` (tsx watch), `npm run build:local` (tsup), `npm run start:local` (node)
- Config: `apps/worker/.env.local` (auto-loaded via dotenv)
- Migrations: `cat migrations/*.sql | sqlite3 /path/to/hexi.db`

### Docker (production self-hosted)
- `docker compose build` — Build production image (3-stage: build → deps → runtime)
- `docker compose up -d` — Start container
- `docker compose logs -f` — Tail logs
- Compose file: `/mnt/hexinas/apps/hexi-gallery/docker-compose.yml`
- Data volume: `/mnt/hexinas/hexi-media` → `/data` (SQLite DB + media files)
- The API serves the built dashboard SPA from `./public` (copied during Docker build)

## Key Architecture Patterns

- **Auth flow:** Magic link email → verify → session token (30-day), OR auto-login token → instant session
- **Auto-login tokens:** Reusable, revocable tokens per client. Hash stored in DB, plaintext shown once at creation
- **Data ownership:** All resources scoped by user_id. Queries always filter by user
- **Soft deletes:** `deleted_at` column, all queries check `IS NULL`
- **Storage tracking:** `storage_used_bytes` incremented/decremented on upload/delete
- **Media status:** `pending` → `ready` (three-step upload: get URL → upload binary → confirm with metadata)
- **CDN transforms:** `/cdn/:tenantId/:mediaId/w_400,q_75,f_auto` — width, quality, format params
- **File keys:** `tenants/{userId}/media/{mediaId}/original.{ext}` (gallery), `tenants/{userId}/library/{mediaId}/original.{ext}` (library) — same pattern for both R2 and local filesystem
- **Adapter pattern:** All routes use `c.get('db')` and `c.get('storage')` instead of direct Cloudflare bindings. Factory in `adapters/index.ts` selects implementation based on `RUNTIME_MODE` env var
- **CDN fallback:** CDN route checks `media` table first, then `library_media` for R2 key lookup
- **Static serving:** In production (Docker), `server.ts` serves the built dashboard SPA from `./public` via `serveStatic`. API 404s are scoped to `/api/*` so non-API routes fall through to the SPA

## Storage Adapter Architecture

The API uses pluggable adapters for storage, database, and image transforms. Set `RUNTIME_MODE` in env to select:

| Component | Cloudflare mode (default) | Local mode (`RUNTIME_MODE=local`) |
|-----------|--------------------------|-----------------------------------|
| Storage | R2Bucket via `R2StorageAdapter` | Filesystem via `LocalStorageAdapter` |
| Database | D1 via `D1DatabaseAdapter` | better-sqlite3 via `SqliteDatabaseAdapter` |
| Image transforms | `PassthroughTransformer` (serves original) | `SharpTransformer` (real resize/format) |
| Email (SMTP) | `cloudflare:sockets` | `nodemailer` |
| Entry point | `src/index.ts` → `export default app` | `src/server.ts` → `@hono/node-server` |
| Dashboard | Deployed separately (Cloudflare Pages, etc.) | Served from `./public` by API (Docker) |

Adapters are injected via Hono middleware and accessed with `c.get('db')`, `c.get('storage')`, `c.get('imageTransformer')`.

### Local mode file layout (NAS)
```
/mnt/hexinas/hexi-media/
  hexi.db                        # SQLite database
  files/                         # Media file storage
    tenants/{userId}/
      media/{mediaId}/original.ext
      library/{mediaId}/original.ext
```

## Database Tables (D1/SQLite)

- `users` — Tenant accounts with storage limits
- `magic_link_tokens` — Time-limited auth tokens
- `sessions` — User sessions (30-day expiry)
- `auto_login_tokens` — Reusable login tokens with optional expiry
- `galleries` — Photo collections with JSON config
- `media` — Gallery-bound images/videos with sort order
- `library_media` — Standalone assets (profiles, banners, logos) with tags

## API Routes Summary

### Auth (`/api/v1/auth`)
- `POST /magic-link` — Send magic link email
- `GET /verify` — Verify magic link, create session
- `GET /auto?token=xxx` — Auto-login with reusable token
- `POST /auto-login-tokens` — Generate auto-login token (auth required)
- `GET /auto-login-tokens` — List tokens (auth required)
- `DELETE /auto-login-tokens/:id` — Revoke token (auth required)
- `POST /logout` — End session
- `GET /me` — Current user profile

### Galleries (`/api/v1/galleries`) — all auth required
- CRUD: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
- Media: `POST /:id/media/upload-url`, `PUT /:id/media/:mid/upload`, `POST /:id/media/confirm`
- Media: `GET /:id/media`, `PATCH /:id/media/:mid`, `DELETE /:id/media/:mid`, `POST /:id/media/reorder`

### Library (`/api/v1/library`) — all auth required
- `POST /upload` — Get upload slot
- `PUT /:mediaId/upload` — Upload binary
- `POST /confirm` — Confirm with metadata
- `GET /` — List (paginated, `?tag=` filter)
- `GET /:id`, `PATCH /:id`, `DELETE /:id`

### Public (`/api/v1/public`)
- `GET /galleries/:slug` — Published gallery
- `GET /galleries/:slug/media` — Gallery media (paginated)
- `GET /media/:id` — Single library item (src, alt, dimensions, srcSet)

### CDN (`/api/v1/cdn`)
- `GET /:tenantId/:mediaId/:variant` — Serve with transforms
