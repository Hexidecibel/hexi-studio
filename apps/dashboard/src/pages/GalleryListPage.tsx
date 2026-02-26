import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, type Gallery } from '../lib/api';

export function GalleryListPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadGalleries = async () => {
    try {
      const result = await api.galleries.list();
      setGalleries(result.data);
    } catch (err) {
      console.error('Failed to load galleries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGalleries();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.galleries.create({ name: newName.trim() });
      setNewName('');
      setShowCreate(false);
      await loadGalleries();
    } catch (err) {
      console.error('Failed to create gallery:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
    try {
      await api.galleries.delete(id);
      await loadGalleries();
    } catch (err) {
      console.error('Failed to delete gallery:', err);
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your Galleries</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          New Gallery
        </button>
      </div>

      {showCreate && (
        <div className="create-form">
          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Gallery name"
              autoFocus
              className="input"
            />
            <div className="form-actions">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-text">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {galleries.length === 0 && !showCreate ? (
        <div className="empty-state">
          <h2>No galleries yet</h2>
          <p>Create your first gallery to get started.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            Create Gallery
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {galleries.map((gallery) => (
            <div key={gallery.id} className="gallery-card">
              <Link to={`/galleries/${gallery.id}`} className="gallery-card-link">
                <div className="gallery-card-preview">
                  <span className="media-count">{gallery.media_count} items</span>
                </div>
                <div className="gallery-card-info">
                  <h3>{gallery.name}</h3>
                  <span className={`status-badge ${gallery.published ? 'published' : 'draft'}`}>
                    {gallery.published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(gallery.id, gallery.name)}
                className="btn-icon delete-btn"
                title="Delete gallery"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
