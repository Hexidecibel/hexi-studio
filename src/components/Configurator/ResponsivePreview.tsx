import styles from './ResponsivePreview.module.css';

interface ResponsivePreviewProps {
  width: number;
  onChange: (width: number) => void;
}

const presets = [
  { label: 'Mobile', width: 375, icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0z' },
  { label: 'Tablet', width: 768, icon: 'M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-15a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 4.5v15a2.25 2.25 0 0 0 2.25 2.25z' },
  { label: 'Desktop', width: 0, icon: 'M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25h-13.5A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25z' },
];

export function ResponsivePreview({ width, onChange }: ResponsivePreviewProps) {
  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Preview Size</legend>
      <div className={styles.options}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            className={`${styles.option} ${width === preset.width ? styles.active : ''}`}
            onClick={() => onChange(preset.width)}
            title={preset.width ? `${preset.width}px` : 'Full width'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.icon}>
              <path d={preset.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={styles.label}>{preset.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
