'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { serverSafeMedia } from '@/lib/media';
import { useAuth } from '@/lib/auth';

const field =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 font-body text-body-md text-on-surface transition-colors focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/browse';
  const { signIn, user, ready } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      await signIn(email, password);
      router.push(next);
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit}>
      <div className="space-y-2">
        <label className="block font-body text-label-md text-on-surface-variant" htmlFor="email">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className={field}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block font-body text-label-md text-on-surface-variant" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="font-body text-label-md text-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-secondary px-8 py-4 font-body text-label-lg uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Log In'}
      </button>

      <p className="text-center font-body text-sm text-on-surface-variant">
        New to EverAfter?{' '}
        <Link href="/register" className="font-body text-label-lg text-secondary hover:underline">
          Create your profile
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-[calc(100vh-80px)] grid-cols-1 lg:grid-cols-2">
      <div className="flex items-center justify-center bg-surface px-margin-mobile py-20">
        <div className="w-full max-w-md">
          <h1 className="mb-3 font-heading text-headline-md text-primary">Welcome back</h1>
          <p className="mb-10 font-body text-body-md text-on-surface-variant">
            Sign in to continue where you left off.
          </p>
          <Suspense fallback={<div className="h-80 rounded-xl bg-surface-container-low" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <div className="relative hidden lg:block">
        <Image
          src={serverSafeMedia.hero}
          alt="An Indian couple in traditional wedding attire"
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container/60 to-transparent" />
      </div>
    </div>
  );
}
