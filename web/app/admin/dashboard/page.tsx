'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { Badge, Panel, StatCard, Td, TableWrap, Th, EmptyRow } from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';
import { useAdminAuth, type Permission } from '@/lib/adminAuth';
import { formatINR } from '@/lib/api';

type Stats = {
  members: number;
  newMembers: number;
  premium: number;
  profiles: number;
  maleProfiles: number;
  femaleProfiles: number;
  verifiedProfiles: number;
  shortlists: number;
  interests: number;
  paidOrders: number;
  subscribers: number;
  revenue: number;
  pendingProfiles: number;
};

type Activity = { kind: string; created_at: string; email: string; profile: string };

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [error, setError] = useState('');
  const { can, session } = useAdminAuth();

  useEffect(() => {
    Promise.all([
      adminApi<Stats>('/api/admin/stats'),
      adminApi<{ items: Activity[] }>('/api/admin/activity?limit=12'),
    ])
      .then(([s, a]) => {
        setStats(s);
        setActivity(a.items);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <AdminShell title="Overview" description="Everything happening on EverAfter right now" permission="overview.view">
      {error && (
        <p role="alert" className="mb-4 font-body text-label-md text-error">
          {error}
        </p>
      )}

      {!stats && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
          ))}
        </div>
      )}

      {stats && (
        <>
          {stats.pendingProfiles > 0 && can('profiles.approve') && (
            <Link
              href="/admin/profiles"
              className="mb-5 flex items-center gap-4 rounded-2xl bg-primary-container px-5 py-4 text-inverse-on-surface shadow-card transition-transform hover:-translate-y-0.5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <Icon name="pending_actions" className="text-[22px] text-secondary-fixed-dim" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[18px]">
                  {stats.pendingProfiles} profile{stats.pendingProfiles === 1 ? '' : 's'} waiting for approval
                </p>
                <p className="font-body text-label-md opacity-70">
                  They are hidden from the website until approved.
                </p>
              </div>
              <span className="font-body text-label-md uppercase text-secondary-fixed-dim">Review now →</span>
            </Link>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="group"
              label="Registered Members"
              value={stats.members}
              sub={`${stats.newMembers} joined this week`}
              tone="accent"
            />
            <StatCard
              icon="workspace_premium"
              label="Premium Members"
              value={stats.premium}
              sub={`${stats.paidOrders} paid order${stats.paidOrders === 1 ? '' : 's'}`}
            />
            <StatCard
              icon="payments"
              label="Revenue"
              value={formatINR(stats.revenue)}
              sub="from completed payments"
            />
            <StatCard
              icon="mail"
              label="Newsletter"
              value={stats.subscribers}
              sub="subscribers"
            />
            <StatCard
              icon="badge"
              label="Directory Profiles"
              value={stats.profiles}
              sub={`${stats.maleProfiles} men · ${stats.femaleProfiles} women`}
            />
            <StatCard
              icon="verified"
              label="Verified Profiles"
              value={stats.verifiedProfiles}
              sub={`of ${stats.profiles} total`}
            />
            <StatCard icon="favorite" label="Shortlists" value={stats.shortlists} sub="saved by members" />
            <StatCard
              icon="mark_email_read"
              label="Interests Sent"
              value={stats.interests}
              sub="member → profile"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
            <Panel
              title="Recent Activity"
              actions={
                <Link
                  href="/admin/members"
                  className="font-body text-label-md uppercase text-secondary hover:underline"
                >
                  View members
                </Link>
              }
            >
              <TableWrap>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant/30">
                      <Th>Action</Th>
                      <Th>Member</Th>
                      <Th>Profile</Th>
                      <Th>When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity === null && <EmptyRow colSpan={4} message="Loading…" />}
                    {activity?.length === 0 && (
                      <EmptyRow
                        colSpan={4}
                        message="No activity yet — it appears here as members shortlist and express interest."
                      />
                    )}
                    {activity?.map((a, i) => (
                      <tr key={`${a.kind}-${a.created_at}-${i}`} className="border-b border-outline-variant/20 last:border-0">
                        <Td>
                          <Badge tone={a.kind === 'interest' ? 'success' : 'info'}>
                            {a.kind === 'interest' ? 'Interest' : 'Shortlist'}
                          </Badge>
                        </Td>
                        <Td className="text-on-surface-variant">{a.email}</Td>
                        <Td>{a.profile}</Td>
                        <Td className="text-on-surface-variant">
                          {new Date(a.created_at).toLocaleString()}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Panel>

            <Panel title="Quick Actions">
              <div className="flex flex-col gap-2 p-4">
                {[
                  { href: '/admin/upload', icon: 'upload_file', label: 'Upload a biodata & find matches', perm: 'profiles.create' },
                  { href: '/admin/profiles', icon: 'fact_check', label: 'Approve pending profiles', perm: 'profiles.approve' },
                  { href: '/admin/export', icon: 'file_export', label: 'Export biodata (Excel / PDF / CSV)', perm: 'export.data' },
                  { href: '/admin/members', icon: 'group', label: 'Manage members', perm: 'members.view' },
                  { href: '/admin/payments', icon: 'receipt_long', label: 'Review payments', perm: 'payments.view' },
                  { href: '/admin/team', icon: 'admin_panel_settings', label: 'Team & roles', perm: null },
                ]
                  .filter((a) => (a.perm ? can(a.perm as Permission) : !!session?.isSuper))
                  .map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 font-body text-body-md text-on-surface transition-colors hover:bg-surface-container-low"
                  >
                    <Icon name={a.icon} className="text-[20px] text-secondary" />
                    {a.label}
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </AdminShell>
  );
}
