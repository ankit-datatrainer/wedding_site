'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from './Icon';
import { api } from '@/lib/api';

const QUICK_LINKS = [
  { label: 'About Us', href: '/help#about' },
  { label: 'Safety Tips', href: '/help#safety' },
  { label: 'Contact Support', href: '/help#contact' },
  { label: 'Terms of Service', href: '/help#terms' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  });
  const [pending, setPending] = useState(false);

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await api<{ message: string }>('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus({ kind: 'ok', message: res.message });
      setEmail('');
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    } finally {
      setPending(false);
    }
  }

  return (
    <footer className="w-full border-t border-outline-variant/30 bg-surface-container-low pb-8 pt-section-gap-mobile">
      <div className="mx-auto max-w-container px-margin-mobile">
        <div className="mb-section-gap-mobile grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container">
                <Icon name="favorite" className="text-sm text-on-secondary" filled />
              </span>
              <span className="font-heading text-2xl text-primary">EverAfter</span>
            </div>
            <p className="font-body text-body-md text-on-surface-variant">
              Connecting souls through tradition and modern elegance since 2012.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-body text-label-lg uppercase text-primary">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-on-surface-variant transition-colors hover:text-secondary"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-body text-label-lg uppercase text-primary">Support</h4>
            <div className="flex flex-col gap-2">
              <a
                className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-secondary"
                href="mailto:support@everafter.com"
              >
                <Icon name="mail" className="text-[18px]" />
                <span>support@everafter.com</span>
              </a>
              <a
                className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-secondary"
                href="tel:1800432788"
              >
                <Icon name="phone" className="text-[18px]" />
                <span>1-800-HEART-88</span>
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-body text-label-lg uppercase text-primary">Newsletter</h4>
            <form className="flex flex-col gap-4" onSubmit={subscribe}>
              <label className="sr-only" htmlFor="newsletter-email">
                Your email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="w-full rounded-lg border border-outline-variant bg-surface p-3 transition-all focus:border-secondary focus:outline-none"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-primary py-3 font-body text-label-lg uppercase tracking-widest text-on-primary transition-all hover:bg-on-primary-container disabled:opacity-60"
              >
                {pending ? 'Subscribing…' : 'Subscribe'}
              </button>
              {status.kind !== 'idle' && (
                <p
                  role="status"
                  className={`font-body text-label-md ${
                    status.kind === 'ok' ? 'text-secondary' : 'text-error'
                  }`}
                >
                  {status.message}
                </p>
              )}
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/30 pt-8 md:flex-row">
          <span className="font-body text-label-md text-on-surface-variant">
            © {new Date().getFullYear()} EverAfter Matrimonials. All rights reserved.
          </span>
          <div className="flex gap-6 text-on-surface-variant">
            <Icon name="share" className="cursor-pointer hover:text-secondary" />
            <Icon name="public" className="cursor-pointer hover:text-secondary" />
            <Icon name="shield" className="cursor-pointer hover:text-secondary" />
          </div>
        </div>
      </div>
    </footer>
  );
}
