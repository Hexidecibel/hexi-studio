import type { ImageItem, SourceAdapter, PaginatedResult } from '../types';

export type FetchPage = (cursor?: string) => Promise<PaginatedResult>;

export interface AsyncAdapterConfig {
  fetchPage: FetchPage;
}

export const asyncAdapter: SourceAdapter<AsyncAdapterConfig> = {
  name: 'async',

  fetch: async (config) => {
    const allImages: ImageItem[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const result = await config.fetchPage(cursor);
      allImages.push(...result.images);
      cursor = result.nextCursor;
      hasMore = result.hasMore;
    }

    return allImages;
  },
};
