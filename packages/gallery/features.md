# Features

All implemented features in @hexi/gallery.

---

## Layouts

### Grid Layout
- CSS Grid with `auto-fill` / `minmax()` for responsive columns
- Configurable column count (fixed number or `'auto'`)
- Configurable gap (pixels or CSS string)

### Masonry Layout
- Column-based distribution with shortest-column-first algorithm
- Aspect ratio-aware height calculation
- Configurable column count (default 3)
- Configurable gap spacing

### Justified Layout (Google Photos style)
- Row-packing algorithm based on image aspect ratios
- Configurable target row height and max row height
- Dynamic reflow via ResizeObserver (useContainerWidth hook)
- Correct row sizing at any viewport width — no CSS overrides needed

---

## Image Handling

### Responsive Images
- Full `srcSet` support with automatic `sizes` attribute
- Gallery: `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw`
- Lightbox: `sizes="100vw"` for full-screen display
- Thumbnail fallback for gallery thumbnails

### Lazy Loading
- IntersectionObserver-based with 200px preload margin
- `triggerOnce` optimization — stops observing after first load
- Configurable `eager` or `lazy` loading per gallery
- Graceful fallback when IntersectionObserver is unavailable (SSR)

### Loading States
- LQIP (Low Quality Image Placeholder) via `blurDataUrl`
- Shimmer animation placeholder while loading
- Opacity fade-in transition on image load

### Error Handling
- Image load error detection with fallback icon
- Error state rendering in both gallery and lightbox views
- `role="alert"` on lightbox error state for screen readers

### Metadata
- Title and description per image (displayed in lightbox)
- Arbitrary `metadata` record for custom data
- Image dimensions (`width`, `height`) for layout calculations

---

## Lightbox

- Portal-rendered full-screen modal overlay
- Keyboard navigation: Escape to close, Arrow Left/Right to navigate
- Touch swipe gestures for mobile (configurable 50px threshold)
- Image counter display (`1 of N`)
- Title and description display
- Backdrop click to close
- Body scroll lock when open
- Previous/Next navigation buttons with SVG icons

---

## Accessibility

- `role="dialog"`, `aria-modal="true"` on lightbox
- `aria-label` on all interactive buttons (close, prev, next)
- `aria-live="polite"` on image counter for screen reader announcements
- Focus trap in lightbox modal (Tab/Shift+Tab cycling)
- Focus restoration to triggering element on close
- `prefers-reduced-motion` support — disables transitions
- Semantic HTML: `<button>` elements for clickable images
- `aria-hidden` on decorative elements (shimmer)

---

## Theming

- CSS custom properties with `--hexi-` prefix
- Automatic dark mode via `prefers-color-scheme: dark`
- Design tokens for:
  - Spacing (gap-xs through gap-xl: 4px–32px)
  - Shadows (sm, md, lg, hover variants)
  - Transitions (fast 150ms, normal 250ms, slow 400ms)
  - Colors (primary, secondary, tertiary backgrounds + text)
  - Border radius (sm through xl + full)
  - Z-index layers (gallery, lightbox, controls)
  - Focus ring styling
- Fully overridable by consumers via CSS custom properties

---

## Hooks (exported for custom layouts)

| Hook | Purpose |
|------|---------|
| `useLightbox` | Lightbox state management, keyboard nav, scroll lock |
| `useIntersectionObserver` | Lazy loading with configurable margin and threshold |
| `useContainerWidth` | ResizeObserver-based container width measurement |
| `useFocusTrap` | Modal focus trapping with Tab cycling and restoration |
| `useSwipe` | Touch swipe gesture detection (left/right) |

---

## Build & Distribution

- ESM + CJS dual build output
- TypeScript declarations included
- CSS side effects declared for bundler tree-shaking
- Vite library mode build with source maps
- 78 tests across 8 test suites (Vitest + React Testing Library)

---

## Type System

- `ImageItem` — full image data model (id, src, alt, dimensions, srcSet, blurDataUrl, metadata)
- `LayoutType` — `'grid' | 'masonry' | 'justified'`
- `LayoutOptions` — type, columns, gap, rowHeight, maxRowHeight
- `GalleryProps` — images, layout, className, onImageClick, enableLightbox, loading, renderImage
- `SourceAdapter<T>` — generic interface for pluggable image sources
- `ThemeTokens` — design token type definitions
- `ConfiguratorState` — visual builder state shape
- `DEFAULT_LAYOUT` — sensible defaults constant

---

## Feature Log

| Date | Feature | Tests |
|------|---------|-------|
| 2024-01-28 | Phase 1: Foundation | 10 passing |
| 2025-01-28 | Phase 2: Core Gallery (GalleryImage, Grid, Masonry, Justified, Gallery container) | 28 passing |
| 2025-01-28 | Phase 3: Image Handling (srcSet, lazy loading, shimmer, error states, metadata) | 74 passing |
| 2025-01-28 | Phase 5: Lightbox (modal, keyboard nav, swipe, focus trap, controls) | 74 passing |
| 2025-01-29 | Responsive justified layout (useContainerWidth + ResizeObserver) | 78 passing |
