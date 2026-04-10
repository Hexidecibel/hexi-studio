import { useState, useEffect, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, type LibraryItem } from '../lib/api';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { GooglePhotosImport } from '../components/GooglePhotosImport';

export function LibraryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { uploads, processFiles, clearError } = useUploadQueue();
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [editTags, setEditTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop reorder state
  const [localItems, setLocalItems] = useState<LibraryItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    try {
      const result = await api.library.list(1, 100, filterTag || undefined);
      setItems(result.data);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  }, [filterTag]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Keep localItems in sync with items when not dragging
  useEffect(() => {
    if (dragIndex === null) {
      setLocalItems(items);
    }
  }, [items, dragIndex]);

  const handleReorderDragStart = useCallback((e: DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
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
    const reordered = [...localItems];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Optimistic update
    setLocalItems(reordered);
    setDragIndex(null);
    setOverIndex(null);

    // Persist via API
    const newOrder = reordered.map((item) => item.id);
    api.library.reorder(newOrder).then(() => {
      loadItems();
    }).catch((err) => {
      console.error('Reorder failed:', err);
      // Revert on failure
      setLocalItems(items);
    });
  }, [dragIndex, localItems, items, loadItems]);

  const handleReorderDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  // Collect all unique tags for filter chips
  const allTags = Array.from(new Set(
    items.flatMap((item) => {
      try { return JSON.parse(item.tags || '[]') as string[]; }
      catch { return []; }
    })
  )).sort();

  const handleFiles = useCallback((files: FileList | File[]) => {
    processFiles(Array.from(files), async (file, onProgress) => {
      onProgress(10, 'getting-url');

      // 1. Get upload URL
      const { data: uploadInfo } = await api.library.getUploadUrl({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      onProgress(50, 'uploading');

      // 2. Upload file
      await api.library.upload(uploadInfo.mediaId, file);

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
      await api.library.confirm({
        mediaId: uploadInfo.mediaId,
        width,
        height,
        alt: file.name.replace(/\.[^.]+$/, ''),
      });
    }, () => {
      loadItems();
    });
  }, [loadItems, processFiles]);

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

  const handleDelete = useCallback(async (item: LibraryItem) => {
    if (!confirm(`Delete "${item.alt || item.filename}"?`)) return;
    try {
      await api.library.delete(item.id);
      await loadItems();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [loadItems]);

  const handleEdit = (item: LibraryItem) => {
    setEditingItem({ ...item });
    try {
      const tags = JSON.parse(item.tags || '[]') as string[];
      setEditTags(tags.join(', '));
    } catch {
      setEditTags('');
    }
  };

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await api.library.update(editingItem.id, {
        alt: editingItem.alt,
        title: editingItem.title || undefined,
        description: editingItem.description || undefined,
        tags,
      });
      setEditingItem(null);
      await loadItems();
    } catch (err) {
      console.error('Update failed:', err);
    }
  }, [editingItem, editTags, loadItems]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getMediaUrl = (item: LibraryItem) => {
    return `/api/v1/cdn/${item.user_id}/${item.id}/w_400,q_75`;
  };

  const getPublicUrl = (item: LibraryItem) => {
    return `/api/v1/public/media/${item.id}`;
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Media Library</h1>
      </div>

      <div className="editor-layout">
        {/* Upload area */}
        <section className="editor-section">
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
              <p className="text-muted">Images for profiles, banners, logos, etc.</p>
            </div>
          </div>

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

          <GooglePhotosImport
            targetType="library"
            onImportComplete={loadItems}
          />
        </section>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <section className="editor-section">
            <h2>Filter by Tag</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`btn-secondary btn-sm ${!filterTag ? 'active' : ''}`}
                onClick={() => setFilterTag('')}
                style={!filterTag ? { background: '#7c5cfc', color: '#fff', borderColor: '#7c5cfc' } : {}}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`btn-secondary btn-sm ${filterTag === tag ? 'active' : ''}`}
                  onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                  style={filterTag === tag ? { background: '#7c5cfc', color: '#fff', borderColor: '#7c5cfc' } : {}}
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Library grid */}
        <section className="editor-section">
          <h2>Library ({localItems.length} items)</h2>
          {loading ? (
            <div className="page-loading"><div className="loading-spinner" /></div>
          ) : localItems.length > 0 ? (
            <div className="media-grid">
              {localItems.map((item, index) => (
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
                      <div className="video-thumb-container">
                        <video className="video-thumb" src={getMediaUrl(item)} preload="metadata" muted playsInline />
                        <div className="video-overlay">
                          <div className="video-play-icon">
                            <svg viewBox="0 0 24 24"><polygon points="8,5 20,12 8,19" /></svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img src={getMediaUrl(item)} alt={item.alt} loading="lazy" />
                    )}
                  </div>
                  <div className="media-item-actions">
                    <button
                      onClick={() => handleEdit(item)}
                      className="btn-icon"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => copyToClipboard(getPublicUrl(item), item.id)}
                      className="btn-icon"
                      title="Copy public URL"
                    >
                      {copied === item.id ? 'OK' : 'URL'}
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
          ) : (
            <div className="empty-state">
              <p>No media yet. Upload some files to get started.</p>
            </div>
          )}
        </section>
      </div>

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
                  placeholder="Describe this image"
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
              <label className="field">
                <span>Tags (comma-separated)</span>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="input"
                  placeholder="e.g. artists, heroes, logos"
                />
              </label>
              <div className="field">
                <span>Public API URL</span>
                <div className="code-block">
                  <pre><code>{getPublicUrl(editingItem)}</code></pre>
                  <button
                    onClick={() => copyToClipboard(getPublicUrl(editingItem), 'modal-url')}
                    className="copy-btn"
                  >
                    {copied === 'modal-url' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
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
