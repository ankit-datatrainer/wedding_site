'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { MatchList } from '@/components/admin/MatchList';
import {
  ProfileForm,
  blankProfileForm,
  formToPayload,
  profileToForm,
  validateProfileForm,
  type ProfileFormValue,
} from '@/components/admin/ProfileForm';
import { ErrorNote, Panel, StatusBadge, btnOutline, btnPrimary } from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi, parseBiodataForAdmin } from '@/lib/adminApi';
import { useAdminAuth } from '@/lib/adminAuth';
import type { MatchCandidate, Profile, ProfileStatus } from '@/lib/types';

const STEPS = [
  { title: 'Upload biodata', icon: 'upload_file' },
  { title: 'Review details', icon: 'fact_check' },
  { title: 'Matches & publish', icon: 'favorite' },
];

/**
 * The guided biodata flow: PDF in → every field reviewed → ranked matches
 * shown (1, 2, 3…) → published or queued for approval. The matches are
 * computed before saving so the admin sees who this biodata suits while
 * deciding whether to publish it.
 */
export default function UploadBiodataPage() {
  const { can } = useAdminAuth();
  const canApprove = can('profiles.approve');
  const canMatch = can('matches.view');

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProfileFormValue>(blankProfileForm());
  const [file, setFile] = useState<File | null>(null);
  const [parseInfo, setParseInfo] = useState<{ warnings: string[]; missing: string[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [matches, setMatches] = useState<MatchCandidate[] | null>(null);
  const [saved, setSaved] = useState<Profile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function readPdf(f: File | undefined) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
      setError('Please choose a PDF biodata.');
      return;
    }
    setFile(f);
    setBusy('parse');
    setError('');
    try {
      const res = await parseBiodataForAdmin(f);
      setForm(profileToForm(res.profile));
      setParseInfo({ warnings: res.warnings, missing: res.missing });
      setStep(1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function toMatches() {
    const problem = validateProfileForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!canMatch) return;
    setBusy('match');
    setMatches(null);
    try {
      const res = await adminApi<{ items: MatchCandidate[] }>('/api/admin/profiles/match-preview?limit=10', {
        method: 'POST',
        body: JSON.stringify(formToPayload(form)),
      });
      setMatches(res.items);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save(status?: ProfileStatus) {
    setBusy(status || 'save');
    setError('');
    try {
      const payload = { ...formToPayload(form), source: file ? 'biodata' : 'manual', ...(status ? { status } : {}) };
      const created = await adminApi<Profile>('/api/admin/profiles', { method: 'POST', body: JSON.stringify(payload) });
      setSaved(created);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function restart() {
    setStep(0);
    setForm(blankProfileForm());
    setFile(null);
    setParseInfo(null);
    setMatches(null);
    setSaved(null);
    setError('');
  }

  return (
    <AdminShell
      title="Upload Biodata"
      description="Upload a biodata, complete the details, and see the best matches"
      permission="profiles.create"
    >
      {/* Stepper */}
      <ol className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        {STEPS.map((s, i) => {
          const state = i < step || saved ? 'done' : i === step ? 'current' : 'todo';
          return (
            <li
              key={s.title}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 sm:px-4 ${
                state === 'current' ? 'bg-surface shadow-card ring-1 ring-secondary/40' : 'bg-surface/60'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-heading text-[15px] ${
                  state === 'done'
                    ? 'bg-secondary text-on-secondary'
                    : state === 'current'
                      ? 'bg-primary-container text-inverse-on-surface'
                      : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {state === 'done' ? <Icon name="check" className="text-[18px]" /> : i + 1}
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="font-body text-[11px] uppercase tracking-wide text-on-surface-variant">Step {i + 1}</p>
                <p className="truncate font-body text-body-md font-semibold text-on-surface">{s.title}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <ErrorNote message={error} />

      {/* Step 1 — upload */}
      {step === 0 && (
        <Panel title="Step 1 — Upload the biodata PDF">
          <div className="flex flex-col gap-5 p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                readPdf(e.dataTransfer.files?.[0]);
              }}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
                dragging ? 'border-secondary bg-secondary-fixed/40' : 'border-outline-variant bg-surface-container-low'
              }`}
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container/20">
                {busy === 'parse' ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
                ) : (
                  <Icon name="upload_file" className="text-[30px] text-secondary" />
                )}
              </span>
              <div>
                <p className="font-heading text-[18px] text-primary">
                  {busy === 'parse' ? `Reading ${file?.name}…` : 'Drop a biodata PDF here'}
                </p>
                <p className="mt-1 font-body text-label-md text-on-surface-variant">
                  We read the name, family, horoscope, education and reference details for you. Max 10MB.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button type="button" onClick={() => inputRef.current?.click()} disabled={!!busy} className={btnPrimary}>
                  <Icon name="folder_open" className="text-[18px]" />
                  Choose PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setParseInfo(null);
                    setStep(1);
                  }}
                  disabled={!!busy}
                  className={btnOutline}
                >
                  <Icon name="edit" className="text-[18px]" />
                  Fill in manually
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => readPdf(e.target.files?.[0])}
              />
            </div>
            <p className="flex items-start gap-2 font-body text-label-md text-on-surface-variant">
              <Icon name="lock" className="text-[16px]" />
              The PDF is read in memory and never stored — only the details you save are kept.
              {!canApprove && ' Profiles you add are sent for approval before they appear on the website.'}
            </p>
          </div>
        </Panel>
      )}

      {/* Step 2 — review */}
      {step === 1 && (
        <Panel
          title="Step 2 — Review & complete the details"
          actions={
            file && (
              <span className="flex items-center gap-1.5 font-body text-label-md text-on-surface-variant">
                <Icon name="picture_as_pdf" className="text-[17px]" />
                {file.name}
              </span>
            )
          }
        >
          <div className="p-5">
            {parseInfo && (
              <div className="mb-6 rounded-xl bg-secondary-fixed/40 px-4 py-3">
                <p className="flex items-center gap-2 font-body text-body-md text-on-secondary-fixed">
                  <Icon name="auto_awesome" className="text-[18px] text-secondary" />
                  Details read from the biodata — please check each section and fill anything missing.
                </p>
                {parseInfo.missing.length > 0 && (
                  <p className="mt-1 font-body text-label-md text-on-secondary-fixed-variant">
                    Couldn&apos;t find: <strong>{parseInfo.missing.join(', ')}</strong> — enter these below.
                  </p>
                )}
              </div>
            )}

            <ProfileForm value={form} onChange={setForm} />

            <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-outline-variant/30 pt-5">
              <button type="button" onClick={() => setStep(0)} className={btnOutline}>
                <Icon name="arrow_back" className="text-[18px]" />
                Back
              </button>
              <button type="button" onClick={toMatches} className={btnPrimary}>
                {canMatch ? 'Find Matches' : 'Continue'}
                <Icon name="arrow_forward" className="text-[18px]" />
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* Step 3 — matches & publish */}
      {step === 2 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
          <Panel
            title={`Step 3 — Profiles matching ${form.base.name || 'this biodata'}`}
            actions={
              matches && (
                <span className="font-body text-label-md text-on-surface-variant">
                  {matches.length} match{matches.length === 1 ? '' : 'es'}, best first
                </span>
              )
            }
          >
            <div className="p-5">
              {!canMatch && (
                <p className="font-body text-body-md text-on-surface-variant">
                  Your role doesn&apos;t include viewing matches — save the profile to continue.
                </p>
              )}
              {canMatch && busy === 'match' && (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-surface-container-low" />
                  ))}
                </div>
              )}
              {canMatch && matches && (
                <>
                  <p className="mb-4 font-body text-label-md text-on-surface-variant">
                    Ranked against every live {form.base.gender === 'female' ? 'groom' : 'bride'} profile and registered
                    member. Each tag shows exactly what matched.
                  </p>
                  <MatchList items={matches} />
                </>
              )}
            </div>
          </Panel>

          <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
            <Panel title={saved ? 'Saved' : 'Publish this profile'}>
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low">
                    <Icon name={form.base.gender === 'female' ? 'woman' : 'man'} className="text-[22px] text-secondary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-body text-body-md font-semibold text-on-surface">{form.base.name}</p>
                    <p className="font-body text-label-md text-on-surface-variant">
                      {[form.base.age && `${form.base.age} yrs`, form.base.religion, form.base.location].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>

                {saved ? (
                  <>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={saved.status} />
                    </div>
                    <p className="font-body text-body-md text-on-surface-variant">
                      {saved.status === 'approved'
                        ? 'Published — this profile is now visible on the website.'
                        : 'Saved and waiting for approval. It will appear on the website once approved.'}
                    </p>
                    <button onClick={restart} className={btnPrimary}>
                      <Icon name="upload_file" className="text-[18px]" />
                      Upload another biodata
                    </button>
                    <Link href="/admin/profiles" className={btnOutline}>
                      Go to Profiles & Approvals
                    </Link>
                  </>
                ) : (
                  <>
                    {canApprove ? (
                      <>
                        <button onClick={() => save('approved')} disabled={!!busy} className={btnPrimary}>
                          <Icon name="public" className="text-[18px]" />
                          {busy === 'approved' ? 'Publishing…' : 'Approve & Publish'}
                        </button>
                        <button onClick={() => save('pending')} disabled={!!busy} className={btnOutline}>
                          {busy === 'pending' ? 'Saving…' : 'Save as Pending'}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => save()} disabled={!!busy} className={btnPrimary}>
                        <Icon name="send" className="text-[18px]" />
                        {busy === 'save' ? 'Submitting…' : 'Submit for Approval'}
                      </button>
                    )}
                    <button onClick={() => setStep(1)} disabled={!!busy} className="font-body text-label-md uppercase text-secondary hover:underline">
                      Back to edit details
                    </button>
                  </>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
