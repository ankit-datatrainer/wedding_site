'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { homePathFor, useAdminAuth } from '@/lib/adminAuth';

/** Bare /admin just routes to the right place once auth state is known. */
export default function AdminIndexPage() {
  const { admin, session, ready, can } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(admin ? homePathFor(session, can) : '/admin/login');
  }, [ready, admin, session, can, router]);

  return null;
}
