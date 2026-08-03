'use client';

import { useRef, useState } from 'react';
import { Icon } from './Icon';
import { deletePhoto, mediaUrl, uploadPhoto } from '@/lib/api';

export function PhotoUploader({
  photos,
  photoUrl,
  onChange,
}: {
  photos: string[];
  photoUrl: string | null;
  onChange: (next: { photos: string[]; photo_url: string | null }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError('');
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error('Only JPEG, PNG or WebP photos are allowed.');
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('Each photo must be under 5MB.');
        }
        const res = await uploadPhoto(file);
        onChange({ photos: res.photos, photo_url: res.photo_url });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(url: string) {
    setError('');
    try {
      const res = await deletePhoto(url);
      onChange({ photos: res.photos, photo_url: res.photo_url });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {photos.map((url) => (
          <div key={url} className="group relative h-28 w-28 overflow-hidden rounded-lg shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded
                photos come from the API's own origin, which varies by
                environment, so they're outside next/image's remotePatterns. */}
            <img src={mediaUrl(url)} alt="Profile photo" className="h-full w-full object-cover" />
            {url === photoUrl && (
              <span className="absolute left-1 top-1 rounded bg-secondary px-1.5 py-0.5 font-body text-[10px] uppercase text-on-secondary">
                Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(url)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-on-surface/70 text-surface opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:opacity-60"
        >
          <Icon name={busy ? 'progress_activity' : 'add_a_photo'} className="text-[24px]" />
          <span className="font-body text-label-md">{busy ? 'Uploading…' : 'Add Photo'}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && (
        <p role="alert" className="font-body text-label-md text-error">
          {error}
        </p>
      )}
      <p className="font-body text-label-md text-on-surface-variant">
        JPEG, PNG or WebP, up to 5MB each. The first photo you add becomes your primary picture.
      </p>
    </div>
  );
}
