'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { serverSafeMedia } from '@/lib/media';
import { useAuth } from '@/lib/auth';

const PROFILE_FOR = [
  { value: 'self', label: 'Myself' },
  { value: 'son', label: 'Son' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'relative', label: 'Relative' },
];

const TRUST = [
  { icon: 'verified_user', value: '100%', label: 'Verified Profiles' },
  { icon: 'groups', value: '5 Million+', label: 'Members Worldwide' },
  { icon: 'security', value: 'Privacy', label: 'Protected Always' },
];

const field =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body text-body-md text-on-surface transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, user, ready } = useAuth();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    profileFor: 'self',
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    if (ready && user) router.replace('/browse');
  }, [ready, user, router]);

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function next() {
    setError('');
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!form.gender) {
      setError('Please select a gender.');
      return;
    }
    if (!form.dob) {
      setError('Please enter a date of birth.');
      return;
    }
    setStep(2);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await signUp(form);
      router.push('/onboarding');
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-start justify-center bg-gradient-to-br from-primary-fixed to-surface">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-5%] top-[-10%] h-[60%] w-[40%] rounded-full bg-primary-fixed/30 opacity-70 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[70%] w-[50%] rounded-full bg-secondary-fixed/20 opacity-60 blur-[120px]" />
      </div>

      <div className="z-10 mx-auto flex w-full max-w-container flex-col items-center px-margin-mobile py-section-gap-mobile">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-20">
          <h1 className="mb-4 font-heading text-display-lg-mobile text-on-surface md:text-display-lg">
            Begin Your Journey to <span className="italic text-secondary">Forever</span>
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant">
            Join our trusted community. Over 5 million success stories started with this simple step.
          </p>
        </div>

        <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-surface-container-lowest shadow-xl">
          <div className="absolute left-0 top-0 h-1 w-full bg-surface-variant">
            <div
              className="h-full rounded-r-full bg-secondary transition-all duration-500 ease-in-out"
              style={{ width: step === 1 ? '25%' : '75%' }}
            />
          </div>

          <div className="flex flex-col gap-12 p-8 md:flex-row md:p-12">
            <div className="flex-1">
              <h2 className="mb-8 font-heading text-headline-md text-on-surface">
                {step === 1 ? "Let's start with the basics" : 'Secure your account'}
              </h2>

              <form className="space-y-8" onSubmit={submit}>
                {step === 1 ? (
                  <>
                    <fieldset className="space-y-4">
                      <legend className="block font-body text-label-lg uppercase tracking-wider text-on-surface">
                        Creating Profile For
                      </legend>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {PROFILE_FOR.map((option) => (
                          <label key={option.value} className="relative cursor-pointer">
                            <input
                              className="peer sr-only"
                              type="radio"
                              name="profileFor"
                              value={option.value}
                              checked={form.profileFor === option.value}
                              onChange={(e) => set('profileFor', e.target.value)}
                            />
                            <span className="block rounded-lg border border-transparent bg-surface-container-low px-4 py-3 text-center font-body text-body-md text-on-surface-variant transition-all peer-checked:border-secondary peer-checked:bg-secondary-fixed peer-checked:text-secondary peer-checked:shadow-sm">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                          <label
                            className="block font-body text-label-md text-on-surface-variant"
                            htmlFor="firstName"
                          >
                            First Name
                          </label>
                          <input
                            id="firstName"
                            className={field}
                            placeholder="Enter first name"
                            value={form.firstName}
                            onChange={(e) => set('firstName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <label
                            className="block font-body text-label-md text-on-surface-variant"
                            htmlFor="lastName"
                          >
                            Last Name
                          </label>
                          <input
                            id="lastName"
                            className={field}
                            placeholder="Enter last name"
                            value={form.lastName}
                            onChange={(e) => set('lastName', e.target.value)}
                          />
                        </div>
                      </div>

                      <fieldset className="space-y-3">
                        <legend className="block font-body text-label-md text-on-surface-variant">
                          Gender
                        </legend>
                        <div className="flex gap-6">
                          {['male', 'female'].map((g) => (
                            <label key={g} className="flex cursor-pointer items-center gap-2">
                              <input
                                type="radio"
                                name="gender"
                                value={g}
                                checked={form.gender === g}
                                onChange={(e) => set('gender', e.target.value)}
                                className="h-5 w-5 accent-[#b02559]"
                              />
                              <span className="font-body text-body-md capitalize text-on-surface">
                                {g}
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className="space-y-2">
                        <label
                          className="block font-body text-label-md text-on-surface-variant"
                          htmlFor="dob"
                        >
                          Date of Birth
                        </label>
                        <input
                          id="dob"
                          type="date"
                          className={field}
                          value={form.dob}
                          onChange={(e) => set('dob', e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label
                        className="block font-body text-label-md text-on-surface-variant"
                        htmlFor="email"
                      >
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        className={field}
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="block font-body text-label-md text-on-surface-variant"
                        htmlFor="password"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        className={field}
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={(e) => set('password', e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="font-body text-label-md uppercase text-on-surface-variant hover:text-secondary"
                    >
                      ← Back to basics
                    </button>
                  </div>
                )}

                {error && (
                  <p role="alert" className="font-body text-label-md text-error">
                    {error}
                  </p>
                )}

                <div className="pt-2">
                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={next}
                      className="group flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-8 py-4 font-body text-label-lg text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container"
                    >
                      Continue
                      <Icon
                        name="arrow_forward"
                        className="text-[20px] transition-transform group-hover:translate-x-1"
                      />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={pending}
                      className="w-full rounded-lg bg-secondary px-8 py-4 font-body text-label-lg text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container disabled:opacity-60"
                    >
                      {pending ? 'Creating your profile…' : 'Create My Profile'}
                    </button>
                  )}
                </div>

                <p className="mt-4 text-center font-body text-sm text-on-surface-variant">
                  Already have an account?{' '}
                  <Link href="/login" className="font-body text-label-lg text-secondary hover:underline">
                    Log in
                  </Link>
                </p>
              </form>
            </div>

            <aside className="hidden w-64 flex-col justify-center gap-10 border-l border-surface-variant pl-12 md:flex">
              {TRUST.map((badge) => (
                <div key={badge.label} className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed shadow-sm">
                    <Icon name={badge.icon} className="text-secondary" filled />
                  </span>
                  <span>
                    <span className="block font-body text-[16px] font-semibold text-on-surface">
                      {badge.value}
                    </span>
                    <span className="block font-body text-label-md text-on-surface-variant">
                      {badge.label}
                    </span>
                  </span>
                </div>
              ))}

              <div className="group relative mt-8 h-48 w-full overflow-hidden rounded-xl shadow-md">
                <div className="absolute inset-0 z-10 bg-on-surface/20 transition-colors duration-500 group-hover:bg-transparent" />
                <Image
                  src={serverSafeMedia.jewellery}
                  alt="Traditional Indian gold wedding jewellery on burgundy velvet"
                  fill
                  sizes="256px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
