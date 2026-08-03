'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProfileEditor } from '@/components/admin/ProfileEditor';
import { Badge, EmptyRow, Pager, Panel, SearchBox, TableWrap, Td, Th } from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';
import { mediaUrl } from '@/lib/api';
import type { Paged, Profile } from '@/lib/types';

const PAGE_SIZE = 20;

export default function AdminProfilesPage() {
  const [result, setResult] = useState<Paged<Profile> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) qs.set('search', search);
      if (gender) qs.set('gender', gender);
      setResult(await adminApi<Paged<Profile>>(`/api/admin/profiles?${qs}`));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, gender]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(profile: Profile) {
    if (!confirm(`Delete ${profile.name} from the directory?\n\nMembers who shortlisted this profile will lose it. This cannot be undone.`)) {
      return;
    }
    setBusy(true);
    try {
      await adminApi(`/api/admin/profiles/${profile.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVerified(profile: Profile) {
    setBusy(true);
    try {
      await adminApi(`/api/admin/profiles/${profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ verified: !profile.verified }),
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="Directory Profiles"
      description="The pool the matching algorithm ranks over"
      actions={
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 font-body text-label-md uppercase text-on-secondary shadow-sm transition-colors hover:bg-on-secondary-container"
        >
          <Icon name="add" className="text-[18px]" />
          Add Profile
        </button>
      }
    >
      {error && (
        <p role="alert" className="mb-4 font-body text-label-md text-error">
          {error}
        </p>
      )}

      <Panel
        title={result ? `${result.total} profile${result.total === 1 ? '' : 's'}` : 'Profiles'}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={gender}
              onChange={(e) => {
                setPage(1);
                setGender(e.target.value);
              }}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body text-body-md focus:border-secondary focus:outline-none"
            >
              <option value="">All genders</option>
              <option value="male">Men</option>
              <option value="female">Women</option>
            </select>
            <SearchBox
              value={search}
              onChange={(v) => {
                setPage(1);
                setSearch(v);
              }}
              placeholder="Search name or city…"
            />
          </div>
        }
      >
        <TableWrap>
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th />
                <Th>Name</Th>
                <Th>Age</Th>
                <Th>Gender</Th>
                <Th>Profession</Th>
                <Th>Location</Th>
                <Th>Religion</Th>
                <Th>Verified</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow colSpan={9} message="Loading…" />}

              {!loading && result?.items.length === 0 && (
                <EmptyRow colSpan={9} message="No profiles match these filters." />
              )}

              {!loading &&
                result?.items.map((p) => (
                  <tr key={p.id} className="border-b border-outline-variant/20 last:border-0">
                    <Td>
                      {p.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URLs can't be pre-registered with next/image.
                        <img src={mediaUrl(p.photo)} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low">
                          <Icon name="person" className="text-[18px] text-on-surface-variant" />
                        </span>
                      )}
                    </Td>
                    <Td>{p.name}</Td>
                    <Td className="text-on-surface-variant">{p.age}</Td>
                    <Td className="capitalize text-on-surface-variant">{p.gender}</Td>
                    <Td className="text-on-surface-variant">{p.profession || '—'}</Td>
                    <Td className="text-on-surface-variant">{p.location || '—'}</Td>
                    <Td className="text-on-surface-variant">{p.religion || '—'}</Td>
                    <Td>
                      <button
                        onClick={() => toggleVerified(p)}
                        disabled={busy}
                        title="Click to toggle"
                        className="disabled:opacity-50"
                      >
                        {p.verified ? <Badge tone="success">Verified</Badge> : <Badge>No</Badge>}
                      </button>
                    </Td>
                    <Td className="text-right">
                      <button
                        onClick={() => setEditing(p)}
                        className="font-body text-label-md uppercase text-secondary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(p)}
                        disabled={busy}
                        className="ml-4 font-body text-label-md uppercase text-error hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))}
            </tbody>
          </table>
        </TableWrap>

        {result && (
          <Pager page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} busy={loading} />
        )}
      </Panel>

      {(editing || creating) && (
        <ProfileEditor
          profile={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={load}
        />
      )}
    </AdminShell>
  );
}
