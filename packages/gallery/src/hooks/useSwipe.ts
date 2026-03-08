import { useRef, useCallback } from 'react';

export interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeDown?: () => void;
  onSwipeUp?: () => void;
  threshold?: number;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeDown,
  onSwipeUp,
  threshold = 50,
}: UseSwipeOptions) {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((_e: React.TouchEvent) => {
    // No-op — we detect on end
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX.current;
      const diffY = endY - startY.current;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) >= threshold) {
        // Horizontal swipe
        if (diffX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }
      } else if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) >= threshold) {
        // Vertical swipe
        if (diffY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight, onSwipeDown, onSwipeUp, threshold],
  );

  return { onTouchStart, onTouchMove, onTouchEnd };
}
