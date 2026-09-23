'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  Badge,
  EmptyRow,
  ErrorNote,
  Modal,
  Panel,
  TableWrap,
  Td,
  Th,
  btnOutline,
  btnPrimary,
  inputBase,
} from '@/components/admin/ui';
import { Icon } from '@/components/Icon';
import { adminApi } from '@/lib/adminApi';
import type { User } from '@/lib/types';

type PermissionDef = { key: string; group: string; label: string };
type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  member_count: number;
};
type TeamMember = User & { role_name: string; suspended: boolean };

const ROLE_ICON: Record<string, string> = {
  Staff: 'badge',
  Manager: 'manage_accounts',
  Developer: 'code',
  'Content Editor': 'edit_note',
};

export default function TeamPage() {
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');
  const [editingRole, setEditingRole] = useState<Role | 'new' | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | 'new' | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [r, t] = await Promise.all([
        adminApi<{ items: Role[]; permissions: PermissionDef[] }>('/api/admin/roles'),
        adminApi<{ items: TeamMember[] }>('/api/admin/team'),
      ]);
      setRoles(r.items);
      setPermissions(r.permissions);
      setTeam(t.items);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function removeRole(role: Role) {
    if (!confirm(`Delete the "${role.name}" role?`)) return;
    try {
      await adminApi(`/api/admin/roles/${role.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function patchMember(m: TeamMember, body: Record<string, unknown>) {
    try {
      await adminApi(`/api/admin/team/${m.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function removeMember(m: TeamMember) {
    if (!confirm(`Remove ${m.first_name} ${m.last_name} (${m.email}) from the team? They will lose access immediately.`)) return;
    try {
      await adminApi(`/api/admin/team/${m.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const permLabel = useMemo(() => new Map(permissions.map((p) => [p.key, p.label])), [permissions]);

  return (
    <AdminShell
      title="Team & Roles"
      description="Create roles, choose what each can do, and give your team access"
      superOnly
      actions={
        <>
          <button onClick={() => setEditingRole('new')} className={btnOutline}>
            <Icon name="add_moderator" className="text-[18px]" />
            New Role
          </button>
          <button onClick={() => setEditingMember('new')} disabled={!roles?.length} className={btnPrimary}>
            <Icon name="person_add" className="text-[18px]" />
            Add Team Member
          </button>
        </>
      }
    >
      <ErrorNote message={error} />

      {/* Roles */}
      <h2 className="mb-3 font-heading text-[18px] text-primary">Roles</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="flex flex-col rounded-2xl bg-primary-container p-5 text-inverse-on-surface shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <Icon name="shield_person" className="text-[22px] text-secondary-fixed-dim" />
            </span>
            <div>
              <p className="font-heading text-[17px]">Super Admin</p>
              <p className="font-body text-label-md opacity-70">Full access · you</p>
            </div>
          </div>
          <p className="mt-3 font-body text-label-md opacity-80">
            Every permission, plus managing roles and team accounts. Can&apos;t be edited or assigned.
          </p>
        </div>

        {roles === null &&
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface" />)}

        {roles?.map((role) => (
          <div key={role.id} className="flex flex-col rounded-2xl bg-surface p-5 shadow-card">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-container/15">
                <Icon name={ROLE_ICON[role.name] || 'shield'} className="text-[21px] text-secondary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-[17px] text-primary">{role.name}</p>
                <p className="font-body text-label-md text-on-surface-variant">
                  {role.member_count} member{role.member_count === 1 ? '' : 's'} · {role.permissions.length} permission
                  {role.permissions.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            {role.description && <p className="mt-3 font-body text-label-md text-on-surface-variant">{role.description}</p>}
            <ul className="mt-3 flex flex-1 flex-col gap-1">
              {role.permissions.slice(0, 5).map((p) => (
                <li key={p} className="flex items-start gap-1.5 font-body text-[12px] text-on-surface">
                  <Icon name="check" className="mt-px text-[14px] text-secondary" />
                  {permLabel.get(p) || p}
                </li>
              ))}
              {role.permissions.length > 5 && (
                <li className="pl-5 font-body text-[12px] text-on-surface-variant">+{role.permissions.length - 5} more</li>
              )}
              {role.permissions.length === 0 && (
                <li className="font-body text-[12px] text-on-surface-variant">No permissions yet</li>
              )}
            </ul>
            <div className="mt-4 flex gap-4 border-t border-outline-variant/30 pt-3">
              <button onClick={() => setEditingRole(role)} className="font-body text-label-md uppercase text-secondary hover:underline">
                Edit access
              </button>
              <button onClick={() => removeRole(role)} className="font-body text-label-md uppercase text-error hover:underline">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Team */}
      <Panel title={team ? `Team members (${team.length})` : 'Team members'}>
        <TableWrap>
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Added</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {team === null && <EmptyRow colSpan={6} message="Loading…" />}
              {team?.map((m) => {
                const isSuper = m.role === 'admin';
                return (
                  <tr key={m.id} className="border-b border-outline-variant/20 last:border-0">
                    <Td>
                      {m.first_name} {m.last_name}
                    </Td>
                    <Td className="text-on-surface-variant">{m.email}</Td>
                    <Td>
                      {isSuper ? (
                        <Badge tone="info">Super Admin</Badge>
                      ) : (
                        <select
                          value={m.admin_role_id || ''}
                          onChange={(e) => patchMember(m, { roleId: e.target.value })}
                          className="rounded-lg border border-outline-variant bg-surface px-2 py-1.5 font-body text-body-md focus:border-secondary focus:outline-none"
                        >
                          {!m.admin_role_id && <option value="">No role</option>}
                          {roles?.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </Td>
                    <Td>{m.suspended ? <Badge tone="warn">Suspended</Badge> : <Badge tone="success">Active</Badge>}</Td>
                    <Td className="text-on-surface-variant">{new Date(m.created_at).toLocaleDateString()}</Td>
                    <Td className="text-right">
                      {!isSuper && (
                        <div className="flex justify-end gap-4">
                          <button onClick={() => setEditingMember(m)} className="font-body text-label-md uppercase text-secondary hover:underline">
                            Edit
                          </button>
                          <button
                            onClick={() => patchMember(m, { suspended: !m.suspended })}
                            className="font-body text-label-md uppercase text-on-surface-variant hover:underline"
                          >
                            {m.suspended ? 'Reactivate' : 'Suspend'}
                          </button>
                          <button onClick={() => removeMember(m)} className="font-body text-label-md uppercase text-error hover:underline">
                            Remove
                          </button>
                        </div>
                      )}
                    </Td>
                  </tr>
                );
              })}
              {team?.length === 1 && (
                <EmptyRow colSpan={6} message="No team members yet — add one and pick their role to give them limited access." />
              )}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {editingRole && (
        <RoleDialog
          role={editingRole === 'new' ? null : editingRole}
          permissions={permissions}
          onClose={() => setEditingRole(null)}
          onSaved={load}
        />
      )}
      {editingMember && roles && (
        <MemberDialog
          member={editingMember === 'new' ? null : editingMember}
          roles={roles}
          onClose={() => setEditingMember(null)}
          onSaved={load}
        />
      )}
    </AdminShell>
  );
}

function RoleDialog({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: Role | null;
  permissions: PermissionDef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [perms, setPerms] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    const out: { group: string; items: PermissionDef[] }[] = [];
    for (const p of permissions) {
      const g = out.find((x) => x.group === p.group);
      if (g) g.items.push(p);
      else out.push({ group: p.group, items: [p] });
    }
    return out;
  }, [permissions]);

  const toggle = (key: string) =>
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function save() {
    setSaving(true);
    setError('');
    try {
      const body = JSON.stringify({ name, description, permissions: [...perms] });
      if (role) await adminApi(`/api/admin/roles/${role.id}`, { method: 'PATCH', body });
      else await adminApi('/api/admin/roles', { method: 'POST', body });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal
      title={role ? `Edit role: ${role.name}` : 'New role'}
      subtitle="Tick exactly what people with this role may do"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || name.trim().length < 2} className={btnPrimary}>
            {saving ? 'Saving…' : role ? 'Save Role' : 'Create Role'}
          </button>
        </>
      }
    >
      <ErrorNote message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-label-md text-on-surface-variant">Role name *</span>
          <input className={inputBase} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Verifier" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-label-md text-on-surface-variant">Description</span>
          <input className={inputBase} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for" />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-5">
        {groups.map(({ group, items }) => (
          <fieldset key={group}>
            <legend className="mb-2 font-body text-label-md uppercase tracking-wide text-primary">{group}</legend>
            <div className="flex flex-col gap-1.5">
              {items.map((p) => (
                <label
                  key={p.key}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    perms.has(p.key) ? 'border-secondary/50 bg-secondary-fixed/30' : 'border-outline-variant/50 hover:bg-surface-container-low'
                  }`}
                >
                  <input type="checkbox" checked={perms.has(p.key)} onChange={() => toggle(p.key)} className="h-4 w-4 accent-[#b02559]" />
                  <span className="font-body text-body-md text-on-surface">{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}

function MemberDialog({
  member,
  roles,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(member?.first_name ?? '');
  const [lastName, setLastName] = useState(member?.last_name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(member?.admin_role_id || roles.find((r) => r.name === 'Staff')?.id || roles[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setSaving(true);
    setError('');
    try {
      if (member) {
        const body: Record<string, string> = { firstName, lastName, roleId };
        if (password) body.password = password;
        await adminApi(`/api/admin/team/${member.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      } else {
        await adminApi('/api/admin/team', {
          method: 'POST',
          body: JSON.stringify({ firstName, lastName, email, password, roleId }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const role = roles.find((r) => r.id === roleId);

  return (
    <Modal
      title={member ? `Edit ${member.first_name}` : 'Add team member'}
      subtitle={member ? member.email : 'They sign in at /admin/login with these details'}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : member ? 'Save Changes' : 'Create Account'}
          </button>
        </>
      }
    >
      <ErrorNote message={error} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-label-md text-on-surface-variant">First name *</span>
          <input className={inputBase} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-label-md text-on-surface-variant">Last name</span>
          <input className={inputBase} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-label-md text-on-surface-variant">Email *</span>
          <input type="email" className={inputBase} value={email} disabled={!!member} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body text-label-md text-on-surface-variant">
            {member ? 'New password (leave blank to keep)' : 'Password * (min 8 characters)'}
          </span>
          <input type="text" autoComplete="new-password" className={inputBase} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-body text-label-md text-on-surface-variant">Role *</span>
          <select className={inputBase} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {role && (
        <p className="mt-4 rounded-lg bg-surface-container-low px-3 py-2.5 font-body text-label-md text-on-surface-variant">
          <strong className="text-on-surface">{role.name}:</strong> {role.description || `${role.permissions.length} permissions`}
        </p>
      )}
    </Modal>
  );
}
