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
      <section className="relative -mt-[80px] flex min-h-[720px] w-full flex-col justify-center overflow-hidden lg:min-h-[100svh]">
        <Image
          src="/hero_bg.jpg"
          alt="Royal Indian wedding bride and groom in luxury traditional wedding attire"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center] lg:object-center brightness-[1.02]"
        />

        {/*
          Luxury Scrim: gentle royal warm gradient allowing the wedding couple and golden lighting
          to remain brilliant and sharp while keeping text exceptionally readable.
        */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-surface/90 via-surface/60 to-surface/95 lg:bg-gradient-to-r lg:from-surface/95 lg:via-surface/75 lg:via-45% lg:to-transparent"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-container flex-col gap-10 px-margin-mobile pb-14 pt-[130px] sm:pt-[150px] lg:gap-14 lg:pb-20 lg:pt-[175px]">
          <div className="flex max-w-2xl flex-col gap-6 rounded-3xl border border-white/80 bg-surface/85 p-6 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 sm:p-9 lg:p-12">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="font-body text-xs font-bold uppercase tracking-wider text-secondary">
                India&apos;s Most Trusted Matrimonial Network
              </span>
            </div>

            <h1 className="text-balance font-heading text-[32px] leading-[1.14] text-primary sm:text-display-lg-mobile lg:text-[50px] lg:leading-[1.12]">
              Find Your Forever <br className="hidden sm:inline" />
              With Someone Who <br className="hidden sm:inline" />
              <span className="text-secondary">Truly Understands You</span>
            </h1>

            <p className="max-w-lg font-body text-body-md text-on-surface-variant sm:text-body-lg">
              Thoughtful matchmaking for cultured families and individuals serious about marriage — verified profiles,
              meaningful conversations, and families brought along for the journey.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-8 py-4 text-center font-body text-label-lg font-bold uppercase tracking-wider text-on-secondary shadow-md transition-all hover:bg-on-secondary-container hover:shadow-lg"
              >
                <span>Create Free Profile</span>
                <Icon name="arrow_forward" className="text-[18px] transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-secondary/70 bg-surface/60 px-8 py-4 text-center font-body text-label-lg font-bold uppercase tracking-wider text-secondary backdrop-blur-sm transition-all hover:bg-secondary hover:text-on-secondary"
              >
                <Icon name="search" className="text-[18px]" />
                <span>Browse Verified Profiles</span>
              </Link>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3 border-t border-outline-variant/30 pt-6 sm:gap-6 lg:flex lg:items-center lg:gap-8">
              {HERO_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-2 text-center lg:flex-row lg:gap-3.5 lg:text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-container/25 text-secondary shadow-sm ring-1 ring-secondary/20 lg:h-12 lg:w-12">
                    <Icon name={stat.icon} className="text-[22px] text-secondary" filled />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-heading text-lg font-bold text-primary">{stat.value}</span>
                    <span className="font-body text-xs font-medium text-on-surface-variant">
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
            <div className="absolute left-0 top-0 h-3/4 w-3/4 overflow-hidden rounded-2xl border-2 border-white/80 opacity-90 shadow-xl transition-all hover:opacity-100">
              <Image
                src="/about_mandap.jpg"
                alt="A traditional Indian royal wedding mandap with marigold decor and sacred fire"
                fill
                sizes="(max-width: 1024px) 75vw, 450px"
                className="object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 z-10 h-3/4 w-3/4 overflow-hidden rounded-2xl border-4 border-white shadow-2xl ring-1 ring-black/10">
              <Image
                src="/about_couple.jpg"
                alt="A newlywed Indian couple in royal wedding attire smiling happily together"
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
