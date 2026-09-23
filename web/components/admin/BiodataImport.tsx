'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { importBiodata, type BiodataImportResult } from '@/lib/adminApi';
import { useAdminAuth } from '@/lib/adminAuth';
import type { ProfileStatus } from '@/lib/types';
import { MatchList } from './MatchList';

/**
 * Bulk biodata import dialog.
 *
 * Files are queued client-side and sent in one request so the admin gets a
 * single per-file report rather than a stream of toasts. A partial success is
 * the expected case with real-world PDFs, so the result view always shows
 * both what landed and what didn't, with the reason.
 */
export function BiodataImport({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BiodataImportResult | null>(null);
  const { can } = useAdminAuth();
  const canApprove = can('profiles.approve');
  const [publish, setPublish] = useState<ProfileStatus>('approved');

  function addFiles(list: FileList | null) {
    if (!list) return;
    const pdfs = Array.from(list).filter(
      (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
    );
    if (pdfs.length < list.length) {
      setError('Only PDF files can be imported — anything else was ignored.');
    } else {
      setError('');
    }
    // Capped to match the server's per-request limit.
    setFiles((prev) => [...prev, ...pdfs].slice(0, 20));
    if (inputRef.current) inputRef.current.value = '';
  }

  async function run() {
    if (!files.length) return;
    setBusy(true);
    setError('');
    try {
      const res = await importBiodata(files, canApprove ? publish : 'pending');
      setResult(res);
      if (res.summary.imported > 0) onImported();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFiles([]);
    setResult(null);
    setError('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-float">
        <header className="flex items-center justify-between border-b border-outline-variant/30 px-6 py-4">
          <div>
            <h2 className="font-heading text-[19px] text-primary">Import biodata PDFs</h2>
            <p className="font-body text-label-md text-on-surface-variant">
              Each PDF becomes a directory profile
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-on-surface-variant transition-colors hover:text-secondary"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {result ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3">
                <Stat label="Imported" value={result.summary.imported} tone="success" />
                <Stat label="Failed" value={result.summary.failed} tone={result.summary.failed ? 'error' : 'neutral'} />
                <Stat label="Total" value={result.summary.total} tone="neutral" />
              </div>

              {result.imported.length > 0 && (
                <section>
                  <h3 className="mb-2 font-body text-label-md uppercase tracking-wide text-on-surface-variant">
                    Added to the directory
                  </h3>
                  <p className="mb-3 font-body text-label-md text-on-surface-variant">
                    {result.summary.status === 'approved'
                      ? 'These profiles are live on the website now.'
                      : 'These profiles are pending — they appear on the website once approved in Profiles & Approvals.'}
                  </p>
                  <ul className="flex flex-col gap-4">
                    {result.imported.map((item) => (
                      <li key={item.filename} className="rounded-xl bg-surface-container-low p-3">
                        <div className="flex flex-wrap items-center gap-2 px-1 pb-2">
                          <Icon name="check_circle" className="text-[17px] text-secondary" filled />
                          <span className="font-body text-body-md font-semibold text-on-surface">
                            {item.profile.name}
                          </span>
                          <span className="font-body text-label-md text-on-surface-variant">
                            {item.profile.age} yrs · {item.profile.gender} · from {item.filename}
                          </span>
                          {item.warnings.length > 0 && (
                            <span
                              title={item.warnings.join('; ')}
                              className="ml-auto font-body text-label-md text-on-surface-variant"
                            >
                              {item.warnings.length} field
                              {item.warnings.length === 1 ? '' : 's'} not read
                            </span>
                          )}
                        </div>
                        {can('matches.view') && (
                          <div className="rounded-lg bg-surface p-3">
                            <p className="mb-2 font-body text-label-md uppercase tracking-wide text-on-surface-variant">
                              Top matches for {item.profile.name.split(' ')[0]}
                            </p>
                            <MatchList items={item.matches} compact />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {result.failures.length > 0 && (
                <section>
                  <h3 className="mb-2 font-body text-label-md uppercase tracking-wide text-on-surface-variant">
                    Could not be imported
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {result.failures.map((f) => (
                      <li
                        key={f.filename}
                        className="flex items-start gap-2 rounded-lg bg-error-container/40 px-3 py-2.5"
                      >
                        <Icon name="error" className="mt-px text-[17px] text-error" />
                        <div className="min-w-0">
                          <p className="break-all font-body text-body-md text-on-surface">
                            {f.filename}
                          </p>
                          <p className="font-body text-label-md text-on-surface-variant">
                            {f.error}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 font-body text-label-md text-on-surface-variant">
                    These are usually scanned or image-only PDFs. Add them with{' '}
                    <strong>Add Profile</strong> instead.
                  </p>
                </section>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragging
                    ? 'border-secondary bg-secondary-fixed/40'
                    : 'border-outline-variant bg-surface-container-low'
                }`}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container/20">
                  <Icon name="upload_file" className="text-[28px] text-secondary" />
                </span>
                <div>
                  <p className="font-body text-body-md text-on-surface">
                    Drop biodata PDFs here
                  </p>
                  <p className="mt-1 font-body text-label-md text-on-surface-variant">
                    Up to 20 files, 10MB each. Name, age and gender are required in each PDF.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-1 rounded-lg border-[1.5px] border-outline-variant px-5 py-2.5 font-body text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary"
                >
                  Choose files
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {canApprove ? (
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="mb-2 font-body text-label-md uppercase tracking-wide text-on-surface-variant">
                    After import
                  </legend>
                  {([
                    ['approved', 'Approve & publish on the website'],
                    ['pending', 'Keep pending for review'],
                  ] as const).map(([v, label]) => (
                    <label
                      key={v}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border-[1.5px] px-3 py-2 font-body text-label-md ${
                        publish === v ? 'border-secondary bg-secondary-fixed/40 text-secondary' : 'border-outline-variant text-on-surface-variant'
                      }`}
                    >
                      <input type="radio" name="publish" className="accent-[#b02559]" checked={publish === v} onChange={() => setPublish(v)} />
                      {label}
                    </label>
                  ))}
                </fieldset>
              ) : (
                <p className="flex items-center gap-2 rounded-lg bg-tertiary-fixed/40 px-3 py-2 font-body text-label-md text-on-tertiary-fixed-variant">
                  <Icon name="info" className="text-[16px]" />
                  Imported profiles are sent for approval before they appear on the website.
                </p>
              )}

              {files.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2.5"
                    >
                      <Icon name="picture_as_pdf" className="text-[18px] text-on-surface-variant" />
                      <span className="min-w-0 flex-1 truncate font-body text-body-md text-on-surface">
                        {f.name}
                      </span>
                      <span className="shrink-0 font-body text-label-md text-on-surface-variant">
                        {(f.size / 1024 / 1024).toFixed(1)}MB
                      </span>
                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label={`Remove ${f.name}`}
                        disabled={busy}
                        className="shrink-0 text-on-surface-variant transition-colors hover:text-error disabled:opacity-40"
                      >
                        <Icon name="close" className="text-[17px]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 flex items-center gap-2 font-body text-label-md text-error">
              <Icon name="error" className="text-[16px]" />
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-outline-variant/30 px-6 py-4">
          {result ? (
            <>
              <button
                onClick={reset}
                className="rounded-lg border-[1.5px] border-outline-variant px-5 py-2.5 font-body text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary"
              >
                Import more
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-secondary px-6 py-2.5 font-body text-label-md uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border-[1.5px] border-outline-variant px-5 py-2.5 font-body text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={busy || files.length === 0}
                className="flex items-center gap-2 rounded-lg bg-secondary px-6 py-2.5 font-body text-label-md uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary/40 border-t-on-secondary" />
                )}
                {busy
                  ? 'Reading PDFs…'
                  : `Import ${files.length || ''} ${files.length === 1 ? 'file' : 'files'}`.trim()}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'error' | 'neutral';
}) {
  const tones = {
    success: 'bg-secondary text-on-secondary',
    error: 'bg-error-container text-on-error-container',
    neutral: 'bg-surface-container-high text-on-surface-variant',
  };
  return (
    <div className={`flex-1 rounded-xl px-4 py-3 ${tones[tone]}`}>
      <p className="font-heading text-[22px] leading-tight">{value}</p>
      <p className="font-body text-label-md uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
