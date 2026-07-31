import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, clearToken, loadToken, onUnauthorized, storeToken } from './api';
import type { Company, User } from './types';

interface AuthState {
  ready: boolean;
  user: User | null;
  company: Company | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface RegisterPayload {
  company: { name: string; legalForm?: string; street?: string; zip?: string; city?: string };
  user: { email: string; password: string; firstName: string; lastName: string };
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  const refresh = useCallback(async () => {
    const data = await api<{ user: User; company: Company | null }>('/api/auth/me');
    setUser(data.user);
    setCompany(data.company);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = await loadToken();
        if (token) await refresh();
      } catch {
        // Token ungültig/abgelaufen → als abgemeldet starten
      } finally {
        setReady(true);
      }
    })();
    return onUnauthorized(() => {
      setUser(null);
      setCompany(null);
    });
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ token: string; user: User; company: Company | null }>(
      '/api/auth/login',
      { method: 'POST', body: { email, password } },
    );
    await storeToken(data.token);
    setUser(data.user);
    setCompany(data.company);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await api<{ token: string; user: User; company: Company }>(
      '/api/auth/register',
      { method: 'POST', body: payload },
    );
    await storeToken(data.token);
    setUser(data.user);
    setCompany(data.company);
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
    setCompany(null);
  }, []);

  const value = useMemo(
    () => ({ ready, user, company, login, register, logout, refresh }),
    [ready, user, company, login, register, logout, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth außerhalb von AuthProvider');
  return ctx;
}
