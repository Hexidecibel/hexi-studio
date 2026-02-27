import { useState, useCallback, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { api, type MediaItem } from '../lib/api';
import { useUploadQueue } from '../hooks/useUploadQueue';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface MediaGridProps {
  galleryId: string;
  userId: string;
  media: MediaItem[];
  onMediaChange: () => void;
}

export function MediaGrid({ galleryId, userId, media, onMediaChange }: MediaGridProps) {
  const { uploads, processFiles, clearError } = useUploadQueue();
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isSelecting = selectedIds.size > 0;

  // Drag-and-drop reorder state
  const [localMedia, setLocalMedia] = useState<MediaItem[]>(media);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Keep local media in sync with prop when not dragging
  useEffect(() => {
    if (dragIndex === null) {
      setLocalMedia(media);
      // Clear selections that no longer exist
      setSelectedIds(prev => {
        const mediaIds = new Set(media.map(m => m.id));
        const next = new Set([...prev].filter(id => mediaIds.has(id)));
        return next.size === prev.size ? prev : next;
      });
    }
  }, [media, dragIndex]);

  const handleReorderDragStart = useCallback((e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set minimal drag data so the browser recognizes it as a drag
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleReorderDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && index !== dragIndex) {
      setOverIndex(index);
    }
  }, [dragIndex]);

  const handleReorderDragLeave = useCallback(() => {
    setOverIndex(null);
  }, []);

  const handleReorderDrop = useCallback((e: DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }

    // Compute new order by moving the dragged item to the drop position
    const reordered = [...localMedia];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Optimistic update
    setLocalMedia(reordered);
    setDragIndex(null);
    setOverIndex(null);

    // Persist via API
    const newOrder = reordered.map((item) => item.id);
    api.media.reorder(galleryId, newOrder).then(() => {
      onMediaChange();
    }).catch((err) => {
      console.error('Reorder failed:', err);
      // Revert on failure
      setLocalMedia(media);
    });
  }, [dragIndex, localMedia, galleryId, media, onMediaChange]);

  const handleReorderDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === localMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(localMedia.map(m => m.id)));
    }
  }, [localMedia, selectedIds.size]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} item${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.media.delete(galleryId, id))
      );
      setSelectedIds(new Set());
      onMediaChange();
    } catch (err) {
      console.error('Batch delete failed:', err);
      onMediaChange(); // refresh to show what actually got deleted
    }
  }, [selectedIds, galleryId, onMediaChange]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    processFiles(Array.from(files), async (file, onProgress) => {
      onProgress(10, 'getting-url');

      // 1. Get upload URL
      const { data: uploadInfo } = await api.media.getUploadUrl(galleryId, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      onProgress(50, 'uploading');

      // 2. Upload file
      await api.media.upload(galleryId, uploadInfo.mediaId, file);

      onProgress(80, 'confirming');

      // 3. Get dimensions for images
      let width: number | undefined;
      let height: number | undefined;

      if (file.type.startsWith('image/')) {
        const dims = await getImageDimensions(file);
        width = dims.width;
        height = dims.height;
      }

      // 4. Confirm upload
      await api.media.confirm(galleryId, {
        mediaId: uploadInfo.mediaId,
        width,
        height,
        alt: file.name.replace(/\.[^.]+$/, ''),
      });
    }, () => {
      onMediaChange();
    });
  }, [galleryId, onMediaChange, processFiles]);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleDelete = useCallback(async (item: MediaItem) => {
    if (!confirm(`Delete "${item.alt || item.filename}"?`)) return;
    try {
      await api.media.delete(galleryId, item.id);
      onMediaChange();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [galleryId, onMediaChange]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    try {
      await api.media.update(galleryId, editingItem.id, {
        alt: editingItem.alt,
        title: editingItem.title || undefined,
        description: editingItem.description || undefined,
      });
      setEditingItem(null);
      onMediaChange();
    } catch (err) {
      console.error('Update failed:', err);
    }
  }, [galleryId, editingItem, onMediaChange]);

  const getMediaUrl = (item: MediaItem) => {
    return `/api/v1/cdn/${userId}/${item.id}/w_400,q_75`;
  };

  return (
    <div className="media-section">
      {/* Upload area */}
      <div
        className={`upload-area ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
        <div className="upload-area-content">
          <span className="upload-icon">+</span>
          <p>Drop files here or click to upload</p>
          <p className="text-muted">Images (JPEG, PNG, WebP, GIF) and Videos (MP4, WebM)</p>
        </div>
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="upload-progress-list">
          {uploads.map(item => (
            <div key={item.localId} className={`upload-progress-item ${item.status === 'error' ? 'upload-error' : ''}`}>
              <div className="upload-progress-file-name">{item.fileName}</div>
              <div className="upload-progress-track">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="upload-progress-status">
                {item.status === 'error' ? (
                  <span onClick={() => clearError(item.localId)} style={{cursor:'pointer'}}>&#10005; {item.error}</span>
                ) : item.status === 'done' ? 'Done' :
                  item.status === 'queued' ? 'Queued' :
                  item.status === 'getting-url' ? 'Preparing...' :
                  item.status === 'uploading' ? 'Uploading...' : 'Confirming...'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Batch actions */}
      {localMedia.length > 0 && (
        <div className="media-batch-bar">
          <button onClick={selectAll} className="btn-secondary btn-sm">
            {selectedIds.size === localMedia.length ? 'Deselect All' : 'Select All'}
          </button>
          {isSelecting && (
            <>
              <span className="text-muted">{selectedIds.size} selected</span>
              <button onClick={() => setSelectedIds(new Set())} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button onClick={handleBatchDelete} className="btn-danger btn-sm">
                Delete Selected
              </button>
            </>
          )}
        </div>
      )}

      {/* Media grid */}
      {localMedia.length > 0 ? (
        <div className="media-grid">
          {localMedia.map((item, index) => (
            <div
              key={item.id}
              className={
                'media-item' +
                (dragIndex === index ? ' media-item-dragging' : '') +
                (overIndex === index && dragIndex !== null && dragIndex < index ? ' media-item-drop-after' : '') +
                (overIndex === index && dragIndex !== null && dragIndex > index ? ' media-item-drop-before' : '') +
                (selectedIds.has(item.id) ? ' media-item-selected' : '')
              }
              draggable={!isSelecting}
              onDragStart={(e) => !isSelecting && handleReorderDragStart(e, index)}
              onDragOver={(e) => !isSelecting && handleReorderDragOver(e, index)}
              onDragLeave={!isSelecting ? handleReorderDragLeave : undefined}
              onDrop={(e) => !isSelecting && handleReorderDrop(e, index)}
              onDragEnd={!isSelecting ? handleReorderDragEnd : undefined}
              onClick={() => isSelecting && toggleSelect(item.id)}
            >
              <div className="media-item-preview">
                {/* Selection checkbox */}
                {(isSelecting || selectedIds.has(item.id)) && (
                  <div
                    className={`media-select-check ${selectedIds.has(item.id) ? 'checked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                  >
                    {selectedIds.has(item.id) ? '\u2713' : ''}
                  </div>
                )}
                {item.media_type === 'video' ? (
                  <div className="video-thumb-container">
                    <video className="video-thumb" src={getMediaUrl(item)} preload="metadata" muted playsInline />
                    <div className="video-overlay">
                      <div className="video-play-icon">
                        <svg viewBox="0 0 24 24"><polygon points="8,5 20,12 8,19" /></svg>
                      </div>
                    </div>
                    {item.duration != null && (
                      <div className="video-duration">{formatDuration(item.duration)}</div>
                    )}
                  </div>
                ) : (
                  <img src={getMediaUrl(item)} alt={item.alt} loading="lazy" />
                )}
              </div>
              <div className="media-item-actions">
                <button
                  onClick={() => setEditingItem({ ...item })}
                  className="btn-icon"
                  title="Edit"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="btn-icon"
                  title="Delete"
                >
                  &times;
                </button>
              </div>
              <div className="media-item-info">
                <span className="media-item-name" title={item.alt || item.filename}>
                  {item.alt || item.filename}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : uploads.length === 0 ? (
        <div className="empty-state">
          <p>No media yet. Upload some files to get started.</p>
        </div>
      ) : null}

      {/* Edit modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Media</h3>
              <button onClick={() => setEditingItem(null)} className="btn-icon">&times;</button>
            </div>
            <div className="modal-body">
              <label className="field">
                <span>Alt Text</span>
                <input
                  type="text"
                  value={editingItem.alt}
                  onChange={(e) => setEditingItem({ ...editingItem, alt: e.target.value })}
                  className="input"
                  placeholder="Describe this image for accessibility"
                />
              </label>
              <label className="field">
                <span>Title</span>
                <input
                  type="text"
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="input"
                  placeholder="Optional title"
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="input textarea"
                  rows={3}
                  placeholder="Optional description"
                />
              </label>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingItem(null)} className="btn-text">Cancel</button>
              <button onClick={handleSaveEdit} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
