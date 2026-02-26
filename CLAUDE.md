# hexi-photo-gallery

A self-hosted photo gallery platform — image admin, gallery builder, and media CDN. Manages galleries and standalone media assets for multiple client sites via API. Deployable to Cloudflare (Workers + D1 + R2) or self-hostable.

## Tech Stack

- **Gallery component:** React 18 + TypeScript, published as `@hexi/gallery` npm package
- **Worker API:** Cloudflare Worker with Hono framework, D1 (SQLite), R2 (object storage)
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
│       ├── index.ts     # Hono app, route mounting, middleware
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

## Key Architecture Patterns

- **Auth flow:** Magic link email → verify → session token (30-day), OR auto-login token → instant session
- **Auto-login tokens:** Reusable, revocable tokens per client. Hash stored in DB, plaintext shown once at creation
- **Data ownership:** All resources scoped by user_id. Queries always filter by user
- **Soft deletes:** `deleted_at` column, all queries check `IS NULL`
- **Storage tracking:** `storage_used_bytes` incremented/decremented on upload/delete
- **Media status:** `pending` → `ready` (three-step upload: get URL → upload binary → confirm with metadata)
- **CDN transforms:** `/cdn/:tenantId/:mediaId/w_400,q_75,f_auto` — width, quality, format params
- **R2 keys:** `tenants/{userId}/media/{mediaId}/original.{ext}` (gallery), `tenants/{userId}/library/{mediaId}/original.{ext}` (library)
- **CDN fallback:** CDN route checks `media` table first, then `library_media` for R2 key lookup

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
