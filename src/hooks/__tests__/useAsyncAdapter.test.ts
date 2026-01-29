import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAsyncAdapter } from '../useAsyncAdapter';

describe('useAsyncAdapter', () => {
  it('should start with empty images and hasMore true', () => {
    const fetchPage = vi.fn();
    const { result } = renderHook(() => useAsyncAdapter(fetchPage));

    expect(result.current.images).toEqual([]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('should load images on loadMore', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      images: [{ id: '1', src: 'a.jpg', alt: 'A' }],
      nextCursor: 'page2',
      hasMore: true,
    });

    const { result } = renderHook(() => useAsyncAdapter(fetchPage));

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.images).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('should handle errors', async () => {
    const fetchPage = vi.fn().mockRejectedValueOnce(new Error('Failed'));

    const { result } = renderHook(() => useAsyncAdapter(fetchPage));

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe('Failed');
  });

  it('should provide a refetch function', () => {
    const fetchPage = vi.fn();
    const { result } = renderHook(() => useAsyncAdapter(fetchPage));
    expect(typeof result.current.refetch).toBe('function');
  });
});
