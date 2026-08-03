'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';
import type { Profile } from '@/lib/types';

const input =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-body text-label-md text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

const BLANK = {
  name: '', age: '', gender: 'female', profession: '', location: '', education: '',
  education_level: 'Bachelors', religion: '', community: '', marital_status: 'Never Married',
  height_cm: '', mother_tongue: '', diet: 'Vegetarian', photo: '', about: '', verified: false,
};

/** Create/edit dialog for directory profiles. `profile === null` means create. */
export function ProfileEditor({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, string | boolean>>(
    profile
      ? {
          name: profile.name ?? '',
          age: String(profile.age ?? ''),
          gender: profile.gender ?? 'female',
          profession: profile.profession ?? '',
          location: profile.location ?? '',
          education: profile.education ?? '',
          education_level: profile.education_level || 'Bachelors',
          religion: profile.religion ?? '',
          community: profile.community ?? '',
          marital_status: profile.marital_status || 'Never Married',
          height_cm: String(profile.height_cm ?? ''),
          mother_tongue: profile.mother_tongue ?? '',
          diet: profile.diet || 'Vegetarian',
          photo: profile.photo ?? '',
          about: profile.about ?? '',
          verified: !!profile.verified,
        }
      : { ...BLANK }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Strip empty optional strings so zod's enum/url validators don't reject "".
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (typeof v === 'string' && v.trim() === '' && k !== 'name') continue;
        payload[k] = v;
      }

      if (profile) {
        await adminApi(`/api/admin/profiles/${profile.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApi('/api/admin/profiles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-on-surface/40 p-4" onClick={onClose}>
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="my-8 w-full max-w-2xl rounded-2xl bg-surface p-6 shadow-float sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between">
          <h2 className="font-heading text-[22px] text-primary">
            {profile ? 'Edit Profile' : 'Add Profile'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name *">
            <input required className={input} value={String(form.name)} onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Age *">
            <input required type="number" min={18} max={100} className={input} value={String(form.age)} onChange={(e) => set('age', e.target.value)} />
          </Field>
          <Field label="Gender *">
            <select className={input} value={String(form.gender)} onChange={(e) => set('gender', e.target.value)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Profession">
            <input className={input} value={String(form.profession)} onChange={(e) => set('profession', e.target.value)} />
          </Field>
          <Field label="Location (City, State)">
            <input className={input} placeholder="Mumbai, Maharashtra" value={String(form.location)} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Education">
            <input className={input} placeholder="B.Tech, IIT Delhi" value={String(form.education)} onChange={(e) => set('education', e.target.value)} />
          </Field>
          <Field label="Education Level">
            <select className={input} value={String(form.education_level)} onChange={(e) => set('education_level', e.target.value)}>
              {['Bachelors', 'Masters', 'Doctorate'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Religion">
            <input className={input} value={String(form.religion)} onChange={(e) => set('religion', e.target.value)} />
          </Field>
          <Field label="Community">
            <input className={input} value={String(form.community)} onChange={(e) => set('community', e.target.value)} />
          </Field>
          <Field label="Marital Status">
            <select className={input} value={String(form.marital_status)} onChange={(e) => set('marital_status', e.target.value)}>
              {['Never Married', 'Divorced', 'Widowed'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Height (cm)">
            <input type="number" min={120} max={230} className={input} value={String(form.height_cm)} onChange={(e) => set('height_cm', e.target.value)} />
          </Field>
          <Field label="Mother Tongue">
            <input className={input} value={String(form.mother_tongue)} onChange={(e) => set('mother_tongue', e.target.value)} />
          </Field>
          <Field label="Diet">
            <select className={input} value={String(form.diet)} onChange={(e) => set('diet', e.target.value)}>
              {['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'].map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Photo URL">
            <input type="url" className={input} placeholder="https://…" value={String(form.photo)} onChange={(e) => set('photo', e.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <Field label="About">
              <textarea rows={3} className={input} value={String(form.about)} onChange={(e) => set('about', e.target.value)} />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={!!form.verified}
              onChange={(e) => set('verified', e.target.checked)}
              className="h-5 w-5 accent-[#b02559]"
            />
            <span className="font-body text-body-md text-on-surface">
              Verified — shows the verified badge on the profile card
            </span>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-4 font-body text-label-md text-error">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-[1.5px] border-outline-variant px-6 py-2.5 font-body text-label-lg uppercase text-on-surface-variant"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-secondary px-6 py-2.5 font-body text-label-lg uppercase text-on-secondary shadow-sm hover:bg-on-secondary-container disabled:opacity-60"
          >
            {saving ? 'Saving…' : profile ? 'Save Changes' : 'Create Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
