import { useState, useCallback } from 'react';
import type { ImageItem } from '../../types';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import styles from './GalleryImage.module.css';

export interface GalleryImageProps {
  image: ImageItem;
  index: number;
  onClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
  className?: string;
}

export function GalleryImage({
  image,
  index,
  onClick,
  loading = 'lazy',
  className,
}: GalleryImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver({ rootMargin: '200px' });

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleClick = useCallback(() => {
    onClick?.(image, index);
  }, [onClick, image, index]);

  const shouldRenderImg = isIntersecting || loading === 'eager';
  const src = image.thumbnail || image.src;
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
        {content}
      </button>
    );
  }

  return (
    <div ref={ref as unknown as React.RefObject<HTMLDivElement>} className={wrapperClassName} style={wrapperStyle}>
      {content}
    </div>
  );
}
