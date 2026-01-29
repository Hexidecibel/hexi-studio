import { useState, useRef, useCallback } from 'react';
import type { ImageItem } from '../../types';
import { urlAdapter } from '../../adapters/urlAdapter';
import { createImagesFromFiles } from '../../utils/createImagesFromFiles';
import styles from './SourceConfig.module.css';

const SAMPLE_IMAGES: ImageItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `sample-${i}`,
  src: `https://picsum.photos/id/${i + 10}/800/600`,
  alt: `Sample image ${i + 1}`,
  width: 800,
  height: 600,
}));

interface SourceConfigProps {
  images: ImageItem[];
  onImagesChange: (images: ImageItem[]) => void;
}

type SourceType = 'urls' | 'upload' | 'sample';

export function SourceConfig({ images, onImagesChange }: SourceConfigProps) {
  const [sourceType, setSourceType] = useState<SourceType>('sample');
  const [urlText, setUrlText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(async () => {
    const urls = urlText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return;

    const result = await urlAdapter.fetch({ urls });
    onImagesChange(result);
  }, [urlText, onImagesChange]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const result = createImagesFromFiles(e.target.files);
        onImagesChange(result);
      }
    },
    [onImagesChange],
  );

  const handleSample = useCallback(() => {
    onImagesChange(SAMPLE_IMAGES);
  }, [onImagesChange]);

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Images ({images.length})</legend>

      <div className={styles.sourceButtons}>
        <button
          className={`${styles.sourceBtn} ${sourceType === 'urls' ? styles.active : ''}`}
          onClick={() => setSourceType('urls')}
        >
          URLs
        </button>
        <button
          className={`${styles.sourceBtn} ${sourceType === 'upload' ? styles.active : ''}`}
          onClick={() => setSourceType('upload')}
        >
          Upload
        </button>
        <button
          className={`${styles.sourceBtn} ${sourceType === 'sample' ? styles.active : ''}`}
          onClick={() => {
            setSourceType('sample');
            handleSample();
          }}
        >
          Sample
        </button>
      </div>

      {sourceType === 'urls' && (
        <div className={styles.urlSection}>
          <textarea
            className={styles.textarea}
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="Paste image URLs (one per line)"
            rows={4}
          />
          <button className={styles.submitBtn} onClick={handleUrlSubmit}>
            Load URLs
          </button>
        </div>
      )}

      {sourceType === 'upload' && (
        <div className={styles.uploadSection}>
          <button
            className={styles.dropZone}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.uploadIcon}>
              <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Click to upload images</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className={styles.fileInput}
          />
        </div>
      )}
    </fieldset>
  );
}
