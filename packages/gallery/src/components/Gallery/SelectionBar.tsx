import type { MediaItem } from '../../types';
import styles from './SelectionBar.module.css';

export interface SelectionBarProps {
  count: number;
  onShare?: (images: MediaItem[]) => void;
  onDeselectAll: () => void;
  onExit: () => void;
  selectedImages: MediaItem[];
}

export function SelectionBar({
  count,
  onShare,
  onDeselectAll,
  onExit,
  selectedImages,
}: SelectionBarProps) {
  if (count === 0) return null;

  return (
    <div className={styles.bar} role="toolbar" aria-label="Selection actions">
      <span className={styles.count}>
        {count} selected
      </span>
      <div className={styles.actions}>
        {onShare && (
          <button
            className={styles.actionButton}
            onClick={() => onShare(selectedImages)}
            aria-label={`Share ${count} photo${count !== 1 ? 's' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>Share</span>
          </button>
        )}
        <button
          className={styles.actionButton}
          onClick={onDeselectAll}
          aria-label="Deselect all"
        >
          Deselect All
        </button>
        <button
          className={`${styles.actionButton} ${styles.cancelButton}`}
          onClick={onExit}
          aria-label="Exit selection mode"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.iconSvg}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
