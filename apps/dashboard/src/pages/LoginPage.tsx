import { useState, useEffect, type FormEvent } from 'react';
import { api } from '../lib/api';

const API_BASE = '/api/v1';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });
  const [foursureEnabled, setFoursureEnabled] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/auth/oauth/providers`)
      .then(res => res.json())
      .then(data => setProviders(data))
      .catch(() => {}); // Silently fail — just hide OAuth buttons
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/auth/4sure/config`)
      .then(r => r.json())
      .then(data => setFoursureEnabled(data.enabled))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.auth.sendMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const hasAlternativeLogins = foursureEnabled || providers.google || providers.apple;

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p>We sent a sign-in link to <strong>{email}</strong>.</p>
          <p className="text-muted">Click the link in the email to sign in. It expires in 15 minutes.</p>
          <button onClick={() => setSent(false)} className="btn-text">
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in to Hexi Gallery</h1>
        <p>Enter your email to receive a sign-in link.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="input"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
        {hasAlternativeLogins && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <div className="oauth-buttons">
              {foursureEnabled && (
                <a href="/api/v1/auth/4sure" className="btn-oauth">
                  <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Sign in with 4sure
                </a>
              )}
              {providers.google && (
                <a href={`${API_BASE}/auth/oauth/google`} className="btn-oauth">
                  <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </a>
              )}
              {providers.apple && (
                <a href={`${API_BASE}/auth/oauth/apple`} className="btn-oauth">
                  <svg className="oauth-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
