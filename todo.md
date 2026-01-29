# Todo

## Backlog

### Phase 1: Foundation
> Moved to plan.md - in progress

### Phase 2: Core Gallery
- [ ] Build Gallery container component
- [ ] Implement standard grid layout (responsive columns)
- [ ] Implement masonry layout
- [ ] Implement justified/packed layout (Google Photos style)
- [ ] Add configurable gap/spacing controls
- [ ] Create responsive breakpoint system (mobile-first)

### Phase 3: Image Handling
- [ ] Create ImageItem component with srcset/responsive image support
- [ ] Implement blur-up LQIP (Low Quality Image Placeholder) loading
- [ ] Add loading shimmer animation
- [ ] Implement lazy loading with IntersectionObserver
- [ ] Add error states with graceful fallbacks
- [ ] Support image metadata (title, description, date)

### Phase 4: Source Adapters
- [ ] Define SourceAdapter interface
- [ ] Create URL source adapter (simple array of URLs)
- [ ] Create local file source adapter
- [ ] Create S3 source adapter
- [ ] Add adapter for async/paginated sources

### Phase 5: Lightbox
- [ ] Build modal/lightbox overlay component
- [ ] Add smooth open/close transitions
- [ ] Implement keyboard navigation (arrows, escape)
- [ ] Add touch swipe gestures for mobile
- [ ] Implement pinch-to-zoom
- [ ] Add image counter and metadata display
- [ ] Focus trap and focus restoration

### Phase 6: Accessibility
- [ ] Add comprehensive ARIA labels
- [ ] Implement focus management
- [ ] Support prefers-reduced-motion
- [ ] Screen reader announcements for image changes
- [ ] Ensure color contrast compliance

### Phase 7: Performance
- [ ] Implement virtualization for large galleries (100+ images)
- [ ] Optimize re-renders with proper memoization
- [ ] Add performance monitoring hooks
- [ ] Ensure tree-shaking works (ESM exports)

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
- [ ] Write comprehensive tests (unit + integration)
- [ ] Set up CI/CD for npm publishing
- [ ] Create CHANGELOG

---

## Notes
- Mobile-first responsive design
- CSS Modules + CSS Custom Properties for styling/theming
- Target: npm publishable package
- Should handle 10 to 1000+ images gracefully
- **Two modes**: Gallery component (library) + Configurator (visual builder)
- Configurator exports clean, copy-paste-ready code
