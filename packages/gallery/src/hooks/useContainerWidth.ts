import { useRef, useState, useEffect } from 'react';

export interface UseContainerWidthOptions {
  defaultWidth?: number;
}

export function useContainerWidth({ defaultWidth = 1200 }: UseContainerWidthOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const measured = entry.contentBoxSize
        ? entry.contentBoxSize[0].inlineSize
        : entry.contentRect.width;

      if (measured > 0) {
        setWidth(measured);
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, width };
}
