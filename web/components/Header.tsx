'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useAuth } from '@/lib/auth';

const PUBLIC_NAV = [
  { label: 'Home', href: '/' },
  { label: 'Browse Profiles', href: '/browse' },
  { label: 'Membership', href: '/membership' },
  { label: 'Success Stories', href: '/success-stories' },
  { label: 'Help', href: '/help' },
];

const MEMBER_NAV = [
  { label: 'Browse Profiles', href: '/browse' },
  { label: 'Matches', href: '/matches' },
  { label: 'Shortlist', href: '/shortlist' },
  { label: 'Membership', href: '/membership' },
  { label: 'Success Stories', href: '/success-stories' },
];

export function Header() {
  const pathname = usePathname();
  const { user, ready, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  // Close menus on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [userDropdownOpen]);

  const navItems = user ? MEMBER_NAV : PUBLIC_NAV;
  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U'
    : '';

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 bg-surface/95 shadow-card backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-[80px] max-w-container items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container shadow-sm">
            <Icon name="favorite" className="text-on-secondary" filled />
          </span>
          <span className="font-heading text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            EverAfter
          </span>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden items-center gap-5 lg:flex xl:gap-8">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`whitespace-nowrap font-body text-label-lg uppercase tracking-wide transition-colors ${
                  active
                    ? 'font-bold text-secondary'
                    : 'text-on-surface-variant hover:text-secondary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Auth State & Profile Actions */}
        <div className="flex shrink-0 items-center gap-3">
          {ready && user ? (
            /* Logged-In User Navigation & Dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((v) => !v)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                aria-label="User account menu"
                className={`flex items-center gap-2.5 rounded-full border p-1 pl-1.5 pr-3 transition-all ${
                  userDropdownOpen
                    ? 'border-secondary bg-secondary-container/15 shadow-sm'
                    : 'border-outline-variant/60 bg-surface-container-low hover:border-secondary hover:bg-surface-container'
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-body text-xs font-bold uppercase text-on-secondary shadow-sm">
                  {userInitials}
                </span>
                <span className="hidden max-w-[120px] truncate font-body text-sm font-semibold text-primary sm:inline-block">
                  {user.first_name || 'My Account'}
                </span>
                <Icon
                  name="expand_more"
                  className={`text-[20px] text-on-surface-variant transition-transform duration-200 ${
                    userDropdownOpen ? 'rotate-180 text-secondary' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu Card */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2.5 w-64 origin-top-right animate-in fade-in zoom-in-95 rounded-2xl border border-outline-variant/40 bg-surface p-2 shadow-float backdrop-blur-2xl"
                >
                  {/* Account Header */}
                  <div className="border-b border-outline-variant/30 px-3.5 py-3">
                    <p className="font-body text-sm font-bold text-primary">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="truncate font-body text-xs text-on-surface-variant">{user.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 font-body text-[11px] font-semibold text-secondary">
                      <Icon name="verified" className="text-[13px]" />
                      <span>{user.role === 'admin' ? 'Administrator' : 'Active Member'}</span>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="flex flex-col gap-0.5 py-2">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:text-secondary"
                    >
                      <Icon name="dashboard" className="text-[18px] text-secondary" />
                      <span>Dashboard & Preferences</span>
                    </Link>
                    <Link
                      href="/onboarding"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:text-secondary"
                    >
                      <Icon name="person" className="text-[18px] text-on-surface-variant" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      href="/matches"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:text-secondary"
                    >
                      <Icon name="favorite" className="text-[18px] text-secondary" filled />
                      <span>Matches</span>
                    </Link>
                    <Link
                      href="/shortlist"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:text-secondary"
                    >
                      <Icon name="bookmark" className="text-[18px] text-on-surface-variant" />
                      <span>Shortlist</span>
                    </Link>
                    <Link
                      href="/interests"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:text-secondary"
                    >
                      <Icon name="volunteer_activism" className="text-[18px] text-on-surface-variant" />
                      <span>Interests Sent</span>
                    </Link>
                    <Link
                      href="/membership"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high hover:text-secondary"
                    >
                      <Icon name="workspace_premium" className="text-[18px] text-on-surface-variant" />
                      <span>Upgrade Membership</span>
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-secondary transition-colors hover:bg-secondary/10"
                      >
                        <Icon name="admin_panel_settings" className="text-[18px]" />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}
                  </div>

                  {/* Sign Out Button */}
                  <div className="border-t border-outline-variant/30 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        signOut();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 font-body text-sm font-medium text-error transition-colors hover:bg-error-container/40"
                    >
                      <Icon name="logout" className="text-[18px]" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : ready && !user ? (
            /* Logged-Out Actions */
            <>
              <Link
                href="/login"
                className="hidden font-body text-label-lg uppercase tracking-wide text-on-surface-variant transition-colors hover:text-secondary sm:inline-block"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-secondary px-5 py-2.5 font-body text-label-md uppercase tracking-wider text-on-secondary shadow-sm transition-all hover:bg-on-secondary-container sm:px-6 sm:py-3 sm:text-label-lg"
              >
                Register
              </Link>
            </>
          ) : (
            /* Loading placeholder */
            <div className="h-9 w-9 animate-pulse rounded-full bg-outline-variant/40" />
          )}

          {/* Hamburger Menu Toggle (Mobile & Tablet) */}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/40 text-primary transition-colors hover:bg-surface-container-high lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[24px]" />
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="max-h-[calc(100vh-80px)] overflow-y-auto border-t border-outline-variant/30 bg-surface px-4 py-5 shadow-float lg:hidden"
        >
          {ready && user && (
            /* Mobile User Summary */
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-container-low p-3.5 border border-outline-variant/30">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary font-body text-sm font-bold uppercase text-on-secondary shadow-sm">
                {userInitials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-bold text-primary">
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate font-body text-xs text-on-surface-variant">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 font-body text-label-lg uppercase tracking-wide transition-colors ${
                    active
                      ? 'bg-secondary/10 font-bold text-secondary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-secondary'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && <Icon name="chevron_right" className="text-[18px] text-secondary" />}
                </Link>
              );
            })}

            {ready && user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 font-body text-label-lg uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary"
                >
                  <Icon name="dashboard" className="text-[18px] text-secondary" />
                  <span>Dashboard & Preferences</span>
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 font-body text-label-lg uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary"
                >
                  <Icon name="person" className="text-[18px]" />
                  <span>My Profile</span>
                </Link>
                <Link
                  href="/interests"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 font-body text-label-lg uppercase tracking-wide text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-secondary"
                >
                  <Icon name="volunteer_activism" className="text-[18px]" />
                  <span>Interests Sent</span>
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 font-body text-label-lg uppercase tracking-wide text-secondary transition-colors hover:bg-secondary/10"
                  >
                    <Icon name="admin_panel_settings" className="text-[18px]" />
                    <span>Admin Dashboard</span>
                  </Link>
                )}
                <div className="mt-2 border-t border-outline-variant/30 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-body text-label-lg uppercase tracking-wide text-error transition-colors hover:bg-error-container/40"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-2 border-t border-outline-variant/30 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-outline-variant/60 py-3 font-body text-label-lg uppercase tracking-wide text-primary transition-colors hover:bg-surface-container-low"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl bg-secondary py-3 font-body text-label-lg uppercase tracking-wide text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
