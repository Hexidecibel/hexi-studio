import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gallery } from '@hexi/gallery';
import type { MediaItem as GalleryMediaItem, LayoutType, LayoutOptions } from '@hexi/gallery';
import '@hexi/gallery/styles';
import { api } from '../lib/api';

interface GalleryConfig {
  layout?: LayoutType;
  columns?: number;
  gap?: number;
  rowHeight?: number;
  enableLightbox?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [galleryName, setGalleryName] = useState('');
  const [config, setConfig] = useState<GalleryConfig>({});
  const [items, setItems] = useState<GalleryMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.galleries
      .preview(id)
      .then((result) => {
        setGalleryName(result.gallery.name);
        setConfig(result.gallery.config as GalleryConfig);

        // Map API items to @hexi/gallery MediaItem format
        const galleryItems: GalleryMediaItem[] = result.media.items.map((item) => ({
          id: item.id,
          src: item.src,
          alt: item.alt || '',
          type: (item.type as 'image' | 'video') || 'image',
          width: item.width,
          height: item.height,
          thumbnail: item.thumbnail,
          srcSet: item.srcSet,
          blurDataUrl: item.blurDataUrl,
          title: item.title,
          description: item.description,
          poster: item.poster,
          duration: item.duration,
        }));
        setItems(galleryItems);
      })
      .catch((err) => {
        console.error('Failed to load preview:', err);
        setError('Failed to load gallery preview');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '16px' }}>
        <h2>No media yet</h2>
        <p style={{ color: '#7a7a9a' }}>Upload some photos or videos to see your gallery preview.</p>
        <button onClick={() => navigate(`/galleries/${id}`)} className="btn-primary">Go to Editor</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: config.theme === 'dark' ? '#111' : '#fff' }}>
      {/* Floating toolbar */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        padding: '8px 16px',
        borderRadius: '12px',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
        <span style={{ fontWeight: 600 }}>{galleryName}</span>
        <span style={{ color: '#9ca3af' }}>|</span>
        <span style={{ color: '#9ca3af' }}>{items.length} items</span>
        <span style={{ color: '#9ca3af' }}>|</span>
        <span style={{ color: '#9ca3af', textTransform: 'capitalize' }}>{config.layout || 'masonry'}</span>
        <button
          onClick={() => navigate(`/galleries/${id}/settings`)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Settings
        </button>
        <button
          onClick={() => navigate(`/galleries/${id}`)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Editor
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#7c5cfc',
            border: 'none',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Close
        </button>
      </div>

      {/* Gallery */}
      <div style={{ padding: '80px 24px 24px' }}>
        <Gallery
          images={items}
          layout={{
            type: config.layout || 'masonry',
            columns: config.columns ?? 3,
            gap: config.gap ?? 8,
            rowHeight: config.rowHeight ?? 240,
          } satisfies LayoutOptions}
          enableLightbox={config.enableLightbox ?? true}
        />
      </div>
    </div>
  );
}
