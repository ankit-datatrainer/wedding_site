'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { MemberDetailDrawer } from '@/components/admin/MemberDetailDrawer';
import { Badge, EmptyRow, Pager, Panel, SearchBox, TableWrap, Td, Th } from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi, adminDownload } from '@/lib/adminApi';
import { useAdminAuth } from '@/lib/adminAuth';
import { mediaUrl } from '@/lib/api';
import type { Paged, User } from '@/lib/types';

const PAGE_SIZE = 20;

export default function AdminMembersPage() {
  const [result, setResult] = useState<Paged<User> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const { can } = useAdminAuth();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) qs.set('search', search);
      setResult(await adminApi<Paged<User>>(`/api/admin/members?${qs}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Debounced so typing in the search box doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(member: User) {
    if (!confirm(`Delete ${member.first_name} ${member.last_name} (${member.email})?\n\nThis also removes their shortlists, interests and orders. It cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      await adminApi(`/api/admin/members/${member.id}`, { method: 'DELETE' });
      setSelected(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setBusy(true);
    try {
      await adminDownload(
        '/api/admin/export.csv',
        `everafter-members-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Members"
      description="Everyone who has registered on the site"
      permission="members.view"
      actions={
        can('export.data') && (
        <button
          onClick={exportCsv}
          disabled={busy || !result?.total}
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 font-body text-label-md uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container disabled:opacity-50"
        >
          <Icon name="download" className="text-[18px]" />
          Export CSV
        </button>
        )
      }
    >
      {error && (
        <p role="alert" className="mb-4 font-body text-label-md text-error">
          {error}
        </p>
      )}

      <Panel
        title={result ? `${result.total} member${result.total === 1 ? '' : 's'}` : 'Members'}
        actions={
          <SearchBox
            value={search}
            onChange={(v) => {
              setPage(1);
              setSearch(v);
            }}
            placeholder="Search name or email…"
          />
        }
      >
        <TableWrap>
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th />
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Gender</Th>
                <Th>City</Th>
                <Th>Reference</Th>
                <Th>Plan</Th>
                <Th>Joined</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow colSpan={10} message="Loading…" />}

              {!loading && result?.items.length === 0 && (
                <EmptyRow
                  colSpan={10}
                  message={
                    search
                      ? 'No members match that search.'
                      : 'No members have registered yet. New sign-ups appear here automatically.'
                  }
                />
              )}

              {!loading &&
                result?.items.map((m) => (
                  <tr key={m.id} className="border-b border-outline-variant/20 last:border-0">
                    <Td>
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
                    </Td>
                    <Td>
                      {m.first_name} {m.last_name}
                    </Td>
                    <Td className="text-on-surface-variant">{m.email}</Td>
                    <Td className="text-on-surface-variant">{m.phone || '—'}</Td>
                    <Td className="capitalize text-on-surface-variant">{m.gender || '—'}</Td>
                    <Td className="text-on-surface-variant">{m.details?.city || '—'}</Td>
                    <Td>
                      {m.details?.referenceName ? (
                        <span title={[m.details.referencePhone, m.details.referredBy].filter(Boolean).join(' · ')}>
                          <span className="block">{m.details.referenceName}</span>
                          <span className="block font-body text-[12px] text-on-surface-variant">
                            {[m.details.referredBy, m.details.referencePhone].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      ) : (
                        <span className="font-body text-label-md text-error">Missing</span>
                      )}
                    </Td>
                    <Td>
                      {m.plan_id ? (
                        <Badge tone="success">{m.plan_id}</Badge>
                      ) : (
                        <Badge>Free</Badge>
                      )}
                    </Td>
                    <Td className="text-on-surface-variant">
                      {new Date(m.created_at).toLocaleDateString()}
                    </Td>
                    <Td className="text-right">
                      <button
                        onClick={() => setSelected(m)}
                        className="font-body text-label-md uppercase text-secondary hover:underline"
                      >
                        View
                      </button>
                      {can('members.delete') && (
                        <button
                          onClick={() => remove(m)}
                          disabled={busy}
                          className="ml-4 font-body text-label-md uppercase text-error hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableWrap>

        {result && (
          <Pager
            page={page}
            total={result.total}
            pageSize={PAGE_SIZE}
            onPage={setPage}
            busy={loading}
          />
        )}
      </Panel>

      {selected && <MemberDetailDrawer member={selected} onClose={() => setSelected(null)} />}
    </AdminShell>
  );
}
