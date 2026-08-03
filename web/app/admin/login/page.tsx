'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useAdminAuth } from '@/lib/adminAuth';

export default function AdminLoginPage() {
  const { admin, ready, signIn } = useAdminAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && admin) router.replace('/admin/dashboard');
  }, [ready, admin, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await signIn(email, password);
      router.push('/admin/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-inverse-surface px-margin-mobile">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-float sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Icon name="admin_panel_settings" className="text-on-primary" />
          </span>
          <h1 className="font-heading text-[26px] text-primary">Super Admin</h1>
          <p className="font-body text-label-md text-on-surface-variant">
            Restricted access — EverAfter staff only.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={submit}>
          <label className="flex flex-col gap-2">
            <span className="font-body text-label-md text-on-surface-variant">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-body text-label-md text-on-surface-variant">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>

          {error && (
            <p role="alert" className="font-body text-label-md text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-primary px-8 py-3.5 font-body text-label-lg uppercase text-on-primary shadow-sm transition-colors hover:bg-on-primary-container disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </main>
  );
}
