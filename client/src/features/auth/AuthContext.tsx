import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from './api/authApi';

interface AuthState {
  user: { email: string; isAdmin: boolean } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Module-level flag: persists across route changes (prevents redundant session checks)
let sessionChecked = false;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: !sessionChecked,
  });

  const restoreSession = useCallback(async () => {
    if (sessionChecked) return;
    sessionChecked = true;

    try {
      const { data } = await authApi.refresh();
      setState({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      // No valid session — user remains unauthenticated
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  const login = async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    setState({ user: data, isAuthenticated: true, isLoading: false });
  };

  const register = async (email: string, password: string, confirmPassword: string) => {
    const { data } = await authApi.register({ email, password, confirmPassword });
    setState({ user: data, isAuthenticated: true, isLoading: false });
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore — clear locally anyway */ }
    setState({ user: null, isAuthenticated: false, isLoading: false });
    sessionChecked = false; // Reset so next mount re-checks
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
