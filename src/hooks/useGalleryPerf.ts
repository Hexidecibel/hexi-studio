import { useState, useRef, useCallback } from 'react';

export interface GalleryPerfMetrics {
  renderCount: number;
  lastRenderDuration: number;
  averageRenderDuration: number;
  imagesLoaded: number;
  imagesTotal: number;
  loadProgress: number;
  timeToFirstImage: number | null;
  timeToAllImages: number | null;
}

export function useGalleryPerf(totalImages: number): GalleryPerfMetrics & {
  onImageLoad: () => void;
} {
  const [imagesLoaded, setImagesLoaded] = useState(0);
  const [timeToFirstImage, setTimeToFirstImage] = useState<number | null>(null);
  const [timeToAllImages, setTimeToAllImages] = useState<number | null>(null);

  const renderCountRef = useRef(0);
  const renderDurations = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(performance.now());
  const mountTime = useRef<number>(performance.now());
  const firstImageRecorded = useRef(false);

  // Track render timing via ref mutation (no state update = no infinite loop)
  const now = performance.now();
  const duration = now - lastRenderStart.current;
  if (duration > 0.01) {
    renderDurations.current.push(duration);
    renderCountRef.current++;
  }
  lastRenderStart.current = now;

  const onImageLoad = useCallback(() => {
    setImagesLoaded((prev) => {
      const next = prev + 1;

      if (!firstImageRecorded.current) {
        firstImageRecorded.current = true;
        setTimeToFirstImage(performance.now() - mountTime.current);
      }

      if (next >= totalImages && totalImages > 0) {
        setTimeToAllImages(performance.now() - mountTime.current);
      }

      return next;
    });
  }, [totalImages]);

  const averageRenderDuration =
    renderDurations.current.length > 0
      ? renderDurations.current.reduce((a, b) => a + b, 0) / renderDurations.current.length
      : 0;

  const lastRenderDuration =
    renderDurations.current.length > 0
      ? renderDurations.current[renderDurations.current.length - 1]
      : 0;

  const loadProgress = totalImages > 0 ? imagesLoaded / totalImages : 0;

  return {
    renderCount: renderCountRef.current,
    lastRenderDuration,
    averageRenderDuration,
    imagesLoaded,
    imagesTotal: totalImages,
    loadProgress,
    timeToFirstImage,
    timeToAllImages,
    onImageLoad,
  };
}
