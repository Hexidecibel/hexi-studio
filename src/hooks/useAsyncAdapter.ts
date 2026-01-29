import { useState, useCallback, useRef } from 'react';
import type { ImageItem } from '../types';
import type { FetchPage } from '../adapters/asyncAdapter';

export interface UseAsyncAdapterReturn {
  images: ImageItem[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useAsyncAdapter(fetchPage: FetchPage): UseAsyncAdapterReturn {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | undefined>();
  const fetchId = useRef(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const id = ++fetchId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPage(cursorRef.current);
      if (id === fetchId.current) {
        setImages((prev) => [...prev, ...result.images]);
        cursorRef.current = result.nextCursor;
        setHasMore(result.hasMore);
      }
    } catch (err) {
      if (id === fetchId.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (id === fetchId.current) {
        setLoading(false);
      }
    }
  }, [fetchPage, loading, hasMore]);

  const refetch = useCallback(async () => {
    const id = ++fetchId.current;
    cursorRef.current = undefined;
    setImages([]);
    setHasMore(true);
    setLoading(true);
    setError(null);

    try {
      const result = await fetchPage(undefined);
      if (id === fetchId.current) {
        setImages(result.images);
        cursorRef.current = result.nextCursor;
        setHasMore(result.hasMore);
      }
    } catch (err) {
      if (id === fetchId.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (id === fetchId.current) {
        setLoading(false);
      }
    }
  }, [fetchPage]);

  return { images, loading, error, hasMore, loadMore, refetch };
}
