import { h, Fragment } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import type { MediaItem, GalleryConfig } from './types';

interface GalleryProps {
  items: MediaItem[];
  config: GalleryConfig;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
}

export function Gallery({ items, config, hasMore, onLoadMore, loading }: GalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const layout = config.layout || 'masonry';
  const columns = config.columns || 3;
  const gap = config.gap ?? 8;

  const gridStyle: Record<string, string> = {
    display: 'grid',
    gap: `${gap}px`,
    width: '100%',
  };

  if (layout === 'grid') {
    gridStyle.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  } else if (layout === 'masonry') {
    gridStyle.columns = `${columns}`;
    gridStyle.display = 'block';
    gridStyle.columnGap = `${gap}px`;
  } else if (layout === 'justified') {
    gridStyle.gridTemplateColumns = `repeat(auto-fill, minmax(${config.rowHeight || 240}px, 1fr))`;
    gridStyle.gridAutoRows = `${config.rowHeight || 240}px`;
  }

  const handleClick = useCallback((index: number) => {
    if (config.enableLightbox !== false) {
      setLightboxIndex(index);
    }
  }, [config.enableLightbox]);

  return (
    <Fragment>
      <div style={gridStyle} class="hexi-gallery-grid">
        {items.map((item, i) => (
          <div
            key={item.id}
            class="hexi-gallery-item"
            style={layout === 'masonry' ? { breakInside: 'avoid', marginBottom: `${gap}px` } : {}}
            onClick={() => handleClick(i)}
          >
            {item.type === 'video' ? (
              <video
                src={item.src}
                poster={item.poster}
                style={{ width: '100%', display: 'block', borderRadius: '4px', cursor: 'pointer' }}
                muted
                preload="metadata"
              />
            ) : (
              <img
                src={item.thumbnail || item.src}
                srcSet={item.srcSet}
                sizes={`(max-width: 768px) 100vw, ${Math.floor(100 / columns)}vw`}
                alt={item.alt}
                loading="lazy"
                style={{ width: '100%', display: 'block', borderRadius: '4px', cursor: 'pointer' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Load more sentinel */}
      {hasMore && <div ref={sentinelRef} style={{ height: '1px' }} />}
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div class="hexi-spinner" />
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </Fragment>
  );
}

interface LightboxProps {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const item = items[index];
  if (!item) return null;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1) onNavigate(index + 1);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [index, items.length, onClose, onNavigate]);

  const overlayStyle: Record<string, string> = {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '999999',
    cursor: 'pointer',
  };

  const imgStyle: Record<string, string> = {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain',
    cursor: 'default',
  };

  const btnStyle: Record<string, string> = {
    position: 'absolute',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    padding: '12px 16px',
    cursor: 'pointer',
    borderRadius: '4px',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e: Event) => e.stopPropagation()}>
        {item.type === 'video' ? (
          <video
            src={item.src}
            poster={item.poster}
            controls
            autoPlay
            style={imgStyle}
          />
        ) : (
          <img src={item.src} alt={item.alt} style={imgStyle} />
        )}
      </div>

      {/* Close button */}
      <button
        style={{ ...btnStyle, top: '16px', right: '16px' }}
        onClick={onClose}
      >
        &times;
      </button>

      {/* Navigation */}
      {index > 0 && (
        <button
          style={{ ...btnStyle, left: '16px', top: '50%', transform: 'translateY(-50%)' }}
          onClick={(e: Event) => { e.stopPropagation(); onNavigate(index - 1); }}
        >
          &lsaquo;
        </button>
      )}
      {index < items.length - 1 && (
        <button
          style={{ ...btnStyle, right: '16px', top: '50%', transform: 'translateY(-50%)' }}
          onClick={(e: Event) => { e.stopPropagation(); onNavigate(index + 1); }}
        >
          &rsaquo;
        </button>
      )}
    </div>
  );
}
