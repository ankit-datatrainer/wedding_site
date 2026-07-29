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

// -------------------------------------------------------------- profiles ---

export async function listProfiles(query = {}) {
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
    return { items: data ?? [], total: count ?? 0, page, pageSize };
  }

  const filtered = applySort(applyFilters(mem.profiles, query), sort);
  const from = (page - 1) * pageSize;
  return {
    items: filtered.slice(from, from + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function getProfile(id) {
  if (usingSupabase) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return mem.profiles.find((p) => p.id === id) || null;
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
