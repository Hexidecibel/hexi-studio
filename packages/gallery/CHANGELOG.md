# Changelog

## 0.1.0

### Features

- **Three layout algorithms**: Grid (CSS Grid auto-fill), Masonry (shortest-column distribution), and Justified (Google Photos-style row packing)
- **Full-featured lightbox**: portal-based modal with keyboard navigation (arrow keys, Escape), touch swipe, pinch-to-zoom, focus trap, and smooth transitions
- **Source adapters**: URL adapter (string/object arrays), S3 adapter (public bucket XML listing with custom fetchFn for auth), async paginated adapter with loadMore/hasMore
- **File utility**: `createImagesFromFiles()` converts FileList to ImageItem[] via `URL.createObjectURL`
- **Virtualization**: opt-in windowing for Grid and Masonry layouts (>50 items threshold)
- **Performance monitoring**: `useGalleryPerf` hook tracks render count, load progress, time-to-first-image, time-to-all-images
- **Interactive configurator**: visual builder with layout picker, spacing controls, theme controls, source configuration, responsive preview, and JSX code export with clipboard copy
- **Theming**: 30+ CSS custom properties (`--hexi-*` prefix), automatic dark mode via `prefers-color-scheme`, reduced motion support
- **Accessibility**: ARIA labels, focus trap in lightbox, `aria-live` for image counter, WCAG AA color contrast, keyboard-navigable controls
- **Responsive images**: srcSet/sizes support, LQIP blur placeholders, lazy loading via IntersectionObserver
- **Error handling**: graceful image load failures with error icon, S3 adapter error propagation
- **Demo page**: hero gallery, layout comparison, interactive configurator, 200+ image performance demo, theming showcase

### Hooks

- `useLightbox` — lightbox state (open/close, navigation, keyboard)
- `useIntersectionObserver` — lazy loading with triggerOnce
- `useContainerWidth` — ResizeObserver-based container measurement
- `useFocusTrap` — modal focus trapping and restoration
- `useSwipe` — horizontal swipe gesture detection
- `usePinchZoom` — two-finger zoom, single-finger pan, double-tap toggle
- `useSourceAdapter` — generic adapter fetch with loading/error state
- `useAsyncAdapter` — paginated adapter with cursor-based loadMore
- `useConfigurator` — configurator state management with useReducer
- `useLocalStorage` — persisted state via localStorage
- `useGalleryPerf` — performance metrics tracking
- `useVirtualization` — window-scroll virtualization with height cache

### Technical

- React 18 with TypeScript
- Zero runtime dependencies (React as peer dep)
- Dual ESM/CJS build via Vite
- CSS Modules for component styles
- 134 tests across 20 test suites
- CI/CD via GitHub Actions (lint + test + build on push/PR, npm publish on release tag)
