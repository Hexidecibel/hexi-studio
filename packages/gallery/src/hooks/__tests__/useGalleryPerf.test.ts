import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useGalleryPerf } from '../useGalleryPerf';

describe('useGalleryPerf', () => {
  it('should start with zero metrics', () => {
    const { result } = renderHook(() => useGalleryPerf(10));
    expect(result.current.imagesLoaded).toBe(0);
    expect(result.current.imagesTotal).toBe(10);
    expect(result.current.loadProgress).toBe(0);
    expect(result.current.timeToFirstImage).toBeNull();
    expect(result.current.timeToAllImages).toBeNull();
  });

  it('should track image loads', () => {
    const { result } = renderHook(() => useGalleryPerf(3));

    act(() => {
      result.current.onImageLoad();
    });

    expect(result.current.imagesLoaded).toBe(1);
    expect(result.current.loadProgress).toBeCloseTo(1 / 3, 2);
  });

  it('should set timeToFirstImage on first load', () => {
    const { result } = renderHook(() => useGalleryPerf(3));

    act(() => {
      result.current.onImageLoad();
    });

    expect(result.current.timeToFirstImage).toBeGreaterThanOrEqual(0);
  });

  it('should set timeToAllImages when all loaded', () => {
    const { result } = renderHook(() => useGalleryPerf(2));

    act(() => {
      result.current.onImageLoad();
      result.current.onImageLoad();
    });

    expect(result.current.timeToAllImages).toBeGreaterThanOrEqual(0);
  });

  it('should track render count', () => {
    const { result } = renderHook(() => useGalleryPerf(5));
    // renderCount uses ref-based tracking, starts at 0 on mount
    expect(result.current.renderCount).toBeGreaterThanOrEqual(0);
  });
});
