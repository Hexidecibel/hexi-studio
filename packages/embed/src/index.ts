import { h, render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { fetchGallery, fetchMediaPage } from './api';
import { Gallery } from './Gallery';
import type { MediaItem, GalleryConfig } from './types';

interface EmbedAppProps {
  slug: string;
}

function EmbedApp({ slug }: EmbedAppProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [config, setConfig] = useState<GalleryConfig>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchGallery(slug)
      .then((data) => {
        setConfig(data.gallery.config);
        setItems(data.media.items);
        setHasMore(data.media.hasMore);
        setPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load more pages
  const loadMore = useCallback(() => {
    if (loading) return;
    const nextPage = page + 1;
    setLoading(true);
    fetchMediaPage(slug, nextPage)
      .then((data) => {
        setItems((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setPage(nextPage);
      })
      .catch((err) => console.error('Failed to load more:', err))
      .finally(() => setLoading(false));
  }, [slug, page, loading]);

  if (error) {
    return h('div', { style: { padding: '20px', color: '#666', textAlign: 'center' } }, `Gallery not found: ${slug}`);
  }

  if (loading && items.length === 0) {
    return h('div', { style: { padding: '20px', textAlign: 'center' } },
      h('div', { class: 'hexi-spinner' })
    );
  }

  return h(Gallery, { items, config, hasMore, onLoadMore: loadMore, loading });
}

// Inject minimal styles
function injectStyles() {
  if (document.getElementById('hexi-embed-styles')) return;
  const style = document.createElement('style');
  style.id = 'hexi-embed-styles';
  style.textContent = `
    .hexi-gallery-item img,
    .hexi-gallery-item video {
      transition: opacity 0.3s;
    }
    .hexi-gallery-item:hover img,
    .hexi-gallery-item:hover video {
      opacity: 0.85;
    }
    .hexi-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: hexi-spin 0.8s linear infinite;
      margin: 0 auto;
    }
    @keyframes hexi-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}

// Initialize all gallery elements
function init() {
  injectStyles();
  const elements = document.querySelectorAll('[data-gallery]');
  elements.forEach((el) => {
    const slug = el.getAttribute('data-gallery');
    if (!slug) return;
    // Don't re-initialize
    if (el.getAttribute('data-hexi-initialized')) return;
    el.setAttribute('data-hexi-initialized', 'true');
    render(h(EmbedApp, { slug }), el);
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Expose for manual initialization
(window as unknown as Record<string, unknown>).HexiGallery = { init };
