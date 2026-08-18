import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { HeroSearch } from '@/components/HeroSearch';
import { ProfileCard } from '@/components/ProfileCard';
import { serverApi, TOKEN_KEY } from '@/lib/api';
import type { Media, Paged, Profile } from '@/lib/types';

const HERO_STATS = [
  { icon: 'group', value: '5 Millions+', label: 'Members' },
  { icon: 'verified', value: '100%', label: 'Verified Profile' },
  { icon: 'shield', value: 'Privacy', label: 'Protected' },
];

const REASONS = [
  {
    icon: 'verified_user',
    title: 'Verified',
    body: 'Every profile passes a documented identity and background check before it appears in search, so the person you meet is the person you saw.',
  },
  {
    icon: 'workspace_premium',
    title: 'Trusted',
    body: 'Thirteen years of matchmaking, more than five million members, and relationship advisors who stay with you from first message to wedding day.',
  },
  {
    icon: 'lock',
    title: 'Privacy First',
    body: 'You decide who sees your photographs and contact details. Nothing is public, nothing is sold, and you can withdraw access at any moment.',
  },
];

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_KEY)?.value;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const [{ photos }, recent] = await Promise.all([
    serverApi<Media>('/api/media', 3600),
    serverApi<Paged<Profile>>('/api/profiles?pageSize=4&sort=newest', token ? false : 60, { headers }),
  ]);

  return (
    <div className="flex w-full flex-col">
      {/*
        Hero. Everything sits in normal flow inside a min-height section rather
        than a fixed height with an absolutely positioned search bar — that
        older arrangement clipped the stats row once the content grew taller
        than the box, which happened on every phone.
      */}
      <section className="relative -mt-[80px] flex min-h-[680px] w-full flex-col justify-center overflow-hidden lg:min-h-[100svh]">
        <Image
          src="/hero_bg.png"
          alt="An Indian couple in traditional wedding attire smiling at each other"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] lg:object-center"
        />

        {/*
          Scrim: vertical on small screens so the copy stays legible over the
          middle of the photograph, horizontal on large ones so the couple on
          the right stays visible behind a clear left column.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-surface via-surface/75 to-surface/95 lg:bg-gradient-to-r lg:from-surface lg:via-surface/70 lg:to-transparent"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-container flex-col gap-10 px-margin-mobile pb-14 pt-[120px] sm:pt-[140px] lg:gap-14 lg:pb-20 lg:pt-[180px]">
          <div className="flex max-w-2xl flex-col gap-5 rounded-2xl border border-white/60 bg-surface/80 p-6 shadow-float backdrop-blur-md sm:gap-6 sm:rounded-3xl sm:p-8 lg:p-12">
            <h1 className="text-balance font-heading text-[32px] leading-[1.15] text-primary sm:text-display-lg-mobile lg:text-display-lg">
              Find Your Forever <br className="hidden sm:inline" />
              With Someone Who, <br className="hidden sm:inline" />
              <span className="text-secondary">Truly Understands You</span>
            </h1>

            <p className="max-w-lg font-body text-body-md text-on-surface-variant sm:text-body-lg">
              Thoughtful matchmaking for people who are serious about marriage — verified profiles,
              real conversations, and families brought along for the journey.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="rounded-lg bg-secondary px-8 py-3.5 text-center font-body text-label-lg uppercase text-on-secondary shadow-md transition-all hover:bg-on-secondary-container"
              >
                Create Free Profile
              </Link>
              <Link
                href="/browse"
                className="rounded-lg border-[1.5px] border-secondary px-8 py-3.5 text-center font-body text-label-lg uppercase text-secondary transition-all hover:bg-secondary hover:text-on-secondary"
              >
                Browse Profiles
              </Link>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3 border-t border-outline-variant/40 pt-6 sm:gap-6 lg:flex lg:items-center lg:gap-8">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 text-center lg:flex-row lg:gap-3 lg:text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container/20 lg:h-12 lg:w-12">
                    <Icon name={stat.icon} className="text-[20px] text-secondary lg:text-[24px]" />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-body text-label-lg text-secondary">{stat.value}</span>
                    <span className="font-body text-label-md text-on-surface-variant">
                      {stat.label}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[1000px]">
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="w-full bg-surface py-section-gap-mobile lg:py-section-gap">
        <div className="mx-auto grid max-w-container grid-cols-1 items-center gap-16 px-margin-mobile lg:grid-cols-2">
          <div className="relative flex aspect-square w-full items-center justify-center lg:h-[600px] lg:aspect-auto">
            <div className="absolute left-0 top-0 h-3/4 w-3/4 overflow-hidden rounded-xl opacity-60 shadow-lg">
              <Image
                src={photos.aboutBack}
                alt="A traditional Indian wedding ceremony in warm gold tones"
                fill
                sizes="(max-width: 1024px) 75vw, 450px"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 z-10 h-3/4 w-3/4 overflow-hidden rounded-xl shadow-2xl">
              <Image
                src={photos.aboutFront}
                alt="A newlywed couple in red and cream attire during their wedding ceremony"
                fill
                sizes="(max-width: 1024px) 75vw, 450px"
                className="object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="text-balance font-heading text-headline-md text-primary lg:text-headline-lg">
              We Believe In
              <br />
              Relationships That Last
            </h2>
            <div className="flex flex-col gap-4 font-body text-body-md text-on-surface-variant">
              <p>
                EverAfter began in 2012 with a simple conviction: a marriage is a meeting of two
                families, not two profiles. Every part of the experience — the questions we ask, the
                matches we surface, the advisors we assign — is built around that belief.
              </p>
              <p>
                We verify every member, we keep your details private until you choose otherwise, and
                we never rank profiles by who paid the most. What you see is a genuine, considered
                shortlist of people whose values line up with yours.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/register"
                className="inline-block rounded-lg bg-secondary px-8 py-3 font-body text-label-lg text-on-secondary shadow-md transition-all hover:bg-secondary-container"
              >
                Make Your Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent profiles */}
      <section className="w-full bg-surface-container-low py-section-gap-mobile lg:py-section-gap">
        <div className="mx-auto flex max-w-container flex-col gap-12 px-margin-mobile">
          <div className="text-center">
            <h2 className="font-heading text-headline-md text-primary lg:text-headline-lg">
              Recently Joined Profiles
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {recent.items.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
          <div className="text-center">
            <Link
              href="/browse"
              className="inline-block rounded-lg border-[1.5px] border-secondary px-8 py-3 font-body text-label-lg uppercase text-secondary transition-all hover:bg-secondary hover:text-on-secondary"
            >
              Browse All Profiles
            </Link>
          </div>
        </div>
      </section>

      {/* Why choose us */}
      <section className="relative w-full overflow-hidden bg-primary-fixed py-section-gap-mobile lg:py-section-gap">
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-10 mix-blend-multiply"
          style={{ backgroundImage: `url('${photos.floral}')` }}
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex max-w-container flex-col gap-12 px-margin-mobile">
          <div className="text-center">
            <h2 className="font-heading text-headline-md text-primary lg:text-headline-lg">
              Why Choose Us
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
            {REASONS.map((reason) => (
              <div
                key={reason.title}
                className="flex flex-col items-start gap-4 rounded-xl bg-surface p-8 shadow-md"
              >
                <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-container/20">
                  <Icon name={reason.icon} className="text-[24px] text-secondary" />
                </span>
                <h3 className="font-heading text-[24px] text-primary">{reason.title}</h3>
                <p className="font-body text-sm text-on-surface-variant">{reason.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
