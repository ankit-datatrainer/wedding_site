// Biodata-to-biodata matching for the admin panel.
//
// When an admin uploads a biodata, this ranks everyone it could be matched
// with — published directory profiles and registered members of the opposite
// gender — and explains every point of every score. Rule-based on purpose,
// like store.js#scoreMatch: an admin calling a family needs to say *why*
// this is a good match, not "the model said so".

import { listMatchCandidates } from './store.js';

const lc = (v) => String(v ?? '').trim().toLowerCase();
const same = (a, b) => lc(a) && lc(b) && lc(a) === lc(b);

function ageFromDob(dob) {
  if (!dob) return null;
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

function educationLevelOf(text) {
  const t = lc(text);
  if (!t) return '';
  if (/ph\.?d|doctor(ate)?/.test(t)) return 'Doctorate';
  if (/m\.?tech|m\.?b\.?a|m\.?sc|m\.?com|m\.?a\b|master|post ?grad|m\.?e\b|mca|ll\.?m|md\b|ms\b|pgdm/.test(t)) return 'Masters';
  return 'Bachelors';
}

/** Common shape for a directory profile row. */
export function normalizeProfile(p) {
  const d = p.details || {};
  const [city = '', state = ''] = String(p.location || '').split(',').map((x) => x.trim());
  return {
    kind: 'profile',
    id: p.id,
    name: p.name,
    gender: p.gender,
    age: typeof p.age === 'number' ? p.age : Number(p.age) || null,
    religion: p.religion,
    community: p.community,
    motherTongue: p.mother_tongue,
    city: p.city || city,
    state: d.state || state,
    diet: p.diet,
    maritalStatus: p.marital_status,
    educationLevel: p.education_level || educationLevelOf(p.education),
    heightCm: Number(p.height_cm) || null,
    manglik: d.manglik,
    profession: p.profession,
    education: p.education,
    location: p.location,
    photo: p.photo || '',
    verified: !!p.verified,
  };
}

/** Common shape for a registered member (users row). */
export function normalizeMember(u) {
  const d = u.details || {};
  return {
    kind: 'member',
    id: u.id,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
    gender: u.gender,
    age: ageFromDob(u.dob),
    religion: d.religion,
    community: d.community,
    motherTongue: d.motherTongue,
    city: d.city,
    state: d.state,
    diet: d.diet,
    maritalStatus: d.maritalStatus,
    educationLevel: educationLevelOf(d.highestEducation),
    heightCm: Number(d.heightCm) || null,
    manglik: d.manglik,
    profession: d.occupation || '',
    education: d.highestEducation || '',
    location: [d.city, d.state].filter(Boolean).join(', '),
    photo: u.photo_url || '',
    verified: false,
    email: u.email,
  };
}

/**
 * Scores `candidate` for `subject`. Both are normalized shapes. Returns a
 * 0–100 score plus the reasons that earned it, strongest first.
 */
export function scorePair(subject, candidate) {
  const reasons = [];
  const add = (points, label) => reasons.push({ points, label });

  if (same(subject.religion, candidate.religion)) add(20, `Same religion (${candidate.religion})`);
  if (same(subject.community, candidate.community)) add(15, `Same community / caste (${candidate.community})`);
  if (same(subject.motherTongue, candidate.motherTongue)) add(10, `Same mother tongue (${candidate.motherTongue})`);

  if (same(subject.city, candidate.city)) add(10, `Same city (${candidate.city})`);
  else if (same(subject.state, candidate.state)) add(5, `Same state (${candidate.state})`);

  if (same(subject.diet, candidate.diet)) add(10, `Same diet (${candidate.diet})`);
  if (same(subject.maritalStatus, candidate.maritalStatus)) add(8, `Both ${candidate.maritalStatus}`);

  if (subject.age && candidate.age) {
    // Traditional expectation in this market: the groom is the same age or
    // a few years older. Scored on that signed gap, not the absolute one.
    const groomMinusBride =
      subject.gender === 'female' ? candidate.age - subject.age : subject.age - candidate.age;
    if (groomMinusBride >= 0 && groomMinusBride <= 5) add(12, `Ideal age gap (${candidate.age} yrs)`);
    else if (groomMinusBride >= -2 && groomMinusBride <= 8) add(6, `Compatible age (${candidate.age} yrs)`);
  }

  if (subject.heightCm && candidate.heightCm) {
    const groomTaller =
      subject.gender === 'female'
        ? candidate.heightCm >= subject.heightCm
        : subject.heightCm >= candidate.heightCm;
    if (groomTaller) add(4, 'Height compatible');
  }

  if (subject.educationLevel && subject.educationLevel === candidate.educationLevel) {
    add(5, `Similar education (${candidate.educationLevel})`);
  }

  const m1 = lc(subject.manglik);
  const m2 = lc(candidate.manglik);
  if ((m1 === 'yes' || m1 === 'no') && m1 === m2) add(3, m1 === 'yes' ? 'Both Manglik' : 'Both non-Manglik');

  if (candidate.verified) add(3, 'Verified profile');

  reasons.sort((a, b) => b.points - a.points);
  const score = Math.min(100, reasons.reduce((sum, r) => sum + r.points, 0));
  return { score, reasons };
}

/**
 * Ranked matches for a subject (a normalized shape). Hard filters: opposite
 * gender, not the subject itself. Ties break toward verified, then newest.
 */
export async function findMatches(subject, { limit = 10, excludeId } = {}) {
  if (!subject.gender) return [];
  const { profiles, members } = await listMatchCandidates(subject.gender);
  const pool = [...profiles.map(normalizeProfile), ...members.map(normalizeMember)].filter(
    (c) => c.id !== excludeId && c.id !== subject.id
  );

  return pool
    .map((c) => ({ ...c, ...scorePair(subject, c) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.verified) - Number(a.verified))
    .slice(0, Math.max(1, Math.min(50, limit)))
    .map((c, i) => ({ rank: i + 1, ...c }));
}
