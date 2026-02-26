import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useVirtualization } from '../useVirtualization';
import { useRef } from 'react';

function useTestRef() {
  return useRef<HTMLElement | null>(null);
}

describe('useVirtualization', () => {
  it('should not virtualize when totalCount <= 50', () => {
    const { result } = renderHook(() => {
      const containerRef = useTestRef();
      return useVirtualization({
        totalCount: 30,
        estimatedItemHeight: 200,
        containerRef,
      });
    });

    expect(result.current.isVirtualized).toBe(false);
    expect(result.current.virtualItems).toHaveLength(30);
  });

  it('should virtualize when totalCount > 50 and enabled', () => {
    const { result } = renderHook(() => {
      const containerRef = useTestRef();
      return useVirtualization({
        totalCount: 100,
        estimatedItemHeight: 200,
        containerRef,
      });
    });

    expect(result.current.isVirtualized).toBe(true);
  });

  it('should not virtualize when disabled', () => {
    const { result } = renderHook(() => {
      const containerRef = useTestRef();
      return useVirtualization({
        totalCount: 100,
        estimatedItemHeight: 200,
        containerRef,
        enabled: false,
      });
    });

    expect(result.current.isVirtualized).toBe(false);
    expect(result.current.virtualItems).toHaveLength(100);
  });

  it('should calculate totalHeight from item heights', () => {
    const { result } = renderHook(() => {
      const containerRef = useTestRef();
      return useVirtualization({
        totalCount: 10,
        estimatedItemHeight: 100,
        containerRef,
        enabled: false,
      });
    });

    expect(result.current.totalHeight).toBe(1000);
  });

  it('should return virtualItems with correct structure', () => {
    const { result } = renderHook(() => {
      const containerRef = useTestRef();
      return useVirtualization({
        totalCount: 5,
        estimatedItemHeight: 100,
        containerRef,
        enabled: false,
      });
    });

    const item = result.current.virtualItems[0];
    expect(item).toHaveProperty('index', 0);
    expect(item).toHaveProperty('offsetTop', 0);
    expect(item).toHaveProperty('height', 100);
  });
});
