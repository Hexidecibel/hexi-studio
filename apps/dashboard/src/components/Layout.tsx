import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/" className="logo">Hexi Gallery</Link>
        </div>
        <nav className="header-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Galleries
          </Link>
        </nav>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="btn-text">Sign Out</button>
        </div>
      </header>
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
