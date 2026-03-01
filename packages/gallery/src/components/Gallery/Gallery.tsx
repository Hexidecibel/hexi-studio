import { useCallback, useMemo } from 'react';
import type { GalleryProps, ImageItem } from '../../types';
import { DEFAULT_LAYOUT } from '../../types';
import { useLightbox } from '../../hooks/useLightbox';
import { GridLayout } from './layouts/GridLayout';
import { MasonryLayout } from './layouts/MasonryLayout';
import { JustifiedLayout } from './layouts/JustifiedLayout';
import { ShowcaseLayout } from './layouts/ShowcaseLayout';
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
  renderEmpty,
  renderLightboxFooter,
  enableDownload,
  enableSlideshow,
  slideshowInterval,
  shuffle,
}: GalleryProps) {
  const resolvedLayout = { ...DEFAULT_LAYOUT, ...layout };

  const displayImages = useMemo(() => {
    if (!shuffle) return images;
    const shuffled = [...images];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [images, shuffle]);

  const lightbox = useLightbox({ images: displayImages, slideshowInterval });

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

  if (images.length === 0) {
    return (
      <div className={containerClassName}>
        {renderEmpty?.()}
      </div>
    );
  }

  const layoutProps = {
    images: displayImages,
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
      ) : resolvedLayout.type === 'showcase' ? (
        <ShowcaseLayout {...layoutProps} />
      ) : (
        <GridLayout {...layoutProps} />
      )}

      {enableLightbox && (
        <Lightbox
          images={displayImages}
          currentIndex={lightbox.currentIndex}
          isOpen={lightbox.isOpen}
          hasNext={lightbox.hasNext}
          hasPrev={lightbox.hasPrev}
          totalCount={lightbox.totalCount}
          onClose={lightbox.close}
          onNext={lightbox.next}
          onPrev={lightbox.prev}
          renderLightboxFooter={renderLightboxFooter}
          enableDownload={enableDownload}
          enableSlideshow={enableSlideshow}
          isPlaying={lightbox.isPlaying}
          onToggleSlideshow={lightbox.toggleSlideshow}
          onPauseSlideshow={lightbox.pauseSlideshow}
        />
      )}
    </div>
  );
}
