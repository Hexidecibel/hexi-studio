import { useState, useCallback, useEffect, useRef } from 'react';
import type { ImageItem } from '../../../types';
import { isVideoItem } from '../../../types';
import { usePinchZoom } from '../../../hooks/usePinchZoom';
import styles from './Lightbox.module.css';

interface LightboxImageProps {
  image: ImageItem;
  onZoomChange?: (isZoomed: boolean) => void;
  onVideoPlayStateChange?: (isPlaying: boolean) => void;
}

function LightboxVideo({
  image,
  onPlayStateChange,
}: {
  image: ImageItem;
  onPlayStateChange?: (isPlaying: boolean) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoadedData = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Autoplay with catch for blocked autoplay, respect prefers-reduced-motion
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    video.play().catch(() => {
      // Autoplay blocked — user sees paused video with native controls
    });
  }, [isLoaded]);

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
        <span>Failed to load video</span>
      </div>
    );
  }

  return (
    <div className={styles.videoContainer}>
      {!isLoaded && <div className={styles.spinner} aria-label="Loading video" />}
      <video
        ref={videoRef}
        key={image.id}
        controls
        muted
        playsInline
        poster={image.poster}
        className={styles.video}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={() => onPlayStateChange?.(true)}
        onPause={() => onPlayStateChange?.(false)}
        onEnded={() => onPlayStateChange?.(false)}
        style={{ opacity: isLoaded ? 1 : 0 }}
      >
        {image.sources?.map((s, i) => (
          <source key={i} src={s.src} type={s.type} />
        ))}
        {(!image.sources || image.sources.length === 0) && (
          <source src={image.src} />
        )}
      </video>
    </div>
  );
}

export function LightboxImage({ image, onZoomChange, onVideoPlayStateChange }: LightboxImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isVideo = isVideoItem(image);

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

  // Video items render via LightboxVideo — no pinch-zoom
  if (isVideo) {
    return <LightboxVideo image={image} onPlayStateChange={onVideoPlayStateChange} />;
  }

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
