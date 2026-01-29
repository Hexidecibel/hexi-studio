import { useCallback } from 'react';
import type { GalleryProps, ImageItem } from '../../types';
import { DEFAULT_LAYOUT } from '../../types';
import { useLightbox } from '../../hooks/useLightbox';
import { GridLayout } from './layouts/GridLayout';
import { MasonryLayout } from './layouts/MasonryLayout';
import { JustifiedLayout } from './layouts/JustifiedLayout';
import { Lightbox } from './Lightbox';
import styles from './Gallery.module.css';

export function Gallery({
  images,
  layout,
  className,
  onImageClick,
  enableLightbox,
  loading,
  virtualize,
  onImageLoad,
}: GalleryProps) {
  const resolvedLayout = { ...DEFAULT_LAYOUT, ...layout };
  const lightbox = useLightbox({ images });

  const handleImageClick = useCallback(
    (image: ImageItem, index: number) => {
      onImageClick?.(image, index);
      if (enableLightbox) {
        lightbox.open(index);
      }
    },
    [onImageClick, enableLightbox, lightbox],
  );

  const containerClassName = [styles.gallery, className].filter(Boolean).join(' ');

  const layoutProps = {
    images,
    layout: resolvedLayout,
    onImageClick: onImageClick || enableLightbox ? handleImageClick : undefined,
    loading,
    virtualize,
    onImageLoad,
  };

  return (
    <div className={containerClassName}>
      {resolvedLayout.type === 'masonry' ? (
        <MasonryLayout {...layoutProps} />
      ) : resolvedLayout.type === 'justified' ? (
        <JustifiedLayout {...layoutProps} />
      ) : (
        <GridLayout {...layoutProps} />
      )}

      {enableLightbox && (
        <Lightbox
          images={images}
          currentIndex={lightbox.currentIndex}
          isOpen={lightbox.isOpen}
          hasNext={lightbox.hasNext}
          hasPrev={lightbox.hasPrev}
          totalCount={lightbox.totalCount}
          onClose={lightbox.close}
          onNext={lightbox.next}
          onPrev={lightbox.prev}
        />
      )}
    </div>
  );
}
