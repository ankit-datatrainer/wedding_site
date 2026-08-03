'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ProfileCard } from '@/components/ProfileCard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Paged, Profile } from '@/lib/types';

const PAGE_SIZE = 12;

/**
 * The algorithmic feed: opposite-gender candidates ranked by
 * server/src/store.js#scoreMatch against the viewer's own onboarding
 * profile. No filters to set — that's the point.
 */
export default function MatchesPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paged<Profile> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await api<Paged<Profile>>(
        `/api/matches?page=${targetPage}&pageSize=${PAGE_SIZE}`,
        { auth: true }
      );
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login?next=/matches');
      return;
    }
    load(page);
  }, [ready, user, page, load]);

  const oppositeLabel = user?.gender === 'male' ? 'women' : 'men';

  return (
    <div className="mx-auto max-w-container px-margin-mobile py-16">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-container/20">
          <Icon name="favorite" className="text-secondary" filled />
        </span>
        <h1 className="font-heading text-headline-md text-primary lg:text-headline-lg">
          Matches For You
        </h1>
      </div>
      <p className="max-w-2xl font-body text-body-md text-on-surface-variant">
        Ranked automatically against the profile you filled in at{' '}
        <Link href="/onboarding" className="text-secondary hover:underline">
          My Profile
        </Link>{' '}
        — religion, community, location, diet and age all count. The more you complete there, the
        better these get. No filters to set: every {oppositeLabel}&rsquo;s profile in our directory,
        best fit first.
      </p>

      {error && (
        <p role="alert" className="mt-8 font-body text-body-md text-error">
          {error}
        </p>
      )}

      {loading && !result && (
        <div className="mt-12 grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[420px] animate-pulse rounded-xl bg-surface-container-low" />
          ))}
        </div>
      )}

      {result && result.items.length === 0 && (
        <div className="mt-12 rounded-xl bg-surface-container-low p-12 text-center">
          <p className="font-body text-body-lg text-on-surface-variant">
            No {oppositeLabel} in the directory yet — check back soon.
          </p>
        </div>
      )}

      {result && result.items.length > 0 && (
        <>
          <p className="mt-8 font-body text-label-md text-on-surface-variant">
            {result.total} match{result.total === 1 ? '' : 'es'}
          </p>
          <div className="mt-6 grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
          {result.total > PAGE_SIZE && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-primary transition-colors hover:border-secondary hover:text-secondary disabled:opacity-40"
              >
                <Icon name="chevron_left" />
              </button>
              <span className="font-body text-label-md text-on-surface-variant">
                Page {page} of {Math.max(1, Math.ceil(result.total / PAGE_SIZE))}
              </span>
              <button
                disabled={page >= Math.ceil(result.total / PAGE_SIZE) || loading}
                onClick={() => setPage((p) => p + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant text-primary transition-colors hover:border-secondary hover:text-secondary disabled:opacity-40"
              >
                <Icon name="chevron_right" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
