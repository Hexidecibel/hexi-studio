import { useCallback, useMemo, useEffect } from 'react';
import type { GalleryProps, ImageItem } from '../../types';
import { DEFAULT_LAYOUT } from '../../types';
import { useLightbox } from '../../hooks/useLightbox';
import { useSelection } from '../../hooks/useSelection';
import { GridLayout } from './layouts/GridLayout';
import { MasonryLayout } from './layouts/MasonryLayout';
import { JustifiedLayout } from './layouts/JustifiedLayout';
import { ShowcaseLayout } from './layouts/ShowcaseLayout';
import { Lightbox } from './Lightbox';
import { SelectionBar } from './SelectionBar';
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
  enableSelection,
  enableShare,
  onShare,
  renderSelectionBar,
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

  const selection = useSelection();

  // Exit selection mode on Escape
  useEffect(() => {
    if (!selection.isSelecting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selection.exitSelectionMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection.isSelecting, selection.exitSelectionMode]);

  const handleImageClick = useCallback(
    (image: ImageItem, index: number) => {
      if (selection.isSelecting) return; // selection toggle handled by GalleryImage
      onImageClick?.(image, index);
      if (enableLightbox) {
        lightbox.open(index);
      }
    },
    [onImageClick, enableLightbox, lightbox, selection.isSelecting],
  );

  const handleLongPress = useCallback(
    (image: ImageItem) => {
      if (enableSelection) {
        selection.enterSelectionMode(image.id);
      }
    },
    [enableSelection, selection.enterSelectionMode],
  );

  const handleToggleSelect = useCallback(
    (image: ImageItem) => {
      selection.toggle(image.id);
    },
    [selection.toggle],
  );

  const handleShareFromLightbox = useCallback(
    (image: ImageItem) => {
      onShare?.([image]);
    },
    [onShare],
  );

  const handleShareSelected = useCallback(
    (selectedImages: ImageItem[]) => {
      onShare?.(selectedImages);
    },
    [onShare],
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
    ...(enableSelection && {
      isSelecting: selection.isSelecting,
      selected: selection.selected,
      onToggleSelect: handleToggleSelect,
      onLongPress: handleLongPress,
    }),
  };

  const selectedImages = useMemo(
    () => displayImages.filter((img) => selection.selected.has(img.id)),
    [displayImages, selection.selected],
  );

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
          enableShare={enableShare}
          onShare={handleShareFromLightbox}
        />
      )}

      {enableSelection && selection.isSelecting && (
        renderSelectionBar ? (
          renderSelectionBar(selectedImages, selection.exitSelectionMode)
        ) : (
          <SelectionBar
            count={selection.count}
            selectedImages={selectedImages}
            onShare={onShare ? handleShareSelected : undefined}
            onDeselectAll={selection.deselectAll}
            onExit={selection.exitSelectionMode}
          />
        )
      )}
    </div>
  );
}
