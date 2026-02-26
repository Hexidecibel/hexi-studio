import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, type Gallery, type MediaItem } from '../lib/api';
import { MediaGrid } from '../components/MediaGrid';

export function GalleryEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const loadGallery = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api.galleries.get(id);
      setGallery(result.data);
      setName(result.data.name);
      setSlug(result.data.slug);
    } catch {
      navigate('/');
    }
  }, [id, navigate]);

  const loadMedia = useCallback(async () => {
    if (!id) return;
    try {
      const result = await api.media.list(id);
      setMedia(result.data);
    } catch (err) {
      console.error('Failed to load media:', err);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadGallery(), loadMedia()]).finally(() => setLoading(false));
  }, [loadGallery, loadMedia]);

  const handleSave = async () => {
    if (!id || !gallery) return;
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (name !== gallery.name) updates.name = name;
      if (slug !== gallery.slug) updates.slug = slug;
      if (Object.keys(updates).length > 0) {
        const result = await api.galleries.update(id, updates);
        setGallery(result.data);
      }
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  if (!gallery || !user) return null;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate('/')} className="btn-text">&larr; Back</button>
        <h1>{gallery.name}</h1>
        <Link to={`/galleries/${id}/settings`} className="btn-text">Settings</Link>
        <Link to={`/galleries/${id}/embed`} className="btn-text">Embed</Link>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="editor-layout">
        <section className="editor-section">
          <h2>Gallery Details</h2>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input"
            />
            <span className="field-hint">Used in the public URL: /gallery/{slug}</span>
          </label>
        </section>

        <section className="editor-section">
          <h2>Media ({media.length} items)</h2>
          <MediaGrid
            galleryId={gallery.id}
            userId={user.id}
            media={media}
            onMediaChange={loadMedia}
          />
        </section>
      </div>
    </div>
  );
}
