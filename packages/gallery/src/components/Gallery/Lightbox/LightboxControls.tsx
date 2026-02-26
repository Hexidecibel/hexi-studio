import { useCallback } from 'react';
import { isVideoItem } from '../../../types';
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
  renderLightboxFooter?: (image: ImageItem, index: number) => React.ReactNode;
  enableDownload?: boolean;
  enableSlideshow?: boolean;
  isPlaying?: boolean;
  onToggleSlideshow?: () => void;
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
  renderLightboxFooter,
  enableDownload,
  enableSlideshow,
  isPlaying,
  onToggleSlideshow,
}: LightboxControlsProps) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const isVideo = isVideoItem(currentImage);

  const handleDownload = useCallback(async () => {
    const url = currentImage.src;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = currentImage.title || currentImage.alt || (isVideo ? 'video' : 'image');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, [currentImage.src, currentImage.title, currentImage.alt]);

  return (
    <>
      {/* Header: counter + close */}
      <div className={styles.header} onClick={stop}>
        <span className={styles.counter} aria-live="polite">
          {currentIndex + 1} of {totalCount}
        </span>
        <div className={styles.headerActions}>
          {enableDownload && (
            <button
              className={styles.headerButton}
              onClick={handleDownload}
              aria-label={isVideo ? 'Download video' : 'Download image'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          )}
          {enableSlideshow && (
            <button
              className={styles.headerButton}
              onClick={(e) => { e.stopPropagation(); onToggleSlideshow?.(); }}
              aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className={styles.iconSvg}>
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className={styles.iconSvg}>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>
          )}
          <button
            className={styles.headerButton}
            onClick={onClose}
            aria-label="Close lightbox"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
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
      {renderLightboxFooter ? (
        <div className={styles.footer} onClick={stop}>
          {renderLightboxFooter(currentImage, currentIndex)}
        </div>
      ) : (currentImage.title || currentImage.description) ? (
        <div className={styles.footer} onClick={stop}>
          {currentImage.title && (
            <h2 className={styles.title}>{currentImage.title}</h2>
          )}
          {currentImage.description && (
            <p className={styles.description}>{currentImage.description}</p>
          )}
        </div>
      ) : null}
    </>
  );
}
