import { cookies } from 'next/headers';
import { Suspense } from 'react';
import { BrowseFilters } from '@/components/BrowseFilters';
import { Pagination } from '@/components/Pagination';
import { ProfileCard } from '@/components/ProfileCard';
import { SortSelect } from '@/components/SortSelect';
import { buildQuery, serverApi, TOKEN_KEY } from '@/lib/api';
import type { Paged, Profile } from '@/lib/types';

export const metadata = {
  title: 'Browse Profiles — EverAfter',
  description:
    'Explore carefully curated profiles of individuals seeking meaningful, life-long connections.',
};

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 6;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : (v ?? '')])
  );

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const page = Math.max(1, Number(flat.page) || 1);
  const query = buildQuery({ ...flat, page, pageSize: PAGE_SIZE });
  const result = await serverApi<Paged<Profile>>(`/api/profiles${query}`, false, { headers });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const makeHref = (target: number) => `/browse${buildQuery({ ...flat, page: target })}`;

  return (
    <div className="w-full bg-surface pb-section-gap-mobile lg:pb-section-gap">
      <section className="w-full bg-primary-fixed/40 py-16">
        <div className="mx-auto max-w-container px-margin-mobile">
          <h1 className="font-heading text-headline-md text-primary lg:text-headline-lg">
            Discover Your Match
          </h1>
          <p className="mt-4 max-w-2xl font-body text-body-lg text-on-surface-variant">
            Explore carefully curated profiles of individuals seeking meaningful, life-long
            connections. Use the filters to refine your search.
          </p>
        </div>
      </section>

      <div className="mx-auto mt-12 grid max-w-container grid-cols-1 gap-gutter px-margin-mobile lg:grid-cols-[300px_1fr] lg:gap-12">
        <aside className="lg:sticky lg:top-[100px] lg:self-start">
          <Suspense fallback={<div className="h-96 rounded-xl bg-surface-container-low" />}>
            <BrowseFilters />
          </Suspense>
        </aside>

        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-heading text-[26px] text-primary">
              {result.total} {result.total === 1 ? 'Profile' : 'Profiles'}
            </h2>
            <Suspense fallback={null}>
              <SortSelect />
            </Suspense>
          </div>

          {result.items.length === 0 ? (
            <p className="rounded-xl bg-surface-container-low p-12 text-center font-body text-body-lg text-on-surface-variant">
              No profiles match these filters yet. Try widening the age range or clearing a filter.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
              {result.items.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </div>
      </div>
    </div>
  );
}
