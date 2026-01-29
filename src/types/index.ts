/**
 * Core types for @hexi/gallery
 */

/**
 * Represents a single image in the gallery
 */
export interface ImageItem {
  /** Unique identifier for the image */
  id: string;
  /** Primary image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Original width in pixels (helps with layout calculations) */
  width?: number;
  /** Original height in pixels (helps with layout calculations) */
  height?: number;
  /** Smaller thumbnail URL for grid view */
  thumbnail?: string;
  /** Base64 blur placeholder for LQIP loading */
  blurDataUrl?: string;
  /** Responsive srcset string */
  srcSet?: string;
  /** Image title (displayed in lightbox) */
  title?: string;
  /** Image description (displayed in lightbox) */
  description?: string;
  /** Additional custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Available layout types
 */
export type LayoutType = 'grid' | 'masonry' | 'justified';

/**
 * Configuration options for gallery layout
 */
export interface LayoutOptions {
  /** Layout algorithm to use */
  type: LayoutType;
  /** Number of columns, or 'auto' for responsive */
  columns?: number | 'auto';
  /** Gap between images (number = pixels, string = CSS value) */
  gap?: number | string;
  /** Target row height for justified layout */
  rowHeight?: number;
  /** Maximum row height for justified layout */
  maxRowHeight?: number;
}

/**
 * Props for the main Gallery component
 */
export interface GalleryProps {
  /** Array of images to display */
  images: ImageItem[];
  /** Layout configuration */
  layout?: LayoutOptions;
  /** Additional CSS class name */
  className?: string;
  /** Callback when an image is clicked */
  onImageClick?: (image: ImageItem, index: number) => void;
  /** Enable built-in lightbox */
  enableLightbox?: boolean;
  /** Image loading strategy */
  loading?: 'lazy' | 'eager';
  /** Custom render function for images */
  renderImage?: (image: ImageItem, index: number) => React.ReactNode;
  /** Enable virtualization. true = auto (>50 items), number = custom threshold */
  virtualize?: boolean | number;
  /** Callback fired each time an image finishes loading */
  onImageLoad?: () => void;
}

/**
 * Generic source adapter interface for fetching images from various sources
 */
export interface SourceAdapter<TConfig = unknown> {
  /** Unique name for this adapter */
  name: string;
  /** Fetch images from the source */
  fetch: (config: TConfig) => Promise<ImageItem[]>;
  /** Optional validation for config */
  validate?: (config: TConfig) => boolean;
}

/**
 * Configuration for the Gallery Configurator
 */
export interface ConfiguratorState {
  /** Current images */
  images: ImageItem[];
  /** Current layout options */
  layout: LayoutOptions;
  /** Theme overrides */
  theme?: Partial<ThemeTokens>;
}

/**
 * Theme design tokens (CSS custom properties)
 */
export interface ThemeTokens {
  /** Gap sizes */
  gapXs: string;
  gapSm: string;
  gapMd: string;
  gapLg: string;
  gapXl: string;
  /** Shadows */
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  /** Transitions */
  transitionFast: string;
  transitionNormal: string;
  transitionSlow: string;
  /** Colors */
  bgPrimary: string;
  bgSecondary: string;
  bgOverlay: string;
  textPrimary: string;
  textSecondary: string;
  /** Border radius */
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
}

/**
 * Paginated result for async adapters
 */
export interface PaginatedResult {
  images: ImageItem[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Default layout options
 */
export const DEFAULT_LAYOUT: LayoutOptions = {
  type: 'grid',
  columns: 'auto',
  gap: 16,
};
