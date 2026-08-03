'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useAdminAuth } from '@/lib/adminAuth';

const NAV = [
  { href: '/admin/dashboard', label: 'Overview', icon: 'dashboard' },
  { href: '/admin/members', label: 'Members', icon: 'group' },
  { href: '/admin/profiles', label: 'Profiles', icon: 'badge' },
  { href: '/admin/payments', label: 'Payments', icon: 'payments' },
  { href: '/admin/newsletter', label: 'Newsletter', icon: 'mail' },
];

const initialsOf = (email: string) => email.slice(0, 2).toUpperCase();

/**
 * Chrome shared by every admin screen: sidebar nav, header, and the auth
 * guard that bounces unauthenticated visitors to /admin/login.
 */
export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { admin, ready, signOut } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (ready && !admin) router.replace('/admin/login');
  }, [ready, admin, router]);

  if (!ready || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a0410]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary-fixed-dim border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-container-low">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col transition-transform lg:static lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(180deg, #2D0312 0%, #1a0410 65%, #10030b 100%)',
        }}
      >
        <div className="flex h-[76px] items-center justify-between px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary shadow-[0_0_0_4px_rgba(232,82,131,0.15)]">
              <Icon name="favorite" className="text-[16px] text-on-secondary" filled />
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-heading text-[18px] text-inverse-on-surface">EverAfter</span>
              <span className="mt-0.5 font-body text-[10px] uppercase tracking-wider text-inverse-on-surface/45">
                Admin Console
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

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
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
              <p className="font-body text-[11px] uppercase tracking-wide text-inverse-on-surface/45">
                Super Admin
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
        <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-outline-variant/40 bg-surface/90 px-4 backdrop-blur-md sm:px-6">
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

          {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
