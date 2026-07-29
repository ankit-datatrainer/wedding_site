'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Icon } from './Icon';
import type { Story } from '@/lib/types';

export function StoryCarousel({ stories }: { stories: Story[] }) {
  const [index, setIndex] = useState(0);
  const story = stories[index];

  const move = (delta: number) =>
    setIndex((i) => (i + delta + stories.length) % stories.length);

  if (!story) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 items-center gap-10 rounded-2xl bg-surface-container-lowest p-8 shadow-card lg:grid-cols-[380px_1fr] lg:p-12">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-md">
          <Image
            src={story.photo}
            alt={`${story.couple} on their wedding day`}
            fill
            sizes="(max-width: 1024px) 100vw, 380px"
            className="object-cover"
          />
        </div>

        <blockquote className="flex flex-col gap-6">
          <Icon name="format_quote" className="text-[48px] text-secondary-fixed-dim" filled />
          <p className="font-heading text-[22px] leading-relaxed text-on-surface lg:text-[26px]">
            {story.quote}
          </p>
          <footer className="flex flex-col gap-2">
            <cite className="font-body text-label-lg not-italic uppercase tracking-wider text-secondary">
              {story.couple}
            </cite>
            <span className="flex gap-1" aria-label={`${story.rating} out of 5`}>
              {Array.from({ length: story.rating }).map((_, i) => (
                <Icon key={i} name="star" className="text-[18px] text-tertiary-container" filled />
              ))}
            </span>
          </footer>
        </blockquote>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => move(-1)}
          aria-label="Previous story"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-card transition-colors hover:text-secondary"
        >
          <Icon name="chevron_left" />
        </button>
        <span className="font-body text-label-md text-on-surface-variant">
          {index + 1} / {stories.length}
        </span>
        <button
          onClick={() => move(1)}
          aria-label="Next story"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-card transition-colors hover:text-secondary"
        >
          <Icon name="chevron_right" />
        </button>
      </div>
    </div>
  );
}
