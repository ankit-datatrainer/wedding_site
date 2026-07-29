'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icon';
import { useAuth } from '@/lib/auth';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Membership', href: '/membership' },
  { label: 'Browse Profiles', href: '/browse' },
  { label: 'Success Stories', href: '/success-stories' },
  { label: 'Help', href: '/help' },
];

export function Header() {
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="fixed top-0 z-50 w-full bg-surface/90 shadow-card backdrop-blur-xl">
      <div className="mx-auto flex h-[80px] max-w-container items-center justify-between px-margin-mobile">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container">
            <Icon name="favorite" className="text-on-secondary" filled />
          </span>
          <span className="font-heading text-headline-md tracking-tight text-primary">EverAfter</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`font-body text-label-lg uppercase transition-colors ${
                isActive(item.href)
                  ? 'font-bold text-secondary'
                  : 'text-on-surface-variant hover:text-secondary'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {ready && user ? (
            <>
              <Link
                href="/shortlist"
                className="hidden font-body text-label-lg uppercase text-on-surface-variant transition-colors hover:text-secondary sm:block"
              >
                Shortlist
              </Link>
              <button
                onClick={signOut}
                className="hidden font-body text-label-lg uppercase text-on-surface-variant transition-colors hover:text-secondary sm:block"
              >
                Log Out
              </button>
              <span
                title={`${user.first_name} ${user.last_name}`}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary font-body text-label-md uppercase text-on-primary"
              >
                {user.first_name?.[0]}
                {user.last_name?.[0]}
              </span>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden font-body text-label-lg uppercase text-on-surface-variant transition-colors hover:text-secondary sm:block"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-secondary-container px-8 py-3 font-body text-label-lg uppercase text-on-secondary shadow-md transition-all hover:bg-secondary"
              >
                Register
              </Link>
            </>
          )}

          <button
            className="lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} className="text-primary" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-outline-variant/30 bg-surface px-margin-mobile py-4 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`rounded-lg px-3 py-3 font-body text-label-lg uppercase ${
                isActive(item.href) ? 'bg-primary-fixed text-secondary' : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
