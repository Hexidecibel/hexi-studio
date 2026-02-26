export interface MediaItem {
  id: string;
  src: string;
  alt: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  thumbnail?: string;
  srcSet?: string;
  blurDataUrl?: string;
  title?: string;
  description?: string;
  poster?: string;
  duration?: number;
}

export interface GalleryConfig {
  layout?: 'grid' | 'masonry' | 'justified';
  columns?: number;
  gap?: number;
  rowHeight?: number;
  enableLightbox?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export interface GalleryResponse {
  gallery: {
    name: string;
    slug: string;
    config: GalleryConfig;
  };
  media: {
    items: MediaItem[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface MediaPageResponse {
  items: MediaItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
