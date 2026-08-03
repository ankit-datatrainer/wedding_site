// Data access layer.
//
// When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set the store talks to
// Supabase. Otherwise it falls back to an in-memory store seeded from the
// design-screen content, so the app is fully usable before any keys exist.
// Both paths expose the same functions, so no route code changes when you
// add credentials.

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { profiles as seedProfiles, stories as seedStories } from './data/seed.js';

export const usingSupabase = config.supabase.enabled;

export const supabase = usingSupabase
  ? createClient(config.supabase.url, config.supabase.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

// ---------------------------------------------------------------- memory ---

const mem = {
  profiles: seedProfiles.map((p) => ({ ...p })),
  stories: seedStories.map((s) => ({ ...s })),
  users: [],
  shortlists: [], // { user_id, profile_id, created_at }
  interests: [], // { user_id, profile_id, created_at }
  orders: [], // { id, user_id, plan_id, amount, currency, status, payment_id }
  subscribers: [], // { email, created_at }
};

let idSeq = 1;
const nextId = (prefix) => `${prefix}_${Date.now().toString(36)}_${idSeq++}`;

// --------------------------------------------------------------- helpers ---

function applyFilters(rows, q) {
  let out = rows;

  if (q.gender) out = out.filter((p) => p.gender === q.gender);
  if (q.minAge) out = out.filter((p) => p.age >= Number(q.minAge));
  if (q.maxAge) out = out.filter((p) => p.age <= Number(q.maxAge));
  if (q.religion && q.religion !== 'Any') out = out.filter((p) => p.religion === q.religion);
  if (q.community && q.community !== 'Any') out = out.filter((p) => p.community === q.community);
  if (q.verified === 'true') out = out.filter((p) => p.verified);

  const marital = toArray(q.maritalStatus);
  if (marital.length) out = out.filter((p) => marital.includes(p.marital_status));

  const education = toArray(q.educationLevel);
  if (education.length) out = out.filter((p) => education.includes(p.education_level));

  if (q.location) {
    const needle = String(q.location).toLowerCase();
    out = out.filter((p) => p.location.toLowerCase().includes(needle));
  }

  if (q.search) {
    const needle = String(q.search).toLowerCase();
    out = out.filter((p) =>
      [p.name, p.profession, p.location, p.education].join(' ').toLowerCase().includes(needle)
    );
  }

  return out;
}

function applySort(rows, sort) {
  const out = [...rows];
  if (sort === 'active') return out.sort((a, b) => a.last_active_days - b.last_active_days);
  if (sort === 'relevance') {
    return out.sort((a, b) => Number(b.verified) - Number(a.verified) || a.age - b.age);
  }
  return out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // newest
}

export function toArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Marks each profile with whether the given viewer has shortlisted /
 * expressed interest in it, so the heart icon on a ProfileCard reflects
 * reality on first render instead of resetting to "off" on every reload.
 * A no-op (flags default false) when there is no logged-in viewer.
 */
async function annotateViewerFlags(items, viewerId) {
  if (!viewerId || items.length === 0) {
    return items.map((p) => ({ ...p, is_shortlisted: false, is_interested: false }));
  }

  let shortlistedIds, interestedIds;
  if (usingSupabase) {
    const [sl, it] = await Promise.all([
      supabase.from('shortlists').select('profile_id').eq('user_id', viewerId),
      supabase.from('interests').select('profile_id').eq('user_id', viewerId),
    ]);
    if (sl.error) throw sl.error;
    if (it.error) throw it.error;
    shortlistedIds = new Set((sl.data ?? []).map((r) => r.profile_id));
    interestedIds = new Set((it.data ?? []).map((r) => r.profile_id));
  } else {
    shortlistedIds = new Set(
      mem.shortlists.filter((s) => s.user_id === viewerId).map((s) => s.profile_id)
    );
    interestedIds = new Set(
      mem.interests.filter((s) => s.user_id === viewerId).map((s) => s.profile_id)
    );
  }

  return items.map((p) => ({
    ...p,
    is_shortlisted: shortlistedIds.has(p.id),
    is_interested: interestedIds.has(p.id),
  }));
}

// -------------------------------------------------------------- profiles ---

export async function listProfiles(query = {}, viewerId) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(query.pageSize) || 6));
  const sort = query.sort || 'newest';

  if (usingSupabase) {
    let sb = supabase.from('profiles').select('*', { count: 'exact' });

    if (query.gender) sb = sb.eq('gender', query.gender);
    if (query.minAge) sb = sb.gte('age', Number(query.minAge));
    if (query.maxAge) sb = sb.lte('age', Number(query.maxAge));
    if (query.religion && query.religion !== 'Any') sb = sb.eq('religion', query.religion);
    if (query.community && query.community !== 'Any') sb = sb.eq('community', query.community);
    if (query.verified === 'true') sb = sb.eq('verified', true);
    if (query.location) sb = sb.ilike('location', `%${query.location}%`);
    if (query.search) sb = sb.ilike('name', `%${query.search}%`);

    const marital = toArray(query.maritalStatus);
    if (marital.length) sb = sb.in('marital_status', marital);
    const education = toArray(query.educationLevel);
    if (education.length) sb = sb.in('education_level', education);

    if (sort === 'active') sb = sb.order('last_active_days', { ascending: true });
    else if (sort === 'relevance') sb = sb.order('verified', { ascending: false }).order('age');
    else sb = sb.order('created_at', { ascending: false });

    const from = (page - 1) * pageSize;
    const { data, count, error } = await sb.range(from, from + pageSize - 1);
    if (error) throw error;
    return {
      items: await annotateViewerFlags(data ?? [], viewerId),
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  const filtered = applySort(applyFilters(mem.profiles, query), sort);
  const from = (page - 1) * pageSize;
  return {
    items: await annotateViewerFlags(filtered.slice(from, from + pageSize), viewerId),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function getProfile(id, viewerId) {
  let profile;
  if (usingSupabase) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    profile = data;
  } else {
    profile = mem.profiles.find((p) => p.id === id) || null;
  }
  if (!profile) return null;
  const [annotated] = await annotateViewerFlags([profile], viewerId);
  return annotated;
}

const OPPOSITE_GENDER = { male: 'female', female: 'male' };

function ageFromDob(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

/**
 * Rule-based compatibility score (0–100) between a member's own captured
 * profile (`viewer`) and a candidate listing. Deliberately transparent and
 * deterministic rather than a black-box model — every point is explainable,
 * which matters more than raw accuracy for a matrimonial audience that will
 * ask "why was I shown this person".
 */
export function scoreMatch(viewer, candidate) {
  const d = viewer.details || {};
  let score = 0;

  if (d.religion && candidate.religion && d.religion.toLowerCase() === candidate.religion.toLowerCase()) {
    score += 25;
  }
  if (d.community && candidate.community && d.community.toLowerCase() === candidate.community.toLowerCase()) {
    score += 15;
  }

  const candidateState = (candidate.location || '').split(',')[1]?.trim().toLowerCase();
  if (d.city && candidate.city && d.city.toLowerCase() === candidate.city.toLowerCase()) {
    score += 10;
  } else if (d.state && candidateState && d.state.toLowerCase() === candidateState) {
    score += 5;
  }

  if (d.diet && candidate.diet && d.diet === candidate.diet) score += 10;
  if (d.maritalStatus && candidate.marital_status && d.maritalStatus === candidate.marital_status) {
    score += 10;
  }

  const viewerAge = ageFromDob(viewer.dob);
  if (viewerAge != null && typeof candidate.age === 'number') {
    const gap = Math.abs(viewerAge - candidate.age);
    if (gap <= 5) score += 10;
    else if (gap <= 10) score += 5;
  }

  if (candidate.verified) score += 5;

  return Math.min(100, score);
}

/**
 * The "algorithm": every candidate of the opposite gender, scored against
 * the viewer's own onboarding profile with scoreMatch, highest first. This
 * is what powers /matches — automatic, no manual gender toggle required.
 */
export async function getMatches(viewerId, { page = 1, pageSize = 12 } = {}) {
  const viewer = await getUserById(viewerId);
  if (!viewer) return { items: [], total: 0, page: 1, pageSize, viewerGender: null };

  const targetGender = OPPOSITE_GENDER[viewer.gender] || null;
  if (!targetGender) return { items: [], total: 0, page: 1, pageSize, viewerGender: viewer.gender };

  let candidates;
  if (usingSupabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('gender', targetGender)
      .limit(500);
    if (error) throw error;
    candidates = data ?? [];
  } else {
    candidates = mem.profiles.filter((p) => p.gender === targetGender);
  }

  const scored = candidates
    .map((c) => ({ ...c, match_score: scoreMatch(viewer, c) }))
    .sort((a, b) => b.match_score - a.match_score || new Date(b.created_at) - new Date(a.created_at));

  const annotated = await annotateViewerFlags(scored, viewerId);

  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(48, Math.max(1, Number(pageSize) || 12));
  const from = (p - 1) * size;

  return {
    items: annotated.slice(from, from + size),
    total: annotated.length,
    page: p,
    pageSize: size,
    viewerGender: viewer.gender,
  };
}

export async function listStories() {
  if (usingSupabase) {
    const { data, error } = await supabase.from('success_stories').select('*');
    if (error) throw error;
    return data ?? [];
  }
  return mem.stories;
}

// ----------------------------------------------------------------- users ---

export async function findUserByEmail(email) {
  const key = email.toLowerCase();
  if (usingSupabase) {
    const { data, error } = await supabase.from('users').select('*').eq('email', key).maybeSingle();
    if (error) throw error;
    return data;
  }
  return mem.users.find((u) => u.email === key) || null;
}

export async function createUser(user) {
  const row = { id: nextId('u'), created_at: new Date().toISOString(), ...user };
  row.email = row.email.toLowerCase();
  if (usingSupabase) {
    const { data, error } = await supabase.from('users').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  mem.users.push(row);
  return row;
}

export async function getUserById(id) {
  if (usingSupabase) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return mem.users.find((u) => u.id === id) || null;
}

export async function setUserPlan(userId, planId) {
  if (usingSupabase) {
    const { error } = await supabase.from('users').update({ plan_id: planId }).eq('id', userId);
    if (error) throw error;
    return;
  }
  const u = mem.users.find((x) => x.id === userId);
  if (u) u.plan_id = planId;
}

/**
 * Merges `patch` into the user's matrimonial `details` blob and, when
 * present, `phone`/`photos`/`photo_url`. Used by the onboarding wizard so a
 * member can save one section at a time without resubmitting the rest.
 */
export async function updateUserProfile(userId, patch) {
  const { details: detailsPatch, ...columns } = patch;

  if (usingSupabase) {
    const current = await getUserById(userId);
    if (!current) return null;
    const mergedDetails = { ...(current.details || {}), ...(detailsPatch || {}) };
    const { data, error } = await supabase
      .from('users')
      .update({ ...columns, details: mergedDetails })
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  const u = mem.users.find((x) => x.id === userId);
  if (!u) return null;
  Object.assign(u, columns);
  u.details = { ...(u.details || {}), ...(detailsPatch || {}) };
  return u;
}

/**
 * Appends a photo URL to the member's gallery. The first photo uploaded
 * becomes `photo_url` (the profile picture) automatically.
 */
export async function addUserPhoto(userId, url) {
  const user = await getUserById(userId);
  if (!user) return null;
  const photos = [...(user.photos || []), url];
  const patch = { photos, photo_url: user.photo_url || url };

  if (usingSupabase) {
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  Object.assign(user, patch);
  return user;
}

/** Removes a photo URL from the gallery; demotes `photo_url` if it was primary. */
export async function removeUserPhoto(userId, url) {
  const user = await getUserById(userId);
  if (!user) return null;
  const photos = (user.photos || []).filter((p) => p !== url);
  const patch = { photos, photo_url: user.photo_url === url ? photos[0] || null : user.photo_url };

  if (usingSupabase) {
    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  Object.assign(user, patch);
  return user;
}

/** Paginated, searchable member listing for the admin dashboard. */
export async function listUsers({ page = 1, pageSize = 20, search = '' } = {}) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(200, Math.max(1, Number(pageSize) || 20));

  if (usingSupabase) {
    let sb = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'member')
      .order('created_at', { ascending: false });
    if (search) sb = sb.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    const from = (p - 1) * size;
    const { data, count, error } = await sb.range(from, from + size - 1);
    if (error) throw error;
    return { items: data ?? [], total: count ?? 0, page: p, pageSize: size };
  }

  let rows = mem.users.filter((u) => (u.role || 'member') === 'member');
  if (search) {
    const needle = search.toLowerCase();
    rows = rows.filter((u) =>
      [u.email, u.first_name, u.last_name].join(' ').toLowerCase().includes(needle)
    );
  }
  rows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const from = (p - 1) * size;
  return { items: rows.slice(from, from + size), total: rows.length, page: p, pageSize: size };
}

/** All members, unpaginated — used for the CSV export. */
export async function listAllUsers() {
  if (usingSupabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'member')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  return mem.users
    .filter((u) => (u.role || 'member') === 'member')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

/**
 * Creates the super-admin account on boot if it doesn't exist yet, and keeps
 * its password in sync with ADMIN_PASSWORD on every restart — so rotating
 * the env var is enough to change the login, no SQL required.
 */
export async function ensureAdminSeeded({ email, passwordHash }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.password_hash !== passwordHash || existing.role !== 'admin') {
      if (usingSupabase) {
        await supabase
          .from('users')
          .update({ password_hash: passwordHash, role: 'admin' })
          .eq('id', existing.id);
      } else {
        existing.password_hash = passwordHash;
        existing.role = 'admin';
      }
    }
    return;
  }

  await createUser({
    email,
    password_hash: passwordHash,
    first_name: 'Super',
    last_name: 'Admin',
    gender: 'other',
    dob: null,
    profile_for: 'self',
    plan_id: null,
    role: 'admin',
    phone: null,
    photo_url: null,
    photos: [],
    details: {},
  });
}

// ------------------------------------------------- shortlists / interests ---

async function toggleLink(table, list, userId, profileId) {
  if (usingSupabase) {
    const { data } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', userId)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (data) {
      await supabase.from(table).delete().eq('id', data.id);
      return { active: false };
    }
    await supabase.from(table).insert({ user_id: userId, profile_id: profileId });
    return { active: true };
  }

  const i = list.findIndex((x) => x.user_id === userId && x.profile_id === profileId);
  if (i >= 0) {
    list.splice(i, 1);
    return { active: false };
  }
  list.push({ user_id: userId, profile_id: profileId, created_at: new Date().toISOString() });
  return { active: true };
}

export const toggleShortlist = (userId, profileId) =>
  toggleLink('shortlists', mem.shortlists, userId, profileId);

export const expressInterest = (userId, profileId) =>
  toggleLink('interests', mem.interests, userId, profileId);

export async function listShortlist(userId) {
  if (usingSupabase) {
    const { data, error } = await supabase
      .from('shortlists')
      .select('profile_id, profiles(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.profiles).filter(Boolean);
  }
  const ids = mem.shortlists.filter((s) => s.user_id === userId).map((s) => s.profile_id);
  return mem.profiles.filter((p) => ids.includes(p.id));
}

export async function listInterests(userId) {
  if (usingSupabase) {
    const { data, error } = await supabase
      .from('interests')
      .select('profile_id, profiles(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.profiles).filter(Boolean);
  }
  const ids = mem.interests.filter((s) => s.user_id === userId).map((s) => s.profile_id);
  return mem.profiles.filter((p) => ids.includes(p.id));
}

// ---------------------------------------------------------------- orders ---

export async function createOrder(order) {
  const row = { created_at: new Date().toISOString(), ...order };
  if (usingSupabase) {
    const { data, error } = await supabase.from('orders').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  mem.orders.push(row);
  return row;
}

export async function updateOrder(id, patch) {
  if (usingSupabase) {
    const { data, error } = await supabase
      .from('orders')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const o = mem.orders.find((x) => x.id === id);
  if (o) Object.assign(o, patch);
  return o || null;
}

export async function getOrder(id) {
  if (usingSupabase) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return mem.orders.find((x) => x.id === id) || null;
}

// ------------------------------------------------------------ newsletter ---

export async function addSubscriber(email) {
  const row = { email: email.toLowerCase(), created_at: new Date().toISOString() };
  if (usingSupabase) {
    const { error } = await supabase.from('newsletter_subscribers').upsert(row, {
      onConflict: 'email',
    });
    if (error) throw error;
    return row;
  }
  if (!mem.subscribers.some((s) => s.email === row.email)) mem.subscribers.push(row);
  return row;
}

export const _mem = mem;
