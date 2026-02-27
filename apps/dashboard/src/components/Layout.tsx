import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, isAdmin, logout, isImpersonating, impersonatingEmail, stopAssuming } = useAuth();
  const location = useLocation();

  return (
    <div className="dashboard-layout">
      {isImpersonating && (
        <div className="impersonation-banner">
          <span>Viewing as <strong>{impersonatingEmail}</strong></span>
          <button onClick={stopAssuming} className="impersonation-stop-btn">
            Stop Impersonating
          </button>
        </div>
      )}
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/" className="logo">Hexi Gallery</Link>
        </div>
        <nav className="header-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Galleries
          </Link>
          <Link to="/library" className={location.pathname === '/library' ? 'active' : ''}>
            Library
          </Link>
          <Link to="/account" className={location.pathname === '/account' ? 'active' : ''}>
            Account
          </Link>
          {isAdmin && (
            <Link to="/admin/tenants" className={location.pathname === '/admin/tenants' ? 'active' : ''}>
              Tenants
            </Link>
          )}
        </nav>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="btn-secondary btn-sm">Sign Out</button>
        </div>
      </header>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
