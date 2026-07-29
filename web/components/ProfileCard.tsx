'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from './Icon';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

export function ProfileCard({ profile }: { profile: Profile }) {
  const { user } = useAuth();
  const router = useRouter();
  const [shortlisted, setShortlisted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      router.push('/login?next=/browse');
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ active: boolean }>(`/api/profiles/${profile.id}/shortlist`, {
        method: 'POST',
        auth: true,
      });
      setShortlisted(res.active);
    } catch {
      /* leave the previous state in place */
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-xl bg-surface shadow-card transition-transform duration-300 hover:-translate-y-1">
      <div className="relative h-[240px] w-full">
        <Image
          src={profile.photo}
          alt={`Portrait of ${profile.name}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover"
        />
        {profile.verified && (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded bg-surface/90 px-2 py-1 shadow-sm backdrop-blur-sm">
            <Icon name="verified" className="text-[14px] text-secondary" />
            <span className="font-body text-[10px] uppercase text-primary">Verified</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-body text-body-lg font-bold text-primary">
          {profile.name}, {profile.age}
        </h3>
        <p className="font-body text-label-md text-on-surface-variant">{profile.profession}</p>

        <div className="mt-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon name="location_on" className="text-[16px]" />
            <span className="font-body text-label-md">{profile.location}</span>
          </div>
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon name="school" className="text-[16px]" />
            <span className="font-body text-label-md">{profile.education}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Link
            href={`/profile/${profile.id}`}
            className="flex-1 rounded bg-secondary py-2 text-center font-body text-label-md text-on-secondary transition-colors hover:bg-secondary-container"
          >
            View Profile
          </Link>
          <button
            onClick={toggle}
            disabled={busy}
            aria-pressed={shortlisted}
            aria-label={shortlisted ? `Remove ${profile.name} from shortlist` : `Shortlist ${profile.name}`}
            className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
              shortlisted
                ? 'border-secondary bg-secondary text-on-secondary'
                : 'border-outline-variant text-primary hover:border-secondary hover:text-secondary'
            }`}
          >
            <Icon name="favorite" className="text-[18px]" filled={shortlisted} />
          </button>
        </div>
      </div>
    </article>
  );
}
