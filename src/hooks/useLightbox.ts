import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ImageItem } from '../types';

export interface UseLightboxOptions {
  images: ImageItem[];
}

export interface UseLightboxReturn {
  isOpen: boolean;
  currentIndex: number;
  currentImage: ImageItem | undefined;
  hasNext: boolean;
  hasPrev: boolean;
  totalCount: number;
  open: (index: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
}

export function useLightbox({ images }: UseLightboxOptions): UseLightboxReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const totalCount = images.length;
  const currentImage = isOpen ? images[currentIndex] : undefined;
  const hasNext = currentIndex < totalCount - 1;
  const hasPrev = currentIndex > 0;

  const open = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalCount - 1));
  }, [totalCount]);

  const prev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalCount - 1)));
  }, [totalCount]);

  // Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          close();
          break;
        case 'ArrowRight':
          next();
          break;
        case 'ArrowLeft':
          prev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, next, prev]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return useMemo(
    () => ({
      isOpen,
      currentIndex,
      currentImage,
      hasNext,
      hasPrev,
      totalCount,
      open,
      close,
      next,
      prev,
      goTo,
    }),
    [isOpen, currentIndex, currentImage, hasNext, hasPrev, totalCount, open, close, next, prev, goTo],
  );
}
