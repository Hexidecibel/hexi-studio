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
// export { GalleryConfigurator } from './components/GalleryConfigurator';

// Hooks (to be implemented)
// export { useGallery } from './hooks/useGallery';
// export { useLightbox } from './hooks/useLightbox';

// Source Adapters (to be implemented)
// export { createUrlAdapter } from './services/urlAdapter';
// export { createS3Adapter } from './services/s3Adapter';
