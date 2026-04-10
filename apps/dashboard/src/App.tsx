import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { VerifyPage } from './pages/VerifyPage';
import { GalleryListPage } from './pages/GalleryListPage';
import { GalleryEditorPage } from './pages/GalleryEditorPage';
import { GallerySettingsPage } from './pages/GallerySettingsPage';
import { EmbedPage } from './pages/EmbedPage';
import { PreviewPage } from './pages/PreviewPage';
import { Layout } from './components/Layout';
import { AutoLoginPage } from './pages/AutoLoginPage';
import { OAuthCompletePage } from './pages/OAuthCompletePage';
import { AccountPage } from './pages/AccountPage';
import { LibraryPage } from './pages/LibraryPage';
import { AdminTenantsPage } from './pages/AdminTenantsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';

const PublicGalleryPage = lazy(() => import('./pages/PublicGalleryPage'));
const PublicPhotoPage = lazy(() => import('./pages/PublicPhotoPage'));

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Public gallery routes bypass auth entirely
  const isPublicRoute = location.pathname.startsWith('/g/');

  if (isLoading && !isPublicRoute) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public gallery pages - no auth required */}
      <Route path="/g/:slug" element={
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /></div>}>
          <PublicGalleryPage />
        </Suspense>
      } />
      <Route path="/g/:slug/photo/:id" element={
        <Suspense fallback={<div className="loading-screen"><div className="loading-spinner" /></div>}>
          <PublicPhotoPage />
        </Suspense>
      } />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route path="/auto-login" element={<AutoLoginPage />} />
      <Route path="/auth/auto" element={<AutoLoginPage />} />
      <Route path="/auth/oauth-complete" element={<OAuthCompletePage />} />
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<GalleryListPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/galleries/:id" element={<GalleryEditorPage />} />
        <Route path="/galleries/:id/settings" element={<GallerySettingsPage />} />
        <Route path="/galleries/:id/embed" element={<EmbedPage />} />
        <Route path="/galleries/:id/preview" element={<PreviewPage />} />
        <Route path="/admin/tenants" element={<AdminTenantsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
}
