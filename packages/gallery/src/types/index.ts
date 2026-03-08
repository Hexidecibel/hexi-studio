/**
 * Core types for @hexi/gallery
 */

/**
 * Video source variant for multi-format support
 */
export interface VideoSource {
  /** Video source URL */
  src: string;
  /** MIME type (e.g., 'video/mp4') */
  type: string;
}

/**
 * Represents a single media item (image or video)
 */
export interface MediaItem {
  /** Unique identifier for the image */
  id: string;
  /** Primary image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Media type — defaults to 'image' for backward compatibility */
  type?: 'image' | 'video';
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
  /** Poster image for video items (used in grid and as lightbox loading placeholder) */
  poster?: string;
  /** Video format variants (e.g., mp4, webm) */
  sources?: VideoSource[];
  /** Video duration in seconds (for optional UI badge) */
  duration?: number;
  /** Additional custom metadata */
  metadata?: Record<string, unknown>;
}

/** @deprecated Use MediaItem instead */
export type ImageItem = MediaItem;

/**
 * Type guard to check if a media item is a video
 */
export function isVideoItem(item: MediaItem): boolean {
  return item.type === 'video';
}

/**
 * Available layout types
 */
export type LayoutType = 'grid' | 'masonry' | 'justified' | 'showcase';

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
  /** Thumbnail strip height for showcase layout */
  thumbnailHeight?: number;
}

/**
 * Props for the main Gallery component
 */
export interface GalleryProps {
  /** Array of images to display */
  images: MediaItem[];
  /** Layout configuration */
  layout?: LayoutOptions;
  /** Additional CSS class name */
  className?: string;
  /** Callback when an image is clicked */
  onImageClick?: (image: MediaItem, index: number) => void;
  /** Enable built-in lightbox */
  enableLightbox?: boolean;
  /** Image loading strategy */
  loading?: 'lazy' | 'eager';
  /** Custom render function for images */
  renderImage?: (image: MediaItem, index: number) => React.ReactNode;
  /** Enable virtualization. true = auto (>50 items), number = custom threshold */
  virtualize?: boolean | number;
  /** Callback fired each time an image finishes loading */
  onImageLoad?: () => void;
  /** Custom render when gallery has no images */
  renderEmpty?: () => React.ReactNode;
  /** Custom render for lightbox footer content */
  renderLightboxFooter?: (image: MediaItem, index: number) => React.ReactNode;
  /** Show download button in lightbox */
  enableDownload?: boolean;
  /** Enable slideshow mode in lightbox */
  enableSlideshow?: boolean;
  /** Slideshow interval in milliseconds (default 5000) */
  slideshowInterval?: number;
  /** Randomize image order on each load */
  shuffle?: boolean;
  /** Enable long-press multi-select mode */
  enableSelection?: boolean;
  /** Show share button in lightbox */
  enableShare?: boolean;
  /** Called when user shares photos (from lightbox or selection bar) */
  onShare?: (images: MediaItem[]) => void;
  /** Custom render for selection action bar (overrides built-in SelectionBar) */
  renderSelectionBar?: (selected: MediaItem[], exit: () => void) => React.ReactNode;
}

/**
 * Generic source adapter interface for fetching images from various sources
 */
export interface SourceAdapter<TConfig = unknown> {
  /** Unique name for this adapter */
  name: string;
  /** Fetch images from the source */
  fetch: (config: TConfig) => Promise<MediaItem[]>;
  /** Optional validation for config */
  validate?: (config: TConfig) => boolean;
}

/**
 * Configuration for the Gallery Configurator
 */
export interface ConfiguratorState {
  /** Current images */
  images: MediaItem[];
  /** Current layout options */
  layout: LayoutOptions;
  /** Theme overrides */
  theme?: Partial<ThemeTokens>;
  /** Whether to randomize image order */
  shuffle?: boolean;
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
  images: MediaItem[];
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
