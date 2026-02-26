import { describe, it, expect, vi } from 'vitest';
import { asyncAdapter } from '../asyncAdapter';

describe('asyncAdapter', () => {
  it('should have the name "async"', () => {
    expect(asyncAdapter.name).toBe('async');
  });

  it('should fetch all pages until hasMore is false', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({
        images: [{ id: '1', src: 'a.jpg', alt: 'A' }],
        nextCursor: 'page2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        images: [{ id: '2', src: 'b.jpg', alt: 'B' }],
        nextCursor: undefined,
        hasMore: false,
      });

    const images = await asyncAdapter.fetch({ fetchPage });

    expect(images).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenCalledWith(undefined);
    expect(fetchPage).toHaveBeenCalledWith('page2');
  });

  it('should handle single page result', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      images: [{ id: '1', src: 'a.jpg', alt: 'A' }],
      hasMore: false,
    });

    const images = await asyncAdapter.fetch({ fetchPage });
    expect(images).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
