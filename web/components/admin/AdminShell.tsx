'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useAdminAuth, type Permission } from '@/lib/adminAuth';

type NavItem = { href: string; label: string; icon: string; permission?: Permission; superOnly?: boolean };

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Workspace',
    items: [
      { href: '/admin/dashboard', label: 'Overview', icon: 'dashboard', permission: 'overview.view' },
      { href: '/admin/profiles', label: 'Profiles & Approvals', icon: 'badge', permission: 'profiles.view' },
      { href: '/admin/upload', label: 'Upload Biodata', icon: 'upload_file', permission: 'profiles.create' },
      { href: '/admin/members', label: 'Members', icon: 'group', permission: 'members.view' },
      { href: '/admin/export', label: 'Export Biodata', icon: 'file_export', permission: 'export.data' },
    ],
  },
  {
    section: 'Business',
    items: [
      { href: '/admin/payments', label: 'Payments', icon: 'payments', permission: 'payments.view' },
      { href: '/admin/newsletter', label: 'Newsletter', icon: 'mail', permission: 'newsletter.manage' },
      { href: '/admin/emails', label: 'Parent Emails', icon: 'forward_to_inbox', permission: 'emails.view' },
    ],
  },
  {
    section: 'Administration',
    items: [{ href: '/admin/team', label: 'Team & Roles', icon: 'admin_panel_settings', superOnly: true }],
  },
];

const initialsOf = (email: string) => email.slice(0, 2).toUpperCase();

/**
 * Chrome shared by every admin screen: sidebar nav, header, the auth guard
 * that bounces unauthenticated visitors to /admin/login, and the permission
 * gate. Pass `permission` (or `superOnly`) and a user without it sees a
 * polite no-access notice instead of the page — the API refuses them too.
 */
export function AdminShell({
  title,
  description,
  actions,
  permission,
  superOnly,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  permission?: Permission;
  superOnly?: boolean;
  children: React.ReactNode;
}) {
  const { admin, session, ready, can, signOut } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (ready && !admin) router.replace('/admin/login');
  }, [ready, admin, router]);

  if (!ready || !admin || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a0410]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary-fixed-dim border-t-transparent" />
      </div>
    );
  }

  const allowed = (item: { permission?: Permission; superOnly?: boolean }) =>
    item.superOnly ? session.isSuper : !item.permission || can(item.permission);
  const pageAllowed = allowed({ permission, superOnly });

  return (
    <div className="flex min-h-screen bg-surface-container-low">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #2D0312 0%, #1a0410 65%, #10030b 100%)',
        }}
      >
        <div className="flex h-[76px] items-center justify-between px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_0_0_4px_rgba(232,82,131,0.15)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static brand mark */}
              <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-heading text-[18px] text-inverse-on-surface">EverAfter</span>
              <span className="mt-0.5 font-body text-[10px] uppercase tracking-wider text-inverse-on-surface/45">
                Matrimony Admin
              </span>
            </div>
          </Link>
          <button
            className="text-inverse-on-surface/60 hover:text-inverse-on-surface lg:hidden"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          {NAV.map((group) => {
            const items = group.items.filter(allowed);
            if (!items.length) return null;
            return (
              <div key={group.section} className="flex flex-col gap-1">
                <p className="px-3.5 pb-1 font-body text-[10px] uppercase tracking-[0.14em] text-inverse-on-surface/35">
                  {group.section}
                </p>
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setNavOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-body-md transition-all ${
                        active
                          ? 'bg-secondary text-on-secondary shadow-[0_6px_18px_-6px_rgba(232,82,131,0.7)]'
                          : 'text-inverse-on-surface/60 hover:bg-white/[0.06] hover:text-inverse-on-surface'
                      }`}
                    >
                      <Icon
                        name={item.icon}
                        className={`text-[19px] ${active ? '' : 'text-inverse-on-surface/45 group-hover:text-secondary-fixed-dim'}`}
                        filled={active}
                      />
                      {item.label}
                      {active && <Icon name="chevron_right" className="ml-auto text-[16px]" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/"
            target="_blank"
            className="mb-2 flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-body text-body-md text-inverse-on-surface/60 transition-colors hover:bg-white/[0.06] hover:text-inverse-on-surface"
          >
            <Icon name="open_in_new" className="text-[19px] text-inverse-on-surface/45" />
            View Site
          </Link>

          <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-3.5 py-3 ring-1 ring-white/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-fixed-dim font-body text-label-md font-semibold uppercase text-primary-container">
              {initialsOf(admin.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-label-md text-inverse-on-surface">
                {admin.email}
              </p>
              <p className="font-body text-[11px] uppercase tracking-wide text-secondary-fixed-dim/80">
                {session.roleName}
              </p>
            </div>
            <button
              onClick={signOut}
              aria-label="Log out"
              title="Log out"
              className="shrink-0 text-inverse-on-surface/50 transition-colors hover:text-secondary-fixed-dim"
            >
              <Icon name="logout" className="text-[19px]" />
            </button>
          </div>
        </div>
      </aside>

      {navOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-on-surface/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex min-h-[76px] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-outline-variant/40 bg-surface/90 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="text-primary lg:hidden"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-[21px] leading-tight text-primary">
                {title}
              </h1>
              {description && (
                <p className="truncate font-body text-label-md text-on-surface-variant">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && pageAllowed && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          {!session.schemaReady && session.isSuper && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-tertiary-container/60 bg-tertiary-fixed/40 px-4 py-3">
              <Icon name="database" className="mt-0.5 text-[20px] text-on-tertiary-fixed-variant" />
              <p className="font-body text-body-md text-on-tertiary-fixed">
                <strong>One-time database update needed.</strong> Run{' '}
                <code className="rounded bg-white/60 px-1">server/supabase/migrations/002_team_roles_approval.sql</code>{' '}
                in the Supabase SQL editor and restart the API. Until then, profile approval, Team &amp;
                Roles and the parent email log are unavailable — everything else works.
              </p>
            </div>
          )}

          {pageAllowed ? (
            children
          ) : (
            <div className="mx-auto mt-10 flex max-w-md flex-col items-center rounded-2xl bg-surface p-10 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container/20">
                <Icon name="lock" className="text-[26px] text-secondary" />
              </span>
              <h2 className="mt-4 font-heading text-[20px] text-primary">No access to this page</h2>
              <p className="mt-2 font-body text-body-md text-on-surface-variant">
                Your role (<strong>{session.roleName}</strong>) doesn&apos;t include this section. Ask the
                super admin if you need it.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
