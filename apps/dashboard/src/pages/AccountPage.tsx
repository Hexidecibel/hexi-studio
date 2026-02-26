import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface AutoLoginToken {
  id: string;
  label: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export function AccountPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<AutoLoginToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTokenUrl, setNewTokenUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const result = await api.auth.listAutoLoginTokens();
      setTokens(result.data);
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleCreate = async () => {
    if (!label.trim()) return;
    setCreating(true);
    try {
      const result = await api.auth.createAutoLoginToken(label.trim());
      const url = `${window.location.origin}/auth/auto?token=${result.data.token}`;
      setNewTokenUrl(url);
      setLabel('');
      await loadTokens();
    } catch (err) {
      console.error('Failed to create token:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string, tokenLabel: string) => {
    if (!confirm(`Revoke token "${tokenLabel || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await api.auth.revokeAutoLoginToken(id);
      await loadTokens();
    } catch (err) {
      console.error('Failed to revoke token:', err);
    }
  };

  const copyUrl = async () => {
    if (!newTokenUrl) return;
    await navigator.clipboard.writeText(newTokenUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Account</h1>
      </div>

      <div className="editor-layout">
        {/* Account info */}
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
              <span>{formatBytes(user.storageUsedBytes)} / {formatBytes(user.storageLimitBytes)}</span>
            </div>
          </div>
        </section>

        {/* Auto-login tokens */}
        <section className="editor-section">
          <h2>Auto-Login Tokens</h2>
          <p className="text-muted">
            Generate reusable login links for your clients. They click the link and land directly in the dashboard — no email required.
          </p>

          {/* Create new token */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. client name)"
              className="input"
              style={{ flex: 1 }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !label.trim()}
              className="btn-primary"
            >
              {creating ? 'Creating...' : 'Generate Token'}
            </button>
          </div>

          {/* New token URL (shown once) */}
          {newTokenUrl && (
            <div className="code-block" style={{ marginTop: '12px' }}>
              <pre><code>{newTokenUrl}</code></pre>
              <button onClick={copyUrl} className="copy-btn">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}

          {/* Token list */}
          {loading ? (
            <div className="page-loading"><div className="loading-spinner" /></div>
          ) : tokens.length === 0 ? (
            <p className="text-muted" style={{ marginTop: '16px' }}>No tokens yet.</p>
          ) : (
            <div className="token-list" style={{ marginTop: '16px' }}>
              {tokens.map((t) => (
                <div key={t.id} className="token-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'var(--surface, #f9fafb)',
                  marginBottom: '8px',
                }}>
                  <div>
                    <strong>{t.label || 'Untitled'}</strong>
                    <div className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                      Created {formatDate(t.created_at)}
                      {t.last_used_at && <> · Last used {formatDate(t.last_used_at)}</>}
                      {t.expires_at && <> · Expires {formatDate(t.expires_at)}</>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevoke(t.id, t.label)}
                    className="btn-danger btn-sm"
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
