'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/lib/auth';

const input =
  'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 font-body text-body-md text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary';

/**
 * The member's reference on their dashboard. Every new registration carries
 * one; members who joined before references were required are asked to add
 * theirs here, and anyone can correct it.
 */
export function ReferenceCard() {
  const { user, updateProfile } = useAuth();
  const d = user?.details ?? {};
  const missing = !d.referenceName;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(d.referenceName ?? '');
  const [phone, setPhone] = useState(d.referencePhone ?? '');
  const [relation, setRelation] = useState(d.referredBy ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Enter your reference's name.");
    if ((phone.match(/\d/g) || []).length < 10) return setError('Enter a phone number with at least 10 digits.');
    if (!relation.trim()) return setError('Tell us how you know them.');
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        details: { referenceName: name.trim(), referencePhone: phone.trim(), referredBy: relation.trim() },
      });
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`rounded-2xl border p-6 shadow-card ${
        missing && !editing ? 'border-secondary/50 bg-secondary-fixed/30' : 'border-outline-variant/40 bg-surface-container-lowest'
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-container/20 text-secondary">
          <Icon name="how_to_reg" className="text-[20px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-[18px] text-primary">My Reference</h3>
          <p className="font-body text-[12px] text-on-surface-variant">
            {missing ? 'Required — please add a reference' : 'Someone who can vouch for you'}
          </p>
        </div>
        {!missing && !editing && (
          <button onClick={() => setEditing(true)} className="font-body text-label-md uppercase text-secondary hover:underline">
            Edit
          </button>
        )}
      </div>

      {editing || missing ? (
        <form onSubmit={save} className="flex flex-col gap-3">
          <input className={input} placeholder="Reference person's name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className={input} type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className={input} placeholder="Relation (e.g. Uncle, Family friend)" value={relation} onChange={(e) => setRelation(e.target.value)} />
          {error && <p className="font-body text-label-md text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-secondary py-2.5 font-body text-label-md uppercase text-on-secondary hover:bg-on-secondary-container disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Reference'}
            </button>
            {!missing && (
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-outline-variant px-4 font-body text-label-md uppercase text-on-surface-variant">
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-[90px_1fr] gap-y-2 font-body text-body-md">
          <dt className="text-label-md uppercase text-on-surface-variant">Name</dt>
          <dd className="text-on-surface">{d.referenceName}</dd>
          <dt className="text-label-md uppercase text-on-surface-variant">Phone</dt>
          <dd className="text-on-surface">{d.referencePhone || '—'}</dd>
          <dt className="text-label-md uppercase text-on-surface-variant">Relation</dt>
          <dd className="text-on-surface">{d.referredBy || '—'}</dd>
        </dl>
      )}
    </section>
  );
}
