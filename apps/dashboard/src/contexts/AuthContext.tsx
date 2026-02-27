import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  storageUsedBytes: number;
  storageLimitBytes: number;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isImpersonating: boolean;
  impersonatingEmail: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  assumeUser: (userId: string) => Promise<void>;
  stopAssuming: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatingEmail, setImpersonatingEmail] = useState<string | null>(() => localStorage.getItem('hexi_impersonating'));

  const isImpersonating = !!impersonatingEmail;

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('hexi_session_token');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch {
      localStorage.removeItem('hexi_session_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (token: string) => {
    localStorage.setItem('hexi_session_token', token);
    const userData = await api.auth.me();
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem('hexi_session_token');
    localStorage.removeItem('hexi_admin_token');
    localStorage.removeItem('hexi_impersonating');
    setImpersonatingEmail(null);
    setUser(null);
  }, []);

  const assumeUser = useCallback(async (userId: string) => {
    const currentToken = localStorage.getItem('hexi_session_token');
    if (!currentToken) return;
    // Save admin's token
    localStorage.setItem('hexi_admin_token', currentToken);
    // Call API to get session as target user
    const result = await api.admin.assumeUser(userId);
    // Swap to assumed user's token
    localStorage.setItem('hexi_session_token', result.token);
    localStorage.setItem('hexi_impersonating', result.assumedUser.email);
    setImpersonatingEmail(result.assumedUser.email);
    // Reload user data
    const userData = await api.auth.me();
    setUser(userData);
  }, []);

  const stopAssuming = useCallback(async () => {
    const adminToken = localStorage.getItem('hexi_admin_token');
    if (!adminToken) return;
    // Restore admin token
    localStorage.setItem('hexi_session_token', adminToken);
    localStorage.removeItem('hexi_admin_token');
    localStorage.removeItem('hexi_impersonating');
    setImpersonatingEmail(null);
    // Reload admin user data
    const userData = await api.auth.me();
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin: user?.isAdmin ?? false, isLoading, isImpersonating, impersonatingEmail, login, logout, assumeUser, stopAssuming }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
