import { useAuth } from '../contexts/AuthContext';

export function AccountPage() {
  const { user } = useAuth();

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
      </div>
    </div>
  );
}
