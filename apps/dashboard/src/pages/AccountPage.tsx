import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface ApiKey {
  id: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
}

interface CreatedKey {
  id: string;
  key: string;
  label: string;
  created_at: string;
}

interface StorageBreakdown {
  gallery: { count: number; totalBytes: number };
  library: { count: number; totalBytes: number };
  total: { count: number; totalBytes: number };
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export function AccountPage() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const fetchApiKeys = async () => {
    setLoading(true);
    try {
      const res = await api.apiKeys.list();
      setApiKeys(res.apiKeys);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageBreakdown = async () => {
    try {
      const data = await api.auth.storageBreakdown();
      setStorageBreakdown(data);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchApiKeys();
    fetchStorageBreakdown();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;
    setCreating(true);
    setCreatedKey(null);
    setCopied(false);
    try {
      const res = await api.apiKeys.create(newKeyLabel.trim());
      setCreatedKey(res);
      setNewKeyLabel('');
      fetchApiKeys();
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, label: string) => {
    if (!window.confirm(`Revoke API key "${label}"? This cannot be undone.`)) return;
    try {
      await api.apiKeys.delete(id);
      if (createdKey?.id === id) setCreatedKey(null);
      fetchApiKeys();
    } catch {
      // silently fail
    }
  };

  const handleCopy = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = key;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Account</h1>
      </div>

      <div className="editor-layout">
        <section className="editor-section">
          <h2>Account Info</h2>
          <div className="account-info-grid">
            <div className="field">
              <span className="field-label">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="field">
              <span className="field-label">Plan</span>
              <span style={{ textTransform: 'capitalize' }}>{user.plan}</span>
            </div>
            <div className="field">
              <span className="field-label">Storage</span>
              {(() => {
                const used = storageBreakdown?.storageUsedBytes ?? user.storageUsedBytes;
                const limit = storageBreakdown?.storageLimitBytes ?? user.storageLimitBytes;
                const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
                const barClass = pct > 90 ? 'danger' : pct > 70 ? 'warning' : '';
                return (
                  <>
                    <span>{formatBytes(used)} / {formatBytes(limit)} ({pct.toFixed(1)}%)</span>
                    <div className="storage-bar-track">
                      <div
                        className={`storage-bar-fill${barClass ? ` ${barClass}` : ''}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {storageBreakdown && (
                      <div className="storage-breakdown">
                        <div className="storage-breakdown-item">
                          <span className="storage-breakdown-dot" style={{ background: '#7c5cfc' }} />
                          <span>Gallery: {storageBreakdown.gallery.count} files ({formatBytes(storageBreakdown.gallery.totalBytes)})</span>
                        </div>
                        <div className="storage-breakdown-item">
                          <span className="storage-breakdown-dot" style={{ background: '#00d4aa' }} />
                          <span>Library: {storageBreakdown.library.count} files ({formatBytes(storageBreakdown.library.totalBytes)})</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </section>

        <section className="editor-section">
          <h2>API Keys</h2>

          {createdKey && (
            <div style={{
              background: 'rgba(0, 212, 170, 0.1)',
              border: '1px solid var(--color-success)',
              borderRadius: 'var(--radius)',
              padding: '16px',
              marginBottom: '20px',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-success)' }}>
                API Key Created
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                marginBottom: '8px',
              }}>
                <code style={{
                  flex: 1,
                  fontFamily: "'SF Mono', Monaco, Consolas, 'Courier New', monospace",
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  wordBreak: 'break-all',
                }}>
                  {createdKey.key}
                </code>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => handleCopy(createdKey.key)}
                  style={{ flexShrink: 0 }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-warning)' }}>
                Copy this key now — it won't be shown again.
              </div>
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <input
              type="text"
              className="input"
              placeholder="Key label (e.g. My App)"
              value={newKeyLabel}
              onChange={(e) => setNewKeyLabel(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={creating || !newKeyLabel.trim()}
              style={{ flexShrink: 0 }}
            >
              {creating ? 'Creating...' : 'Create API Key'}
            </button>
          </form>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
              Loading...
            </div>
          ) : apiKeys.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--color-surface-elevated)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{key.label}</span>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      Created {formatDate(key.created_at)}
                      {' · '}
                      {key.last_used_at ? `Last used ${formatDate(key.last_used_at)}` : 'Never used'}
                    </span>
                  </div>
                  <button
                    className="btn-danger btn-sm"
                    onClick={() => handleRevoke(key.id, key.label)}
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
