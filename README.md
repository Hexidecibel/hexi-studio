# @hexi/gallery

A beautiful, configurable photo gallery component for React with grid, masonry, and justified layouts.

- **Three layout algorithms** — CSS Grid, Masonry (shortest-column), and Justified (Google Photos-style row packing)
- **Full-featured lightbox** — keyboard navigation, touch swipe, pinch-to-zoom, focus trap, portal-based
- **Source adapters** — URL arrays, S3 bucket listings, async paginated sources, local file uploads
- **Performance** — lazy loading with IntersectionObserver, LQIP blur placeholders, optional virtualization for 200+ images
- **Interactive configurator** — visual builder with code export
- **Accessible** — ARIA labels, focus management, reduced motion support, WCAG AA contrast
- **Themeable** — 30+ CSS custom properties, dark mode, custom themes
- **Zero dependencies** — only React 18 as a peer dependency
- **TypeScript** — full type definitions, generic adapter interface

## Installation

```bash
npm install @hexi/gallery
```

## Quick Start

```tsx
import { Gallery } from '@hexi/gallery';
import '@hexi/gallery/styles';

const images = [
  { id: '1', src: '/photos/beach.jpg', alt: 'Beach sunset', width: 800, height: 600 },
  { id: '2', src: '/photos/mountains.jpg', alt: 'Mountain vista', width: 1200, height: 800 },
  { id: '3', src: '/photos/forest.jpg', alt: 'Forest trail', width: 600, height: 900 },
];

function App() {
  return (
    <Gallery
      images={images}
      layout={{ type: 'masonry', gap: 12 }}
      enableLightbox
    />
  );
}
```

## Layouts

### Grid

Responsive CSS Grid with auto-fill columns.

```tsx
<Gallery images={images} layout={{ type: 'grid', gap: 16, columns: 'auto' }} />
```

### Masonry

Pinterest-style shortest-column distribution.

```tsx
<Gallery images={images} layout={{ type: 'masonry', gap: 12, columns: 4 }} />
```

### Justified

Google Photos-style row packing that fills the container width.

```tsx
<Gallery images={images} layout={{ type: 'justified', gap: 8, rowHeight: 240 }} />
```

## Source Adapters

### URL Adapter

```tsx
import { urlAdapter, useSourceAdapter } from '@hexi/gallery';

function MyGallery() {
  const { images, loading } = useSourceAdapter(urlAdapter, {
    urls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
  });

  if (loading) return <p>Loading...</p>;
  return <Gallery images={images} enableLightbox />;
}
```

### S3 Adapter

Fetches public S3 bucket listings. Accepts a custom `fetchFn` for authenticated access — no AWS SDK dependency.

```tsx
import { s3Adapter, useSourceAdapter } from '@hexi/gallery';

const { images } = useSourceAdapter(s3Adapter, {
  bucket: 'my-photos',
  region: 'us-east-1',
  prefix: 'gallery/',
});
```

### Async Adapter

Paginated sources with `loadMore()`.

```tsx
import { useAsyncAdapter } from '@hexi/gallery';

const { images, loadMore, hasMore } = useAsyncAdapter(async (cursor) => {
  const res = await fetch(`/api/photos?cursor=${cursor || ''}`);
  const data = await res.json();
  return { images: data.items, nextCursor: data.next, hasMore: data.hasNext };
});
```

### Local Files

```tsx
import { createImagesFromFiles } from '@hexi/gallery';

function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
  const images = createImagesFromFiles(e.target.files!);
  setImages(images);
}
```

## Theming

Override CSS custom properties to customize appearance:

```css
:root {
  --hexi-bg-primary: #0a0a0a;
  --hexi-image-radius: 16px;
  --hexi-shadow-md: 0 4px 20px rgba(0, 100, 255, 0.15);
  --hexi-gap-md: 12px;
}
```

Dark mode is supported automatically via `prefers-color-scheme`.

## Configurator

The interactive configurator lets users visually build gallery configurations and export the code:

```tsx
import { ConfiguratorPanel, useConfigurator } from '@hexi/gallery';

function Builder() {
  const config = useConfigurator();
  return (
    <ConfiguratorPanel
      state={config.state}
      exportCode={config.exportCode}
      onLayoutChange={config.setLayout}
      onLayoutTypeChange={config.setLayoutType}
      onImagesChange={config.setImages}
      onThemeChange={config.setTheme}
      onReset={config.reset}
    />
  );
}
```

## Virtualization

For galleries with many images, enable virtualization to only render visible items:

```tsx
<Gallery images={largeImageSet} virtualize enableLightbox />
```

Supported for Grid and Masonry layouts. Justified layout requires the full image list for row composition.

## API

### `<Gallery>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `ImageItem[]` | required | Array of images |
| `layout` | `LayoutOptions` | `{ type: 'grid', columns: 'auto', gap: 16 }` | Layout configuration |
| `enableLightbox` | `boolean` | `false` | Enable built-in lightbox |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | Image loading strategy |
| `virtualize` | `boolean \| number` | `false` | Enable virtualization |
| `onImageClick` | `(image, index) => void` | — | Click handler |
| `className` | `string` | — | Additional CSS class |
| `renderImage` | `(image, index) => ReactNode` | — | Custom render function |

### Hooks

| Hook | Description |
|------|-------------|
| `useLightbox` | Lightbox state management |
| `useIntersectionObserver` | Lazy loading with IntersectionObserver |
| `useContainerWidth` | ResizeObserver-based width measurement |
| `usePinchZoom` | Pinch-to-zoom with touch events |
| `useSourceAdapter` | Generic source adapter hook |
| `useAsyncAdapter` | Paginated async adapter with `loadMore()` |
| `useConfigurator` | Configurator state management |
| `useLocalStorage` | Persisted state via localStorage |
| `useGalleryPerf` | Performance monitoring metrics |
| `useVirtualization` | Window-scroll virtualization |

## Development

```bash
npm install
npm run dev        # Start dev server
npm run test       # Run tests (watch mode)
npm run test:run   # Run tests (single run)
npm run build      # Production build
npm run lint       # ESLint
```

## License

MIT
