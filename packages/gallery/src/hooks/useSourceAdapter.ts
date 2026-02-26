import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageItem, SourceAdapter } from '../types';

export interface UseSourceAdapterReturn {
  images: ImageItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useSourceAdapter<TConfig>(
  adapter: SourceAdapter<TConfig>,
  config: TConfig,
): UseSourceAdapterReturn {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const configRef = useRef(config);
  const fetchId = useRef(0);

  configRef.current = config;

  const fetchImages = useCallback(async () => {
    const id = ++fetchId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await adapter.fetch(configRef.current);
      if (id === fetchId.current) {
        setImages(result);
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
  }, [adapter]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return { images, loading, error, refetch: fetchImages };
}
