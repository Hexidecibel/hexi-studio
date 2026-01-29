import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSourceAdapter } from '../useSourceAdapter';
import type { SourceAdapter, ImageItem } from '../../types';

const mockImages: ImageItem[] = [
  { id: '1', src: 'https://example.com/1.jpg', alt: 'Image 1' },
  { id: '2', src: 'https://example.com/2.jpg', alt: 'Image 2' },
];

const mockAdapter: SourceAdapter<{ count: number }> = {
  name: 'mock',
  fetch: vi.fn(async () => mockImages),
};

describe('useSourceAdapter', () => {
  it('should start in loading state', () => {
    const { result } = renderHook(() =>
      useSourceAdapter(mockAdapter, { count: 2 })
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.images).toEqual([]);
  });

  it('should load images from adapter', async () => {
    const { result } = renderHook(() =>
      useSourceAdapter(mockAdapter, { count: 2 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.images).toEqual(mockImages);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    const errorAdapter: SourceAdapter<object> = {
      name: 'error',
      fetch: async () => { throw new Error('Network error'); },
    };

    const { result } = renderHook(() =>
      useSourceAdapter(errorAdapter, {})
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Network error');
  });

  it('should provide a refetch function', async () => {
    const { result } = renderHook(() =>
      useSourceAdapter(mockAdapter, { count: 2 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
  });
});
