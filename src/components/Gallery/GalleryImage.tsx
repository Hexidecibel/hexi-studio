import { useState, useCallback } from 'react';
import type { ImageItem } from '../../types';
import { isVideoItem } from '../../types';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import styles from './GalleryImage.module.css';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface GalleryImageProps {
  image: ImageItem;
  index: number;
  onClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
  className?: string;
  onImageLoad?: () => void;
}

export function GalleryImage({
  image,
  index,
  onClick,
  loading = 'lazy',
  className,
  onImageLoad,
}: GalleryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver({ rootMargin: '200px' });

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onImageLoad?.();
  }, [onImageLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.(image, index);
  }, [onClick, image, index]);

  const shouldRenderImg = isIntersecting || loading === 'eager';
  const isVideo = isVideoItem(image);
  const src = image.thumbnail || (isVideo && image.poster) || image.src;
  const hasAspectRatio = image.width && image.height;

  const wrapperStyle: React.CSSProperties = {
    ...(hasAspectRatio && { aspectRatio: `${image.width} / ${image.height}` }),
    ...(image.blurDataUrl && { backgroundImage: `url(${image.blurDataUrl})` }),
  };

  const content = (
    <>
      {shouldRenderImg && !hasError ? (
        <img
          src={src}
          alt={image.alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`${styles.image} ${isLoaded ? styles.loaded : ''}`}
          draggable={false}
          {...(image.srcSet ? { srcSet: image.srcSet, sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw' } : undefined)}
        />
      ) : hasError ? (
        <div className={styles.error} aria-label="Image failed to load">
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
        </div>
      ) : null}
      {!isLoaded && !hasError && (
        <div className={styles.shimmer} aria-hidden="true" />
      )}
    </>
  );

  const fullContent = (
    <>
      {content}
      {isVideo && isLoaded && (
        <>
          <div className={styles.playOverlay} aria-hidden="true">
            <svg viewBox="0 0 48 48" className={styles.playIcon}>
              <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.5)" />
              <polygon points="19,14 19,34 35,24" fill="white" />
            </svg>
          </div>
          {image.duration != null && (
            <span className={styles.duration}>{formatDuration(image.duration)}</span>
          )}
        </>
      )}
    </>
  );

  const wrapperClassName = [
    styles.wrapper,
    'gallery-image',
    className,
  ].filter(Boolean).join(' ');

  if (onClick) {
    return (
      <button
        ref={ref as unknown as React.RefObject<HTMLButtonElement>}
        type="button"
        className={wrapperClassName}
        style={wrapperStyle}
        onClick={handleClick}
        aria-label={image.title || image.alt}
      >
        {fullContent}
      </button>
    );
  }

  return (
    <div ref={ref as unknown as React.RefObject<HTMLDivElement>} className={wrapperClassName} style={wrapperStyle}>
      {fullContent}
    </div>
  );
}
