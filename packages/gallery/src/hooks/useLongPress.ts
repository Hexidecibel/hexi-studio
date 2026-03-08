import { useCallback, useRef } from 'react';

export interface UseLongPressOptions {
  onLongPress: () => void;
  delay?: number;
  moveThreshold?: number;
}

export interface UseLongPressHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function useLongPress({
  onLongPress,
  delay = 500,
  moveThreshold = 10,
}: UseLongPressOptions): UseLongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggered = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    longPressTriggered.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onLongPress();
      timerRef.current = null;
    }, delay);
  }, [onLongPress, delay]);

  const onPointerUp = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerCancel = useCallback(() => {
    clear();
  }, [clear]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startPos.current) {
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > moveThreshold) {
        clear();
      }
    }
  }, [moveThreshold, clear]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    if (longPressTriggered.current) {
      e.preventDefault();
    }
  }, []);

  return { onPointerDown, onPointerUp, onPointerCancel, onPointerMove, onContextMenu };
}
