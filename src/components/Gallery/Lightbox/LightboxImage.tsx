import { useState, useCallback } from 'react';
import type { ImageItem } from '../../../types';
import { usePinchZoom } from '../../../hooks/usePinchZoom';
import styles from './Lightbox.module.css';

interface LightboxImageProps {
  image: ImageItem;
  onZoomChange?: (isZoomed: boolean) => void;
}

export function LightboxImage({ image, onZoomChange }: LightboxImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const zoom = usePinchZoom({
    maxScale: 4,
    onZoomChange: (scale) => onZoomChange?.(scale > 1),
  });

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  if (hasError) {
    return (
      <div className={styles.errorState} role="alert">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={styles.errorIcon}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span>Failed to load image</span>
      </div>
    );
  }

  return (
    <div ref={zoom.ref} className={styles.zoomContainer}>
      {!isLoaded && <div className={styles.spinner} aria-label="Loading image" />}
      <img
        key={image.id}
        src={image.src}
        alt={image.alt}
        className={styles.image}
        onLoad={handleLoad}
        onError={handleError}
        draggable={false}
        style={{ opacity: isLoaded ? 1 : 0, ...zoom.style }}
        {...(image.srcSet ? { srcSet: image.srcSet, sizes: '100vw' } : undefined)}
      />
    </div>
  );
}
