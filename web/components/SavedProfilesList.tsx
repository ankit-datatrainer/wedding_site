'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProfileCard } from '@/components/ProfileCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

/** Shared shell for /shortlist and /interests — same shape, different endpoint. */
export function SavedProfilesList({
  endpoint,
  redirectTo,
  title,
  description,
  emptyMessage,
}: {
  endpoint: string;
  redirectTo: string;
  title: string;
  description: string;
  emptyMessage: string;
}) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Profile[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/login?next=${redirectTo}`);
      return;
    }
    setItems(null);
    setError('');
    api<{ items: Profile[] }>(endpoint, { auth: true })
      .then((res) => setItems(res.items))
      .catch((err: Error) => setError(err.message));
  }, [ready, user, router, endpoint, redirectTo]);

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16">
      <h1 className="font-heading text-headline-md text-primary lg:text-headline-lg">{title}</h1>
      <p className="mt-4 font-body text-body-md text-on-surface-variant">{description}</p>

      <div className="mt-6 flex gap-2 border-b border-outline-variant/40">
        {[
          { href: '/shortlist', label: 'Shortlisted' },
          { href: '/interests', label: 'Interested' },
        ].map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-4 py-3 font-body text-label-lg uppercase transition-colors ${
              redirectTo === tab.href
                ? 'border-secondary text-secondary'
                : 'border-transparent text-on-surface-variant hover:text-secondary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-8 font-body text-body-md text-error">
          {error}
        </p>
      )}

      {items === null && !error && (
        <div className="mt-12 grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[420px] animate-pulse rounded-xl bg-surface-container-low" />
          ))}
        </div>
      )}

      {items?.length === 0 && (
        <div className="mt-12 rounded-xl bg-surface-container-low p-12 text-center">
          <p className="font-body text-body-lg text-on-surface-variant">{emptyMessage}</p>
          <Link
            href="/matches"
            className="mt-6 inline-block rounded-lg bg-secondary px-8 py-3 font-body text-label-lg uppercase text-on-secondary transition-colors hover:bg-secondary-container"
          >
            See Your Matches
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="mt-12 grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          {items.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
