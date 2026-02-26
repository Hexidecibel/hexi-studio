import { Routes, Route, Navigate } from 'react-router-dom';
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
import { AccountPage } from './pages/AccountPage';
import { LibraryPage } from './pages/LibraryPage';

export function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/auth/verify" element={<VerifyPage />} />
      <Route path="/auth/auto" element={<AutoLoginPage />} />
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<GalleryListPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/galleries/:id" element={<GalleryEditorPage />} />
        <Route path="/galleries/:id/settings" element={<GallerySettingsPage />} />
        <Route path="/galleries/:id/embed" element={<EmbedPage />} />
        <Route path="/galleries/:id/preview" element={<PreviewPage />} />
      </Route>
    </Routes>
  );
}
