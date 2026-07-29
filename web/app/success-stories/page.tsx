import Image from 'next/image';
import { Icon } from '@/components/Icon';
import { StoryCarousel } from '@/components/StoryCarousel';
import { serverApi } from '@/lib/api';
import type { Story, StoryMedia } from '@/lib/types';

export const metadata = {
  title: 'Success Stories — EverAfter',
  description: 'Read the inspiring journeys of couples who found their forever on EverAfter.',
};

export default async function SuccessStoriesPage() {
  const { items, media } = await serverApi<{ items: Story[]; media: StoryMedia }>(
    '/api/stories',
    300
  );

  return (
    <div className="w-full bg-surface">
      <section className="w-full bg-primary-fixed/40 py-20">
        <div className="mx-auto max-w-container px-margin-mobile text-center">
          <h1 className="mx-auto max-w-3xl text-balance font-heading text-display-lg-mobile text-primary lg:text-display-lg">
            Every Match Has A Beautiful Story
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-body text-body-lg text-on-surface-variant">
            Read the inspiring journeys of couples who found their forever on EverAfter.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-container px-margin-mobile py-section-gap-mobile lg:py-section-gap">
        <StoryCarousel stories={items} />
      </section>

      <section className="w-full bg-surface-container-low py-section-gap-mobile lg:py-section-gap">
        <div className="mx-auto max-w-container px-margin-mobile">
          <div className="mb-10 text-center">
            <h2 className="font-heading text-headline-md text-primary lg:text-headline-lg">
              Witness the Magic
            </h2>
            <p className="mt-4 font-body text-body-md text-on-surface-variant">
              Watch heartwarming moments from our community.
            </p>
          </div>

          <div className="relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl shadow-float">
            <Image
              src={media.video}
              alt="A couple sharing a moment at their wedding"
              fill
              sizes="(max-width: 1024px) 100vw, 900px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-on-surface/25" />
            <button
              aria-label="Play the community film"
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow-float transition-transform hover:scale-105"
            >
              <Icon name="play_arrow" className="text-[36px] text-secondary" filled />
            </button>
          </div>
        </div>
      </section>

      <section className="w-full py-section-gap-mobile lg:py-section-gap">
        <div className="mx-auto grid max-w-container grid-cols-1 items-center gap-16 px-margin-mobile lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h2 className="text-balance font-heading text-headline-md text-primary lg:text-headline-lg">
              Take Your Matches
              <br />
              On The Go
            </h2>
            <p className="font-body text-body-md text-on-surface-variant">
              Stay connected with your potential life partner anytime, anywhere. Our beautifully
              designed mobile app offers a seamless and secure experience.
            </p>
            <p className="font-body text-body-md text-on-surface-variant">
              Receive real-time notifications, browse curated profiles, and chat securely with
              verified members — all from the palm of your hand.
            </p>

            <div className="mt-4 flex flex-wrap gap-4">
              <span className="flex cursor-pointer items-center gap-3 rounded-lg bg-primary px-6 py-3 text-on-primary transition-opacity hover:opacity-90">
                <Icon name="file_download" />
                <span className="font-body text-label-lg">Download on App Store</span>
              </span>
              <span className="flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-primary px-6 py-3 text-primary transition-colors hover:bg-primary hover:text-on-primary">
                <Icon name="android" />
                <span className="font-body text-label-lg">Get it on Google Play</span>
              </span>
            </div>
          </div>

          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-float">
            <Image
              src={media.app}
              alt="The EverAfter mobile app in use"
              fill
              sizes="(max-width: 1024px) 100vw, 550px"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
