'use client';

import { useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { uploadProfilePhoto } from '@/lib/adminApi';
import { mediaUrl } from '@/lib/api';
import type { Profile, ProfileDetails } from '@/lib/types';
import { inputBase } from './ui';

/** Columns on the `profiles` row. */
export type ProfileBase = {
  name: string;
  age: string;
  gender: string;
  profession: string;
  location: string;
  education: string;
  education_level: string;
  religion: string;
  community: string;
  marital_status: string;
  height_cm: string;
  mother_tongue: string;
  diet: string;
  photo: string;
  about: string;
};

export type ProfileFormValue = { base: ProfileBase; details: ProfileDetails };

export function blankProfileForm(): ProfileFormValue {
  return {
    base: {
      name: '', age: '', gender: 'female', profession: '', location: '', education: '',
      education_level: '', religion: '', community: '', marital_status: 'Never Married',
      height_cm: '', mother_tongue: '', diet: '', photo: '', about: '',
    },
    details: {},
  };
}

/** Fills the form from a saved or parsed profile; unknown/missing fields stay blank. */
export function profileToForm(p: Partial<Profile>): ProfileFormValue {
  const blank = blankProfileForm();
  const base = { ...blank.base };
  for (const key of Object.keys(base) as (keyof ProfileBase)[]) {
    const v = (p as Record<string, unknown>)[key];
    if (v !== undefined && v !== null) base[key] = String(v);
  }
  return { base, details: { ...(p.details || {}) } };
}

/** Form → API payload. Blank optional values are dropped so enum validators don't see "". */
export function formToPayload(form: ProfileFormValue): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(form.base)) {
    if (v.trim() === '' && k !== 'name') continue;
    payload[k] = v.trim();
  }
  const details: Record<string, string> = {};
  for (const [k, v] of Object.entries(form.details)) {
    if (v && v.trim()) details[k] = v.trim();
  }
  payload.details = details;
  return payload;
}

/** Client-side check matching the server's hard requirements. */
export function validateProfileForm(form: ProfileFormValue): string | null {
  if (!form.base.name.trim()) return 'Full name is required.';
  const age = Number(form.base.age);
  if (!age || age < 18 || age > 100) return 'Enter an age between 18 and 100.';
  if (!form.base.gender) return 'Select a gender.';
  if (form.base.height_cm && (Number(form.base.height_cm) < 120 || Number(form.base.height_cm) > 230)) {
    return 'Height must be between 120 and 230 cm.';
  }
  return null;
}

type FieldDef = {
  key: string;
  label: string;
  scope: 'base' | 'details';
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea';
  options?: string[];
  placeholder?: string;
  wide?: boolean;
  required?: boolean;
};

const SECTIONS: { title: string; icon: string; fields: FieldDef[] }[] = [
  {
    title: 'Basic details',
    icon: 'badge',
    fields: [
      { key: 'name', label: 'Full Name', scope: 'base', required: true, placeholder: 'e.g. Ananya Sharma' },
      { key: 'gender', label: 'Gender', scope: 'base', options: ['female', 'male'], required: true },
      { key: 'age', label: 'Age', scope: 'base', type: 'number', required: true },
      { key: 'dob', label: 'Date of Birth', scope: 'details', type: 'date' },
      { key: 'height_cm', label: 'Height (cm)', scope: 'base', type: 'number', placeholder: 'e.g. 165' },
      { key: 'weightKg', label: 'Weight (kg)', scope: 'details', type: 'number' },
      { key: 'marital_status', label: 'Marital Status', scope: 'base', options: ['Never Married', 'Divorced', 'Widowed'] },
      { key: 'diet', label: 'Diet', scope: 'base', options: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'] },
      { key: 'complexion', label: 'Complexion', scope: 'details' },
      { key: 'bloodGroup', label: 'Blood Group', scope: 'details' },
      { key: 'smoking', label: 'Smoking', scope: 'details', options: ['No', 'Occasionally', 'Yes'] },
      { key: 'drinking', label: 'Drinking', scope: 'details', options: ['No', 'Occasionally', 'Yes'] },
    ],
  },
  {
    title: 'Religion & horoscope',
    icon: 'auto_awesome',
    fields: [
      { key: 'religion', label: 'Religion', scope: 'base', placeholder: 'e.g. Hindu' },
      { key: 'community', label: 'Community / Caste', scope: 'base', placeholder: 'e.g. Brahmin' },
      { key: 'mother_tongue', label: 'Mother Tongue', scope: 'base', placeholder: 'e.g. Hindi' },
      { key: 'gothram', label: 'Gothram', scope: 'details' },
      { key: 'manglik', label: 'Manglik', scope: 'details', options: ['Yes', 'No', "Don't Know"] },
      { key: 'rashi', label: 'Rashi', scope: 'details' },
      { key: 'nakshatra', label: 'Nakshatra', scope: 'details' },
      { key: 'timeOfBirth', label: 'Time of Birth', scope: 'details', placeholder: 'e.g. 10:45 AM' },
      { key: 'placeOfBirth', label: 'Place of Birth', scope: 'details' },
    ],
  },
  {
    title: 'Education, career & location',
    icon: 'school',
    fields: [
      { key: 'education', label: 'Education', scope: 'base', placeholder: 'e.g. B.Tech, IIT Delhi' },
      { key: 'education_level', label: 'Education Level', scope: 'base', options: ['Bachelors', 'Masters', 'Doctorate'] },
      { key: 'college', label: 'College / University', scope: 'details' },
      { key: 'profession', label: 'Profession', scope: 'base', placeholder: 'e.g. Software Engineer' },
      { key: 'employer', label: 'Employer', scope: 'details' },
      { key: 'annualIncome', label: 'Annual Income', scope: 'details', placeholder: 'e.g. 18 LPA' },
      { key: 'location', label: 'Location (City, State)', scope: 'base', placeholder: 'Mumbai, Maharashtra' },
      { key: 'country', label: 'Country', scope: 'details', placeholder: 'India' },
      { key: 'address', label: 'Address', scope: 'details', wide: true },
    ],
  },
  {
    title: 'Family',
    icon: 'diversity_3',
    fields: [
      { key: 'fatherName', label: "Father's Name", scope: 'details' },
      { key: 'fatherOccupation', label: "Father's Occupation", scope: 'details' },
      { key: 'motherName', label: "Mother's Name", scope: 'details' },
      { key: 'motherOccupation', label: "Mother's Occupation", scope: 'details' },
      { key: 'siblings', label: 'Siblings', scope: 'details', wide: true },
      { key: 'familyType', label: 'Family Type', scope: 'details', options: ['Nuclear', 'Joint'] },
      { key: 'familyStatus', label: 'Family Status', scope: 'details', options: ['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent'] },
      { key: 'familyValues', label: 'Family Values', scope: 'details', options: ['Traditional', 'Moderate', 'Liberal'] },
    ],
  },
  {
    title: 'Contact & reference',
    icon: 'contact_phone',
    fields: [
      { key: 'phone', label: 'Contact Phone', scope: 'details', type: 'tel' },
      { key: 'email', label: 'Contact Email', scope: 'details', type: 'email' },
      { key: 'referenceName', label: 'Reference Name', scope: 'details' },
      { key: 'referencePhone', label: 'Reference Phone', scope: 'details', type: 'tel' },
      { key: 'referredBy', label: 'Reference Relation', scope: 'details', placeholder: 'e.g. Uncle, family friend', wide: true },
    ],
  },
  {
    title: 'About & expectations',
    icon: 'edit_note',
    fields: [
      { key: 'about', label: 'About', scope: 'base', type: 'textarea', wide: true },
      { key: 'partnerExpectations', label: 'Partner Expectations', scope: 'details', type: 'textarea', wide: true },
    ],
  },
];

/**
 * The complete biodata form for a directory profile — every field a printed
 * biodata carries, grouped the way families read them. Controlled: the
 * parent owns the value.
 */
export function ProfileForm({
  value,
  onChange,
}: {
  value: ProfileFormValue;
  onChange: (next: ProfileFormValue) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const get = (f: FieldDef) =>
    f.scope === 'base'
      ? value.base[f.key as keyof ProfileBase] ?? ''
      : (value.details as Record<string, string | undefined>)[f.key] ?? '';

  const set = (f: FieldDef, v: string) => {
    if (f.scope === 'base') return onChange({ ...value, base: { ...value.base, [f.key]: v } });
    const next = { ...value, details: { ...value.details, [f.key]: v } };
    // A date of birth fills in the age, so the admin never types both.
    if (f.key === 'dob' && v) {
      const years = Math.floor((Date.now() - new Date(v).getTime()) / (365.25 * 24 * 3600 * 1000));
      if (years >= 18 && years <= 100) next.base = { ...value.base, age: String(years) };
    }
    onChange(next);
  };

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setPhotoError('');
    try {
      const url = await uploadProfilePhoto(file);
      onChange({ ...value, base: { ...value.base, photo: url } });
    } catch (err) {
      setPhotoError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Photo */}
      <section className="flex flex-wrap items-center gap-4 rounded-xl bg-surface-container-low p-4">
        {value.base.photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded or pasted photo URL
          <img src={mediaUrl(value.base.photo)} alt="" className="h-20 w-20 rounded-xl object-cover shadow-card" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-surface">
            <Icon name="add_a_photo" className="text-[28px] text-on-surface-variant" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-body text-label-md uppercase tracking-wide text-on-surface-variant">Profile photo</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-outline-variant bg-surface px-3 py-2 font-body text-label-md uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:opacity-50"
            >
              <Icon name="upload" className="text-[16px]" />
              {uploading ? 'Uploading…' : value.base.photo ? 'Replace photo' : 'Upload photo'}
            </button>
            {value.base.photo && (
              <button
                type="button"
                onClick={() => onChange({ ...value, base: { ...value.base, photo: '' } })}
                className="px-2 font-body text-label-md uppercase text-error hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <input
            className={`${inputBase} max-w-md py-2 text-[14px]`}
            placeholder="…or paste an image URL"
            value={value.base.photo.startsWith('/uploads/') ? '' : value.base.photo}
            onChange={(e) => onChange({ ...value, base: { ...value.base, photo: e.target.value } })}
          />
          {photoError && <p className="font-body text-label-md text-error">{photoError}</p>}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => pickPhoto(e.target.files?.[0])}
        />
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h3 className="mb-3 flex items-center gap-2 font-heading text-[16px] text-primary">
            <Icon name={section.icon} className="text-[19px] text-secondary" />
            {section.title}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields.map((f) => (
              <label key={f.key} className={`flex flex-col gap-1.5 ${f.wide ? 'sm:col-span-2' : ''}`}>
                <span className="font-body text-label-md text-on-surface-variant">
                  {f.label}
                  {f.required && <span className="text-secondary"> *</span>}
                </span>
                {f.options ? (
                  <select className={inputBase} value={get(f)} onChange={(e) => set(f, e.target.value)}>
                    {!f.required && <option value="">Select…</option>}
                    {f.options.map((o) => (
                      <option key={o} value={o}>
                        {f.key === 'gender' ? (o === 'female' ? 'Female (Bride)' : 'Male (Groom)') : o}
                      </option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea rows={3} className={inputBase} value={get(f)} onChange={(e) => set(f, e.target.value)} />
                ) : (
                  <input
                    type={f.type || 'text'}
                    className={inputBase}
                    placeholder={f.placeholder}
                    value={get(f)}
                    onChange={(e) => set(f, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
