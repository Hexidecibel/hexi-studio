import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import '../styles/public-gallery.css';

interface PhotoItem {
  id: string;
  src: string;
  alt: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  thumbnail?: string;
  srcSet?: string;
  blurDataUrl?: string;
  title?: string;
  description?: string;
}

interface PhotoData {
  item: PhotoItem;
  gallery: { name: string; slug: string };
  prev: string | null;
  next: string | null;
  downloadUrl: string;
}

type ErrorState = 'not-found' | 'error' | null;

export default function PublicPhotoPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PhotoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  // Fetch photo data
  useEffect(() => {
    if (!slug || !id) return;

    setLoading(true);
    setError(null);

    fetch(`/api/v1/og/galleries/${encodeURIComponent(slug)}/photo/${encodeURIComponent(id)}`)
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
      .then((result) => {
        if (!result) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        setError('error');
        setLoading(false);
      });
  }, [slug, id]);

  const photo = data?.item ?? null;
  const gallery = data?.gallery ?? null;
  const prev = data?.prev ?? null;
  const next = data?.next ?? null;

  const handleDownload = useCallback(async () => {
    if (!data || !photo) return;
    try {
      const res = await fetch(data.downloadUrl || photo.src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = photo.type === 'video' ? '.mp4' : '';
      a.download = (photo.title || photo.alt || 'photo') + ext;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [data, photo]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    // Only use native share on mobile/tablet — it's unreliable on desktop
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: photo?.title || gallery?.name,
          url: window.location.href,
        });
        return;
      } catch {
        // Fall through to copy
      }
    }
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Fallback for insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [photo, gallery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prev) navigate(`/g/${slug}/photo/${prev}`);
      if (e.key === 'ArrowRight' && next) navigate(`/g/${slug}/photo/${next}`);
      if (e.key === 'Escape') navigate(`/g/${slug}`);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prev, next, slug, navigate]);

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
      <div className="pp pp-error">
        <h1>Photo Not Found</h1>
        <p>This photo doesn't exist or has been removed.</p>
      </div>
    );
  }

  // Generic error
  if (error === 'error' || !photo || !gallery) {
    return (
      <div className="pp pp-error">
        <h1>Something went wrong</h1>
        <p>Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="pp">
      {/* Top bar */}
      <header className="pp-header">
        <Link to={`/g/${slug}`} className="pp-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span>Back to {gallery.name}</span>
        </Link>
        <div className="pp-actions">
          <button className="pp-action-btn" onClick={handleDownload} title="Download">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>Download</span>
          </button>
          <button className="pp-action-btn" onClick={handleCopyLink} title="Copy Link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button className="pp-action-btn" onClick={handleShare} title="Share">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            <span>{shared ? 'Link Copied!' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Photo */}
      <main className="pp-body">
        {prev && (
          <Link to={`/g/${slug}/photo/${prev}`} className="pp-nav pp-nav-prev" aria-label="Previous photo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
        )}

        <div className="pp-photo-container">
          {photo.type === 'video' ? (
            <video
              src={photo.src}
              controls
              autoPlay
              loop
              playsInline
              className="pp-photo"
              poster={photo.thumbnail}
            />
          ) : (
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="100vw"
              alt={photo.alt}
              className="pp-photo"
            />
          )}
        </div>

        {next && (
          <Link to={`/g/${slug}/photo/${next}`} className="pp-nav pp-nav-next" aria-label="Next photo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        )}
      </main>

      {/* Photo info */}
      {(photo.title || photo.description) && (
        <div className="pp-info">
          {photo.title && <h2 className="pp-photo-title">{photo.title}</h2>}
          {photo.description && <p className="pp-photo-desc">{photo.description}</p>}
        </div>
      )}
    </div>
  );
}
