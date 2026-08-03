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
      <div className="flex min-h-screen items-center justify-center bg-surface-container-low">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface-container-low">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-primary-container text-inverse-on-surface transition-transform lg:static lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[72px] items-center gap-2 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <Icon name="favorite" className="text-[18px] text-on-secondary" filled />
          </span>
          <span className="font-heading text-[20px] text-inverse-on-surface">EverAfter</span>
        </div>

        <nav className="flex flex-col gap-1 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-body-md transition-colors ${
                  active
                    ? 'bg-secondary text-on-secondary'
                    : 'text-inverse-on-surface/75 hover:bg-white/10 hover:text-inverse-on-surface'
                }`}
              >
                <Icon name={item.icon} className="text-[20px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2 rounded-lg px-3 py-2 font-body text-label-md uppercase text-inverse-on-surface/70 transition-colors hover:text-inverse-on-surface"
          >
            <Icon name="open_in_new" className="text-[16px]" />
            View Site
          </Link>
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
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-outline-variant/40 bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Icon name="menu" className="text-primary" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-[20px] leading-tight text-primary">
                {title}
              </h1>
              {description && (
                <p className="truncate font-body text-label-md text-on-surface-variant">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            {actions}
            <span className="hidden font-body text-label-md text-on-surface-variant sm:block">
              {admin.email}
            </span>
            <button
              onClick={signOut}
              className="font-body text-label-lg uppercase text-on-surface-variant transition-colors hover:text-secondary"
            >
              Log Out
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
