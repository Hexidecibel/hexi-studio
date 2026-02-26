import type { LayoutOptions } from '../../types';
import styles from './SpacingControls.module.css';

interface SpacingControlsProps {
  layout: LayoutOptions;
  onChange: (layout: Partial<LayoutOptions>) => void;
}

export function SpacingControls({ layout, onChange }: SpacingControlsProps) {
  const gap = typeof layout.gap === 'number' ? layout.gap : 16;
  const columns = layout.columns === 'auto' ? '' : String(layout.columns || '');

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Spacing</legend>

      <div className={styles.control}>
        <label className={styles.label} htmlFor="gap-slider">
          Gap: {gap}px
        </label>
        <input
          id="gap-slider"
          type="range"
          min="4"
          max="48"
          value={gap}
          onChange={(e) => onChange({ gap: Number(e.target.value) })}
          className={styles.slider}
        />
      </div>

      <div className={styles.control}>
        <label className={styles.label} htmlFor="columns-input">
          Columns
        </label>
        <div className={styles.columnsRow}>
          <input
            id="columns-input"
            type="number"
            min="1"
            max="12"
            value={columns}
            placeholder="auto"
            onChange={(e) =>
              onChange({ columns: e.target.value ? Number(e.target.value) : 'auto' })
            }
            className={styles.numberInput}
          />
          <button
            className={`${styles.autoButton} ${layout.columns === 'auto' ? styles.active : ''}`}
            onClick={() => onChange({ columns: 'auto' })}
          >
            Auto
          </button>
        </div>
      </div>

      {layout.type === 'justified' && (
        <div className={styles.control}>
          <label className={styles.label} htmlFor="rowheight-slider">
            Row Height: {layout.rowHeight || 240}px
          </label>
          <input
            id="rowheight-slider"
            type="range"
            min="100"
            max="400"
            value={layout.rowHeight || 240}
            onChange={(e) => onChange({ rowHeight: Number(e.target.value) })}
            className={styles.slider}
          />
        </div>
      )}
    </fieldset>
  );
}
