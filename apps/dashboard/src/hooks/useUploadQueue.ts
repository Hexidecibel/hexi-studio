import { useState, useCallback, useRef } from 'react';

export type UploadStatus = 'queued' | 'getting-url' | 'uploading' | 'confirming' | 'done' | 'error';

export interface UploadItem {
  localId: string;
  fileName: string;
  progress: number; // 0-100
  status: UploadStatus;
  error?: string;
}

type UploadFn = (file: File, onProgress: (progress: number, status: UploadStatus) => void) => Promise<void>;

const CONCURRENCY = 3;

export function useUploadQueue() {
  const [uploads, setUploads] = useState<Map<string, UploadItem>>(new Map());
  const nextId = useRef(0);

  const updateItem = useCallback((localId: string, updates: Partial<UploadItem>) => {
    setUploads(prev => {
      const next = new Map(prev);
      const item = next.get(localId);
      if (item) {
        next.set(localId, { ...item, ...updates });
      }
      return next;
    });
  }, []);

  const processFiles = useCallback(async (
    files: File[],
    uploadFn: UploadFn,
    onAllDone?: () => void,
  ) => {
    // Create upload items
    const items: { localId: string; file: File }[] = [];
    setUploads(prev => {
      const next = new Map(prev);
      for (const file of files) {
        const localId = `upload-${nextId.current++}`;
        next.set(localId, {
          localId,
          fileName: file.name,
          progress: 0,
          status: 'queued',
        });
        items.push({ localId, file });
      }
      return next;
    });

    // Semaphore-based concurrency control
    let running = 0;
    let index = 0;

    await new Promise<void>((resolve) => {
      const tryNext = () => {
        while (running < CONCURRENCY && index < items.length) {
          const current = items[index++];
          running++;

          const onProgress = (progress: number, status: UploadStatus) => {
            updateItem(current.localId, { progress, status });
          };

          uploadFn(current.file, onProgress)
            .then(() => {
              updateItem(current.localId, { progress: 100, status: 'done' });
              // Auto-remove completed items after 1.5s
              setTimeout(() => {
                setUploads(prev => {
                  const next = new Map(prev);
                  next.delete(current.localId);
                  return next;
                });
              }, 1500);
            })
            .catch((err) => {
              updateItem(current.localId, {
                status: 'error',
                error: err instanceof Error ? err.message : 'Upload failed',
              });
            })
            .finally(() => {
              running--;
              if (running === 0 && index >= items.length) {
                resolve();
              } else {
                tryNext();
              }
            });
        }
        // Handle empty files array
        if (items.length === 0) resolve();
      };
      tryNext();
    });

    onAllDone?.();
  }, [updateItem]);

  const clearError = useCallback((localId: string) => {
    setUploads(prev => {
      const next = new Map(prev);
      next.delete(localId);
      return next;
    });
  }, []);

  const activeUploads = Array.from(uploads.values());

  return { uploads: activeUploads, processFiles, clearError };
}
