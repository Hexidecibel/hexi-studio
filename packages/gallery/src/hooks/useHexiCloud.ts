import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaItem, LayoutType } from '../types';

export interface HexiCloudOptions {
  /** API base URL. Defaults to production API. */
  apiBase?: string;
  /** Number of items per page. Defaults to 50. */
  pageSize?: number;
}

export interface HexiCloudResult {
  /** Media items loaded so far */
  items: MediaItem[];
  /** Whether data is currently loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Gallery configuration from the server */
  config: {
    layout: LayoutType;
    columns?: number;
    gap?: number;
    rowHeight?: number;
    enableLightbox?: boolean;
    theme?: 'light' | 'dark' | 'auto';
  };
  /** Gallery name */
  name: string;
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Load the next page of items */
  loadMore: () => void;
  /** Total number of items in the gallery */
  total: number;
}

interface GalleryApiResponse {
  gallery: {
    name: string;
    slug: string;
    config: {
      layout?: LayoutType;
      columns?: number;
      gap?: number;
      rowHeight?: number;
      enableLightbox?: boolean;
      theme?: 'light' | 'dark' | 'auto';
    };
  };
  media: {
    items: MediaItem[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface MediaPageResponse {
  items: MediaItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Hook to connect to a Hexi Gallery Cloud gallery.
 * Fetches gallery config and media, handles pagination.
 *
 * @example
 * ```tsx
 * import { Gallery, useHexiCloud } from '@hexi/gallery';
 *
 * function MyGallery() {
 *   const { items, loading, config, hasMore, loadMore } = useHexiCloud('my-photos');
 *   return (
 *     <Gallery
 *       images={items}
 *       layout={config.layout}
 *       enableLightbox={config.enableLightbox}
 *       onLoadMore={hasMore ? loadMore : undefined}
 *     />
 *   );
 * }
 * ```
 */
export function useHexiCloud(slug: string, options?: HexiCloudOptions): HexiCloudResult {
  const apiBase = options?.apiBase || 'https://api.hexi.gallery/api/v1';
  const pageSize = options?.pageSize || 50;

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<HexiCloudResult['config']>({ layout: 'masonry' as LayoutType });
  const [name, setName] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setItems([]);
    pageRef.current = 0;

    fetch(`${apiBase}/public/galleries/${slug}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Gallery not found: ${slug}`);
        }
        const data: GalleryApiResponse = await response.json();

        setConfig({
          layout: (data.gallery.config.layout || 'masonry') as LayoutType,
          columns: data.gallery.config.columns,
          gap: data.gallery.config.gap,
          rowHeight: data.gallery.config.rowHeight,
          enableLightbox: data.gallery.config.enableLightbox,
          theme: data.gallery.config.theme,
        });
        setName(data.gallery.name);
        setItems(data.media.items);
        setHasMore(data.media.hasMore);
        setTotal(data.media.total);
        pageRef.current = 1;
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, apiBase]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;

    const nextPage = pageRef.current + 1;
    setLoading(true);

    fetch(`${apiBase}/public/galleries/${slug}/media?page=${nextPage}&limit=${pageSize}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to load more');
        const data: MediaPageResponse = await response.json();

        setItems((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setTotal(data.total);
        pageRef.current = nextPage;
      })
      .catch((err) => console.error('Failed to load more:', err))
      .finally(() => setLoading(false));
  }, [slug, apiBase, pageSize, loading, hasMore]);

  return { items, loading, error, config, name, hasMore, loadMore, total };
}
