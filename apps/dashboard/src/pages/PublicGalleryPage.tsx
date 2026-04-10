import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Gallery } from '@hexi/gallery';
import type { MediaItem } from '@hexi/gallery';
import '../styles/public-gallery.css';

interface GalleryConfig {
  layout?: string;
  columns?: number;
  gap?: number;
  rowHeight?: number;
  enableLightbox?: boolean;
  shuffle?: boolean;
  theme?: string;
}

interface GalleryData {
  name: string;
  slug: string;
  config: GalleryConfig;
}

type ErrorState = 'not-found' | 'error' | null;

export default function PublicGalleryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [gallery, setGallery] = useState<GalleryData | null>(null);
  const [images, setImages] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<ErrorState>(null);
  const [showToast, setShowToast] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Initial fetch
  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    fetch(`/api/v1/og/galleries/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (res.status === 404) {
          setError('not-found');
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          setError('error');
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setGallery(data.gallery);
        setImages(data.media.items);
        setHasMore(data.media.hasMore);
        setTotal(data.media.total);
        setPage(data.media.page);
        setLoading(false);
      })
      .catch(() => {
        setError('error');
        setLoading(false);
      });
  }, [slug]);

  // Load more pages
  const loadMore = useCallback(() => {
    if (!slug || loadingMore || !hasMore) return;

    const nextPage = page + 1;
    setLoadingMore(true);

    fetch(`/api/v1/og/galleries/${encodeURIComponent(slug)}/media?page=${nextPage}&limit=50`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data) => {
        setImages((prev) => [...prev, ...data.items]);
        setHasMore(data.hasMore);
        setPage(data.page);
        setTotal(data.total);
        setLoadingMore(false);
      })
      .catch(() => {
        setLoadingMore(false);
      });
  }, [slug, loadingMore, hasMore, page]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // Share handler
  const handleShare = useCallback(async (images: Array<{ id: string; title?: string; alt?: string }>) => {
    if (!images.length || !gallery) return;
    const image = images[0];
    const url = `${window.location.origin}/g/${slug}/photo/${image.id}`;

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: image.title || image.alt || gallery.name,
          url,
        });
        return;
      } catch {
        // Fall through to copy
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, [slug, gallery]);

  // Loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Not found
  if (error === 'not-found') {
    return (
      <div className="pg pg-error">
        <h1>Gallery Not Found</h1>
        <p>This gallery doesn't exist or isn't public.</p>
      </div>
    );
  }

  // Generic error
  if (error === 'error' || !gallery) {
    return (
      <div className="pg pg-error">
        <h1>Something went wrong</h1>
        <p>Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="pg">
      {/* Minimal header */}
      <header className="pg-header">
        <h1 className="pg-title">{gallery.name}</h1>
        <span className="pg-count">{total} photos</span>
      </header>

      {/* Gallery component */}
      <main className="pg-body">
        <Gallery
          images={images}
          layout={{
            type: (gallery.config.layout as 'grid' | 'masonry' | 'justified' | 'showcase') || 'masonry',
            columns: gallery.config.columns || 'auto',
            gap: gallery.config.gap ?? 8,
            rowHeight: gallery.config.rowHeight,
          }}
          enableLightbox={gallery.config.enableLightbox !== false}
          enableDownload={true}
          enableShare={true}
          onShare={handleShare}
          shuffle={gallery.config.shuffle || false}
          renderEmpty={() => (
            <div className="pg-empty">
              <p>This gallery is empty</p>
            </div>
          )}
        />

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={sentinelRef} className="pg-sentinel">
            {loadingMore && <div className="loading-spinner" />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="pg-footer">
        <span className="pg-branding">Powered by Hexi Gallery</span>
      </footer>
      {/* Toast notification */}
      {showToast && (
        <div className="pg-toast">Link Copied!</div>
      )}
    </div>
  );
}
