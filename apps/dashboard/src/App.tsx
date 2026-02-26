import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { VerifyPage } from './pages/VerifyPage';
import { GalleryListPage } from './pages/GalleryListPage';
import { GalleryEditorPage } from './pages/GalleryEditorPage';
import { GallerySettingsPage } from './pages/GallerySettingsPage';
import { EmbedPage } from './pages/EmbedPage';
import { Layout } from './components/Layout';

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
      <Route element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<GalleryListPage />} />
        <Route path="/galleries/:id" element={<GalleryEditorPage />} />
        <Route path="/galleries/:id/settings" element={<GallerySettingsPage />} />
        <Route path="/galleries/:id/embed" element={<EmbedPage />} />
      </Route>
    </Routes>
  );
}
