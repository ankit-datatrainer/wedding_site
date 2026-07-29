'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'active', label: 'Recently Active' },
];

export function SortSelect() {
  const router = useRouter();
  const params = useSearchParams();

  function change(value: string) {
    const next = new URLSearchParams(params.toString());
    next.set('sort', value);
    next.delete('page');
    router.push(`/browse?${next.toString()}`);
  }

  return (
    <label className="flex items-center gap-2">
      <span className="font-body text-label-md text-on-surface-variant">Sort by:</span>
      <select
        value={params.get('sort') ?? 'newest'}
        onChange={(e) => change(e.target.value)}
        className="cursor-pointer appearance-none rounded-lg border border-outline-variant bg-surface px-3 py-2 font-body text-label-md text-primary focus:border-secondary focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
