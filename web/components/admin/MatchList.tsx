'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';
import { mediaUrl } from '@/lib/api';
import type { MatchCandidate } from '@/lib/types';
import { Modal } from './ui';

function scoreTone(score: number) {
  if (score >= 60) return { bar: 'bg-[#1b6b3a]', text: 'text-[#1b6b3a]', label: 'Strong match' };
  if (score >= 35) return { bar: 'bg-secondary', text: 'text-secondary', label: 'Good match' };
  return { bar: 'bg-outline', text: 'text-on-surface-variant', label: 'Possible match' };
}

/**
 * Numbered, ranked list of matching profiles — "1, 2, 3…" — with the score
 * and the exact reasons behind it, so whoever calls the family can explain
 * why each suggestion was made.
 */
export function MatchList({
  items,
  compact = false,
  emptyMessage = 'No matching profiles yet. Matches appear as more opposite-gender profiles are approved or members register.',
}: {
  items: MatchCandidate[];
  compact?: boolean;
  emptyMessage?: string;
}) {
  if (!items.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-4 py-5 font-body text-body-md text-on-surface-variant">
        <Icon name="search_off" className="text-[22px]" />
        {emptyMessage}
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {items.map((m) => {
        const tone = scoreTone(m.score);
        const reasons = compact ? m.reasons.slice(0, 3) : m.reasons;
        return (
          <li
            key={`${m.kind}-${m.id}`}
            className="rounded-xl border border-outline-variant/40 bg-surface p-4 transition-shadow hover:shadow-card"
          >
            <div className="flex items-start gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container font-heading text-[15px] text-inverse-on-surface"
                aria-label={`Match number ${m.rank}`}
              >
                {m.rank}
              </span>

              {m.photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- profile photos come from several origins
                <img src={mediaUrl(m.photo)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low">
                  <Icon name="person" className="text-[24px] text-on-surface-variant" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-body text-body-md font-semibold text-on-surface">{m.name}</p>
                  {m.verified && <Icon name="verified" className="text-[17px] text-secondary" filled />}
                  <span
                    className={`rounded-full px-2 py-0.5 font-body text-[11px] uppercase tracking-wide ${
                      m.kind === 'member' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {m.kind === 'member' ? 'Registered member' : 'Directory profile'}
                  </span>
                </div>
                <p className="mt-0.5 font-body text-label-md text-on-surface-variant">
                  {[m.age ? `${m.age} yrs` : null, m.religion, m.community, m.location, m.profession]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
                {m.email && <p className="font-body text-label-md text-on-surface-variant">{m.email}</p>}
              </div>

              <div className="flex w-24 shrink-0 flex-col items-end">
                <span className={`font-heading text-[22px] leading-none ${tone.text}`}>{m.score}%</span>
                <span className="mt-1 text-right font-body text-[10px] uppercase tracking-wide text-on-surface-variant">
                  {tone.label}
                </span>
                <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${m.score}%` }} />
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5 sm:pl-[108px]">
              {reasons.map((r) => (
                <span
                  key={r.label}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed/60 px-2 py-0.5 font-body text-[11px] text-on-secondary-fixed-variant"
                >
                  <Icon name="check" className="text-[12px]" />
                  {r.label}
                  <span className="opacity-60">+{r.points}</span>
                </span>
              ))}
              {compact && m.reasons.length > reasons.length && (
                <span className="px-1 font-body text-[11px] text-on-surface-variant">
                  +{m.reasons.length - reasons.length} more
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Dialog that loads and shows the ranked matches for a saved profile. */
export function MatchesDialog({
  profileId,
  profileName,
  onClose,
}: {
  profileId: string;
  profileName: string;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MatchCandidate[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi<{ items: MatchCandidate[] }>(`/api/admin/profiles/${profileId}/matches?limit=10`)
      .then((r) => setItems(r.items))
      .catch((err: Error) => setError(err.message));
  }, [profileId]);

  return (
    <Modal title={`Matches for ${profileName}`} subtitle="Best matches first, ranked by compatibility score" onClose={onClose} wide>
      {error && <p className="font-body text-label-md text-error">{error}</p>}
      {!items && !error && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-container-low" />
          ))}
        </div>
      )}
      {items && <MatchList items={items} />}
    </Modal>
  );
}
