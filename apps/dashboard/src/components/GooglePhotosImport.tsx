import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

interface GooglePhotosImportProps {
  galleryId?: string;
  targetType: 'gallery' | 'library';
  onImportComplete: () => void;
}

type ImportState = 'loading' | 'not-configured' | 'disconnected' | 'connected' | 'picking' | 'albums' | 'paste-link' | 'importing' | 'done' | 'error';

interface Album {
  id: string;
  title: string;
  itemCount: number;
  coverUrl: string | null;
}

export function GooglePhotosImport({ galleryId, targetType, onImportComplete }: GooglePhotosImportProps) {
  const [state, setState] = useState<ImportState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<{ imported: number; failed: number; total: number } | null>(null);
  const [_pickerSessionId, setPickerSessionId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsNextPageToken, setAlbumsNextPageToken] = useState<string | null>(null);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [sharedUrl, setSharedUrl] = useState('');
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    checkStatus();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  const checkStatus = async () => {
    try {
      const result = await api.googlePhotos.status();
      setState(result.connected ? 'connected' : 'disconnected');
    } catch (err: any) {
      if (err.status === 400 || err.message?.includes('not configured')) {
        setState('not-configured');
      } else {
        setState('disconnected');
      }
    }
  };

  const handleConnect = () => {
    const token = localStorage.getItem('hexi_session_token');
    window.location.href = `${api.googlePhotos.getConnectUrl()}?_auth=${token}`;
  };

  const handleDisconnect = async () => {
    try {
      await api.googlePhotos.disconnect();
      setState('disconnected');
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  // --- Picker flow (existing) ---

  const handleStartPicker = async () => {
    setError(null);
    try {
      const session = await api.googlePhotos.createPickerSession();
      setPickerSessionId(session.sessionId);
      setState('picking');
      window.open(session.pickerUri, '_blank');
      pollPickerSession(session.sessionId, parseInt(session.pollingConfig.pollInterval) || 5000);
    } catch (err: any) {
      if (err.status === 401) {
        setState('disconnected');
        setError('Google Photos authorization expired. Please reconnect.');
      } else {
        setError(err.message || 'Failed to start photo picker');
      }
    }
  };

  const pollPickerSession = useCallback((sessionId: string, interval: number) => {
    const poll = async () => {
      try {
        const result = await api.googlePhotos.pollPickerSession(sessionId);
        if (result.mediaItemsSet && result.mediaItems.length > 0) {
          setState('importing');
          setImportProgress({ imported: 0, failed: 0, total: result.mediaItems.length });
          const importResult = await api.googlePhotos.startImport({
            sessionId,
            galleryId,
            targetType,
            mediaItems: result.mediaItems,
          });
          setImportProgress({
            imported: importResult.importedItems,
            failed: importResult.failedItems,
            total: importResult.totalItems,
          });
          setState('done');
          onImportComplete();
          return;
        }
        pollTimerRef.current = setTimeout(poll, interval);
      } catch (err: any) {
        console.error('Polling error:', err);
        setError(err.message || 'Failed to check picker status');
        setState('connected');
      }
    };
    pollTimerRef.current = setTimeout(poll, interval);
  }, [galleryId, targetType, onImportComplete]);

  const handleCancelPicking = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setPickerSessionId(null);
    setState('connected');
  };

  // --- Album flow (new) ---

  const handleShowAlbums = async () => {
    setError(null);
    setAlbums([]);
    setAlbumsNextPageToken(null);
    setState('albums');
    await loadAlbums();
  };

  const loadAlbums = async (pageToken?: string) => {
    setLoadingAlbums(true);
    try {
      const result = await api.googlePhotos.listAlbums(pageToken);
      setAlbums((prev) => pageToken ? [...prev, ...result.albums] : result.albums);
      setAlbumsNextPageToken(result.nextPageToken);
    } catch (err: any) {
      if (err.status === 401) {
        setState('disconnected');
        setError('Google Photos authorization expired. Please reconnect.');
      } else if (err.status === 403) {
        setError('Album access not granted. Please disconnect and reconnect Google Photos.');
      } else {
        setError(err.message || 'Failed to load albums');
      }
    } finally {
      setLoadingAlbums(false);
    }
  };

  const pollImportProgress = useCallback((importId: string) => {
    const poll = async () => {
      try {
        const result = await api.googlePhotos.pollImport(importId);
        const data = result.data;
        setImportProgress({
          imported: data.imported_items || 0,
          failed: data.failed_items || 0,
          total: data.total_items || 0,
        });

        if (data.status === 'completed' || data.status === 'failed') {
          setState('done');
          onImportComplete();
          return;
        }

        // Keep polling
        pollTimerRef.current = setTimeout(poll, 2000);
      } catch (err: any) {
        console.error('Import poll error:', err);
        setError(err.message || 'Failed to check import progress');
        setState('connected');
      }
    };

    pollTimerRef.current = setTimeout(poll, 1000);
  }, [onImportComplete]);

  const handleImportAlbum = async (album: Album) => {
    setError(null);
    setState('importing');
    setImportProgress({ imported: 0, failed: 0, total: album.itemCount });

    try {
      const result = await api.googlePhotos.importAlbum({
        albumId: album.id,
        galleryId,
        targetType,
      });
      setImportProgress({ imported: 0, failed: 0, total: result.totalItems });
      pollImportProgress(result.importId);
    } catch (err: any) {
      if (err.status === 401) {
        setState('disconnected');
        setError('Google Photos authorization expired. Please reconnect.');
      } else {
        setError(err.message || 'Failed to import album');
        setState('connected');
      }
    }
  };

  // --- Shared URL flow ---

  const handleImportSharedUrl = async () => {
    if (!sharedUrl.trim()) return;
    setError(null);
    setState('importing');
    setImportProgress({ imported: 0, failed: 0, total: 0 });

    try {
      const result = await api.googlePhotos.importShared({
        url: sharedUrl.trim(),
        galleryId,
        targetType,
      });
      setImportProgress({ imported: 0, failed: 0, total: result.totalItems });
      setSharedUrl('');
      pollImportProgress(result.importId);
    } catch (err: any) {
      setError(err.message || 'Failed to import from shared album');
      setState('connected');
    }
  };

  // --- Render ---

  if (state === 'loading') {
    return null;
  }

  return (
    <div style={{ marginTop: '12px' }}>
      {error && (
        <div style={{ padding: '8px 12px', marginBottom: '8px', borderRadius: '6px', background: '#f8d7da', color: '#721c24', fontSize: '13px' }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#721c24', fontWeight: 'bold' }}>&times;</button>
        </div>
      )}

      {state === 'not-configured' && (
        <button onClick={() => setState('paste-link')} className="btn-secondary btn-sm">
          Paste Album Link
        </button>
      )}

      {state === 'disconnected' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleConnect} className="btn-secondary btn-sm">
            Connect Google Photos
          </button>
          <button onClick={() => setState('paste-link')} className="btn-secondary btn-sm">
            Paste Album Link
          </button>
        </div>
      )}

      {state === 'connected' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleStartPicker} className="btn-secondary btn-sm">
            Pick Photos
          </button>
          <button onClick={handleShowAlbums} className="btn-secondary btn-sm">
            Import Album
          </button>
          <button onClick={() => setState('paste-link')} className="btn-secondary btn-sm">
            Paste Album Link
          </button>
          <button onClick={handleDisconnect} className="btn-secondary btn-sm" style={{ fontSize: '12px', opacity: 0.7 }}>
            Disconnect
          </button>
        </div>
      )}

      {state === 'picking' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
          <span style={{ fontSize: '13px' }}>Waiting for photo selection...</span>
          <button onClick={handleCancelPicking} className="btn-secondary btn-sm" style={{ fontSize: '12px' }}>
            Cancel
          </button>
        </div>
      )}

      {state === 'albums' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Select an album to import</span>
            <button onClick={() => setState('connected')} className="btn-secondary btn-sm" style={{ fontSize: '12px' }}>
              Back
            </button>
          </div>

          {albums.length === 0 && loadingAlbums && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '16px 0' }}>
              <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '13px' }}>Loading albums...</span>
            </div>
          )}

          {albums.length === 0 && !loadingAlbums && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>No albums found.</p>
          )}

          {albums.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => handleImportAlbum(album)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 0,
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    background: 'var(--color-bg)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7c5cfc')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  {album.coverUrl ? (
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: '100%', height: '120px', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', fontSize: '24px' }}>
                      📷
                    </div>
                  )}
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {album.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {album.itemCount} item{album.itemCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {albumsNextPageToken && (
            <button
              onClick={() => loadAlbums(albumsNextPageToken)}
              disabled={loadingAlbums}
              className="btn-secondary btn-sm"
              style={{ marginTop: '8px', width: '100%' }}
            >
              {loadingAlbums ? 'Loading...' : 'Load more albums'}
            </button>
          )}
        </div>
      )}

      {state === 'paste-link' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Paste a shared Google Photos album link</span>
            <button onClick={() => { setState('connected'); setSharedUrl(''); }} className="btn-secondary btn-sm" style={{ fontSize: '12px' }}>
              Back
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="url"
              value={sharedUrl}
              onChange={(e) => setSharedUrl(e.target.value)}
              placeholder="https://photos.app.goo.gl/..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: '13px',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleImportSharedUrl(); }}
              autoFocus
            />
            <button
              onClick={handleImportSharedUrl}
              disabled={!sharedUrl.trim()}
              className="btn-primary btn-sm"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {state === 'importing' && importProgress && (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
            <div className="loading-spinner" style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px' }}>
              Importing... {importProgress.imported}/{importProgress.total}
              {importProgress.failed > 0 && ` (${importProgress.failed} failed)`}
            </span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              width: `${importProgress.total > 0 ? ((importProgress.imported + importProgress.failed) / importProgress.total) * 100 : 0}%`,
              height: '100%',
              background: '#7c5cfc',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {state === 'done' && importProgress && (
        <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#d4edda', color: '#155724', fontSize: '13px' }}>
          Imported {importProgress.imported} photo{importProgress.imported !== 1 ? 's' : ''} successfully
          {importProgress.failed > 0 && ` (${importProgress.failed} failed)`}.
          <button
            onClick={() => { setState('connected'); setImportProgress(null); }}
            style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#155724', textDecoration: 'underline' }}
          >
            Import more
          </button>
        </div>
      )}

      {state === 'error' && (
        <button onClick={() => { setError(null); checkStatus(); }} className="btn-secondary btn-sm">
          Retry
        </button>
      )}
    </div>
  );
}
