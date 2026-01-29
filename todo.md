# Todo

## Backlog

### Phase 1: Foundation ✅
- [x] Set up project structure
- [x] Configure for npm publishing (ESM + CJS + types)
- [x] Define core TypeScript interfaces
- [x] Set up CSS Modules with custom properties
- [x] Create base theme with design tokens

### Phase 2: Core Gallery ✅
- [x] Build Gallery container component
- [x] Implement standard grid layout (responsive columns)
- [x] Implement masonry layout
- [x] Implement justified/packed layout (Google Photos style)
- [x] Add configurable gap/spacing controls
- [x] Create responsive breakpoint system (ResizeObserver-based)

### Phase 3: Image Handling ✅
- [x] Create ImageItem component with srcset/responsive image support
- [x] Implement blur-up LQIP (Low Quality Image Placeholder) loading
- [x] Add loading shimmer animation
- [x] Implement lazy loading with IntersectionObserver
- [x] Add error states with graceful fallbacks
- [x] Support image metadata (title, description, date)

### Phase 4: Source Adapters
- [x] Define SourceAdapter interface
- [ ] Create URL source adapter (simple array of URLs)
- [ ] Create local file source adapter
- [ ] Create S3 source adapter
- [ ] Add adapter for async/paginated sources

### Phase 5: Lightbox (mostly complete)
- [x] Build modal/lightbox overlay component
- [x] Add smooth open/close transitions
- [x] Implement keyboard navigation (arrows, escape)
- [x] Add touch swipe gestures for mobile
- [ ] Implement pinch-to-zoom
- [x] Add image counter and metadata display
- [x] Focus trap and focus restoration

### Phase 6: Accessibility (mostly complete)
- [x] Add comprehensive ARIA labels
- [x] Implement focus management (focus trap + restoration)
- [x] Support prefers-reduced-motion
- [x] Screen reader announcements for image changes (aria-live)
- [ ] Ensure color contrast compliance

### Phase 7: Performance
- [ ] Implement virtualization for large galleries (100+ images)
- [x] Optimize re-renders with proper memoization
- [ ] Add performance monitoring hooks
- [x] Ensure tree-shaking works (ESM exports)

### Phase 8: Gallery Configurator (Visual Builder)
- [ ] Build ConfiguratorPanel component (collapsible sidebar/overlay)
- [ ] Create source configuration UI (add/remove/reorder sources)
- [ ] Create layout picker (grid, masonry, justified with live preview)
- [ ] Add spacing/gap controls with sliders
- [ ] Add theme/style controls (colors, shadows, border radius)
- [ ] Build responsive preview (mobile/tablet/desktop toggles)
- [ ] Implement "Export Code" feature (generates JSX + props)
- [ ] Add "Copy to Clipboard" for exported code
- [ ] Create blank slate / empty state with guided setup
- [ ] Persist configuration to localStorage for return visits

### Phase 9: Polish & Ship
- [ ] Create demo/showcase page with multiple examples
- [ ] Write README with usage examples
- [ ] Add JSDoc comments for API documentation
- [x] Write comprehensive tests (unit + integration) — 78 tests across 8 suites
- [ ] Set up CI/CD for npm publishing
- [ ] Create CHANGELOG

---

## Up Next

Priority items remaining:
1. **Pinch-to-zoom** in lightbox (Phase 5)
2. **Color contrast audit** (Phase 6)
3. **Source adapters** — URL, local file, S3 (Phase 4)
4. **Virtualization** for large galleries (Phase 7)
5. **Gallery Configurator** visual builder (Phase 8)

---

## Notes
- Mobile-first responsive design
- CSS Modules + CSS Custom Properties for styling/theming
- Target: npm publishable package
- Should handle 10 to 1000+ images gracefully
- **Two modes**: Gallery component (library) + Configurator (visual builder)
- Configurator exports clean, copy-paste-ready code
