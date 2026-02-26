import { useState, useCallback, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { api, type MediaItem } from '../lib/api';

interface MediaGridProps {
  galleryId: string;
  userId: string;
  media: MediaItem[];
  onMediaChange: () => void;
}

export function MediaGrid({ galleryId, userId, media, onMediaChange }: MediaGridProps) {
  const [uploading, setUploading] = useState<Map<string, number>>(new Map());
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop reorder state
  const [localMedia, setLocalMedia] = useState<MediaItem[]>(media);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  // Keep local media in sync with prop when not dragging
  useEffect(() => {
    if (dragIndex === null) {
      setLocalMedia(media);
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

  const uploadFile = useCallback(async (file: File) => {
    try {
      // 1. Get upload URL
      const { data: uploadInfo } = await api.media.getUploadUrl(galleryId, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      setUploading((prev) => new Map(prev).set(uploadInfo.mediaId, 0));

      // 2. Upload file
      await api.media.upload(galleryId, uploadInfo.mediaId, file);

      setUploading((prev) => new Map(prev).set(uploadInfo.mediaId, 50));

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

      setUploading((prev) => {
        const next = new Map(prev);
        next.delete(uploadInfo.mediaId);
        return next;
      });

      onMediaChange();
    } catch (err) {
      console.error('Upload failed:', err);
      setUploading(new Map());
    }
  }, [galleryId, onMediaChange]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach(uploadFile);
  }, [uploadFile]);

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
      {uploading.size > 0 && (
        <div className="upload-progress">
          {Array.from(uploading.entries()).map(([id, _progress]) => (
            <div key={id} className="upload-progress-item">
              <div className="upload-progress-bar" />
              <span>Uploading...</span>
            </div>
          ))}
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
                (overIndex === index && dragIndex !== null && dragIndex > index ? ' media-item-drop-before' : '')
              }
              draggable
              onDragStart={(e) => handleReorderDragStart(e, index)}
              onDragOver={(e) => handleReorderDragOver(e, index)}
              onDragLeave={handleReorderDragLeave}
              onDrop={(e) => handleReorderDrop(e, index)}
              onDragEnd={handleReorderDragEnd}
            >
              <div className="media-item-preview">
                {item.media_type === 'video' ? (
                  <div className="video-placeholder">Video</div>
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
      ) : uploading.size === 0 ? (
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
