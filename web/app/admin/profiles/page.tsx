'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { BiodataImport } from '@/components/admin/BiodataImport';
import { MatchesDialog } from '@/components/admin/MatchList';
import { ProfileEditor } from '@/components/admin/ProfileEditor';
import {
  Badge,
  EmptyRow,
  ErrorNote,
  Pager,
  Panel,
  SearchBox,
  StatusBadge,
  TableWrap,
  Tabs,
  Td,
  Th,
  btnOutline,
  btnPrimary,
} from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';
import { useAdminAuth } from '@/lib/adminAuth';
import { mediaUrl } from '@/lib/api';
import type { Paged, Profile, ProfileStatus } from '@/lib/types';

const PAGE_SIZE = 20;
type Tab = '' | ProfileStatus;

export default function AdminProfilesPage() {
  const { can, session } = useAdminAuth();
  const [result, setResult] = useState<Paged<Profile> | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [tab, setTab] = useState<Tab>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [matchesFor, setMatchesFor] = useState<Profile | null>(null);
  const [viewing, setViewing] = useState<Profile | null>(null);

  const approvals = session?.schemaReady !== false;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) qs.set('search', search);
      if (gender) qs.set('gender', gender);
      if (tab) qs.set('status', tab);
      setResult(await adminApi<Paged<Profile>>(`/api/admin/profiles?${qs}`));

      if (approvals) {
        // Tab badges: one tiny request per status, pageSize 1 — only totals are needed.
        const entries = await Promise.all(
          (['', 'pending', 'approved', 'rejected'] as const).map(async (s) => {
            const q = new URLSearchParams({ page: '1', pageSize: '1' });
            if (s) q.set('status', s);
            if (gender) q.set('gender', gender);
            if (search) q.set('search', search);
            const r = await adminApi<Paged<Profile>>(`/api/admin/profiles?${q}`);
            return [s || 'all', r.total] as const;
          })
        );
        setCounts(Object.fromEntries(entries));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, search, gender, tab, approvals]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (p: Profile, status: ProfileStatus) => {
    let note: string | null = null;
    if (status === 'rejected') {
      note = prompt(`Reason for rejecting ${p.name}? (optional, visible to your team)`, '');
      if (note === null) return;
    }
    return run(() =>
      adminApi(`/api/admin/profiles/${p.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, note: note || undefined }),
      })
    );
  };

  const remove = (p: Profile) => {
    if (!confirm(`Delete ${p.name} from the directory?\n\nMembers who shortlisted this profile will lose it. This cannot be undone.`)) return;
    return run(() => adminApi(`/api/admin/profiles/${p.id}`, { method: 'DELETE' }));
  };

  const toggleVerified = (p: Profile) =>
    run(() =>
      adminApi(`/api/admin/profiles/${p.id}`, { method: 'PATCH', body: JSON.stringify({ verified: !p.verified }) })
    );

  return (
    <AdminShell
      title="Profiles & Approvals"
      description="Only approved profiles are visible on the website"
      permission="profiles.view"
      actions={
        can('profiles.create') && (
          <>
            <button onClick={() => setImporting(true)} className={btnOutline}>
              <Icon name="upload_file" className="text-[18px]" />
              Bulk Import PDFs
            </button>
            <Link href="/admin/upload" className={btnOutline}>
              <Icon name="auto_awesome" className="text-[18px]" />
              Upload & Match
            </Link>
            <button onClick={() => setCreating(true)} className={btnPrimary}>
              <Icon name="add" className="text-[18px]" />
              Add Profile
            </button>
          </>
        )
      }
    >
      <ErrorNote message={error} />

      {approvals && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs<Tab>
            value={tab}
            onChange={(v) => {
              setPage(1);
              setTab(v);
            }}
            tabs={[
              { value: '', label: 'All', count: counts.all },
              { value: 'pending', label: 'Pending approval', count: counts.pending },
              { value: 'approved', label: 'Live', count: counts.approved },
              { value: 'rejected', label: 'Rejected', count: counts.rejected },
            ]}
          />
          {tab === 'pending' && counts.pending > 0 && can('profiles.approve') && (
            <p className="font-body text-label-md text-on-surface-variant">
              Review each biodata, then <strong>Approve</strong> to publish it on the website.
            </p>
          )}
        </div>
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
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th />
                <Th>Name</Th>
                <Th>Age</Th>
                <Th>Profession</Th>
                <Th>Location</Th>
                <Th>Religion</Th>
                <Th>Status</Th>
                <Th>Verified</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && <EmptyRow colSpan={9} message="Loading…" />}

              {!loading && result?.items.length === 0 && (
                <EmptyRow
                  colSpan={9}
                  message={tab === 'pending' ? 'Nothing waiting for approval. 🎉' : 'No profiles match these filters.'}
                />
              )}

              {!loading &&
                result?.items.map((p) => {
                  // Rows created before approvals existed have no status: they are live.
                  const status = p.status || 'approved';
                  return (
                  <tr key={p.id} className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low/50">
                    <Td>
                      {p.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary admin-supplied URLs can't be pre-registered with next/image.
                        <img src={mediaUrl(p.photo)} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low">
                          <Icon name="person" className="text-[18px] text-on-surface-variant" />
                        </span>
                      )}
                    </Td>
                    <Td>
                      <button onClick={() => setViewing(p)} className="text-left hover:text-secondary">
                        <span className="block font-semibold">{p.name}</span>
                        <span className="block font-body text-[12px] text-on-surface-variant">
                          {p.gender === 'female' ? 'Bride' : 'Groom'}
                          {p.source === 'biodata' ? ' · from biodata' : ''}
                          {p.created_by ? ` · by ${p.created_by}` : ''}
                        </span>
                      </button>
                    </Td>
                    <Td className="text-on-surface-variant">{p.age}</Td>
                    <Td className="text-on-surface-variant">{p.profession || '—'}</Td>
                    <Td className="text-on-surface-variant">{p.location || '—'}</Td>
                    <Td className="text-on-surface-variant">{p.religion || '—'}</Td>
                    <Td>
                      <span title={p.review_note || undefined}>
                        <StatusBadge status={p.status} />
                      </span>
                    </Td>
                    <Td>
                      {can('profiles.approve') ? (
                        <button onClick={() => toggleVerified(p)} disabled={busy} title="Click to toggle" className="disabled:opacity-50">
                          {p.verified ? <Badge tone="success">Verified</Badge> : <Badge>No</Badge>}
                        </button>
                      ) : p.verified ? (
                        <Badge tone="success">Verified</Badge>
                      ) : (
                        <Badge>No</Badge>
                      )}
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-3">
                        {approvals && can('profiles.approve') && status !== 'approved' && (
                          <button
                            onClick={() => setStatus(p, 'approved')}
                            disabled={busy}
                            className="inline-flex items-center gap-1 rounded-md bg-[#1b6b3a] px-2.5 py-1 font-body text-label-md uppercase text-white hover:bg-[#15572f] disabled:opacity-50"
                          >
                            <Icon name="check" className="text-[15px]" />
                            Approve
                          </button>
                        )}
                        {approvals && can('profiles.approve') && status !== 'rejected' && (
                          <button
                            onClick={() => setStatus(p, status === 'approved' ? 'pending' : 'rejected')}
                            disabled={busy}
                            className="font-body text-label-md uppercase text-on-surface-variant hover:text-error disabled:opacity-50"
                          >
                            {status === 'approved' ? 'Unpublish' : 'Reject'}
                          </button>
                        )}
                        {can('matches.view') && (
                          <button
                            onClick={() => setMatchesFor(p)}
                            className="font-body text-label-md uppercase text-secondary hover:underline"
                          >
                            Matches
                          </button>
                        )}
                        {can('profiles.edit') && (
                          <button onClick={() => setEditing(p)} className="font-body text-label-md uppercase text-secondary hover:underline">
                            Edit
                          </button>
                        )}
                        {can('profiles.delete') && (
                          <button
                            onClick={() => remove(p)}
                            disabled={busy}
                            className="font-body text-label-md uppercase text-error hover:underline disabled:opacity-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                  );
                })}
            </tbody>
          </table>
        </TableWrap>

        {result && <Pager page={page} total={result.total} pageSize={PAGE_SIZE} onPage={setPage} busy={loading} />}
      </Panel>

      {importing && <BiodataImport onClose={() => setImporting(false)} onImported={load} />}

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

      {matchesFor && (
        <MatchesDialog profileId={matchesFor.id} profileName={matchesFor.name} onClose={() => setMatchesFor(null)} />
      )}

      {viewing && <ProfileDetailDrawer profile={viewing} onClose={() => setViewing(null)} />}
    </AdminShell>
  );
}

const DETAIL_ROWS: [string, (p: Profile) => string | number | undefined | null][] = [
  ['Age / Height', (p) => `${p.age} yrs${p.height_cm ? ` · ${p.height_cm} cm` : ''}`],
  ['Date of Birth', (p) => p.details?.dob],
  ['Marital Status', (p) => p.marital_status],
  ['Diet', (p) => p.diet],
  ['Religion / Community', (p) => [p.religion, p.community].filter(Boolean).join(' / ')],
  ['Mother Tongue', (p) => p.mother_tongue],
  ['Gothram / Manglik', (p) => [p.details?.gothram, p.details?.manglik && `Manglik: ${p.details.manglik}`].filter(Boolean).join(' · ')],
  ['Rashi / Nakshatra', (p) => [p.details?.rashi, p.details?.nakshatra].filter(Boolean).join(' / ')],
  ['Birth Time / Place', (p) => [p.details?.timeOfBirth, p.details?.placeOfBirth].filter(Boolean).join(' · ')],
  ['Education', (p) => [p.education, p.details?.college].filter(Boolean).join(', ')],
  ['Profession', (p) => [p.profession, p.details?.employer].filter(Boolean).join(' at ')],
  ['Income', (p) => p.details?.annualIncome],
  ['Location', (p) => p.location],
  ['Address', (p) => p.details?.address],
  ['Father', (p) => [p.details?.fatherName, p.details?.fatherOccupation].filter(Boolean).join(' — ')],
  ['Mother', (p) => [p.details?.motherName, p.details?.motherOccupation].filter(Boolean).join(' — ')],
  ['Siblings', (p) => p.details?.siblings],
  ['Family', (p) => [p.details?.familyType, p.details?.familyStatus, p.details?.familyValues].filter(Boolean).join(' · ')],
  ['Contact', (p) => [p.details?.phone, p.details?.email].filter(Boolean).join(' · ')],
  ['Reference', (p) => [p.details?.referenceName, p.details?.referencePhone, p.details?.referredBy].filter(Boolean).join(' · ')],
  ['Added', (p) => `${new Date(p.created_at).toLocaleDateString()}${p.created_by ? ` by ${p.created_by}` : ''}`],
  ['Approved', (p) => (p.approved_at ? `${new Date(p.approved_at).toLocaleDateString()} by ${p.approved_by}` : null)],
  ['Review note', (p) => p.review_note],
];

function ProfileDetailDrawer({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-on-surface/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-surface p-6 shadow-float sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start gap-4">
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- see table above
            <img src={mediaUrl(profile.photo)} alt="" className="h-20 w-20 rounded-xl object-cover shadow-card" />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-[24px] text-primary">{profile.name}</h2>
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={profile.status} />
              {profile.verified && <Badge tone="success">Verified</Badge>}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <dl className="flex flex-col divide-y divide-outline-variant/30">
          {DETAIL_ROWS.map(([label, get]) => {
            const v = get(profile);
            if (v === undefined || v === null || v === '') return null;
            return (
              <div key={label} className="flex items-start justify-between gap-4 py-3">
                <dt className="w-2/5 shrink-0 font-body text-label-md uppercase text-on-surface-variant">{label}</dt>
                <dd className="w-3/5 text-right font-body text-body-md text-on-surface">{v}</dd>
              </div>
            );
          })}
        </dl>

        {profile.about && (
          <div className="mt-6">
            <h3 className="mb-2 font-body text-label-lg uppercase text-primary">About</h3>
            <p className="font-body text-body-md text-on-surface-variant">{profile.about}</p>
          </div>
        )}
        {profile.details?.partnerExpectations && (
          <div className="mt-6">
            <h3 className="mb-2 font-body text-label-lg uppercase text-primary">Partner Expectations</h3>
            <p className="font-body text-body-md text-on-surface-variant">{profile.details.partnerExpectations}</p>
          </div>
        )}
      </div>
    </div>
  );
}
