import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      setError('Invalid verification link');
      return;
    }

    api.auth
      .verify(token, email)
      .then(async (result) => {
        await login(result.token);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Verification failed');
      });
  }, [searchParams, login, navigate]);

  if (error) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Verification failed</h1>
          <p className="error">{error}</p>
          <a href="/login" className="btn-primary">Back to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Verifying...</h1>
        <div className="loading-spinner" />
      </div>
    </div>
  );
}
