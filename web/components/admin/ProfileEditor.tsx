'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/adminApi';
import { useAdminAuth } from '@/lib/adminAuth';
import type { Profile, ProfileStatus } from '@/lib/types';
import {
  ProfileForm,
  blankProfileForm,
  formToPayload,
  profileToForm,
  validateProfileForm,
  type ProfileFormValue,
} from './ProfileForm';
import { ErrorNote, Modal, btnOutline, btnPrimary } from './ui';

/**
 * Create/edit dialog for directory profiles. `profile === null` means create.
 * Users with approval rights choose whether the result goes live; everyone
 * else's changes land as pending for review.
 */
export function ProfileEditor({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { can } = useAdminAuth();
  const canApprove = can('profiles.approve');
  const [form, setForm] = useState<ProfileFormValue>(profile ? profileToForm(profile) : blankProfileForm());
  const [verified, setVerified] = useState(!!profile?.verified);
  const [saving, setSaving] = useState<ProfileStatus | 'save' | null>(null);
  const [error, setError] = useState('');

  async function save(status?: ProfileStatus) {
    const problem = validateProfileForm(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(status ?? 'save');
    setError('');
    try {
      const payload = formToPayload(form);
      if (canApprove) {
        payload.verified = verified;
        if (status) payload.status = status;
      }
      if (profile) {
        await adminApi(`/api/admin/profiles/${profile.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await adminApi('/api/admin/profiles', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(null);
    }
  }

  return (
    <Modal
      title={profile ? `Edit ${profile.name}` : 'Add Profile'}
      subtitle={profile ? 'Update any biodata field — changes apply immediately' : 'Fill in the full biodata'}
      onClose={onClose}
      wide
      footer={
        <>
          {canApprove && (
            <label className="mr-auto flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="h-4 w-4 accent-[#b02559]"
              />
              <span className="font-body text-label-md text-on-surface">Verified badge</span>
            </label>
          )}
          <button type="button" onClick={onClose} className={btnOutline}>
            Cancel
          </button>
          {profile ? (
            <button type="button" onClick={() => save()} disabled={!!saving} className={btnPrimary}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          ) : canApprove ? (
            <>
              <button type="button" onClick={() => save('pending')} disabled={!!saving} className={btnOutline}>
                {saving === 'pending' ? 'Saving…' : 'Save as Pending'}
              </button>
              <button type="button" onClick={() => save('approved')} disabled={!!saving} className={btnPrimary}>
                {saving === 'approved' ? 'Publishing…' : 'Approve & Publish'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => save()} disabled={!!saving} className={btnPrimary}>
              {saving ? 'Submitting…' : 'Submit for Approval'}
            </button>
          )}
        </>
      }
    >
      <ErrorNote message={error} />
      <ProfileForm value={form} onChange={setForm} />
    </Modal>
  );
}
