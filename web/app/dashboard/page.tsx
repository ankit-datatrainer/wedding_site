'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { api, mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { PartnerPreferences, Paged, Profile } from '@/lib/types';

export default function DashboardPage() {
  const { user, ready, updateProfile } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Quick stats
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [shortlistCount, setShortlistCount] = useState<number | null>(null);

  // Preference state
  const [professionType, setProfessionType] = useState<'businessman' | 'job' | 'any'>('any');
  const [diet, setDiet] = useState<'vegetarian' | 'non_vegetarian' | 'any'>('any');
  const [sameCaste, setSameCaste] = useState<boolean>(false);
  const [ageMin, setAgeMin] = useState<number>(21);
  const [ageMax, setAgeMax] = useState<number>(35);
  const [location, setLocation] = useState<string>('');

  // Hydrate preferences from user profile
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login?next=/dashboard');
      return;
    }

    const prefs = user.details?.partnerPreferences;
    if (prefs) {
      if (prefs.professionType) setProfessionType(prefs.professionType);
      if (prefs.diet) setDiet(prefs.diet);
      if (typeof prefs.sameCaste === 'boolean') setSameCaste(prefs.sameCaste);
      if (prefs.ageMin) setAgeMin(Number(prefs.ageMin));
      if (prefs.ageMax) setAgeMax(Number(prefs.ageMax));
      if (prefs.location) setLocation(prefs.location);
    }

    // Fetch quick counts
    api<Paged<Profile>>('/api/matches?pageSize=1', { auth: true })
      .then((res) => setMatchesCount(res.total))
      .catch(() => setMatchesCount(null));

    api<Profile[]>('/api/shortlist', { auth: true })
      .then((res) => setShortlistCount(Array.isArray(res) ? res.length : 0))
      .catch(() => setShortlistCount(null));
  }, [ready, user, router]);

  const handleSavePreferences = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setError('');
      setSaveSuccess(false);

      const updatedPrefs: PartnerPreferences = {
        professionType,
        diet,
        sameCaste,
        ageMin,
        ageMax,
        location: location.trim() || undefined,
      };

      try {
        await updateProfile({
          details: {
            ...(user?.details || {}),
            partnerPreferences: updatedPrefs,
          },
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 5000);
      } catch (err) {
        setError((err as Error).message || 'Failed to save preferences');
      } finally {
        setSaving(false);
      }
    },
    [professionType, diet, sameCaste, ageMin, ageMax, location, user, updateProfile]
  );

  if (!ready || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 font-body text-body-md text-on-surface-variant">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  const d = user.details || {};
  const isPdf = user.photo_url?.toLowerCase().endsWith('.pdf');

  return (
    <main className="min-h-screen bg-surface px-margin-mobile py-10 sm:py-14">
      <div className="mx-auto max-w-container">
        {/* Welcome Header */}
        <header className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary-container/20 px-3.5 py-1 text-label-md font-semibold text-secondary">
              <Icon name="verified_user" className="text-[16px]" />
              <span>Verified Matrimonial Dashboard</span>
            </div>
            <h1 className="mt-2.5 font-heading text-headline-md text-primary sm:text-headline-lg">
              Namaste, {user.first_name} 👋
            </h1>
            <p className="mt-1 font-body text-body-md text-on-surface-variant">
              Manage your partner search criteria, view personalized matches, and review family details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 font-body text-label-lg font-semibold text-on-secondary shadow-sm transition-all hover:bg-on-secondary-container hover:shadow-md"
            >
              <Icon name="favorite" className="text-[18px]" filled />
              <span>View Matches ({matchesCount ?? '…'})</span>
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-5 py-2.5 font-body text-label-lg font-semibold text-on-surface transition-colors hover:border-secondary hover:text-secondary"
            >
              <Icon name="edit" className="text-[18px]" />
              <span>Edit Biodata</span>
            </Link>
          </div>
        </header>

        {/* Quick Stats Grid */}
        <section aria-label="Quick statistics" className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Link
            href="/matches"
            className="group rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card transition-all hover:border-secondary hover:shadow-float"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-label-md text-on-surface-variant">Matches For You</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container/20 text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                <Icon name="favorite" className="text-[18px]" filled />
              </span>
            </div>
            <p className="mt-3 font-heading text-headline-md text-primary">
              {matchesCount !== null ? matchesCount : '—'}
            </p>
            <span className="mt-1 flex items-center gap-1 font-body text-label-sm text-secondary">
              <span>Personalized feed</span>
              <Icon name="arrow_forward" className="text-[14px]" />
            </span>
          </Link>

          <Link
            href="/shortlist"
            className="group rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card transition-all hover:border-secondary hover:shadow-float"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-label-md text-on-surface-variant">Shortlisted</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-fixed/30 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                <Icon name="bookmark" className="text-[18px]" />
              </span>
            </div>
            <p className="mt-3 font-heading text-headline-md text-primary">
              {shortlistCount !== null ? shortlistCount : '0'}
            </p>
            <span className="mt-1 flex items-center gap-1 font-body text-label-sm text-primary">
              <span>Saved candidates</span>
              <Icon name="arrow_forward" className="text-[14px]" />
            </span>
          </Link>

          <Link
            href="/interests"
            className="group rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card transition-all hover:border-secondary hover:shadow-float"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-label-md text-on-surface-variant">Interests Sent</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container/20 text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                <Icon name="volunteer_activism" className="text-[18px]" />
              </span>
            </div>
            <p className="mt-3 font-heading text-headline-md text-primary">Active</p>
            <span className="mt-1 flex items-center gap-1 font-body text-label-sm text-secondary">
              <span>View requests</span>
              <Icon name="arrow_forward" className="text-[14px]" />
            </span>
          </Link>

          <Link
            href="/membership"
            className="group rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-card transition-all hover:border-secondary hover:shadow-float"
          >
            <div className="flex items-center justify-between">
              <span className="font-body text-label-md text-on-surface-variant">Plan Status</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-container/20 text-secondary transition-colors group-hover:bg-secondary group-hover:text-on-secondary">
                <Icon name="workspace_premium" className="text-[18px]" />
              </span>
            </div>
            <p className="mt-3 font-heading text-headline-md text-primary capitalize">
              {user.plan_id ? user.plan_id : 'Free Member'}
            </p>
            <span className="mt-1 flex items-center gap-1 font-body text-label-sm text-secondary">
              <span>Upgrade privileges</span>
              <Icon name="arrow_forward" className="text-[14px]" />
            </span>
          </Link>
        </section>

        {/* Main Content: Left Preferences (Feature Focus) & Right Profile Summary */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Partner Preferences Form (2 Columns) */}
          <div className="lg:col-span-2">
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary-container/30 text-secondary">
                  <Icon name="tune" className="text-[26px]" />
                </span>
                <div>
                  <h2 className="font-heading text-headline-sm text-primary">
                    Partner Preferences & Match Criteria
                  </h2>
                  <p className="mt-1 font-body text-body-md text-on-surface-variant">
                    Tell us what matters most in your life partner. These criteria directly influence your match score and ordering on the Matches page.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <div
                  role="status"
                  className="mb-6 flex items-center gap-3 rounded-xl border border-secondary/30 bg-secondary-container/15 p-4 text-secondary"
                >
                  <Icon name="check_circle" className="text-[20px]" filled />
                  <p className="font-body text-body-sm font-semibold">
                    Preferences saved successfully! Your candidate recommendations have been dynamically updated.
                  </p>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-6 flex items-center gap-3 rounded-xl border border-error/30 bg-error-container/20 p-4 text-error"
                >
                  <Icon name="error" className="text-[20px]" />
                  <p className="font-body text-body-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSavePreferences} className="flex flex-col gap-8">
                {/* 1. Profession Preference: Businessman vs Job */}
                <div>
                  <label className="mb-2 block font-heading text-[17px] text-primary">
                    1. Career & Profession Preference
                  </label>
                  <p className="mb-3.5 font-body text-body-sm text-on-surface-variant">
                    Select whether you prefer someone from the business sector or a salaried professional.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setProfessionType('job')}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        professionType === 'job'
                          ? 'border-secondary bg-secondary-container/20 text-secondary shadow-sm ring-2 ring-secondary'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-secondary'
                      }`}
                    >
                      <Icon name="work" className="text-[24px]" />
                      <span className="font-body text-label-lg font-bold">Salaried / Job</span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        Corporate, Tech, Govt, Doctors
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfessionType('businessman')}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        professionType === 'businessman'
                          ? 'border-secondary bg-secondary-container/20 text-secondary shadow-sm ring-2 ring-secondary'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-secondary'
                      }`}
                    >
                      <Icon name="storefront" className="text-[24px]" />
                      <span className="font-body text-label-lg font-bold">Businessman</span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        Entrepreneurs, Business owners
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setProfessionType('any')}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        professionType === 'any'
                          ? 'border-secondary bg-secondary-container/20 text-secondary shadow-sm ring-2 ring-secondary'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-secondary'
                      }`}
                    >
                      <Icon name="public" className="text-[24px]" />
                      <span className="font-body text-label-lg font-bold">Open to Both</span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        No specific career restriction
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Diet Preference: Vegetarian vs Non-Vegetarian */}
                <div>
                  <label className="mb-2 block font-heading text-[17px] text-primary">
                    2. Dietary Lifestyle
                  </label>
                  <p className="mb-3.5 font-body text-body-sm text-on-surface-variant">
                    Choose whether vegetarianism is an important requirement for your match.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setDiet('vegetarian')}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        diet === 'vegetarian'
                          ? 'border-secondary bg-secondary-container/20 text-secondary shadow-sm ring-2 ring-secondary'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-secondary'
                      }`}
                    >
                      <Icon name="spa" className="text-[24px] text-emerald-600" />
                      <span className="font-body text-label-lg font-bold">Vegetarian</span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        Strictly vegetarian diet
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiet('non_vegetarian')}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        diet === 'non_vegetarian'
                          ? 'border-secondary bg-secondary-container/20 text-secondary shadow-sm ring-2 ring-secondary'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-secondary'
                      }`}
                    >
                      <Icon name="restaurant" className="text-[24px]" />
                      <span className="font-body text-label-lg font-bold">Non-Vegetarian</span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        Open to non-veg or eggetarian
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiet('any')}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
                        diet === 'any'
                          ? 'border-secondary bg-secondary-container/20 text-secondary shadow-sm ring-2 ring-secondary'
                          : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:border-secondary'
                      }`}
                    >
                      <Icon name="all_inclusive" className="text-[24px]" />
                      <span className="font-body text-label-lg font-bold">No Restriction</span>
                      <span className="font-body text-[11px] text-on-surface-variant">
                        Any dietary background
                      </span>
                    </button>
                  </div>
                </div>

                {/* 3. Caste Preference: Same Caste */}
                <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container/30 text-secondary">
                        <Icon name="diversity_3" className="text-[20px]" />
                      </span>
                      <div>
                        <span className="font-heading text-[16px] text-primary">
                          Same Caste & Community Preference
                        </span>
                        <p className="mt-0.5 font-body text-body-sm text-on-surface-variant">
                          When checked, profiles matching your community ({d.community || 'your caste'}) receive highest priority matching boost (+20 points).
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={sameCaste}
                        onChange={(e) => setSameCaste(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-7 w-12 rounded-full bg-outline-variant/60 after:absolute after:left-[4px] after:top-[4px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-secondary peer-checked:after:translate-x-5 peer-focus:outline-none" />
                    </label>
                  </div>
                </div>

                {/* 4. Age Range & Location */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block font-body text-label-md font-semibold text-primary">
                      Preferred Min Age: {ageMin} yrs
                    </label>
                    <input
                      type="range"
                      min={18}
                      max={60}
                      value={ageMin}
                      onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
                      className="w-full accent-secondary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-body text-label-md font-semibold text-primary">
                      Preferred Max Age: {ageMax} yrs
                    </label>
                    <input
                      type="range"
                      min={18}
                      max={60}
                      value={ageMax}
                      onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
                      className="w-full accent-secondary"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-body text-label-md font-semibold text-primary">
                      Preferred City / State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai, Bangalore, or Any"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3.5 py-2 font-body text-body-md text-on-surface transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/30 pt-6">
                  <div className="flex items-center gap-2 text-on-surface-variant font-body text-label-sm">
                    <Icon name="info" className="text-[16px]" />
                    <span>Preferences are applied automatically to your algorithmic feed.</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href="/matches"
                      className="rounded-full border border-outline-variant px-5 py-2.5 font-body text-label-md font-semibold text-on-surface transition-colors hover:border-secondary hover:text-secondary"
                    >
                      Preview Matches
                    </Link>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-full bg-secondary px-6 py-2.5 font-body text-label-md font-semibold text-on-secondary shadow-sm transition-all hover:bg-on-secondary-container disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary border-t-transparent" />
                          <span>Saving…</span>
                        </>
                      ) : (
                        <>
                          <Icon name="check" className="text-[18px]" />
                          <span>Save Preferences</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>

          {/* Right Column: Family & Account Overview */}
          <div className="flex flex-col gap-6">
            {/* Profile Avatar Card */}
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card text-center">
              <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-secondary/30 bg-surface-container-high shadow-md">
                {user.photo_url ? (
                  isPdf ? (
                    <div className="flex flex-col items-center justify-center text-error">
                      <Icon name="picture_as_pdf" className="text-[32px]" />
                      <span className="font-body text-[10px] font-bold uppercase">Biodata PDF</span>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={mediaUrl(user.photo_url)}
                      alt={user.first_name}
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <span className="font-heading text-headline-sm uppercase text-secondary">
                    {user.first_name?.[0] || 'U'}
                  </span>
                )}
              </div>

              <h3 className="font-heading text-[20px] text-primary">
                {user.first_name} {user.last_name}
              </h3>
              <p className="font-body text-body-sm text-on-surface-variant">
                {d.occupation || 'Professional'} {d.city ? `• ${d.city}` : ''}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-secondary-container/20 px-2.5 py-1 font-body text-[11px] font-semibold text-secondary">
                  {user.gender === 'male' ? 'Groom Profile' : 'Bride Profile'}
                </span>
                {d.religion && (
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-body text-[11px] font-medium text-on-surface-variant">
                    {d.religion}
                  </span>
                )}
                {d.community && (
                  <span className="rounded-full bg-surface-container px-2.5 py-1 font-body text-[11px] font-medium text-on-surface-variant">
                    {d.community}
                  </span>
                )}
              </div>

              <div className="mt-5 border-t border-outline-variant/30 pt-4">
                <Link
                  href="/onboarding"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/60 py-2.5 font-body text-label-md font-semibold text-primary transition-colors hover:border-secondary hover:bg-surface-container-low hover:text-secondary"
                >
                  <Icon name="manage_accounts" className="text-[18px]" />
                  <span>Update Photos & Biodata</span>
                </Link>
              </div>
            </section>

            {/* Family & Confirmation Notification Card */}
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container/20 text-secondary">
                  <Icon name="family_restroom" className="text-[20px]" />
                </span>
                <div>
                  <h3 className="font-heading text-[18px] text-primary">Family Email Confirmation</h3>
                  <span className="font-body text-label-sm text-on-surface-variant">
                    Parent notification dispatch status
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 font-body text-body-sm">
                {/* Father Info */}
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">Father&apos;s Contact</span>
                    {d.fatherEmail ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <Icon name="mark_email_read" className="text-[13px]" />
                        <span>Confirmed</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">Not provided</span>
                    )}
                  </div>
                  <p className="mt-1 text-on-surface font-medium">
                    {d.fatherName || 'Name not listed'}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {d.fatherEmail ? d.fatherEmail : 'No notification email set'}
                  </p>
                </div>

                {/* Mother Info */}
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">Mother&apos;s Contact</span>
                    {d.motherEmail ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <Icon name="mark_email_read" className="text-[13px]" />
                        <span>Confirmed</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-on-surface-variant">Not provided</span>
                    )}
                  </div>
                  <p className="mt-1 text-on-surface font-medium">
                    {d.motherName || 'Name not listed'}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {d.motherEmail ? d.motherEmail : 'No notification email set'}
                  </p>
                </div>
              </div>

              <p className="mt-4 font-body text-[12px] text-on-surface-variant">
                Tip: When a parent email is registered, an automated notification is sent informing them of your profile setup on EverAfter.
              </p>
            </section>

            {/* Reference Details Card */}
            <section className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container/20 text-secondary">
                  <Icon name="badge" className="text-[20px]" />
                </span>
                <div>
                  <h3 className="font-heading text-[18px] text-primary">Biodata Reference</h3>
                  <span className="font-body text-label-sm text-on-surface-variant">
                    Referee and relationship details
                  </span>
                </div>
              </div>

              {d.referenceName || d.referencePhone || d.referredBy ? (
                <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3.5 font-body text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{d.referenceName || 'Reference Person'}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container/20 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                      <span>On File</span>
                    </span>
                  </div>
                  {d.referencePhone && (
                    <p className="mt-1.5 text-on-surface flex items-center gap-1.5 text-xs">
                      <Icon name="call" className="text-[14px] text-on-surface-variant" />
                      <span>{d.referencePhone}</span>
                    </p>
                  )}
                  {d.referredBy && (
                    <p className="mt-1 text-xs text-on-surface-variant">
                      <span className="font-medium text-on-surface">Referred by:</span> {d.referredBy}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-outline-variant/60 p-4 text-center">
                  <p className="font-body text-body-sm text-on-surface-variant">
                    No reference contact added yet.
                  </p>
                  <Link
                    href="/onboarding"
                    className="mt-2 inline-block font-body text-label-sm font-semibold text-secondary hover:underline"
                  >
                    + Add reference from biodata
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
