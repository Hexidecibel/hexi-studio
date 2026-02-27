import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface TenantUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  created_at: string;
}

interface TenantToken {
  id: string;
  label: string;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

export function AdminTenantsPage() {
  const { isAdmin, assumeUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdTokenUrl, setCreatedTokenUrl] = useState<string | null>(null);
  const [createdTokenCopied, setCreatedTokenCopied] = useState(false);

  // Expanded tenant + tokens
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [tokensByUser, setTokensByUser] = useState<Record<string, TenantToken[]>>({});
  const [tokensLoading, setTokensLoading] = useState<string | null>(null);

  // Generated token display per user
  const [generatedTokens, setGeneratedTokens] = useState<Record<string, string>>({});
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const result = await api.admin.listUsers();
      setUsers(result.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const loadTokens = async (userId: string) => {
    setTokensLoading(userId);
    try {
      const result = await api.admin.listUserTokens(userId);
      setTokensByUser((prev) => ({ ...prev, [userId]: result.data }));
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setTokensLoading(null);
    }
  };

  const toggleExpand = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      if (!tokensByUser[userId]) {
        loadTokens(userId);
      }
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setCreating(true);
    setCreateError('');
    setCreatedTokenUrl(null);
    try {
      const result = await api.admin.createUser({
        email: newEmail.trim(),
        ...(newName.trim() ? { name: newName.trim() } : {}),
      });
      // Auto-generate a first token for the new tenant
      try {
        const tokenResult = await api.admin.createUserToken(result.data.id, { label: 'Initial token' });
        setCreatedTokenUrl(tokenResult.data.autoLoginUrl);
      } catch {
        // Token creation is optional — tenant was still created
      }
      setNewEmail('');
      setNewName('');
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create tenant');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`Delete tenant "${email}"? This will remove all their data and cannot be undone.`)) return;
    try {
      await api.admin.deleteUser(userId);
      if (expandedUserId === userId) setExpandedUserId(null);
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleGenerateToken = async (userId: string) => {
    try {
      const result = await api.admin.createUserToken(userId);
      setGeneratedTokens((prev) => ({ ...prev, [userId]: result.data.autoLoginUrl }));
      await loadTokens(userId);
    } catch (err) {
      console.error('Failed to generate token:', err);
    }
  };

  const handleRevokeToken = async (userId: string, tokenId: string, tokenLabel: string) => {
    if (!window.confirm(`Revoke token "${tokenLabel || 'Untitled'}"? This cannot be undone.`)) return;
    try {
      await api.admin.revokeUserToken(userId, tokenId);
      await loadTokens(userId);
    } catch (err) {
      console.error('Failed to revoke token:', err);
    }
  };

  const copyToClipboard = async (text: string, id?: string) => {
    await navigator.clipboard.writeText(text);
    if (id) {
      setCopiedTokenId(id);
      setTimeout(() => setCopiedTokenId(null), 2000);
    } else {
      setCreatedTokenCopied(true);
      setTimeout(() => setCreatedTokenCopied(false), 2000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tenant Management</h1>
      </div>

      <div className="editor-layout">
        {/* Create Tenant */}
        <section className="editor-section">
          <h2>Create Tenant</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Email (required)"
                required
                className="input"
                style={{ flex: 1 }}
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name (optional)"
                className="input"
                style={{ flex: 1 }}
              />
            </div>
            <div className="form-actions">
              <button type="submit" disabled={creating || !newEmail.trim()} className="btn-primary">
                {creating ? 'Creating...' : 'Create Tenant'}
              </button>
            </div>
            {createError && <p className="error">{createError}</p>}
          </form>

          {createdTokenUrl && (
            <div style={{ marginTop: '16px' }}>
              <p className="text-muted" style={{ marginBottom: '8px' }}>
                Tenant created. Here is their auto-login URL (shown once):
              </p>
              <div className="code-block">
                <pre><code>{createdTokenUrl}</code></pre>
                <button
                  onClick={() => copyToClipboard(createdTokenUrl)}
                  className="copy-btn"
                >
                  {createdTokenCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Tenant List */}
        <section className="editor-section">
          <h2>Tenants ({users.length})</h2>

          {users.length === 0 ? (
            <p className="text-muted">No tenants yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {users.map((tenant) => (
                <div key={tenant.id} style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--color-surface)',
                  overflow: 'hidden',
                }}>
                  {/* Tenant row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpand(tenant.id)}
                  >
                    <div>
                      <strong>{tenant.email}</strong>
                      {tenant.name && <span className="text-muted" style={{ marginLeft: '8px' }}>{tenant.name}</span>}
                      <div className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{tenant.plan}</span>
                        {' · '}
                        {formatBytes(tenant.storage_used_bytes)} / {formatBytes(tenant.storage_limit_bytes)}
                        {' · '}
                        Created {formatDate(tenant.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          assumeUser(tenant.id).then(() => navigate('/'));
                        }}
                        className="btn-secondary btn-sm"
                      >
                        Assume
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(tenant.id, tenant.email); }}
                        className="btn-danger btn-sm"
                      >
                        Delete
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                        {expandedUserId === tenant.id ? '\u25B2' : '\u25BC'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded tokens section */}
                  {expandedUserId === tenant.id && (
                    <div style={{
                      padding: '12px 16px',
                      borderTop: '1px solid var(--color-border)',
                      background: 'var(--color-bg)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <strong style={{ fontSize: '14px' }}>Auto-Login Tokens</strong>
                        <button
                          onClick={() => handleGenerateToken(tenant.id)}
                          className="btn-primary btn-sm"
                        >
                          Generate Token
                        </button>
                      </div>

                      {/* Generated token URL (shown once) */}
                      {generatedTokens[tenant.id] && (
                        <div style={{ marginBottom: '12px' }}>
                          <div className="code-block">
                            <pre><code>{generatedTokens[tenant.id]}</code></pre>
                            <button
                              onClick={() => copyToClipboard(generatedTokens[tenant.id], tenant.id)}
                              className="copy-btn"
                            >
                              {copiedTokenId === tenant.id ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}

                      {tokensLoading === tenant.id ? (
                        <div style={{ padding: '16px', textAlign: 'center' }}>
                          <div className="loading-spinner" style={{ margin: '0 auto' }} />
                        </div>
                      ) : !tokensByUser[tenant.id] || tokensByUser[tenant.id].length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '13px' }}>No tokens yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {tokensByUser[tenant.id].map((token) => (
                            <div key={token.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              background: 'var(--color-surface)',
                              border: '1px solid var(--color-border)',
                            }}>
                              <div>
                                <span style={{ fontSize: '14px' }}>{token.label || 'Untitled'}</span>
                                <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                                  Created {formatDate(token.created_at)}
                                  {token.last_used_at && <> · Last used {formatDate(token.last_used_at)}</>}
                                  {token.expires_at && <> · Expires {formatDate(token.expires_at)}</>}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRevokeToken(tenant.id, token.id, token.label)}
                                className="btn-danger btn-sm"
                              >
                                Revoke
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
