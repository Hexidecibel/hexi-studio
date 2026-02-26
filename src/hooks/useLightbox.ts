import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ImageItem } from '../types';
import { isVideoItem } from '../types';

export interface UseLightboxOptions {
  images: ImageItem[];
  slideshowInterval?: number;
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
  isPlaying: boolean;
  toggleSlideshow: () => void;
  pauseSlideshow: () => void;
}

export function useLightbox({ images, slideshowInterval }: UseLightboxOptions): UseLightboxReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((i) => Math.min(i + 1, totalCount - 1));
  }, [totalCount]);

  const prev = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalCount - 1)));
  }, [totalCount]);

  const pauseSlideshow = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const toggleSlideshow = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

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
        case ' ':
          e.preventDefault();
          toggleSlideshow();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close, next, prev, toggleSlideshow]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen) return;

    const toPreload: HTMLImageElement[] = [];

    const preload = (index: number) => {
      const item = images[index];
      if (!item) return;
      // For video items, preload the poster/thumbnail instead of the video file
      const src = isVideoItem(item)
        ? (item.poster || item.thumbnail)
        : item.src;
      if (src) {
        const img = new Image();
        img.src = src;
        toPreload.push(img);
      }
    };

    preload(currentIndex - 1);
    preload(currentIndex + 1);

    return () => {
      toPreload.forEach((img) => {
        img.src = '';
      });
    };
  }, [isOpen, currentIndex, images]);

  // Slideshow timer
  useEffect(() => {
    if (!isPlaying || !isOpen) return;

    const interval = Math.max(slideshowInterval ?? 5000, 500);
    const timer = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % totalCount);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, isOpen, slideshowInterval, totalCount]);

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
      isPlaying,
      toggleSlideshow,
      pauseSlideshow,
    }),
    [isOpen, currentIndex, currentImage, hasNext, hasPrev, totalCount, open, close, next, prev, goTo, isPlaying, toggleSlideshow, pauseSlideshow],
  );
}
