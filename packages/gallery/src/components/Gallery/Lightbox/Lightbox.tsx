import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ImageItem } from '../../../types';
import { isVideoItem } from '../../../types';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useSwipe } from '../../../hooks/useSwipe';
import { LightboxImage } from './LightboxImage';
import { LightboxControls } from './LightboxControls';
import styles from './Lightbox.module.css';

export interface LightboxProps {
  images: ImageItem[];
  currentIndex: number;
  isOpen: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  totalCount: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  renderLightboxFooter?: (image: ImageItem, index: number) => React.ReactNode;
  enableDownload?: boolean;
  enableShare?: boolean;
  onShare?: (image: ImageItem) => void;
  enableSlideshow?: boolean;
  isPlaying?: boolean;
  onToggleSlideshow?: () => void;
  onPauseSlideshow?: () => void;
}

export function Lightbox({
  images,
  currentIndex,
  isOpen,
  hasNext,
  hasPrev,
  totalCount,
  onClose,
  onNext,
  onPrev,
  renderLightboxFooter,
  enableDownload,
  enableShare,
  onShare,
  enableSlideshow,
  isPlaying,
  onToggleSlideshow,
  onPauseSlideshow,
}: LightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
    if (zoomed) {
      onPauseSlideshow?.();
    }
  }, [onPauseSlideshow]);
  const containerRef = useFocusTrap(isOpen);
  const swipeHandlers = useSwipe({
    onSwipeLeft: isZoomed ? undefined : onNext,
    onSwipeRight: isZoomed ? undefined : onPrev,
  });

  useEffect(() => {
    setIsVideoPlaying(false);
  }, [currentIndex]);

  useEffect(() => {
    if (isVideoPlaying) {
      onPauseSlideshow?.();
    }
  }, [isVideoPlaying, onPauseSlideshow]);

  const handleShare = useCallback(() => {
    const image = images[currentIndex];
    if (onShare && image) {
      onShare(image);
    }
  }, [onShare, images, currentIndex]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  const currentImage = images[currentIndex];
  if (!currentImage) return null;

  return createPortal(
    <div
      ref={containerRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={isVideoItem(currentImage) ? 'Video lightbox' : 'Image lightbox'}
      onClick={handleBackdropClick}
      {...swipeHandlers}
    >
      <LightboxControls
        currentIndex={currentIndex}
        totalCount={totalCount}
        currentImage={currentImage}
        hasNext={hasNext}
        hasPrev={hasPrev}
        onClose={onClose}
        onNext={onNext}
        onPrev={onPrev}
        renderLightboxFooter={renderLightboxFooter}
        enableDownload={enableDownload}
        enableShare={enableShare}
        onShare={handleShare}
        enableSlideshow={enableSlideshow}
        isPlaying={isPlaying}
        onToggleSlideshow={onToggleSlideshow}
      />

      <div className={styles.imageContainer} onClick={handleContentClick}>
        <LightboxImage
          key={currentImage.id}
          image={currentImage}
          onZoomChange={handleZoomChange}
          onVideoPlayStateChange={setIsVideoPlaying}
        />
      </div>
    </div>,
    document.body,
  );
}
