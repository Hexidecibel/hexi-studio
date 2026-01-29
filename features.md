# Features

## Completed

### Phase 1: Foundation ✅

**Project Structure**
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript interfaces
- `src/services/` - Source adapters
- `src/utils/` - Helper functions
- `src/styles/` - Shared styles & theme
- `src/__tests__/` - Test files

**npm Publishing Configuration**
- Package: `@hexi/gallery`
- ESM + CJS dual exports
- TypeScript declarations generated
- CSS exported separately (`@hexi/gallery/styles`)
- React 18+ peer dependency

**Core TypeScript Interfaces**
- `ImageItem` - Single image with metadata
- `LayoutType` - 'grid' | 'masonry' | 'justified'
- `LayoutOptions` - Layout configuration
- `GalleryProps` - Main component props
- `SourceAdapter<T>` - Generic adapter interface
- `ThemeTokens` - Design token types
- `ConfiguratorState` - Builder state
- `DEFAULT_LAYOUT` - Sensible defaults

**Theme System**
- CSS custom properties with `--hexi-` prefix
- Design tokens: spacing, shadows, transitions, colors, radii
- Dark mode support via `prefers-color-scheme`
- Reduced motion support via `prefers-reduced-motion`
- Lightbox-specific tokens
- Focus/accessibility tokens

**Build System**
- Vite library mode
- vite-plugin-dts for type generation
- Source maps enabled
- Tree-shakeable ESM output

---

## Feature Log

| Date | Feature | Tests |
|------|---------|-------|
| 2024-01-28 | Phase 1: Foundation | 10 passing |
| 2025-01-28 | Phase 2: Core Gallery (GalleryImage, Grid, Masonry, Justified, Gallery container) | 28 passing |
