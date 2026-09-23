import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { ProfileActions } from '@/components/ProfileActions';
import { photoProps, SERVER_API_URL } from '@/lib/api';
import type { Profile } from '@/lib/types';

async function fetchProfile(id: string): Promise<Profile | null> {
  const res = await fetch(`${SERVER_API_URL}/api/profiles/${id}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const profile = await fetchProfile((await params).id);
  if (!profile) return { title: 'Profile not found — EverAfter' };
  return {
    title: `${profile.name}, ${profile.age} — EverAfter`,
    description: `${profile.profession} from ${profile.location}.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await fetchProfile((await params).id);
  if (!profile) notFound();

  const x = profile.details ?? {};
  const join = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(' · ');
  const height = profile.height_cm
    ? `${Math.floor(profile.height_cm / 30.48)}′ ${Math.round((profile.height_cm / 2.54) % 12)}″ (${profile.height_cm} cm)`
    : '';

  // Empty rows are dropped, so a sparse profile doesn't render a wall of dashes.
  const clean = (rows: [string, string | undefined | null][]) =>
    rows.filter((r): r is [string, string] => !!r[1] && String(r[1]).trim() !== '');

  const sections: { title: string; icon: string; rows: [string, string][] }[] = [
    {
      title: 'Personal Details',
      icon: 'person',
      rows: clean([
        ['Age', `${profile.age} years`],
        ['Height', height],
        ['Weight', x.weightKg && `${x.weightKg} kg`],
        ['Complexion', x.complexion],
        ['Marital Status', profile.marital_status],
        ['Diet', profile.diet],
        ['Mother Tongue', profile.mother_tongue],
        ['Location', profile.location],
      ]),
    },
    {
      title: 'Religion & Horoscope',
      icon: 'auto_awesome',
      rows: clean([
        ['Religion', profile.religion],
        ['Community', profile.community],
        ['Gothram', x.gothram],
        ['Manglik', x.manglik],
        ['Rashi', x.rashi],
        ['Nakshatra', x.nakshatra],
        ['Birth Time / Place', join(x.timeOfBirth, x.placeOfBirth)],
      ]),
    },
    {
      title: 'Education & Career',
      icon: 'school',
      rows: clean([
        ['Education', profile.education],
        ['College', x.college],
        ['Profession', profile.profession],
        ['Employer', x.employer],
        ['Annual Income', x.annualIncome],
      ]),
    },
    {
      title: 'Family',
      icon: 'diversity_3',
      rows: clean([
        ['Father', join(x.fatherName, x.fatherOccupation)],
        ['Mother', join(x.motherName, x.motherOccupation)],
        ['Siblings', x.siblings],
        ['Family Type', x.familyType],
        ['Family Status', x.familyStatus],
        ['Family Values', x.familyValues],
      ]),
    },
  ].filter((s) => s.rows.length > 0);

  return (
    <div className="w-full bg-surface py-16">
      <div className="mx-auto max-w-container px-margin-mobile">
        <Link
          href="/browse"
          className="mb-8 inline-flex items-center gap-2 font-body text-label-lg uppercase text-on-surface-variant transition-colors hover:text-secondary"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Back to profiles
        </Link>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[420px_1fr]">
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl shadow-float">
              <Image
                {...photoProps(profile.photo)}
                alt={`Portrait of ${profile.name}`}
                fill
                sizes="(max-width: 1024px) 100vw, 420px"
                priority
                className="object-cover object-top"
              />
              {profile.verified && (
                <div className="absolute left-4 top-4 flex items-center gap-1 rounded bg-surface/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                  <Icon name="verified" className="text-[16px] text-secondary" />
                  <span className="font-body text-label-md uppercase text-primary">Verified</span>
                </div>
              )}
            </div>
            <ProfileActions profileId={profile.id} name={profile.name.split(' ')[0]} />
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-headline-md text-primary lg:text-headline-lg">
                {profile.name}, {profile.age}
              </h1>
              <p className="font-body text-body-lg text-on-surface-variant">{profile.profession}</p>
              <div className="flex flex-wrap items-center gap-6 text-on-surface-variant">
                <span className="flex items-center gap-2">
                  <Icon name="location_on" className="text-[18px]" />
                  <span className="font-body text-label-md">{profile.location}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="school" className="text-[18px]" />
                  <span className="font-body text-label-md">{profile.education}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Icon name="schedule" className="text-[18px]" />
                  <span className="font-body text-label-md">
                    {profile.last_active_days === 0
                      ? 'Active today'
                      : `Active ${profile.last_active_days} days ago`}
                  </span>
                </span>
              </div>
            </div>

            <section className="rounded-xl bg-surface-container-low p-8">
              <h2 className="mb-4 font-heading text-[24px] text-primary">
                About {profile.name.split(' ')[0]}
              </h2>
              <p className="font-body text-body-md text-on-surface-variant">{profile.about}</p>
            </section>

            {sections.map((section) => (
              <section key={section.title} className="rounded-xl bg-surface-container-lowest p-8 shadow-card">
                <h2 className="mb-6 flex items-center gap-2 font-heading text-[24px] text-primary">
                  <Icon name={section.icon} className="text-[22px] text-secondary" />
                  {section.title}
                </h2>
                <dl className="grid grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
                  {section.rows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-4 border-b border-outline-variant/40 pb-3"
                    >
                      <dt className="font-body text-label-md uppercase text-on-surface-variant">
                        {label}
                      </dt>
                      <dd className="text-right font-body text-body-md text-on-surface">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}

            {x.partnerExpectations && (
              <section className="rounded-xl bg-surface-container-low p-8">
                <h2 className="mb-4 font-heading text-[24px] text-primary">Partner Expectations</h2>
                <p className="font-body text-body-md text-on-surface-variant">{x.partnerExpectations}</p>
              </section>
            )}

            <section className="flex items-start gap-4 rounded-xl bg-primary-fixed/60 p-6">
              <Icon name="lock" className="mt-1 text-secondary" />
              <p className="font-body text-body-md text-on-surface-variant">
                Contact details are shared only after both members express interest. Upgrade to a{' '}
                <Link href="/membership" className="font-semibold text-secondary hover:underline">
                  premium membership
                </Link>{' '}
                to message verified members directly.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
