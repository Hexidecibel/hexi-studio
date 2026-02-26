import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, type Gallery } from '../lib/api';

export function EmbedPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.galleries
      .get(id)
      .then((result) => setGallery(result.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  if (!gallery) return null;

  const scriptTag = `<div id="hexi-gallery" data-gallery="${gallery.slug}"></div>
<script src="https://cdn.hexi.gallery/embed.js" async></script>`;

  const npmUsage = `npm install @hexi/gallery

// In your React component:
import { Gallery, useHexiCloud } from '@hexi/gallery';
import '@hexi/gallery/styles';

function MyGallery() {
  const { items, loading, config } = useHexiCloud('${gallery.slug}');
  return <Gallery images={items} layout={config.layout} enableLightbox />;
}`;

  return (
    <div className="page">
      <div className="page-header">
        <button onClick={() => navigate(`/galleries/${id}`)} className="btn-secondary">&larr; Back to Editor</button>
        <h1>Embed Gallery</h1>
      </div>

      {!gallery.published && (
        <div className="warning-banner">
          This gallery is not published. Publish it in Settings before embedding.
        </div>
      )}

      <div className="editor-layout">
        {/* Script tag embed */}
        <section className="editor-section">
          <h2>Script Tag (easiest)</h2>
          <p className="text-muted">
            Paste this code into any HTML page. No build tools required.
          </p>
          <div className="code-block">
            <pre><code>{scriptTag}</code></pre>
            <button
              onClick={() => copyToClipboard(scriptTag, 'script')}
              className="copy-btn"
            >
              {copied === 'script' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        {/* NPM package */}
        <section className="editor-section">
          <h2>React Component (npm)</h2>
          <p className="text-muted">
            For React projects. Install the package and use the hook.
          </p>
          <div className="code-block">
            <pre><code>{npmUsage}</code></pre>
            <button
              onClick={() => copyToClipboard(npmUsage, 'npm')}
              className="copy-btn"
            >
              {copied === 'npm' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>

        {/* API endpoint */}
        <section className="editor-section">
          <h2>Public API</h2>
          <p className="text-muted">
            Use the REST API directly to build custom integrations.
          </p>
          <div className="code-block">
            <pre><code>{`GET /api/v1/public/galleries/${gallery.slug}\nGET /api/v1/public/galleries/${gallery.slug}/media?page=1&limit=50`}</code></pre>
            <button
              onClick={() => copyToClipboard(`/api/v1/public/galleries/${gallery.slug}`, 'api')}
              className="copy-btn"
            >
              {copied === 'api' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
