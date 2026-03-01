import { useState } from 'react';
import type { ConfiguratorState, ImageItem, LayoutOptions, LayoutType } from '../../types';
import { LayoutPicker } from './LayoutPicker';
import { SpacingControls } from './SpacingControls';
import { SourceConfig } from './SourceConfig';
import { ResponsivePreview } from './ResponsivePreview';
import { CodeExport } from './CodeExport';
import styles from './ConfiguratorPanel.module.css';

interface ConfiguratorPanelProps {
  state: ConfiguratorState;
  exportCode: string;
  onLayoutChange: (layout: Partial<LayoutOptions>) => void;
  onLayoutTypeChange: (type: LayoutType) => void;
  onImagesChange: (images: ImageItem[]) => void;
  onReset: () => void;
  children?: React.ReactNode;
  previewWidth?: number;
  onPreviewWidthChange?: (width: number) => void;
  shuffle?: boolean;
  onShuffleChange?: (shuffle: boolean) => void;
}

export function ConfiguratorPanel({
  state,
  exportCode,
  onLayoutChange,
  onLayoutTypeChange,
  onImagesChange,
  onReset,
  children,
  previewWidth,
  onPreviewWidthChange,
  shuffle,
  onShuffleChange,
}: ConfiguratorPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : styles.closed}`}>
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close configurator' : 'Open configurator'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={styles.toggleIcon}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 className={styles.title}>Gallery Configurator</h2>
            <button className={styles.resetButton} onClick={onReset}>
              Reset
            </button>
          </div>

          <div className={styles.sections}>
            <LayoutPicker
              value={state.layout.type}
              onChange={onLayoutTypeChange}
            />

            <SpacingControls
              layout={state.layout}
              onChange={onLayoutChange}
            />

            <SourceConfig
              images={state.images}
              onImagesChange={onImagesChange}
            />

            {onShuffleChange && (
              <fieldset className={styles.displayFieldset}>
                <legend className={styles.displayLegend}>Display</legend>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={shuffle ?? false}
                    onChange={(e) => onShuffleChange(e.target.checked)}
                  />
                  Shuffle images
                </label>
              </fieldset>
            )}

            {onPreviewWidthChange && (
              <ResponsivePreview
                width={previewWidth ?? 0}
                onChange={onPreviewWidthChange}
              />
            )}

            <CodeExport code={exportCode} />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
