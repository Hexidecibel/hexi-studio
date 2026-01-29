import { useRef, useState, useCallback, useMemo } from 'react';

export interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  onZoomChange?: (scale: number) => void;
}

export interface UsePinchZoomReturn {
  ref: React.RefCallback<HTMLElement>;
  scale: number;
  translateX: number;
  translateY: number;
  isZoomed: boolean;
  reset: () => void;
  style: React.CSSProperties;
}

function getDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function usePinchZoom({
  minScale = 1,
  maxScale = 4,
  onZoomChange,
}: UsePinchZoomOptions = {}): UsePinchZoomReturn {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const lastTap = useRef(0);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const elementRef = useRef<HTMLElement | null>(null);

  const clampScale = useCallback(
    (s: number) => Math.min(maxScale, Math.max(minScale, s)),
    [minScale, maxScale],
  );

  const reset = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
    onZoomChange?.(1);
  }, [onZoomChange]);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      // Cleanup old element
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart as EventListener);
        elementRef.current.removeEventListener('touchmove', handleTouchMove as EventListener);
        elementRef.current.removeEventListener('touchend', handleTouchEnd as EventListener);
      }

      elementRef.current = node;
      if (!node) return;

      function handleTouchStart(e: TouchEvent) {
        if (e.touches.length === 2) {
          e.preventDefault();
          initialDistance.current = getDistance(e.touches[0], e.touches[1]);
          initialScale.current = scale;
        } else if (e.touches.length === 1) {
          // Check for double tap
          const now = Date.now();
          if (now - lastTap.current < 300) {
            e.preventDefault();
            if (scale > 1) {
              // Reset zoom
              setScale(1);
              setTranslateX(0);
              setTranslateY(0);
              onZoomChange?.(1);
            } else {
              const newScale = clampScale(2);
              setScale(newScale);
              onZoomChange?.(newScale);
            }
            lastTap.current = 0;
            return;
          }
          lastTap.current = now;

          // Pan start (only when zoomed)
          if (scale > 1) {
            panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            translateStart.current = { x: translateX, y: translateY };
          }
        }
      }

      function handleTouchMove(e: TouchEvent) {
        if (e.touches.length === 2) {
          e.preventDefault();
          const currentDistance = getDistance(e.touches[0], e.touches[1]);
          const ratio = currentDistance / initialDistance.current;
          const newScale = clampScale(initialScale.current * ratio);
          setScale(newScale);
          onZoomChange?.(newScale);
        } else if (e.touches.length === 1 && scale > 1) {
          e.preventDefault();
          const dx = e.touches[0].clientX - panStart.current.x;
          const dy = e.touches[0].clientY - panStart.current.y;
          setTranslateX(translateStart.current.x + dx);
          setTranslateY(translateStart.current.y + dy);
        }
      }

      function handleTouchEnd(e: TouchEvent) {
        if (e.touches.length === 0 && scale <= 1) {
          setTranslateX(0);
          setTranslateY(0);
        }
      }

      node.addEventListener('touchstart', handleTouchStart, { passive: false });
      node.addEventListener('touchmove', handleTouchMove, { passive: false });
      node.addEventListener('touchend', handleTouchEnd);
    },
    // We need scale/translate in the closure for panning logic
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, translateX, translateY, clampScale, onZoomChange],
  );

  const isZoomed = scale > 1;

  const style: React.CSSProperties = useMemo(
    () => ({
      transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      transformOrigin: 'center center',
      touchAction: isZoomed ? 'none' : 'auto',
    }),
    [scale, translateX, translateY, isZoomed],
  );

  return { ref, scale, translateX, translateY, isZoomed, reset, style };
}
