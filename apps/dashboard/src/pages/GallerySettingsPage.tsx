import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, type Gallery } from '../lib/api';

type LayoutType = 'grid' | 'masonry' | 'justified' | 'showcase';

interface GalleryConfig {
  [key: string]: unknown;
  layout?: LayoutType;
  columns?: number;
  gap?: number;
  rowHeight?: number;
  enableLightbox?: boolean;
  shuffle?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export function GallerySettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config state
  const [layout, setLayout] = useState<LayoutType>('masonry');
  const [columns, setColumns] = useState(3);
  const [gap, setGap] = useState(8);
  const [rowHeight, setRowHeight] = useState(240);
  const [enableLightbox, setEnableLightbox] = useState(true);
  const [shuffle, setShuffle] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.galleries
      .get(id)
      .then((result) => {
        const g = result.data;
        setGallery(g);
        const config = (g.config || {}) as GalleryConfig;
        setLayout(config.layout || 'masonry');
        setColumns(config.columns ?? 3);
        setGap(config.gap ?? 8);
        setRowHeight(config.rowHeight ?? 240);
        setEnableLightbox(config.enableLightbox ?? true);
        setShuffle(config.shuffle ?? false);
        setTheme(config.theme || 'auto');
        setPublished(!!g.published);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const config: GalleryConfig = {
        layout,
        columns,
        gap,
        rowHeight,
        enableLightbox,
        shuffle,
        theme,
      };
      const result = await api.galleries.update(id, { config, published });
      setGallery(result.data);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  if (!gallery) return null;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(`/galleries/${id}`)} className="btn-secondary">&larr; Back to Editor</button>
        <h1>Settings</h1>
        <Link to={`/galleries/${id}/preview`} className="btn-success">Preview</Link>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="editor-layout">
        {/* Publish */}
        <section className="editor-section">
          <h2>Publishing</h2>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            <span>Published</span>
            <span className="field-hint">
              {published
                ? 'Gallery is live and accessible via embed code'
                : 'Gallery is in draft mode and not publicly accessible'}
            </span>
          </label>
        </section>

        {/* Layout */}
        <section className="editor-section">
          <h2>Layout</h2>
          <label className="field">
            <span>Layout Type</span>
            <div className="layout-picker">
              {(['grid', 'masonry', 'justified', 'showcase'] as LayoutType[]).map((l) => (
                <button
                  key={l}
                  className={`layout-option ${layout === l ? 'active' : ''}`}
                  onClick={() => setLayout(l)}
                  type="button"
                >
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </label>
          <label className="field">
            <span>Columns ({columns})</span>
            <input
              type="range"
              min={1}
              max={6}
              value={columns}
              onChange={(e) => setColumns(parseInt(e.target.value))}
              className="range-input"
            />
          </label>
          <label className="field">
            <span>Gap ({gap}px)</span>
            <input
              type="range"
              min={0}
              max={24}
              value={gap}
              onChange={(e) => setGap(parseInt(e.target.value))}
              className="range-input"
            />
          </label>
          {layout === 'justified' && (
            <label className="field">
              <span>Row Height ({rowHeight}px)</span>
              <input
                type="range"
                min={100}
                max={400}
                value={rowHeight}
                onChange={(e) => setRowHeight(parseInt(e.target.value))}
                className="range-input"
              />
            </label>
          )}
        </section>

        {/* Display */}
        <section className="editor-section">
          <h2>Display</h2>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={enableLightbox}
              onChange={(e) => setEnableLightbox(e.target.checked)}
            />
            <span>Enable Lightbox</span>
            <span className="field-hint">Allow users to click images for a fullscreen view</span>
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            <span>Shuffle Images</span>
            <span className="field-hint">Randomize the display order of images on each page load</span>
          </label>
          <label className="field">
            <span>Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
              className="input"
            >
              <option value="auto">Auto (follow system)</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </section>
      </div>
    </div>
  );
}
