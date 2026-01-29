/**
 * @hexi/gallery
 *
 * A beautiful, configurable photo gallery component for React
 */

// Types
export type {
  ImageItem,
  LayoutType,
  LayoutOptions,
  GalleryProps,
  SourceAdapter,
  ThemeTokens,
  ConfiguratorState,
} from './types';

export { DEFAULT_LAYOUT } from './types';

// Styles (consumers import separately: import '@hexi/gallery/styles')
import './styles/theme.css';

// Components
export { Gallery } from './components/Gallery';
export { GalleryImage } from './components/Gallery';
export { Lightbox } from './components/Gallery';
export type { LightboxProps } from './components/Gallery';

// Hooks
export { useLightbox } from './hooks/useLightbox';
export { useIntersectionObserver } from './hooks/useIntersectionObserver';
