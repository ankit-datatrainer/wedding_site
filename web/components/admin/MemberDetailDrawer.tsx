'use client';

import { Icon } from '@/components/Icon';
import { mediaUrl } from '@/lib/api';
import type { User } from '@/lib/types';

const ROWS: [string, (u: User) => string][] = [
  ['Email', (u) => u.email],
  ['Phone', (u) => u.phone || '—'],
  ['Gender', (u) => u.gender || '—'],
  ['Date of Birth', (u) => u.dob || '—'],
  ['Profile For', (u) => u.profile_for || '—'],
  ['Height / Weight', (u) => `${u.details.heightCm || '—'} cm / ${u.details.weightKg || '—'} kg`],
  ['Marital Status', (u) => u.details.maritalStatus || '—'],
  ['Diet', (u) => u.details.diet || '—'],
  ['Smoking / Drinking', (u) => `${u.details.smoking || '—'} / ${u.details.drinking || '—'}`],
  ['Mother Tongue', (u) => u.details.motherTongue || '—'],
  ['Religion / Community', (u) => `${u.details.religion || '—'} / ${u.details.community || '—'}`],
  ['Gothram', (u) => u.details.gothram || '—'],
  ['Manglik', (u) => u.details.manglik || '—'],
  ['Rashi / Nakshatra', (u) => `${u.details.rashi || '—'} / ${u.details.nakshatra || '—'}`],
  ['Location', (u) => [u.details.city, u.details.state, u.details.country].filter(Boolean).join(', ') || '—'],
  ['Address', (u) => u.details.address || '—'],
  ['PIN Code', (u) => u.details.pincode || '—'],
  ['Education', (u) => `${u.details.highestEducation || '—'}${u.details.college ? `, ${u.details.college}` : ''}`],
  ['Occupation', (u) => `${u.details.occupation || '—'}${u.details.employer ? ` at ${u.details.employer}` : ''}`],
  ['Annual Income', (u) => u.details.annualIncome || '—'],
  ['Father', (u) => `${u.details.fatherName || '—'}${u.details.fatherOccupation ? ` (${u.details.fatherOccupation})` : ''}`],
  ['Mother', (u) => `${u.details.motherName || '—'}${u.details.motherOccupation ? ` (${u.details.motherOccupation})` : ''}`],
  ['Siblings', (u) => u.details.siblings || '—'],
  ['Family', (u) => [u.details.familyType, u.details.familyStatus, u.details.familyValues].filter(Boolean).join(' · ') || '—'],
  ['Plan', (u) => u.plan_id || 'None'],
  ['Joined', (u) => new Date(u.created_at).toLocaleDateString()],
];

export function MemberDetailDrawer({ member, onClose }: { member: User; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-on-surface/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-lg flex-col overflow-y-auto bg-surface p-6 shadow-float sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-heading text-[24px] text-primary">
              {member.first_name} {member.last_name}
            </h2>
            <p className="font-body text-label-md text-on-surface-variant">{member.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        {member.photos.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-3">
            {member.photos.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded photos live on the API origin, outside next/image's remotePatterns.
              <img
                key={url}
                src={mediaUrl(url)}
                alt=""
                className="h-24 w-24 rounded-lg object-cover shadow-card"
              />
            ))}
          </div>
        )}

        <dl className="flex flex-col divide-y divide-outline-variant/30">
          {ROWS.map(([label, get]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-3">
              <dt className="w-2/5 shrink-0 font-body text-label-md uppercase text-on-surface-variant">
                {label}
              </dt>
              <dd className="w-3/5 text-right font-body text-body-md text-on-surface">{get(member)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-xl border border-secondary/30 bg-secondary-fixed/25 p-4">
          <h3 className="mb-2 flex items-center gap-2 font-body text-label-lg uppercase text-primary">
            <Icon name="how_to_reg" className="text-[18px] text-secondary" />
            Reference
          </h3>
          {member.details.referenceName ? (
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 font-body text-body-md">
              <dt className="text-label-md uppercase text-on-surface-variant">Name</dt>
              <dd className="text-on-surface">{member.details.referenceName}</dd>
              <dt className="text-label-md uppercase text-on-surface-variant">Phone</dt>
              <dd className="text-on-surface">
                {member.details.referencePhone ? (
                  <a href={`tel:${member.details.referencePhone}`} className="text-secondary hover:underline">
                    {member.details.referencePhone}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
              <dt className="text-label-md uppercase text-on-surface-variant">Relation</dt>
              <dd className="text-on-surface">{member.details.referredBy || '—'}</dd>
            </dl>
          ) : (
            <p className="font-body text-body-md text-error">No reference provided (registered before references became required).</p>
          )}
        </div>

        {(member.details.fatherEmail || member.details.motherEmail) && (
          <div className="mt-6">
            <h3 className="mb-2 font-body text-label-lg uppercase text-primary">Parent Confirmations</h3>
            <ul className="flex flex-col gap-1.5">
              {(['Father', 'Mother'] as const).map((rel) => {
                const email = rel === 'Father' ? member.details.fatherEmail : member.details.motherEmail;
                if (!email) return null;
                const sent = (member.details.parentNotifications || []).filter((n) => n.relation === rel).pop();
                return (
                  <li key={rel} className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low px-3 py-2">
                    <span className="font-body text-body-md text-on-surface">
                      {rel}: {email}
                    </span>
                    <span className="font-body text-label-md text-on-surface-variant">
                      {sent ? `Confirmation ${sent.status === 'failed' ? 'failed' : 'sent'} ${new Date(sent.sentAt).toLocaleDateString()}` : 'Not notified'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {member.details.aboutMe && (
          <div className="mt-6">
            <h3 className="mb-2 font-body text-label-lg uppercase text-primary">About</h3>
            <p className="font-body text-body-md text-on-surface-variant">{member.details.aboutMe}</p>
          </div>
        )}

        {member.details.partnerExpectations && (
          <div className="mt-6">
            <h3 className="mb-2 font-body text-label-lg uppercase text-primary">Looking For</h3>
            <p className="font-body text-body-md text-on-surface-variant">
              {member.details.partnerExpectations}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
