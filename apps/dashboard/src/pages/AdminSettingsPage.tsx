import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function AdminSettingsPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Google Photos integration
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleClientSecret, setGoogleClientSecret] = useState('');
  const [googleRedirectUri, setGoogleRedirectUri] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const result = await api.admin.getSettings();
        const settings = result.data;
        setGoogleClientId(settings.google_photos_client_id || '');
        setGoogleClientSecret(settings.google_photos_client_secret || '');
        setGoogleRedirectUri(settings.google_photos_redirect_uri || '');
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.admin.updateSettings({
        google_photos_client_id: googleClientId,
        google_photos_client_secret: googleClientSecret,
        google_photos_redirect_uri: googleRedirectUri,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const isConfigured = googleClientId && googleClientSecret && googleRedirectUri;

  if (loading) {
    return <div className="page-loading"><div className="loading-spinner" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="editor-layout">
        <section className="editor-section">
          <h2>Google Photos Integration</h2>
          <p className="text-muted" style={{ marginBottom: '16px' }}>
            Configure Google OAuth credentials to enable photo imports from Google Photos.
            Create credentials at{' '}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
              Google Cloud Console
            </a>.
            Enable the <strong>Photos Picker API</strong>.
          </p>

          <div style={{ display: 'inline-block', marginBottom: '16px', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', background: isConfigured ? '#d4edda' : '#f8d7da', color: isConfigured ? '#155724' : '#721c24' }}>
            {isConfigured ? 'Configured' : 'Not configured'}
          </div>

          <label className="field">
            <span>Client ID</span>
            <input
              type="text"
              value={googleClientId}
              onChange={(e) => setGoogleClientId(e.target.value)}
              className="input"
              placeholder="xxx.apps.googleusercontent.com"
            />
          </label>

          <label className="field">
            <span>Client Secret</span>
            <input
              type="password"
              value={googleClientSecret}
              onChange={(e) => setGoogleClientSecret(e.target.value)}
              className="input"
              placeholder="GOCSPX-..."
            />
          </label>

          <label className="field">
            <span>Redirect URI</span>
            <input
              type="text"
              value={googleRedirectUri}
              onChange={(e) => setGoogleRedirectUri(e.target.value)}
              className="input"
              placeholder="https://your-api.example.com/api/v1/google-photos/callback"
            />
            <span className="field-hint">Must match the authorized redirect URI in Google Cloud Console</span>
          </label>

          <div className="form-actions" style={{ marginTop: '16px' }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Integration Settings'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
