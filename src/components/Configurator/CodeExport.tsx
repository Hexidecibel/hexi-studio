import { useState, useCallback } from 'react';
import styles from './CodeExport.module.css';

interface CodeExportProps {
  code: string;
}

export function CodeExport({ code }: CodeExportProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }, [code]);

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Code</legend>
      <div className={styles.codeWrapper}>
        <pre className={styles.pre}>
          <code className={styles.code}>{code}</code>
        </pre>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </fieldset>
  );
}
