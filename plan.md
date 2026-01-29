# Plan

## Current Architecture

```
src/
├── components/Gallery/
│   ├── Gallery.tsx           # Main container, delegates to layout
│   ├── Gallery.module.css
│   ├── GalleryImage.tsx      # Image wrapper (lazy load, srcSet, error states)
│   ├── GalleryImage.module.css
│   ├── layouts/
│   │   ├── GridLayout.tsx    # CSS Grid layout
│   │   ├── MasonryLayout.tsx # Column-based masonry
│   │   └── JustifiedLayout.tsx # Row-based justified (Google Photos)
│   ├── Lightbox/
│   │   ├── Lightbox.tsx      # Portal-based modal overlay
│   │   ├── LightboxControls.tsx # Nav buttons, counter, metadata
│   │   └── LightboxImage.tsx # Full-size image display
│   └── index.ts              # Barrel exports
├── hooks/
│   ├── useContainerWidth.ts  # ResizeObserver container measurement
│   ├── useFocusTrap.ts       # Modal focus management
│   ├── useIntersectionObserver.ts # Lazy loading
│   ├── useLightbox.ts        # Lightbox state & keyboard nav
│   └── useSwipe.ts           # Touch gesture detection
├── types/
│   └── index.ts              # All type definitions
├── styles/
│   └── theme.css             # CSS custom properties & design tokens
└── index.ts                  # Library entry point
```

## Layout Strategies

**Grid**: CSS Grid with `auto-fill` / `minmax()` for responsive columns
**Masonry**: Distribute images into columns, shortest-column-first algorithm
**Justified**: Pack images into rows to fill width, ResizeObserver for dynamic reflow

---

## Next Up

Remaining work across phases (in priority order):

### Lightbox — pinch-to-zoom
- Add touch gesture handling for pinch-to-zoom in LightboxImage
- Track touch points and scale transforms

### Accessibility — color contrast
- Audit all text/background combinations against WCAG AA
- Fix any contrast failures in light and dark modes

### Source Adapters (Phase 4)
- Implement concrete adapters: URL array, local files, S3
- Wire SourceAdapter interface into Gallery props

### Performance (Phase 7)
- Virtualization for 100+ image galleries
- Performance monitoring hooks

### Configurator (Phase 8)
- Visual builder with live preview
- Layout/theme/spacing controls
- Code export feature

---

## Completed

### Phase 3: Image Handling ✅
- [x] GalleryImage with srcSet, LQIP blur placeholder, shimmer, error fallback
- [x] IntersectionObserver lazy loading (200px rootMargin, triggerOnce)
- [x] Image metadata support (title, description)

### Phase 5: Lightbox ✅ (except pinch-to-zoom)
- [x] Portal-rendered modal with backdrop
- [x] Keyboard navigation (Escape, Arrow keys)
- [x] Touch swipe gestures (useSwipe hook)
- [x] Focus trap and focus restoration
- [x] Image counter with aria-live, title/description display
- [x] Body scroll lock when open

### Phase 6: Accessibility ✅ (except contrast audit)
- [x] ARIA labels on all interactive elements
- [x] Focus trap (useFocusTrap hook)
- [x] prefers-reduced-motion support in theme.css
- [x] aria-live="polite" screen reader announcements

### Phase 2: Core Gallery ✅
- [x] Gallery container with layout switching
- [x] Grid, Masonry, Justified layouts
- [x] Responsive justified layout via useContainerWidth (ResizeObserver)
- [x] Configurable gaps, row heights, column counts
- [x] 78 tests passing, ESM + CJS + types build clean

### Phase 1: Foundation ✅
- [x] Project structure, npm publishing config
- [x] TypeScript interfaces (ImageItem, LayoutOptions, GalleryProps, SourceAdapter)
- [x] CSS Modules + custom properties theme with dark mode
