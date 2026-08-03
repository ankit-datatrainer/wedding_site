'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { MemberDetailDrawer } from '@/components/admin/MemberDetailDrawer';
import { ADMIN_TOKEN_KEY, API_URL, api, getToken, mediaUrl } from '@/lib/api';
import { useAdminAuth } from '@/lib/adminAuth';
import type { Paged, User } from '@/lib/types';

const PAGE_SIZE = 20;

export default function AdminDashboardPage() {
  const { admin, ready, signOut } = useAdminAuth();
  const router = useRouter();

  const [result, setResult] = useState<Paged<User> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) qs.set('search', search);
      const res = await api<Paged<User>>(`/api/admin/members?${qs}`, {
        auth: true,
        tokenKey: ADMIN_TOKEN_KEY,
      });
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!ready) return;
    if (!admin) {
      router.replace('/admin/login');
      return;
    }
    load();
  }, [ready, admin, router, load]);

  async function exportCsv() {
    setExporting(true);
    try {
      const token = getToken(ADMIN_TOKEN_KEY);
      const res = await fetch(`${API_URL}/api/admin/export.csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `everafter-members-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  if (!ready || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-container-low">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen bg-surface-container-low">
      <header className="flex items-center justify-between border-b border-outline-variant/40 bg-surface px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Icon name="admin_panel_settings" className="text-[18px] text-on-primary" />
          </span>
          <div>
            <h1 className="font-heading text-[20px] leading-tight text-primary">Admin Dashboard</h1>
            <p className="font-body text-label-md text-on-surface-variant">{admin.email}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="font-body text-label-lg uppercase text-on-surface-variant hover:text-secondary"
        >
          Log Out
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-[24px] text-primary">Registered Members</h2>
            <p className="font-body text-label-md text-on-surface-variant">
              {result ? `${result.total} member${result.total === 1 ? '' : 's'}` : '—'}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant"
              />
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search name or email…"
                className="w-full rounded-lg border border-outline-variant bg-surface py-2.5 pl-10 pr-4 font-body text-body-md focus:border-secondary focus:outline-none sm:w-64"
              />
            </label>

            <button
              onClick={exportCsv}
              disabled={exporting || !result?.total}
              className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2.5 font-body text-label-lg uppercase text-on-secondary shadow-md transition-colors hover:bg-secondary-container disabled:opacity-50"
            >
              <Icon name="download" className="text-[18px]" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mb-4 font-body text-label-md text-error">
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-xl bg-surface shadow-card">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-left">
                {['', 'Name', 'Email', 'Phone', 'Gender', 'City', 'Joined', ''].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 font-body text-label-md uppercase text-on-surface-variant"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center font-body text-on-surface-variant">
                    Loading…
                  </td>
                </tr>
              )}

              {!loading && result?.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center font-body text-on-surface-variant">
                    No members found.
                  </td>
                </tr>
              )}

              {!loading &&
                result?.items.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/20 last:border-0">
                    <td className="px-4 py-3">
                      {m.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded photos live on the API origin, outside next/image's remotePatterns.
                        <img
                          src={mediaUrl(m.photo_url)}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low font-body text-label-md uppercase text-on-surface-variant">
                          {m.first_name?.[0]}
                          {m.last_name?.[0]}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-body text-body-md text-on-surface">
                      {m.first_name} {m.last_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-body text-body-md text-on-surface-variant">
                      {m.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-body text-body-md text-on-surface-variant">
                      {m.phone || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-body text-body-md capitalize text-on-surface-variant">
                      {m.gender || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-body text-body-md text-on-surface-variant">
                      {m.details.city || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-body text-body-md text-on-surface-variant">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => setSelected(m)}
                        className="font-body text-label-md uppercase text-secondary hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-primary disabled:opacity-40"
            >
              <Icon name="chevron_left" />
            </button>
            <span className="font-body text-label-md text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-primary disabled:opacity-40"
            >
              <Icon name="chevron_right" />
            </button>
          </div>
        )}
      </main>

      {selected && <MemberDetailDrawer member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
