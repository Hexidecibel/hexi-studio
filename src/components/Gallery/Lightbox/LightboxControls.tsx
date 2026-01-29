import { useCallback } from 'react';
import type { ImageItem } from '../../../types';
import styles from './LightboxControls.module.css';

interface LightboxControlsProps {
  currentIndex: number;
  totalCount: number;
  currentImage: ImageItem;
  hasNext: boolean;
  hasPrev: boolean;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function LightboxControls({
  currentIndex,
  totalCount,
  currentImage,
  hasNext,
  hasPrev,
  onClose,
  onNext,
  onPrev,
}: LightboxControlsProps) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <>
      {/* Header: counter + close */}
      <div className={styles.header} onClick={stop}>
        <span className={styles.counter} aria-live="polite">
          {currentIndex + 1} of {totalCount}
        </span>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Prev / Next */}
      {hasPrev && (
        <button
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {hasNext && (
        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next image"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Footer: title / description */}
      {(currentImage.title || currentImage.description) && (
        <div className={styles.footer} onClick={stop}>
          {currentImage.title && (
            <h2 className={styles.title}>{currentImage.title}</h2>
          )}
          {currentImage.description && (
            <p className={styles.description}>{currentImage.description}</p>
          )}
        </div>
      )}
    </>
  );
}
