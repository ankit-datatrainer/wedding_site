'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { PhotoUploader } from '@/components/PhotoUploader';
import { useAuth } from '@/lib/auth';
import type { MemberDetails } from '@/lib/types';

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body text-body-md text-on-surface transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-label-md text-on-surface-variant">{label}</span>
      <input className={inputClass} {...props} />
    </label>
  );
}

function TextArea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-2 sm:col-span-2">
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

function Section({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface-container-lowest p-6 shadow-card sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container/20">
          <Icon name={icon} className="text-secondary" />
        </span>
        <h2 className="font-heading text-[22px] text-primary">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function OnboardingPage() {
  const { user, ready, updateProfile } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [details, setDetails] = useState<MemberDetails>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  });

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login?next=/onboarding');
      return;
    }
    setPhone(user.phone ?? '');
    setDetails(user.details ?? {});
    setPhotos(user.photos ?? []);
    setPhotoUrl(user.photo_url ?? null);
  }, [ready, user, router]);

  const set = <K extends keyof MemberDetails>(key: K, value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: 'idle', message: '' });
    try {
      await updateProfile({ phone, details });
      setStatus({ kind: 'ok', message: 'Your profile has been saved.' });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-3xl px-margin-mobile py-24">
        <div className="h-64 animate-pulse rounded-2xl bg-surface-container-low" />
      </div>
    );
  }

  return (
    <div className="w-full bg-surface pb-section-gap-mobile">
      <section className="w-full bg-primary-fixed/40 py-16">
        <div className="mx-auto max-w-3xl px-margin-mobile">
          <h1 className="font-heading text-headline-md text-primary lg:text-headline-lg">
            Complete Your Profile
          </h1>
          <p className="mt-4 font-body text-body-lg text-on-surface-variant">
            The more you share, the better we can match you. Save any time — nothing here is
            required before you can browse or shortlist profiles.
          </p>
        </div>
      </section>

      <form onSubmit={save} className="mx-auto mt-12 flex max-w-3xl flex-col gap-8 px-margin-mobile">
        <Section icon="add_a_photo" title="Photos">
          <div className="sm:col-span-2">
            <PhotoUploader
              photos={photos}
              photoUrl={photoUrl}
              onChange={(next) => {
                setPhotos(next.photos);
                setPhotoUrl(next.photo_url);
              }}
            />
          </div>
        </Section>

        <Section icon="person" title="About You">
          <Field
            label="Phone Number"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
          <Field
            label="Height (cm)"
            type="number"
            min={120}
            max={230}
            value={details.heightCm ?? ''}
            onChange={(e) => set('heightCm', e.target.value)}
          />
          <Field
            label="Weight (kg)"
            type="number"
            min={30}
            max={200}
            value={details.weightKg ?? ''}
            onChange={(e) => set('weightKg', e.target.value)}
          />
          <Select
            label="Marital Status"
            options={['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']}
            value={details.maritalStatus ?? ''}
            onChange={(e) => set('maritalStatus', e.target.value)}
          />
          <Select
            label="Diet"
            options={['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']}
            value={details.diet ?? ''}
            onChange={(e) => set('diet', e.target.value)}
          />
          <Field
            label="Mother Tongue"
            value={details.motherTongue ?? ''}
            onChange={(e) => set('motherTongue', e.target.value)}
          />
          <Select
            label="Smoking"
            options={['No', 'Occasionally', 'Yes']}
            value={details.smoking ?? ''}
            onChange={(e) => set('smoking', e.target.value)}
          />
          <Select
            label="Drinking"
            options={['No', 'Occasionally', 'Yes']}
            value={details.drinking ?? ''}
            onChange={(e) => set('drinking', e.target.value)}
          />
          <Field
            label="Any Disability (optional)"
            value={details.disability ?? ''}
            onChange={(e) => set('disability', e.target.value)}
          />
        </Section>

        <Section icon="auto_awesome" title="Religion &amp; Horoscope">
          <Field
            label="Religion"
            value={details.religion ?? ''}
            onChange={(e) => set('religion', e.target.value)}
          />
          <Field
            label="Community / Caste"
            value={details.community ?? ''}
            onChange={(e) => set('community', e.target.value)}
          />
          <Field
            label="Gothram"
            value={details.gothram ?? ''}
            onChange={(e) => set('gothram', e.target.value)}
          />
          <Select
            label="Manglik"
            options={['Yes', 'No', "Don't Know"]}
            value={details.manglik ?? ''}
            onChange={(e) => set('manglik', e.target.value)}
          />
          <Field
            label="Rashi (Moon Sign)"
            value={details.rashi ?? ''}
            onChange={(e) => set('rashi', e.target.value)}
          />
          <Field
            label="Nakshatra"
            value={details.nakshatra ?? ''}
            onChange={(e) => set('nakshatra', e.target.value)}
          />
        </Section>

        <Section icon="location_on" title="Location">
          <Field
            label="Country"
            value={details.country ?? ''}
            onChange={(e) => set('country', e.target.value)}
          />
          <Field
            label="State"
            value={details.state ?? ''}
            onChange={(e) => set('state', e.target.value)}
          />
          <Field
            label="City"
            value={details.city ?? ''}
            onChange={(e) => set('city', e.target.value)}
          />
          <Field
            label="PIN Code"
            value={details.pincode ?? ''}
            onChange={(e) => set('pincode', e.target.value)}
          />
          <TextArea
            label="Address"
            value={details.address ?? ''}
            onChange={(e) => set('address', e.target.value)}
          />
        </Section>

        <Section icon="school" title="Education &amp; Career">
          <Field
            label="Highest Education"
            value={details.highestEducation ?? ''}
            onChange={(e) => set('highestEducation', e.target.value)}
          />
          <Field
            label="College / University"
            value={details.college ?? ''}
            onChange={(e) => set('college', e.target.value)}
          />
          <Field
            label="Occupation"
            value={details.occupation ?? ''}
            onChange={(e) => set('occupation', e.target.value)}
          />
          <Field
            label="Employer"
            value={details.employer ?? ''}
            onChange={(e) => set('employer', e.target.value)}
          />
          <Field
            label="Annual Income"
            value={details.annualIncome ?? ''}
            onChange={(e) => set('annualIncome', e.target.value)}
            placeholder="e.g. 12 LPA"
          />
        </Section>

        <Section icon="diversity_3" title="Family Details">
          <Field
            label="Father's Name"
            value={details.fatherName ?? ''}
            onChange={(e) => set('fatherName', e.target.value)}
          />
          <Field
            label="Father's Occupation"
            value={details.fatherOccupation ?? ''}
            onChange={(e) => set('fatherOccupation', e.target.value)}
          />
          <Field
            label="Father's Email"
            type="email"
            value={details.fatherEmail ?? ''}
            onChange={(e) => set('fatherEmail', e.target.value)}
            placeholder="father@example.com"
          />
          <Field
            label="Mother's Name"
            value={details.motherName ?? ''}
            onChange={(e) => set('motherName', e.target.value)}
          />
          <Field
            label="Mother's Occupation"
            value={details.motherOccupation ?? ''}
            onChange={(e) => set('motherOccupation', e.target.value)}
          />
          <Field
            label="Mother's Email"
            type="email"
            value={details.motherEmail ?? ''}
            onChange={(e) => set('motherEmail', e.target.value)}
            placeholder="mother@example.com"
          />
          <Field
            label="Siblings"
            value={details.siblings ?? ''}
            onChange={(e) => set('siblings', e.target.value)}
            placeholder="e.g. One younger sister, married"
          />
          <Select
            label="Family Type"
            options={['Nuclear', 'Joint']}
            value={details.familyType ?? ''}
            onChange={(e) => set('familyType', e.target.value)}
          />
          <Select
            label="Family Status"
            options={['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent']}
            value={details.familyStatus ?? ''}
            onChange={(e) => set('familyStatus', e.target.value)}
          />
          <Select
            label="Family Values"
            options={['Traditional', 'Moderate', 'Liberal']}
            value={details.familyValues ?? ''}
            onChange={(e) => set('familyValues', e.target.value)}
          />
        </Section>

        <Section icon="badge" title="Reference from Biodata">
          <Field
            label="Reference Person's Name"
            value={details.referenceName ?? ''}
            onChange={(e) => set('referenceName', e.target.value)}
            placeholder="e.g. Ramesh Chandra, Mr. S.K. Gupta"
          />
          <Field
            label="Reference Phone Number"
            type="tel"
            value={details.referencePhone ?? ''}
            onChange={(e) => set('referencePhone', e.target.value)}
            placeholder="e.g. +91 98765 43210"
          />
          <div className="sm:col-span-2">
            <Field
              label="Who referred you / Relation"
              value={details.referredBy ?? ''}
              onChange={(e) => set('referredBy', e.target.value)}
              placeholder="e.g. Family Friend, Uncle, Community Elder, Colleague"
            />
          </div>
        </Section>

        <Section icon="edit_note" title="About &amp; Partner Preferences">
          <TextArea
            label="About Me"
            value={details.aboutMe ?? ''}
            onChange={(e) => set('aboutMe', e.target.value)}
            placeholder="Tell prospective matches about yourself…"
          />
          <TextArea
            label="What I'm Looking For"
            value={details.partnerExpectations ?? ''}
            onChange={(e) => set('partnerExpectations', e.target.value)}
            placeholder="Describe the partner you're hoping to find…"
          />
        </Section>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-secondary px-8 py-3.5 font-body text-label-lg uppercase text-on-secondary shadow-md transition-colors hover:bg-on-secondary-container disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
            <Link
              href="/browse"
              className="rounded-lg border-[1.5px] border-secondary px-8 py-3.5 text-center font-body text-label-lg uppercase text-secondary transition-colors hover:bg-secondary hover:text-on-secondary"
            >
              Browse Profiles
            </Link>
          </div>
          {status.kind !== 'idle' && (
            <p
              role="status"
              className={`font-body text-label-md ${
                status.kind === 'ok' ? 'text-secondary' : 'text-error'
              }`}
            >
              {status.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
