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

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Dashboard   │────▶│  Worker API  │────▶│  R2 Storage  │
│  (React SPA) │     │  (Hono)      │     │  (Objects)   │
└─────────────┘     │              │     └─────────────┘
                     │              │────▶┌─────────────┐
┌─────────────┐     │              │     │  D1 Database │
│ Client Sites │────▶│              │     │  (SQLite)    │
│ (embed/API)  │     └──────────────┘     └─────────────┘
└─────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Cloudflare account (for deployment) or local dev tools

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

### Build

```bash
npm run build    # Build all packages
npm run test     # Run tests
npm run lint     # Lint all packages
```

## Project Structure

```
apps/
├── worker/          # Cloudflare Worker API (Hono, D1, R2)
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
