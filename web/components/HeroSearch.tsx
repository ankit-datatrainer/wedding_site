'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { buildQuery } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const AGE_RANGES = ['21 - 28', '25 - 32', '30 - 38', '18 - 25'];
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Any'];
const COMMUNITIES = ['Any', 'Bengali', 'Brahmin', 'Patel', 'Agarwal', 'Iyer', 'Reddy', 'Sunni'];
const LOCATIONS = ['Any', 'Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Chennai', 'Hyderabad'];

/** The hero search bar from the home screen, wired to /browse. */
export function HeroSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [lookingFor, setLookingFor] = useState(
    user?.gender === 'female' ? 'Groom' : 'Bride'
  );

  useEffect(() => {
    if (user?.gender === 'male') setLookingFor('Bride');
    else if (user?.gender === 'female') setLookingFor('Groom');
  }, [user?.gender]);

  const [ageRange, setAgeRange] = useState(AGE_RANGES[0]);
  const [religion, setReligion] = useState('Hindu');
  const [community, setCommunity] = useState('Any');
  const [location, setLocation] = useState('Any');

  function search(event: React.FormEvent) {
    event.preventDefault();
    const [minAge, maxAge] = ageRange.split('-').map((s) => s.trim());
    router.push(
      `/browse${buildQuery({
        gender: lookingFor === 'Bride' ? 'female' : 'male',
        minAge,
        maxAge,
        religion: religion === 'Any' ? undefined : religion,
        community: community === 'Any' ? undefined : community,
        location: location === 'Any' ? undefined : location,
      })}`
    );
  }

  // Chevron is painted as a background image so the control keeps a native
  // select's behaviour (and mobile picker) without the default arrow.
  const field =
    "min-h-[44px] w-full cursor-pointer appearance-none rounded-lg border border-outline-variant/70 bg-surface-container-low bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23514346'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")] bg-[length:20px_20px] bg-[right_10px_center] bg-no-repeat py-2.5 pl-3 pr-9 font-body text-body-md text-on-surface transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary";

  return (
    <form
      onSubmit={search}
      className="flex flex-col items-stretch gap-4 rounded-2xl bg-surface/95 p-4 shadow-float backdrop-blur-sm sm:p-5 lg:flex-row lg:items-end lg:gap-6 lg:p-6"
    >
      <div className="grid w-full flex-1 grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
        <label className="flex flex-col gap-2">
          <span className="font-body text-label-lg text-primary">Looking For</span>
          <select className={field} value={lookingFor} onChange={(e) => setLookingFor(e.target.value)}>
            <option>Bride</option>
            <option>Groom</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-body text-label-lg text-primary">Age Range</span>
          <select className={field} value={ageRange} onChange={(e) => setAgeRange(e.target.value)}>
            {AGE_RANGES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-body text-label-lg text-primary">Religion</span>
          <select className={field} value={religion} onChange={(e) => setReligion(e.target.value)}>
            {RELIGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-body text-label-lg text-primary">Community</span>
          <select className={field} value={community} onChange={(e) => setCommunity(e.target.value)}>
            {COMMUNITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-body text-label-lg text-primary">Location</span>
          <select className={field} value={location} onChange={(e) => setLocation(e.target.value)}>
            {LOCATIONS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="flex min-h-[48px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-secondary px-10 font-body text-label-lg uppercase text-on-secondary shadow-md transition-all hover:bg-on-secondary-container lg:w-auto"
      >
        <Icon name="search" className="text-[20px]" />
        Search
      </button>
    </form>
  );
}
