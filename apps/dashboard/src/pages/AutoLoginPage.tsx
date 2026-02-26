import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function AutoLoginPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError('Invalid auto-login link');
      return;
    }

    api.auth
      .autoLogin(token)
      .then(async (result) => {
        await login(result.token);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Auto-login failed');
      });
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Auto-login failed</h1>
          <p className="error">{error}</p>
          <a href="/login" className="btn-primary">Back to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Signing in...</h1>
        <div className="loading-spinner" />
      </div>
    </div>
  );
}
