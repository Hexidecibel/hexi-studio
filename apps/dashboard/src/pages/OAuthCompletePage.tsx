import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function OAuthCompletePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      const messages: Record<string, string> = {
        'invalid_state': 'Login session expired. Please try again.',
        'token_exchange_failed': 'Authentication failed. Please try again.',
        'no_email': 'Could not retrieve your email address.',
        'missing_params': 'Invalid callback. Please try again.',
        'access_denied': 'Sign in was cancelled.',
      };
      setError(messages[errorParam] || `Sign in failed: ${errorParam}`);
      return;
    }

    if (token) {
      login(token)
        .then(() => navigate('/', { replace: true }))
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Sign in failed');
        });
    } else {
      setError('No authentication token received.');
    }
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Sign In Failed</h1>
          <p className="error">{error}</p>
          <a href="/login" className="btn-primary">Back to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Completing sign in...</h1>
        <div className="loading-spinner" />
      </div>
    </div>
  );
}
