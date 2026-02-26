import styles from './EmptyState.module.css';

interface EmptyStateProps {
  onPasteUrls: () => void;
  onUpload: () => void;
  onSample: () => void;
}

const cards = [
  { icon: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.364-2.06l4.5-4.5a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244', label: 'Paste URLs', key: 'urls' as const },
  { icon: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5', label: 'Upload Files', key: 'upload' as const },
  { icon: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21z', label: 'Sample Images', key: 'sample' as const },
];

export function EmptyState({ onPasteUrls, onUpload, onSample }: EmptyStateProps) {
  const handlers = { urls: onPasteUrls, upload: onUpload, sample: onSample };

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Add images to get started</h3>
      <div className={styles.cards}>
        {cards.map((card) => (
          <button
            key={card.key}
            className={styles.card}
            onClick={handlers[card.key]}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.icon}>
              <path d={card.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.label}>{card.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
