'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { parseBiodata, uploadPhoto, type BiodataDraft } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { MemberDetails } from '@/lib/types';

// ---------------------------------------------------------------- shared ---

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3.5 font-body text-body-md text-on-surface transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-label-md text-on-surface-variant">{label}</span>
      <input className={inputClass} {...props} />
      {hint && <span className="font-body text-label-md text-on-surface-variant/70">{hint}</span>}
    </label>
  );
}

function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-label-md text-on-surface-variant">{label}</span>
      <textarea rows={4} className={inputClass} {...props} />
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-label-md text-on-surface-variant">{label}</span>
      <select className={inputClass} {...props}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-5 text-center font-body text-body-md transition-all ${
            value === opt.value
              ? 'border-secondary bg-secondary-fixed text-secondary shadow-sm'
              : 'border-transparent bg-surface-container-low text-on-surface-variant hover:border-outline-variant'
          }`}
        >
          {opt.icon && <Icon name={opt.icon} className="text-[26px]" />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A real component, not an inline closure — it's mounted via JSX from the
 * photos step's `render`, so its useRef follows normal hook rules. Calling
 * useRef directly inside a step's `render` function would violate the Rules
 * of Hooks: that function only runs for the currently active step, so the
 * hook would fire on some renders of RegisterPage and not others.
 */
function PhotoStep({
  photos,
  setPhotos,
}: {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Photo[] = [];
    for (const file of Array.from(files)) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos((p) => [...p, ...next].slice(0, 6));
    if (inputRef.current) inputRef.current.value = '';
  }

  function remove(url: string) {
    setPhotos((p) => p.filter((ph) => ph.url !== url));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        {photos.map((p) => (
          <div key={p.url} className="group relative h-28 w-28 overflow-hidden rounded-lg shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a remote image next/image can optimize. */}
            <img src={p.url} alt="Selected photo" className="h-full w-full object-cover" />
            {p === photos[0] && (
              <span className="absolute left-1 top-1 rounded bg-secondary px-1.5 py-0.5 font-body text-[10px] uppercase text-on-secondary">
                Primary
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(p.url)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-on-surface/70 text-surface opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary"
          >
            <Icon name="add_a_photo" className="text-[24px]" />
            <span className="font-body text-label-md">Add Photo</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(e) => addFiles(e.target.files)}
      />
      <p className="font-body text-label-md text-on-surface-variant">
        JPEG, PNG or WebP, up to 5MB each, up to 6 photos. They upload once your account is created.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- steps ----

type FormState = {
  profileFor: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  password: string;
  details: MemberDetails;
};

const BLANK: FormState = {
  profileFor: 'self',
  firstName: '',
  lastName: '',
  gender: '',
  dob: '',
  phone: '',
  email: '',
  password: '',
  details: {},
};

type Photo = { file: File; url: string };

type BiodataSummary = { filename: string; filled: number; warnings: string[] };

/**
 * The biodata shortcut: read an existing PDF and pre-fill the whole wizard.
 *
 * Deliberately still a wizard afterwards rather than a one-click "profile
 * created" — parsed values land in the same fields the member would have
 * typed, so every one of them is visible and editable before anything is
 * saved. A misread height is then a two-second correction, not a wrong
 * profile nobody notices.
 */
function BiodataStep({
  summary,
  onParsed,
}: {
  summary: BiodataSummary | null;
  onParsed: (draft: BiodataDraft, file: File, filled: number, warnings: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      setError('Please choose a PDF file.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const { draft, filled, warnings } = await parseBiodata(file);
      onParsed(draft, file, filled, warnings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (summary) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-xl border border-secondary/30 bg-secondary-fixed/40 p-4">
          <Icon name="task_alt" className="mt-0.5 text-[22px] text-secondary" filled />
          <div className="min-w-0 flex-1">
            <p className="font-body text-body-md text-on-surface">
              Read <strong>{summary.filled}</strong> {summary.filled === 1 ? 'detail' : 'details'} from{' '}
              <span className="break-all">{summary.filename}</span>.
            </p>
            <p className="mt-1 font-body text-label-md text-on-surface-variant">
              We&apos;ve filled in the next steps for you — check each one and correct anything
              that looks wrong.
            </p>
          </div>
        </div>

        {summary.warnings.length > 0 && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="font-body text-label-md text-on-surface-variant">
              A few things we couldn&apos;t read — please fill these in yourself:
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {summary.warnings.slice(0, 5).map((w) => (
                <li key={w} className="flex gap-2 font-body text-label-md text-on-surface-variant/80">
                  <Icon name="info" className="mt-px text-[15px]" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="self-start font-body text-label-lg text-secondary hover:underline"
        >
          Upload a different PDF
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    );
  }

  return (
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
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? 'border-secondary bg-secondary-fixed/40' : 'border-outline-variant bg-surface-container-low'
        }`}
      >
        {pending ? (
          <>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-secondary/30 border-t-secondary" />
            <p className="font-body text-body-md text-on-surface">Reading your biodata…</p>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container/20">
              <Icon name="upload_file" className="text-[28px] text-secondary" />
            </span>
            <div>
              <p className="font-body text-body-md text-on-surface">
                Drop your biodata PDF here
              </p>
              <p className="mt-1 font-body text-label-md text-on-surface-variant">
                We&apos;ll read it and fill in the rest of this form for you. PDF, up to 10MB.
              </p>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-1 rounded-lg bg-secondary px-6 py-3 font-body text-label-lg uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container"
            >
              Choose PDF
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={pending}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-2 font-body text-label-md text-error">
          <Icon name="error" className="text-[16px]" />
          {error}
        </p>
      )}

      <p className="text-center font-body text-label-md text-on-surface-variant">
        No biodata handy? Skip this — you can fill everything in yourself.
      </p>
    </div>
  );
}

type Step = {
  title: string;
  subtitle: string;
  icon: string;
  optional?: boolean;
  render: (ctx: {
    form: FormState;
    set: (k: keyof FormState, v: string) => void;
    setDetail: <K extends keyof MemberDetails>(k: K, v: string) => void;
    photos: Photo[];
    setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
    showPassword: boolean;
    setShowPassword: (v: boolean) => void;
    biodata: BiodataSummary | null;
    onBiodataParsed: (
      draft: BiodataDraft,
      file: File,
      filled: number,
      warnings: string[]
    ) => void;
  }) => React.ReactNode;
  validate?: (form: FormState) => string | null;
  /** On an optional step, whether Continue should read "Skip For Now". */
  skipWhen?: (ctx: { photos: Photo[]; biodata: BiodataSummary | null }) => boolean;
};

const STEPS: Step[] = [
  {
    title: 'Have a biodata ready?',
    subtitle: 'Upload it and we’ll fill in this whole form for you — or skip and type it in.',
    icon: 'description',
    optional: true,
    render: ({ biodata, onBiodataParsed }) => (
      <BiodataStep summary={biodata} onParsed={onBiodataParsed} />
    ),
    skipWhen: ({ biodata }) => !biodata,
  },
  {
    title: 'Who are you creating this profile for?',
    subtitle: "This helps us tailor the experience — you can't change this later.",
    icon: 'diversity_1',
    render: ({ form, set }) => (
      <ChipGrid
        options={[
          { value: 'self', label: 'Myself', icon: 'person' },
          { value: 'son', label: 'Son', icon: 'man' },
          { value: 'daughter', label: 'Daughter', icon: 'woman' },
          { value: 'brother', label: 'Brother', icon: 'man_3' },
          { value: 'sister', label: 'Sister', icon: 'woman_2' },
          { value: 'relative', label: 'Relative', icon: 'family_restroom' },
        ]}
        value={form.profileFor}
        onChange={(v) => set('profileFor', v)}
      />
    ),
    validate: (f) => (f.profileFor ? null : 'Please choose who this profile is for.'),
  },
  {
    title: "What's the name?",
    subtitle: 'As it should appear on the profile.',
    icon: 'badge',
    render: ({ form, set }) => (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="First Name" placeholder="Enter first name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoFocus />
        <Field label="Last Name" placeholder="Enter last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
      </div>
    ),
    validate: (f) => (f.firstName.trim() && f.lastName.trim() ? null : 'Please enter a first and last name.'),
  },
  {
    title: 'Gender and date of birth',
    subtitle: 'Used to match with the right audience.',
    icon: 'cake',
    render: ({ form, set }) => (
      <div className="flex flex-col gap-6">
        <ChipGrid
          columns={2}
          options={[
            { value: 'male', label: 'Male', icon: 'male' },
            { value: 'female', label: 'Female', icon: 'female' },
          ]}
          value={form.gender}
          onChange={(v) => set('gender', v)}
        />
        <Field label="Date of Birth" type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
      </div>
    ),
    validate: (f) => {
      if (!f.gender) return 'Please select a gender.';
      if (!f.dob) return 'Please enter a date of birth.';
      const age = (Date.now() - new Date(f.dob).getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 18) return 'The profile must be for someone 18 or older.';
      if (age > 100) return 'Please check the date of birth.';
      return null;
    },
  },
  {
    title: 'Physical & lifestyle',
    subtitle: 'A few basics that matter most in a match.',
    icon: 'fitness_center',
    render: ({ form, setDetail }) => (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Height (cm)" type="number" min={120} max={230} value={form.details.heightCm ?? ''} onChange={(e) => setDetail('heightCm', e.target.value)} />
        <Field label="Weight (kg)" type="number" min={30} max={200} value={form.details.weightKg ?? ''} onChange={(e) => setDetail('weightKg', e.target.value)} />
        <Select label="Marital Status" options={['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']} value={form.details.maritalStatus ?? ''} onChange={(e) => setDetail('maritalStatus', e.target.value)} />
        <Select label="Diet" options={['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']} value={form.details.diet ?? ''} onChange={(e) => setDetail('diet', e.target.value)} />
        <Select label="Smoking" options={['No', 'Occasionally', 'Yes']} value={form.details.smoking ?? ''} onChange={(e) => setDetail('smoking', e.target.value)} />
        <Select label="Drinking" options={['No', 'Occasionally', 'Yes']} value={form.details.drinking ?? ''} onChange={(e) => setDetail('drinking', e.target.value)} />
      </div>
    ),
    validate: (f) =>
      f.details.heightCm && f.details.maritalStatus && f.details.diet
        ? null
        : 'Please fill in height, marital status and diet.',
  },
  {
    title: 'Religion & horoscope',
    subtitle: 'Religion and community carry the most weight in your matches.',
    icon: 'auto_awesome',
    render: ({ form, setDetail }) => (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Religion" placeholder="e.g. Hindu" value={form.details.religion ?? ''} onChange={(e) => setDetail('religion', e.target.value)} autoFocus />
        <Field label="Community / Caste" placeholder="e.g. Brahmin" value={form.details.community ?? ''} onChange={(e) => setDetail('community', e.target.value)} />
        <Field label="Mother Tongue" value={form.details.motherTongue ?? ''} onChange={(e) => setDetail('motherTongue', e.target.value)} />
        <Field label="Gothram (optional)" value={form.details.gothram ?? ''} onChange={(e) => setDetail('gothram', e.target.value)} />
        <Select label="Manglik (optional)" options={['Yes', 'No', "Don't Know"]} value={form.details.manglik ?? ''} onChange={(e) => setDetail('manglik', e.target.value)} />
        <Field label="Rashi (optional)" value={form.details.rashi ?? ''} onChange={(e) => setDetail('rashi', e.target.value)} />
        <Field label="Nakshatra (optional)" value={form.details.nakshatra ?? ''} onChange={(e) => setDetail('nakshatra', e.target.value)} />
      </div>
    ),
    validate: (f) => (f.details.religion && f.details.community ? null : 'Please fill in religion and community.'),
  },
  {
    title: 'Where do you live?',
    subtitle: 'Location matters — many members prefer to search nearby.',
    icon: 'location_on',
    render: ({ form, setDetail }) => (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Country" value={form.details.country ?? ''} onChange={(e) => setDetail('country', e.target.value)} autoFocus />
        <Field label="State" value={form.details.state ?? ''} onChange={(e) => setDetail('state', e.target.value)} />
        <Field label="City" value={form.details.city ?? ''} onChange={(e) => setDetail('city', e.target.value)} />
        <Field label="PIN Code (optional)" value={form.details.pincode ?? ''} onChange={(e) => setDetail('pincode', e.target.value)} />
        <div className="sm:col-span-2">
          <Field label="Address (optional)" value={form.details.address ?? ''} onChange={(e) => setDetail('address', e.target.value)} />
        </div>
      </div>
    ),
    validate: (f) =>
      f.details.country && f.details.state && f.details.city ? null : 'Please fill in country, state and city.',
  },
  {
    title: 'Education & career',
    subtitle: 'What you do says a lot about where you are headed.',
    icon: 'school',
    render: ({ form, setDetail }) => (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Highest Education" placeholder="e.g. B.Tech, IIT Delhi" value={form.details.highestEducation ?? ''} onChange={(e) => setDetail('highestEducation', e.target.value)} autoFocus />
        <Field label="College / University (optional)" value={form.details.college ?? ''} onChange={(e) => setDetail('college', e.target.value)} />
        <Field label="Occupation" placeholder="e.g. Software Engineer" value={form.details.occupation ?? ''} onChange={(e) => setDetail('occupation', e.target.value)} />
        <Field label="Employer (optional)" value={form.details.employer ?? ''} onChange={(e) => setDetail('employer', e.target.value)} />
        <Field label="Annual Income (optional)" placeholder="e.g. 12 LPA" value={form.details.annualIncome ?? ''} onChange={(e) => setDetail('annualIncome', e.target.value)} />
      </div>
    ),
    validate: (f) => (f.details.highestEducation && f.details.occupation ? null : 'Please fill in education and occupation.'),
  },
  {
    title: 'Family details',
    subtitle: 'A marriage joins two families — help us represent yours.',
    icon: 'diversity_3',
    render: ({ form, setDetail }) => (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select label="Family Type" options={['Nuclear', 'Joint']} value={form.details.familyType ?? ''} onChange={(e) => setDetail('familyType', e.target.value)} />
        <Select label="Family Status" options={['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent']} value={form.details.familyStatus ?? ''} onChange={(e) => setDetail('familyStatus', e.target.value)} />
        <Select label="Family Values" options={['Traditional', 'Moderate', 'Liberal']} value={form.details.familyValues ?? ''} onChange={(e) => setDetail('familyValues', e.target.value)} />
        <Field label="Siblings (optional)" placeholder="e.g. One younger sister" value={form.details.siblings ?? ''} onChange={(e) => setDetail('siblings', e.target.value)} />
        <Field label="Father's Name (optional)" value={form.details.fatherName ?? ''} onChange={(e) => setDetail('fatherName', e.target.value)} />
        <Field label="Father's Occupation (optional)" value={form.details.fatherOccupation ?? ''} onChange={(e) => setDetail('fatherOccupation', e.target.value)} />
        <Field label="Mother's Name (optional)" value={form.details.motherName ?? ''} onChange={(e) => setDetail('motherName', e.target.value)} />
        <Field label="Mother's Occupation (optional)" value={form.details.motherOccupation ?? ''} onChange={(e) => setDetail('motherOccupation', e.target.value)} />
      </div>
    ),
    validate: (f) =>
      f.details.familyType && f.details.familyStatus && f.details.familyValues
        ? null
        : 'Please fill in family type, status and values.',
  },
  {
    title: 'Tell us about yourself',
    subtitle: 'This is the first thing a match reads — make it genuine.',
    icon: 'edit_note',
    render: ({ form, setDetail }) => (
      <div className="flex flex-col gap-5">
        <TextArea
          label="About Me"
          placeholder="Share your interests, what a typical week looks like, what matters to you…"
          value={form.details.aboutMe ?? ''}
          onChange={(e) => setDetail('aboutMe', e.target.value)}
        />
        <TextArea
          label="What I'm Looking For (optional)"
          placeholder="Describe the partner you're hoping to find…"
          value={form.details.partnerExpectations ?? ''}
          onChange={(e) => setDetail('partnerExpectations', e.target.value)}
        />
      </div>
    ),
    validate: (f) =>
      (f.details.aboutMe ?? '').trim().length >= 20 ? null : 'Please write at least a couple of sentences about yourself.',
  },
  {
    title: 'Add your photos',
    subtitle: 'Profiles with a photo get far more attention. Optional, but recommended.',
    icon: 'add_a_photo',
    optional: true,
    render: ({ photos, setPhotos }) => <PhotoStep photos={photos} setPhotos={setPhotos} />,
    skipWhen: ({ photos }) => photos.length === 0,
  },
  {
    title: 'Create your login',
    subtitle: 'Last step — this is how you sign back in.',
    icon: 'lock',
    render: ({ form, set, showPassword, setShowPassword }) => (
      <div className="flex flex-col gap-5">
        <Field label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} autoFocus />
        <Field label="Email Address" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
        <label className="flex flex-col gap-2">
          <span className="font-body text-label-md text-on-surface-variant">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-secondary"
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[19px]" />
            </button>
          </div>
        </label>
      </div>
    ),
    validate: (f) => {
      if (!f.phone.trim()) return 'Please enter a phone number.';
      if (!/^\S+@\S+\.\S+$/.test(f.email)) return 'Please enter a valid email address.';
      if (f.password.length < 8) return 'Password must be at least 8 characters.';
      return null;
    },
  },
];

// ------------------------------------------------------------------ page ---

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, updateProfile, user, ready } = useAuth();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(BLANK);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [biodata, setBiodata] = useState<BiodataSummary | null>(null);

  useEffect(() => {
    if (ready && user) router.replace('/matches');
  }, [ready, user, router]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setDetail = <K extends keyof MemberDetails>(k: K, v: string) =>
    setForm((f) => ({ ...f, details: { ...f.details, [k]: v } }));

  /**
   * Merges a parsed biodata into the form.
   *
   * Only fills blanks: anything the member has already typed wins over the
   * PDF, so re-uploading after correcting a field never silently reverts it.
   */
  function onBiodataParsed(
    draft: BiodataDraft,
    file: File,
    filled: number,
    warnings: string[]
  ) {
    setForm((f) => {
      const next = { ...f, details: { ...f.details } };
      for (const key of ['firstName', 'lastName', 'gender', 'dob', 'email', 'phone'] as const) {
        if (!next[key] && draft[key]) next[key] = draft[key];
      }
      for (const [key, value] of Object.entries(draft.details)) {
        const k = key as keyof MemberDetails;
        if (!next.details[k] && value) next.details[k] = value as never;
      }
      return next;
    });
    setBiodata({ filename: file.name, filled, warnings });
    setError('');
  }

  const total = STEPS.length;
  const current = STEPS[step];
  const isLast = step === total - 1;

  function goNext() {
    setError('');
    const message = current.validate?.(form);
    if (message) {
      setError(message);
      return;
    }
    setStep((s) => Math.min(s + 1, total - 1));
  }

  function goBack() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = current.validate?.(form);
    if (message) {
      setError(message);
      return;
    }

    setError('');
    setPending(true);
    try {
      await signUp({
        profileFor: form.profileFor,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        dob: form.dob,
        email: form.email,
        password: form.password,
      });

      // Everything below runs with the account already created. If any of
      // it fails, the account and its core identity are safe either way —
      // the member can finish the rest from My Profile.
      try {
        await updateProfile({ phone: form.phone, details: form.details });
      } catch {
        /* details can be completed later from /onboarding */
      }

      if (photos.length) {
        setUploadNote(`Uploading photo 1 of ${photos.length}…`);
        let uploaded = 0;
        for (const photo of photos) {
          try {
            await uploadPhoto(photo.file);
            uploaded++;
          } catch {
            /* one bad photo shouldn't block the rest */
          }
          setUploadNote(`Uploading photo ${Math.min(uploaded + 1, photos.length)} of ${photos.length}…`);
        }
      }

      router.push('/matches');
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
      setUploadNote('');
    }
  }

  const progress = ((step + 1) / total) * 100;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary-fixed to-surface px-margin-mobile py-10 sm:py-14">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-5%] top-[-10%] h-[60%] w-[40%] rounded-full bg-primary-fixed/30 opacity-70 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[70%] w-[50%] rounded-full bg-secondary-fixed/20 opacity-60 blur-[120px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container">
            <Icon name="favorite" className="text-on-secondary" filled />
          </span>
          <span className="font-heading text-headline-md text-primary">EverAfter</span>
        </Link>

        <div className="w-full overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
          {/* Progress */}
          <div className="border-b border-outline-variant/30 px-6 pb-5 pt-6 sm:px-10">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-body text-label-md uppercase tracking-wide text-on-surface-variant">
                Step {step + 1} of {total}
                {current.optional && <span className="ml-1.5 text-secondary">· Optional</span>}
              </span>
              <span className="font-body text-label-md text-on-surface-variant">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-variant">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <form onSubmit={submit} className="px-6 py-8 sm:px-10 sm:py-10">
            <div key={step} className="animate-step-in">
              <div className="mb-8 flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary-container/20">
                  <Icon name={current.icon} className="text-[24px] text-secondary" />
                </span>
                <div>
                  <h1 className="font-heading text-[24px] leading-tight text-on-surface sm:text-headline-md">
                    {current.title}
                  </h1>
                  <p className="mt-1 font-body text-body-md text-on-surface-variant">
                    {current.subtitle}
                  </p>
                </div>
              </div>

              {current.render({
                form,
                set,
                setDetail,
                photos,
                setPhotos,
                showPassword,
                setShowPassword,
                biodata,
                onBiodataParsed,
              })}
            </div>

            {error && (
              <p role="alert" className="mt-6 flex items-center gap-2 font-body text-label-md text-error">
                <Icon name="error" className="text-[16px]" />
                {error}
              </p>
            )}

            {uploadNote && (
              <p role="status" className="mt-6 flex items-center gap-2 font-body text-label-md text-secondary">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary/40 border-t-secondary" />
                {uploadNote}
              </p>
            )}

            <div className="mt-10 flex items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-lg border-[1.5px] border-outline-variant px-6 py-3.5 font-body text-label-lg uppercase text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary disabled:opacity-50"
                >
                  <Icon name="arrow_back" className="text-[18px]" />
                  Back
                </button>
              )}

              {isLast ? (
                <button
                  type="submit"
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-3.5 font-body text-label-lg uppercase text-on-secondary shadow-md transition-colors hover:bg-on-secondary-container disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary/40 border-t-on-secondary" />
                      Creating your profile…
                    </>
                  ) : (
                    <>
                      Create My Profile
                      <Icon name="check" className="text-[18px]" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="group flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-3.5 font-body text-label-lg uppercase text-on-secondary shadow-md transition-colors hover:bg-on-secondary-container"
                >
                  {current.optional && current.skipWhen?.({ photos, biodata })
                    ? 'Skip For Now'
                    : 'Continue'}
                  <Icon name="arrow_forward" className="text-[18px] transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          </form>
        </div>

        <p className="mt-6 font-body text-body-md text-on-surface-variant">
          Already have an account?{' '}
          <Link href="/login" className="font-body text-label-lg text-secondary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
