import { useState, useEffect, useMemo } from 'react';

export interface VirtualItem {
  index: number;
  offsetTop: number;
  height: number;
}

export interface UseVirtualizationOptions {
  /** Total number of rows to virtualize */
  totalCount: number;
  /** Estimated height of each row in pixels */
  estimatedItemHeight: number;
  /** Extra rows to render above/below the viewport */
  overscan?: number;
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}

export interface UseVirtualizationReturn {
  virtualItems: VirtualItem[];
  totalHeight: number;
  isVirtualized: boolean;
}

const ACTIVATION_THRESHOLD = 50;

export function useVirtualization({
  totalCount,
  estimatedItemHeight,
  overscan = 5,
  containerRef,
  enabled = true,
}: UseVirtualizationOptions): UseVirtualizationReturn {
  const isVirtualized = enabled && totalCount > ACTIVATION_THRESHOLD;
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0,
  );

  useEffect(() => {
    if (!isVirtualized) return;

    const handleScroll = () => setScrollTop(window.scrollY);
    const handleResize = () => setViewportHeight(window.innerHeight);

    handleResize();
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVirtualized]);

  const { virtualItems, totalHeight } = useMemo(() => {
    const rowHeight = estimatedItemHeight;
    const totalH = totalCount * rowHeight;

    if (!isVirtualized) {
      const items: VirtualItem[] = [];
      for (let i = 0; i < totalCount; i++) {
        items.push({ index: i, offsetTop: i * rowHeight, height: rowHeight });
      }
      return { virtualItems: items, totalHeight: totalH };
    }

    // How far the container's top edge is from the page top
    const containerTop = containerRef.current?.getBoundingClientRect().top ?? 0;
    const containerOffset = containerTop + scrollTop;

    // Scroll position relative to the container
    const relativeScroll = scrollTop - containerOffset;

    const startRow = Math.max(
      0,
      Math.floor(relativeScroll / rowHeight) - overscan,
    );
    const endRow = Math.min(
      totalCount - 1,
      Math.ceil((relativeScroll + viewportHeight) / rowHeight) + overscan,
    );

    const items: VirtualItem[] = [];
    for (let i = startRow; i <= endRow; i++) {
      items.push({ index: i, offsetTop: i * rowHeight, height: rowHeight });
    }

    return { virtualItems: items, totalHeight: totalH };
  }, [
    isVirtualized,
    totalCount,
    scrollTop,
    viewportHeight,
    overscan,
    estimatedItemHeight,
    containerRef,
  ]);

  return { virtualItems, totalHeight, isVirtualized };
}
