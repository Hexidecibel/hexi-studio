import type { LayoutType } from '../../types';
import styles from './LayoutPicker.module.css';

interface LayoutPickerProps {
  value: LayoutType;
  onChange: (type: LayoutType) => void;
}

const layouts: { type: LayoutType; label: string; icon: string }[] = [
  {
    type: 'grid',
    label: 'Grid',
    icon: 'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z',
  },
  {
    type: 'masonry',
    label: 'Masonry',
    icon: 'M3 3h7v10H3V3zm11 0h7v6h-7V3zM3 16h7v5H3v-5zm11 12V12h7v9h-7z',
  },
  {
    type: 'justified',
    label: 'Justified',
    icon: 'M3 3h18v5H3V3zm0 8h10v5H3v-5zm13 0h5v5h-5v-5zM3 19h7v2H3v-2zm10 0h8v2h-8v-2z',
  },
  {
    type: 'showcase',
    label: 'Showcase',
    icon: 'M3 3h18v11H3V3zm0 14h5v4H3v-4zm7 0h5v4h-5v-4zm7 0h5v4h-5v-4z',
  },
];

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Layout</legend>
      <div className={styles.options}>
        {layouts.map((layout) => (
          <label
            key={layout.type}
            className={`${styles.option} ${value === layout.type ? styles.active : ''}`}
          >
            <input
              type="radio"
              name="layout"
              value={layout.type}
              checked={value === layout.type}
              onChange={() => onChange(layout.type)}
              className={styles.radio}
            />
            <svg viewBox="0 0 24 24" className={styles.icon} fill="currentColor">
              <path d={layout.icon} />
            </svg>
            <span className={styles.label}>{layout.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
