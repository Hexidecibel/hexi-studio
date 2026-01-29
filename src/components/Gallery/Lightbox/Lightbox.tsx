import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ImageItem } from '../../../types';
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
}: LightboxProps) {
  const containerRef = useFocusTrap(isOpen);
  const swipeHandlers = useSwipe({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
  });

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
      aria-label="Image lightbox"
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
      />

      <div className={styles.imageContainer} onClick={handleContentClick}>
        <LightboxImage key={currentImage.id} image={currentImage} />
      </div>
    </div>,
    document.body,
  );
}
