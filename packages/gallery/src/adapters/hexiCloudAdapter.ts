import type { FetchPage, AsyncAdapterConfig } from './asyncAdapter';
import type { MediaItem, PaginatedResult } from '../types';

export interface HexiCloudConfig {
  /** Gallery slug (identifier) */
  slug: string;
  /** API base URL. Defaults to production API. */
  apiBase?: string;
  /** Number of items per page. Defaults to 50. */
  pageSize?: number;
  /** Optional API key for authenticated access to public endpoints. */
  apiKey?: string;
}

interface PublicGalleryResponse {
  gallery: {
    name: string;
    slug: string;
    config: Record<string, unknown>;
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

function buildHeaders(apiKey?: string): HeadersInit | undefined {
  if (!apiKey) return undefined;
  return { 'X-API-Key': apiKey };
}

/**
 * Create an async adapter config that fetches from Hexi Gallery Cloud's public API.
 *
 * Usage:
 * ```tsx
 * const config = hexiCloudAdapter({ slug: 'my-photos' });
 * const { images, loading, loadMore, hasMore } = useAsyncAdapter(config.fetchPage);
 * ```
 */
export function hexiCloudAdapter(config: HexiCloudConfig): AsyncAdapterConfig {
  const apiBase = config.apiBase || 'https://api.hexi.gallery/api/v1';
  const pageSize = config.pageSize || 50;

  let currentPage = 0;

  const fetchPage: FetchPage = async (): Promise<PaginatedResult> => {
    const nextPage = currentPage + 1;

    if (nextPage === 1) {
      const response = await fetch(`${apiBase}/public/galleries/${config.slug}`, {
        headers: buildHeaders(config.apiKey),
      });
      if (!response.ok) {
        throw new Error(`Gallery not found: ${config.slug}`);
      }
      const data: PublicGalleryResponse = await response.json();
      currentPage = 1;

      return {
        images: data.media.items,
        hasMore: data.media.hasMore,
        nextCursor: data.media.hasMore ? String(nextPage + 1) : undefined,
      };
    }

    const response = await fetch(
      `${apiBase}/public/galleries/${config.slug}/media?page=${nextPage}&limit=${pageSize}`,
      {
        headers: buildHeaders(config.apiKey),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to load media');
    }
    const data: MediaPageResponse = await response.json();
    currentPage = nextPage;

    return {
      images: data.items,
      hasMore: data.hasMore,
      nextCursor: data.hasMore ? String(nextPage + 1) : undefined,
    };
  };

  return {
    fetchPage,
  };
}
