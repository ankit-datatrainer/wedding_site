'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { homePathFor, useAdminAuth } from '@/lib/adminAuth';

const HIGHLIGHTS = [
  { icon: 'group', label: 'Member management', body: 'Search, review and moderate every registered account.' },
  { icon: 'favorite', label: 'The matching pool', body: 'Full control over the profiles the algorithm ranks.' },
  { icon: 'insights', label: 'Live metrics', body: 'Revenue, growth and engagement at a glance.' },
];

export default function AdminLoginPage() {
  const { admin, session, ready, can, signIn } = useAdminAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && admin) router.replace(homePathFor(session, can));
  }, [ready, admin, session, can, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  const inputBase =
    'w-full rounded-lg border border-white/15 bg-white/5 py-3.5 pl-11 pr-4 font-body text-body-md text-inverse-on-surface placeholder:text-inverse-on-surface/40 outline-none transition-colors focus:border-secondary-fixed-dim focus:bg-white/[0.08]';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#1a0410] px-margin-mobile py-12">
      {/* Ambient background: the same burgundy → pink language as the rest of
          the site, just deep and dim enough to read as "staff console" rather
          than the public marketing hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 12% 8%, rgba(232,82,131,0.22), transparent 60%), ' +
            'radial-gradient(50% 45% at 88% 92%, rgba(212,175,55,0.14), transparent 60%), ' +
            'linear-gradient(160deg, #2D0312 0%, #1a0410 55%, #10030b 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10 lg:grid-cols-[1.1fr_1fr]">
        {/* Brand / context panel */}
        <div className="hidden flex-col justify-between bg-white/[0.03] p-10 backdrop-blur-sm lg:flex">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_0_0_4px_rgba(232,82,131,0.15)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
                <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
              </span>
              <span className="font-heading text-[22px] text-inverse-on-surface">EverAfter</span>
            </div>

            <h1 className="mt-12 max-w-sm text-balance font-heading text-[34px] leading-[1.15] text-inverse-on-surface">
              The console behind every <span className="text-secondary-fixed-dim">match</span>.
            </h1>
            <p className="mt-4 max-w-sm font-body text-body-md text-inverse-on-surface/60">
              Sign in with your staff credentials to manage members, the matching directory,
              payments and the newsletter list.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.label} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                  <Icon name={h.icon} className="text-[20px] text-secondary-fixed-dim" />
                </span>
                <div>
                  <p className="font-body text-body-md font-semibold text-inverse-on-surface">
                    {h.label}
                  </p>
                  <p className="font-body text-label-md text-inverse-on-surface/55">{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Sign-in form */}
        <div className="flex flex-col justify-center bg-white/[0.04] p-8 backdrop-blur-xl sm:p-12">
          <div className="mb-2 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src="/logo-mark.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="font-heading text-[19px] text-inverse-on-surface">EverAfter</span>
          </div>

          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-wider text-secondary-fixed-dim ring-1 ring-white/10">
            <Icon name="shield_lock" className="text-[13px]" />
            Staff Only
          </span>

          <h2 className="font-heading text-[28px] text-inverse-on-surface">Admin &amp; Team Sign In</h2>
          <p className="mt-1.5 font-body text-body-md text-inverse-on-surface/55">
            Super admin and team accounts (staff, managers, editors) sign in here.
          </p>

          <form className="mt-8 flex flex-col gap-5" onSubmit={submit}>
            <label className="flex flex-col gap-2">
              <span className="font-body text-label-md text-inverse-on-surface/70">Email</span>
              <div className="relative">
                <Icon
                  name="mail"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-inverse-on-surface/40"
                />
                <input
                  type="email"
                  required
                  autoComplete="username"
                  autoFocus
                  placeholder="admin@everafter.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                />
              </div>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-body text-label-md text-inverse-on-surface/70">Password</span>
              <div className="relative">
                <Icon
                  name="lock"
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-inverse-on-surface/40"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputBase} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-inverse-on-surface/40 transition-colors hover:text-inverse-on-surface/80"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[19px]" />
                </button>
              </div>
            </label>

            {error && (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-lg bg-error/10 px-3.5 py-2.5 font-body text-label-md text-error-container ring-1 ring-error/20"
              >
                <Icon name="error" className="text-[16px] shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="group relative mt-2 flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-secondary px-8 py-3.5 font-body text-label-lg uppercase text-on-secondary shadow-[0_8px_24px_-8px_rgba(232,82,131,0.6)] transition-all hover:bg-secondary-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary/40 border-t-on-secondary" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <Icon
                    name="arrow_forward"
                    className="text-[18px] transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 flex items-center gap-1.5 font-body text-label-md text-inverse-on-surface/35">
            <Icon name="verified_user" className="text-[15px]" />
            Access is limited to authorised EverAfter staff accounts.
          </p>
        </div>
      </div>
    </main>
  );
}
