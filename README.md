# Hexi Photo Gallery

A self-hosted photo gallery platform — image admin, gallery builder, and media CDN. Build and manage galleries for multiple client sites, serve standalone media assets via API, and give clients direct access with auto-login tokens.

## Features

**Gallery Builder**
- Create and manage photo galleries with a visual editor
- Three layout modes: grid, masonry, and justified row
- Drag-and-drop media upload and reorder
- Gallery settings: columns, gap, row height, lightbox, theme
- Publish/unpublish galleries with a toggle

**Media Library**
- Upload standalone images not bound to any gallery
- Tag-based organization (e.g. "artists", "heroes", "logos")
- Public API for fetching individual images by ID
- Use for profile photos, hero banners, or any asset on client sites

**CDN & Image Transforms**
- On-the-fly image resizing, quality adjustment, and format conversion
- URL-based transforms: `/cdn/:userId/:mediaId/w_800,q_75,f_webp`
- Responsive `srcSet` generation for optimal loading
- Aggressive caching with immutable headers and ETags

**Auth & Multi-Tenant**
- Magic link email authentication (no passwords)
- Auto-login tokens — generate reusable links for clients
- Per-user storage tracking with configurable limits
- All data scoped by user — full multi-tenant isolation

**Embed Anywhere**
- Script tag embed for any HTML page
- React component via `@hexi/gallery` npm package
- Public REST API for custom integrations
- Cloud hook: `useHexiCloud()` for React apps

**Deploy Anywhere**
- Cloudflare Workers with D1 + R2 (zero-config scaling)
- Self-hosted via Docker (single container, bind-mount data)
- Self-hosted on bare metal Node.js (NAS, VPS, Raspberry Pi)
- Pluggable storage adapters — swap between cloud and local
- Real image transforms via sharp in self-hosted mode

## Architecture

Runs on **Cloudflare Workers** or **self-hosted** on any Node.js server (NAS, VPS, etc.):

```
                    ┌─────────────────────────────────────────┐
                    │            Hono API Server               │
                    │                                         │
                    │   ┌─────────────────────────────────┐   │
                    │   │      Storage Adapters            │   │
┌─────────────┐    │   │                                  │   │
│  Dashboard   │───▶│   │  Cloudflare    │    Local/NAS    │   │
│  (React SPA) │    │   │  R2 + D1       │    FS + SQLite  │   │
└─────────────┘    │   │  (passthrough)  │    (sharp)      │   │
                    │   └─────────────────────────────────┘   │
┌─────────────┐    │                                         │
│ Client Sites │───▶│                                         │
│ (embed/API)  │    └─────────────────────────────────────────┘
└─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+ (22 LTS recommended)
- npm
- For Cloudflare mode: Cloudflare account with D1 + R2
- For local/self-hosted mode: any Linux/macOS server with filesystem storage

### Development

```bash
# Clone and install
git clone https://github.com/your-org/hexi-photo-gallery.git
cd hexi-photo-gallery
npm install

# Start all dev servers
npm run dev

# Or start individually
cd apps/worker && npm run dev    # API on :8787
cd apps/dashboard && npm run dev # Dashboard on :5173
```

### Self-Hosted / Local Mode

Run the API on your own server with local filesystem storage and SQLite — no Cloudflare account needed.

```bash
cd apps/worker

# Configure environment
cp .env.local.example .env.local
# Edit .env.local: set STORAGE_PATH, DATABASE_PATH, SMTP credentials

# Create storage directory
mkdir -p /path/to/media/files

# Run database migrations
cat migrations/0001_initial.sql migrations/0002_auto_login_and_library.sql | sqlite3 /path/to/media/hexi.db

# Start the server
npm run dev:local     # Development (with hot reload)
npm run build:local   # Production build
npm run start:local   # Production start
```

Local mode includes **real image transforms** via sharp (resize, WebP/AVIF conversion, quality adjustment) — the Cloudflare mode currently serves originals.

### Build

```bash
npm run build    # Build all packages
npm run test     # Run tests
npm run lint     # Lint all packages
```

## Project Structure

```
apps/
├── worker/          # API server (Hono) — runs on Cloudflare Workers or Node.js
├── dashboard/       # Dashboard SPA (React, Vite)
└── embed/           # Embed script for HTML pages
packages/
├── gallery/         # @hexi/gallery React component
└── shared/          # Shared types and utilities
```

## API Overview

### Galleries

```bash
# Create a gallery
POST /api/v1/galleries
{ "name": "Portfolio" }

# Upload media to a gallery
POST /api/v1/galleries/:id/media/upload-url
PUT  /api/v1/galleries/:id/media/:mediaId/upload
POST /api/v1/galleries/:id/media/confirm
```

### Media Library

```bash
# Upload a standalone image
POST /api/v1/library/upload
PUT  /api/v1/library/:mediaId/upload
POST /api/v1/library/confirm

# Fetch a public image by ID (for use on client sites)
GET /api/v1/public/media/:id
# Returns: { id, src, alt, width, height, thumbnail, srcSet }
```

### CDN Transforms

```bash
# Original
GET /api/v1/cdn/:userId/:mediaId/original

# Resized with quality and format
GET /api/v1/cdn/:userId/:mediaId/w_800,q_75,f_webp

# Thumbnail preset
GET /api/v1/cdn/:userId/:mediaId/thumb
```

> In local/self-hosted mode, transforms are processed by [sharp](https://sharp.pixelplumbing.com/) and support real resizing, format conversion (WebP, AVIF), and quality adjustment.

### Auto-Login Tokens

```bash
# Generate a reusable login link for a client
POST /api/v1/auth/auto-login-tokens
{ "label": "Client Name" }
# Returns a token — build a URL: /auth/auto?token=xxx

# Client clicks the link → instant dashboard access
GET /api/v1/auth/auto?token=xxx
```

## Using the Gallery Component

### NPM Package

```bash
npm install @hexi/gallery
```

```tsx
import { Gallery } from '@hexi/gallery';
import '@hexi/gallery/styles';

function MyGallery() {
  return (
    <Gallery
      images={images}
      layout={{ type: 'masonry', columns: 3, gap: 8 }}
      enableLightbox
    />
  );
}
```

### With Cloud Data

```tsx
import { Gallery, useHexiCloud } from '@hexi/gallery';
import '@hexi/gallery/styles';

function MyGallery() {
  const { items, loading, config } = useHexiCloud('my-gallery-slug');
  if (loading) return <div>Loading...</div>;
  return <Gallery images={items} layout={config.layout} enableLightbox />;
}
```

### Script Tag Embed

```html
<div id="hexi-gallery" data-gallery="my-gallery-slug"></div>
<script src="https://your-cdn/embed.js" async></script>
```

## Using the Media Library on Client Sites

Fetch a single image by ID for use anywhere — profile photos, hero banners, etc:

```tsx
// Fetch image metadata
const img = await fetch('/api/v1/public/media/abc123').then(r => r.json());

// Use it
<img
  src={img.src}
  alt={img.alt}
  width={img.width}
  height={img.height}
  srcSet={img.srcSet}
/>
```

## Deployment

### Cloudflare Workers

```bash
cd apps/worker

# Configure wrangler.toml with your D1 database and R2 bucket
# Set environment variables: CORS_ORIGIN, CDN_BASE_URL, SMTP_* or RESEND_API_KEY

# Run migrations
wrangler d1 execute hexi-gallery --file=migrations/0001_initial.sql
wrangler d1 execute hexi-gallery --file=migrations/0002_auto_login_and_library.sql

# Deploy
wrangler deploy
```

### Dashboard

```bash
cd apps/dashboard
npm run build
# Deploy dist/ to your static hosting (Cloudflare Pages, Vercel, Nginx, etc.)
```

### Docker (Recommended for Self-Hosting)

Single container — builds the API and dashboard together, serves everything from one image.

```bash
# Clone the repo
git clone https://github.com/your-org/hexi-photo-gallery.git
cd hexi-photo-gallery

# Create data directory
mkdir -p /path/to/media/files

# Run database migrations
cat apps/worker/migrations/*.sql | sqlite3 /path/to/media/hexi.db

# Build and start
docker compose build
docker compose up -d
```

The container:
- Builds the dashboard SPA and API into a single Node.js image
- Serves the dashboard at `/` and API at `/api/v1/*`
- Uses SQLite + local filesystem + sharp for image transforms
- Expects data at `/data` (bind-mount your storage directory)

Environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `RUNTIME_MODE` | Must be `local` | `local` |
| `DATABASE_PATH` | SQLite DB path inside container | `/data/hexi.db` |
| `STORAGE_PATH` | Media files path inside container | `/data/files` |
| `CORS_ORIGIN` | Your dashboard URL | `https://gallery.example.com` |
| `MAGIC_LINK_BASE_URL` | Base URL for magic link emails | `https://gallery.example.com` |
| `SMTP_HOST` | SMTP server | `smtp.example.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | `user@example.com` |
| `SMTP_PASS` | SMTP password | `secret` |
| `SMTP_FROM` | From address for emails | `Gallery <noreply@example.com>` |
| `ADMIN_EMAIL` | Admin user email (auto-created) | `admin@example.com` |

### Bare Metal (without Docker)

```bash
cd apps/worker

# Configure
cp .env.local.example .env.local
# Edit .env.local with your paths and SMTP credentials

# Initialize database
mkdir -p /your/storage/path/files
cat migrations/*.sql | sqlite3 /your/storage/path/hexi.db

# Build and run
npm run build:local
npm run start:local    # Or use PM2: pm2 start dist/server.js --name hexi-api
```

Environment variables for local mode:

| Variable | Description | Example |
|----------|-------------|---------|
| `RUNTIME_MODE` | Set to `local` for filesystem + SQLite | `local` |
| `STORAGE_PATH` | Directory for media files | `/mnt/nas/hexi/files` |
| `DATABASE_PATH` | Path to SQLite database file | `/mnt/nas/hexi/hexi.db` |
| `PORT` | API server port | `8787` |
| `CORS_ORIGIN` | Allowed origins | `*` |
| `SMTP_HOST` | SMTP server for magic link emails | `smtp.example.com` |

## Database

SQLite via Cloudflare D1. Tables:

| Table | Purpose |
|-------|---------|
| `users` | Tenant accounts with storage limits |
| `sessions` | Auth sessions (30-day expiry) |
| `magic_link_tokens` | Email verification tokens |
| `auto_login_tokens` | Reusable login tokens |
| `galleries` | Gallery collections with JSON config |
| `media` | Gallery-bound images and videos |
| `library_media` | Standalone media assets with tags |

## License

MIT
