'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAdminAuth } from '@/lib/adminAuth';

/** Bare /admin just routes to the right place once auth state is known. */
export default function AdminIndexPage() {
  const { admin, ready } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(admin ? '/admin/dashboard' : '/admin/login');
  }, [ready, admin, router]);

  return null;
}
