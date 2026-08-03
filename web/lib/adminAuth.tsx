'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_TOKEN_KEY, api } from './api';
import type { User } from './types';

// Deliberately separate from lib/auth.tsx (member sessions): different
// localStorage key, different endpoints, no shared state. An admin and a
// member session can be open in the same browser at once without colliding.

type AdminAuthState = {
  admin: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.localStorage.getItem(ADMIN_TOKEN_KEY)) {
      setAdmin(null);
      return;
    }
    try {
      const { user } = await api<{ user: User }>('/api/admin/me', {
        auth: true,
        tokenKey: ADMIN_TOKEN_KEY,
      });
      setAdmin(user);
    } catch {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      setAdmin(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    window.localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
    setAdmin(res.user);
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({ admin, ready, signIn, signOut }), [admin, ready, signIn, signOut]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}
