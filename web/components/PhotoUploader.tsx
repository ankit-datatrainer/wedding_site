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
        const isImage =
          file.type.startsWith('image/') ||
          /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff)$/i.test(file.name);
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

        if (!isImage && !isPdf) {
          throw new Error('Supported formats: JPG, PNG, WebP, GIF, SVG, AVIF, BMP, TIFF, and PDF.');
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Each file must be under 10MB.');
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
        {photos.map((url) => {
          const isPdf = url.toLowerCase().endsWith('.pdf');
          return (
            <div key={url} className="group relative h-28 w-28 overflow-hidden rounded-lg shadow-card border border-outline-variant/40 bg-surface-container-low">
              {isPdf ? (
                <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                  <Icon name="picture_as_pdf" className="text-[32px] text-error" />
                  <span className="mt-1 line-clamp-1 font-body text-[10px] font-semibold text-on-surface">
                    PDF Document
                  </span>
                  <a
                    href={mediaUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 font-body text-[10px] text-secondary hover:underline"
                  >
                    View
                  </a>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={mediaUrl(url)} alt="Profile photo" className="h-full w-full object-cover" />
              )}

              {url === photoUrl && (
                <span className="absolute left-1 top-1 rounded bg-secondary px-1.5 py-0.5 font-body text-[10px] uppercase text-on-secondary shadow-sm">
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
          );
        })}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:opacity-60"
        >
          <Icon name={busy ? 'progress_activity' : 'add_a_photo'} className="text-[24px]" />
          <span className="font-body text-label-md">{busy ? 'Uploading…' : 'Add Photo / PDF'}</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif,image/bmp,image/tiff,application/pdf,.pdf"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="font-body text-label-md text-on-surface-variant">
        Supported formats: JPG, PNG, WebP, GIF, SVG, AVIF, and PDF (up to 10MB each).
      </p>

      {error && (
        <p role="alert" className="font-body text-label-md text-error">
          {error}
        </p>
      )}
    </div>
  );
}
