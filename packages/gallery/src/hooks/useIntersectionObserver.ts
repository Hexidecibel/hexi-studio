import { useRef, useState, useEffect } from 'react';

export interface UseIntersectionObserverOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

export function useIntersectionObserver({
  rootMargin = '200px',
  threshold = 0,
  triggerOnce = true,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(() => {
    return typeof IntersectionObserver === 'undefined';
  });
  const ref = useRef<HTMLElement | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;

    if (!node || typeof IntersectionObserver === 'undefined') {
      return;
    }

    if (triggerOnce && firedRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting;
        setIsIntersecting(intersecting);

        if (intersecting && triggerOnce) {
          firedRef.current = true;
          observer.disconnect();
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce]);

  return { ref, isIntersecting };
}
