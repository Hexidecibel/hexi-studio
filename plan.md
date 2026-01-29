# Plan

## Current Sprint: Phase 2 - Core Gallery

### Architecture

```
src/components/Gallery/
├── Gallery.tsx           # Main container, delegates to layout
├── Gallery.module.css    # Container styles
├── layouts/
│   ├── GridLayout.tsx    # CSS Grid layout
│   ├── MasonryLayout.tsx # Column-based masonry
│   └── JustifiedLayout.tsx # Row-based justified (Google Photos)
├── GalleryImage.tsx      # Individual image wrapper
└── index.ts              # Exports
```

### Implementation Order

1. **GalleryImage** - Individual image component with loading states
2. **GridLayout** - Simple CSS Grid (easiest, proves the pattern)
3. **Gallery** - Container that switches layouts
4. **MasonryLayout** - Column-based distribution
5. **JustifiedLayout** - Row packing algorithm

### Layout Strategies

**Grid**: CSS Grid with `auto-fill` / `minmax()` for responsive columns
**Masonry**: Distribute images into columns, shortest-column-first algorithm
**Justified**: Pack images into rows to fill width (like Google Photos)

---

## In Progress

- [ ] Add responsive breakpoint system

---

## Completed

### Phase 2: Core Gallery ✅
- [x] Build GalleryImage component
- [x] Build GridLayout component
- [x] Build MasonryLayout component
- [x] Build JustifiedLayout component
- [x] Build Gallery container (layout switching, props delegation)
- [x] Barrel exports and library entry point wired up
- [x] All 28 tests passing, library builds clean (ESM + CJS + types)

### Phase 1: Foundation ✅
- [x] Set up project structure
- [x] Configure for npm publishing
- [x] Define core TypeScript interfaces
- [x] Set up CSS Modules with custom properties
- [x] Create base theme with design tokens
