/**
 * @hexi/gallery
 *
 * A beautiful, configurable photo gallery component for React
 */

// Types
export type {
  MediaItem,
  VideoSource,
  ImageItem,
  LayoutType,
  LayoutOptions,
  GalleryProps,
  SourceAdapter,
  ThemeTokens,
  ConfiguratorState,
  PaginatedResult,
} from './types';

export { DEFAULT_LAYOUT, isVideoItem } from './types';

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
export { useContainerWidth } from './hooks/useContainerWidth';
export { usePinchZoom } from './hooks/usePinchZoom';
export { useSourceAdapter } from './hooks/useSourceAdapter';
export { useAsyncAdapter } from './hooks/useAsyncAdapter';
export { useHexiCloud } from './hooks/useHexiCloud';
export type { HexiCloudOptions, HexiCloudResult } from './hooks/useHexiCloud';

// Adapters
export { urlAdapter, s3Adapter, asyncAdapter, hexiCloudAdapter } from './adapters';
export type { UrlAdapterConfig, S3AdapterConfig, FetchPage, AsyncAdapterConfig, HexiCloudConfig } from './adapters';

// Configurator
export { ConfiguratorPanel } from './components/Configurator';
export { useConfigurator } from './hooks/useConfigurator';
export { useLocalStorage } from './hooks/useLocalStorage';
export { useGalleryPerf } from './hooks/useGalleryPerf';
export { useVirtualization } from './hooks/useVirtualization';

// Utilities
export { createImagesFromFiles } from './utils/createImagesFromFiles';
export { generateCode } from './utils/generateCode';
