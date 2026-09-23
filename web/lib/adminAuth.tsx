'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_TOKEN_KEY, api } from './api';
import type { User } from './types';

// Deliberately separate from lib/auth.tsx (member sessions): different
// localStorage key, different endpoints, no shared state. An admin and a
// member session can be open in the same browser at once without colliding.

export type Permission =
  | 'overview.view'
  | 'members.view'
  | 'members.delete'
  | 'profiles.view'
  | 'profiles.create'
  | 'profiles.edit'
  | 'profiles.approve'
  | 'profiles.delete'
  | 'matches.view'
  | 'export.data'
  | 'payments.view'
  | 'newsletter.manage'
  | 'emails.view';

type Session = {
  user: User;
  isSuper: boolean;
  roleName: string;
  permissions: Permission[];
  /** False until migration 002 has been run against Supabase. */
  schemaReady: boolean;
};

type AdminAuthState = {
  admin: User | null;
  session: Session | null;
  ready: boolean;
  /** Whether the signed-in panel user holds a permission. The server enforces the same rule. */
  can: (permission: Permission) => boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

// Order matters: the first page a user may open is where they land.
export const ADMIN_PAGES: { href: string; permission?: Permission; superOnly?: boolean }[] = [
  { href: '/admin/dashboard', permission: 'overview.view' },
  { href: '/admin/profiles', permission: 'profiles.view' },
  { href: '/admin/upload', permission: 'profiles.create' },
  { href: '/admin/members', permission: 'members.view' },
  { href: '/admin/export', permission: 'export.data' },
  { href: '/admin/payments', permission: 'payments.view' },
  { href: '/admin/newsletter', permission: 'newsletter.manage' },
  { href: '/admin/emails', permission: 'emails.view' },
  { href: '/admin/team', superOnly: true },
];

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const s = await api<Session>('/api/admin/me', { auth: true, tokenKey: ADMIN_TOKEN_KEY });
    setSession(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!window.localStorage.getItem(ADMIN_TOKEN_KEY)) {
      setSession(null);
      return;
    }
    try {
      await load();
    } catch {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      setSession(null);
    }
  }, [load]);

  useEffect(() => {
    refresh().finally(() => setReady(true));
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ token: string; user: User }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      window.localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
      await load();
    },
    [load]
  );

  const signOut = useCallback(() => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
    setSession(null);
  }, []);

  const can = useCallback(
    (permission: Permission) => !!session && (session.isSuper || session.permissions.includes(permission)),
    [session]
  );

  const value = useMemo(
    () => ({ admin: session?.user ?? null, session, ready, can, signIn, signOut }),
    [session, ready, can, signIn, signOut]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  return ctx;
}

/** The first admin page this session may open — where login and /admin send them. */
export function homePathFor(session: Session | null, can: (p: Permission) => boolean): string {
  if (!session) return '/admin/login';
  const page = ADMIN_PAGES.find((p) => (p.superOnly ? session.isSuper : !p.permission || can(p.permission)));
  return page?.href ?? '/admin/dashboard'; // renders the no-access notice
}
