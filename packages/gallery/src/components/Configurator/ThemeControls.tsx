import type { ThemeTokens } from '../../types';
import styles from './ThemeControls.module.css';

interface ThemeControlsProps {
  theme?: Partial<ThemeTokens>;
  onChange: (theme: Partial<ThemeTokens>) => void;
}

const shadows = [
  { label: 'None', value: 'none' },
  { label: 'Small', value: '0 1px 2px rgba(0,0,0,0.08)' },
  { label: 'Medium', value: '0 4px 12px rgba(0,0,0,0.12)' },
  { label: 'Large', value: '0 8px 24px rgba(0,0,0,0.16)' },
];

export function ThemeControls({ theme, onChange }: ThemeControlsProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Theme</legend>

      <div className={styles.control}>
        <label className={styles.label} htmlFor="bg-color">
          Background
        </label>
        <input
          id="bg-color"
          type="color"
          value={theme?.bgPrimary || '#ffffff'}
          onChange={(e) => onChange({ bgPrimary: e.target.value })}
          className={styles.colorInput}
        />
      </div>

      <div className={styles.control}>
        <label className={styles.label} htmlFor="text-color">
          Text
        </label>
        <input
          id="text-color"
          type="color"
          value={theme?.textPrimary || '#1a1a2e'}
          onChange={(e) => onChange({ textPrimary: e.target.value })}
          className={styles.colorInput}
        />
      </div>

      <div className={styles.control}>
        <label className={styles.label} htmlFor="radius-slider">
          Border Radius: {theme?.radiusMd || '8px'}
        </label>
        <input
          id="radius-slider"
          type="range"
          min="0"
          max="24"
          value={parseInt(theme?.radiusMd || '8')}
          onChange={(e) => onChange({ radiusMd: `${e.target.value}px` })}
          className={styles.slider}
        />
      </div>

      <div className={styles.control}>
        <label className={styles.label}>Shadow</label>
        <div className={styles.shadowOptions}>
          {shadows.map((s) => (
            <button
              key={s.label}
              className={`${styles.shadowOption} ${(theme?.shadowMd || shadows[2].value) === s.value ? styles.active : ''}`}
              onClick={() => onChange({ shadowMd: s.value })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </fieldset>
  );
}
