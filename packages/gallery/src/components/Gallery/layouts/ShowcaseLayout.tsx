import { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageItem, LayoutOptions } from '../../../types';
import { GalleryImage } from '../GalleryImage';
import { useContainerWidth } from '../../../hooks/useContainerWidth';
import styles from './ShowcaseLayout.module.css';

export interface ShowcaseLayoutProps {
  images: ImageItem[];
  layout: LayoutOptions;
  onImageClick?: (image: ImageItem, index: number) => void;
  loading?: 'lazy' | 'eager';
  virtualize?: boolean | number;
  onImageLoad?: () => void;
  isSelecting?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (image: ImageItem) => void;
  onLongPress?: (image: ImageItem) => void;
}

export function ShowcaseLayout({
  images,
  layout,
  onImageClick,
  loading,
  onImageLoad,
  isSelecting,
  selected,
  onToggleSelect,
  onLongPress,
}: ShowcaseLayoutProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { ref: widthRef, width: containerWidth } = useContainerWidth();
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const gap = typeof layout.gap === 'number' ? layout.gap : 16;
  const gapStr = `${gap}px`;
  const thumbnailHeight = layout.thumbnailHeight || 80;

  // Clamp activeIndex when images change
  useEffect(() => {
    if (activeIndex >= images.length && images.length > 0) {
      setActiveIndex(images.length - 1);
    }
  }, [images.length, activeIndex]);

  // Scroll active thumbnail into view (skip on initial mount to prevent page jump)
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const thumb = thumbRefs.current[activeIndex];
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev));
      }
    },
    [images.length],
  );

  if (images.length === 0) {
    return <div ref={widthRef} className={`${styles.showcase} gallery-showcase`} />;
  }

  const activeImage = images[activeIndex];
  const aspectRatio = activeImage.width && activeImage.height
    ? activeImage.width / activeImage.height
    : 4 / 3;
  const featuredHeight = Math.min(containerWidth / aspectRatio, containerWidth * 0.75);

  return (
    <div ref={widthRef} className={`${styles.showcase} gallery-showcase`} style={{ gap: gapStr }}>
      {/* Featured image */}
      <div
        className={styles.featured}
        style={{ height: featuredHeight }}
        role="tabpanel"
        aria-label={`Image ${activeIndex + 1} of ${images.length}`}
      >
        <GalleryImage
          key={activeImage.id}
          image={activeImage}
          index={activeIndex}
          onClick={onImageClick}
          loading={loading}
          onImageLoad={onImageLoad}
          className={styles.featuredImage}
          isSelecting={isSelecting}
          isSelected={selected?.has(activeImage.id)}
          onToggleSelect={onToggleSelect}
          onLongPress={onLongPress}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div
          ref={stripRef}
          className={styles.strip}
          style={{ gap: gapStr, height: thumbnailHeight }}
          role="tablist"
          aria-label="Image thumbnails"
          onKeyDown={handleKeyDown}
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              ref={(el) => { thumbRefs.current[index] = el; }}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={image.title || image.alt || `Image ${index + 1}`}
              className={`${styles.thumb} ${index === activeIndex ? styles.thumbActive : ''}`}
              style={{ height: thumbnailHeight }}
              onClick={() => setActiveIndex(index)}
              tabIndex={index === activeIndex ? 0 : -1}
            >
              <img
                src={image.thumbnail || image.src}
                alt=""
                className={styles.thumbImg}
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
