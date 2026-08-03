'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

export function ProfileActions({ profileId, name }: { profileId: string; name: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [shortlisted, setShortlisted] = useState(false);
  const [interested, setInterested] = useState(false);
  const [message, setMessage] = useState('');

  // The page around this component is server-rendered without the viewer's
  // token (it lives in browser localStorage, unreachable during SSR), so the
  // initial fetch there can never know if *this* viewer already acted on
  // this profile. Re-fetch client-side, once, to pick up the real state.
  useEffect(() => {
    if (!user) return;
    api<Profile>(`/api/profiles/${profileId}`, { auth: true })
      .then((profile) => {
        setShortlisted(profile.is_shortlisted ?? false);
        setInterested(profile.is_interested ?? false);
      })
      .catch(() => {
        /* keep defaults; the action buttons still work either way */
      });
  }, [user, profileId]);

  async function act(kind: 'shortlist' | 'interest') {
    if (!user) {
      router.push(`/login?next=/profile/${profileId}`);
      return;
    }
    try {
      const res = await api<{ active: boolean }>(`/api/profiles/${profileId}/${kind}`, {
        method: 'POST',
        auth: true,
      });
      if (kind === 'shortlist') {
        setShortlisted(res.active);
        setMessage(res.active ? `${name} added to your shortlist.` : 'Removed from your shortlist.');
      } else {
        setInterested(res.active);
        setMessage(res.active ? `Interest sent to ${name}.` : 'Interest withdrawn.');
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => act('interest')}
          className={`flex-1 rounded-lg px-6 py-3 font-body text-label-lg uppercase shadow-md transition-colors ${
            interested
              ? 'bg-on-secondary-container text-on-secondary'
              : 'bg-secondary text-on-secondary hover:bg-secondary-container'
          }`}
        >
          {interested ? 'Interest Sent' : 'Express Interest'}
        </button>
        <button
          onClick={() => act('shortlist')}
          aria-pressed={shortlisted}
          className={`flex items-center justify-center gap-2 rounded-lg border-[1.5px] px-6 py-3 font-body text-label-lg uppercase transition-colors ${
            shortlisted
              ? 'border-secondary bg-secondary text-on-secondary'
              : 'border-secondary text-secondary hover:bg-secondary hover:text-on-secondary'
          }`}
        >
          <Icon name="favorite" className="text-[18px]" filled={shortlisted} />
          {shortlisted ? 'Shortlisted' : 'Shortlist'}
        </button>
      </div>
      {message && (
        <p role="status" className="font-body text-label-md text-secondary">
          {message}
        </p>
      )}
    </div>
  );
}
