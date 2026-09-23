'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY } from './api';
import type { MemberDetails, RegisterResult, User } from './types';

type AuthState = {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: Record<string, any>) => Promise<RegisterResult>;
  signOut: () => void;
  refresh: () => Promise<void>;
  updateProfile: (patch: { phone?: string; details?: Partial<MemberDetails> }) => Promise<User>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
      setUser(null);
      return;
    }
    try {
      const { user: me } = await api<{ user: User }>('/api/auth/me', { auth: true });
      document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=2592000; SameSite=Lax`;
      setUser(me);
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
      document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const store = (res: { token: string; user: User }) => {
    window.localStorage.setItem(TOKEN_KEY, res.token);
    document.cookie = `${TOKEN_KEY}=${res.token}; path=/; max-age=2592000; SameSite=Lax`;
    setUser(res.user);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    store(
      await api<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    );
  }, []);

  const signUp = useCallback(async (payload: Record<string, unknown>) => {
    const res = await api<RegisterResult & { token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    store(res);
    return { notifications: res.notifications ?? [], reference: res.reference };
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: { phone?: string; details?: Partial<MemberDetails> }) => {
      const res = await api<{ user: User }>('/api/auth/me', {
        method: 'PATCH',
        auth: true,
        body: JSON.stringify(patch),
      });
      setUser(res.user);
      return res.user;
    },
    []
  );

  const value = useMemo(
    () => ({ user, ready, signIn, signUp, signOut, refresh, updateProfile }),
    [user, ready, signIn, signUp, signOut, refresh, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
