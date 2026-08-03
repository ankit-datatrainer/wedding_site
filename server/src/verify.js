// End-to-end verification against whatever database is currently configured.
//
//   npm run verify              (server must already be running)
//   npm run verify -- 4100      (against a non-default port)
//
// Exercises every route the app depends on — auth, the matching algorithm,
// shortlist/interest persistence, photo upload, and the admin panel — and
// reports pass/fail per check. Written to be run against Supabase, where
// several of these code paths differ from the in-memory fallback.

import { config } from './config.js';

const port = process.argv[2] || config.port;
const BASE = `http://127.0.0.1:${port}`;

let passed = 0;
let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
  return ok;
}

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const stamp = Date.now();
const memberEmail = `verify.member.${stamp}@example.com`;
const femaleEmail = `verify.female.${stamp}@example.com`;
const PASSWORD = 'verifyPassword123';

console.log(`\nVerifying ${BASE}\n`);

// ---------------------------------------------------------------- health ---
console.log('Health');
const health = await req('/api/health');
check('GET /api/health', health.status === 200 && health.body?.ok === true);
const usingSupabase = health.body?.database === 'supabase';
console.log(`        database: ${health.body?.database}`);
console.log(`        payments: ${health.body?.payments}`);

// -------------------------------------------------------------- profiles ---
console.log('\nProfile directory');
const all = await req('/api/profiles?pageSize=1');
check('GET /api/profiles', all.status === 200, `${all.body?.total} profiles`);
check('directory is populated', all.body?.total > 0, all.body?.total === 64 ? 'all 64 seeded' : `${all.body?.total} rows`);

const males = await req('/api/profiles?gender=male&pageSize=1');
const females = await req('/api/profiles?gender=female&pageSize=1');
check('gender filter works', males.body?.total > 0 && females.body?.total > 0,
  `${males.body?.total} male / ${females.body?.total} female`);

const filtered = await req('/api/profiles?religion=Sikh&gender=male&pageSize=50');
check('religion filter works', filtered.status === 200 && filtered.body.items.every((p) => p.religion === 'Sikh'),
  `${filtered.body?.total} Sikh men`);

const stories = await req('/api/stories');
check('GET /api/stories', stories.status === 200 && stories.body?.items?.length > 0,
  `${stories.body?.items?.length} stories`);

// ------------------------------------------------------------------ auth ---
console.log('\nMember accounts');
const reg = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    profileFor: 'self', firstName: 'Verify', lastName: 'Member',
    gender: 'male', dob: '1993-04-12', email: memberEmail, password: PASSWORD,
  }),
});
check('POST /api/auth/register', reg.status === 201, reg.body?.error || reg.body?.user?.email);
const token = reg.body?.token;
const AUTH = { Authorization: `Bearer ${token}` };

const dup = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    profileFor: 'self', firstName: 'Verify', lastName: 'Member',
    gender: 'male', dob: '1993-04-12', email: memberEmail, password: PASSWORD,
  }),
});
check('duplicate email rejected', dup.status === 409);

const login = await req('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: memberEmail, password: PASSWORD }),
});
check('POST /api/auth/login', login.status === 200 && !!login.body?.token);

const badLogin = await req('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: memberEmail, password: 'wrong' }),
});
check('wrong password rejected', badLogin.status === 401);

const me = await req('/api/auth/me', { headers: AUTH });
check('GET /api/auth/me', me.status === 200 && me.body?.user?.email === memberEmail);

// ------------------------------------------------------- profile details ---
console.log('\nMatrimonial profile (persistence)');
const patch1 = await req('/api/auth/me', {
  method: 'PATCH',
  headers: AUTH,
  body: JSON.stringify({
    phone: '+919876500000',
    details: { religion: 'Sikh', community: 'Jat', city: 'Amritsar', diet: 'Vegetarian', maritalStatus: 'Never Married' },
  }),
});
check('PATCH /api/auth/me saves details', patch1.status === 200 && patch1.body?.user?.details?.city === 'Amritsar');

const patch2 = await req('/api/auth/me', {
  method: 'PATCH',
  headers: AUTH,
  body: JSON.stringify({ details: { occupation: 'Engineer' } }),
});
check('second PATCH merges (does not wipe)',
  patch2.body?.user?.details?.city === 'Amritsar' && patch2.body?.user?.details?.occupation === 'Engineer');

const badEnum = await req('/api/auth/me', {
  method: 'PATCH', headers: AUTH, body: JSON.stringify({ details: { diet: 'Nonsense' } }),
});
check('invalid enum rejected', badEnum.status === 400);

// re-read from the database to prove it persisted, not just echoed back
const reread = await req('/api/auth/me', { headers: AUTH });
check('details survive a re-read', reread.body?.user?.details?.city === 'Amritsar' && reread.body?.user?.phone === '+919876500000');

// --------------------------------------------------------------- matches ---
console.log('\nMatching algorithm');
const matches = await req('/api/matches?pageSize=50', { headers: AUTH });
check('GET /api/matches', matches.status === 200, `${matches.body?.total} candidates`);
check('male viewer sees only women',
  matches.body?.items?.length > 0 && matches.body.items.every((p) => p.gender === 'female'));
check('results carry a match_score', typeof matches.body?.items?.[0]?.match_score === 'number',
  `top: ${matches.body?.items?.[0]?.name} @ ${matches.body?.items?.[0]?.match_score}%`);
check('results are ranked descending',
  matches.body?.items?.every((p, i, a) => i === 0 || a[i - 1].match_score >= p.match_score));

const anonMatches = await req('/api/matches');
check('unauthenticated /api/matches rejected', anonMatches.status === 401);

// opposite gender viewer
const regF = await req('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    profileFor: 'self', firstName: 'Verify', lastName: 'Female',
    gender: 'female', dob: '1996-08-20', email: femaleEmail, password: PASSWORD,
  }),
});
const AUTH_F = { Authorization: `Bearer ${regF.body?.token}` };
const matchesF = await req('/api/matches?pageSize=50', { headers: AUTH_F });
check('female viewer sees only men',
  matchesF.body?.items?.length > 0 && matchesF.body.items.every((p) => p.gender === 'male'),
  `${matchesF.body?.total} candidates`);

// ------------------------------------------ shortlist / interest / flags ---
console.log('\nShortlist & interests');
const target = matches.body?.items?.[0]?.id;
const targetName = matches.body?.items?.[0]?.name;
const sl = await req(`/api/profiles/${target}/shortlist`, { method: 'POST', headers: AUTH });
check('POST shortlist toggles on', sl.status === 200 && sl.body?.active === true);

// Search-filtered rather than a plain first page: listings cap pageSize at 48
// and sort by recency, so the top-ranked match is not reliably on page one.
const listAfter = await req(`/api/profiles?search=${encodeURIComponent(targetName)}`, { headers: AUTH });
const flagged = listAfter.body?.items?.find((p) => p.id === target);
check('is_shortlisted reflected in listing', flagged?.is_shortlisted === true);

const detail = await req(`/api/profiles/${target}`, { headers: AUTH });
check('is_shortlisted reflected on detail', detail.body?.is_shortlisted === true);

const slList = await req('/api/shortlist', { headers: AUTH });
check('GET /api/shortlist returns it', slList.status === 200 && slList.body?.items?.some((p) => p.id === target),
  `${slList.body?.items?.length} saved`);

const int = await req(`/api/profiles/${target}/interest`, { method: 'POST', headers: AUTH });
check('POST interest toggles on', int.status === 200 && int.body?.active === true);

const intList = await req('/api/interests', { headers: AUTH });
check('GET /api/interests returns it', intList.status === 200 && intList.body?.items?.some((p) => p.id === target));

const slOff = await req(`/api/profiles/${target}/shortlist`, { method: 'POST', headers: AUTH });
check('shortlist toggles back off', slOff.body?.active === false);

// ---------------------------------------------------------------- upload ---
console.log('\nPhoto upload');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);
const form = new FormData();
form.append('photo', new Blob([png], { type: 'image/png' }), 'verify.png');
const upRes = await fetch(`${BASE}/api/uploads/photo`, { method: 'POST', headers: AUTH, body: form });
const up = await upRes.json();
check('POST /api/uploads/photo', upRes.status === 201 && !!up.url, up.url || up.error);
if (up.url) {
  const served = await fetch(BASE + up.url);
  check('uploaded photo is served', served.status === 200);
  const meAfter = await req('/api/auth/me', { headers: AUTH });
  check('photo recorded on the account', meAfter.body?.user?.photos?.includes(up.url));
}

const badForm = new FormData();
badForm.append('photo', new Blob([Buffer.from('nope')], { type: 'text/plain' }), 'x.txt');
const badUp = await fetch(`${BASE}/api/uploads/photo`, { method: 'POST', headers: AUTH, body: badForm });
check('non-image upload rejected', badUp.status === 400);

// ----------------------------------------------------------------- admin ---
console.log('\nSuper-admin panel');
const adminLogin = await req('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify({ email: config.admin.email, password: config.admin.password }),
});
check('POST /api/admin/login', adminLogin.status === 200 && adminLogin.body?.user?.role === 'admin',
  adminLogin.body?.error || config.admin.email);
const ADMIN = { Authorization: `Bearer ${adminLogin.body?.token}` };

const adminBad = await req('/api/admin/login', {
  method: 'POST',
  body: JSON.stringify({ email: config.admin.email, password: 'wrong-password' }),
});
check('admin wrong password rejected', adminBad.status === 401);

const memberOnAdmin = await req('/api/admin/members', { headers: AUTH });
check('member token blocked from admin routes', memberOnAdmin.status === 403);

const anonOnAdmin = await req('/api/admin/members');
check('anonymous blocked from admin routes', anonOnAdmin.status === 401);

const members = await req('/api/admin/members?pageSize=100', { headers: ADMIN });
check('GET /api/admin/members', members.status === 200, `${members.body?.total} members`);
check('new registration appears in admin', members.body?.items?.some((m) => m.email === memberEmail));
check('admin account excluded from member list',
  !members.body?.items?.some((m) => m.email === config.admin.email));

const found = members.body?.items?.find((m) => m.email === memberEmail);
check('admin sees the full profile details', found?.details?.city === 'Amritsar' && found?.phone === '+919876500000');

const search = await req(`/api/admin/members?search=${encodeURIComponent('Verify')}`, { headers: ADMIN });
check('admin search works', search.status === 200 && search.body?.total > 0, `${search.body?.total} hits`);

const csvRes = await fetch(`${BASE}/api/admin/export.csv`, { headers: ADMIN });
const csv = await csvRes.text();
check('GET /api/admin/export.csv', csvRes.status === 200 && csv.includes(memberEmail),
  `${csv.split('\r\n').length - 1} rows`);
check('CSV includes profile columns', csv.includes('Amritsar') && csv.includes('religion'));

const csvAsMember = await fetch(`${BASE}/api/admin/export.csv`, { headers: AUTH });
check('member blocked from CSV export', csvAsMember.status === 403);

// ------------------------------------------------------------ newsletter ---
console.log('\nNewsletter & payments');
const news = await req('/api/newsletter', {
  method: 'POST', body: JSON.stringify({ email: `news.${stamp}@example.com` }),
});
check('POST /api/newsletter', news.status === 201);

const plans = await req('/api/payments/plans');
check('GET /api/payments/plans', plans.status === 200 && plans.body?.items?.length === 3);

const order = await req('/api/payments/order', {
  method: 'POST', headers: AUTH, body: JSON.stringify({ planId: 'gold' }),
});
check('POST /api/payments/order', order.status === 200 && !!order.body?.order?.id, `mode: ${order.body?.mode}`);

const verifyPay = await req('/api/payments/verify', {
  method: 'POST', headers: AUTH, body: JSON.stringify({ razorpay_order_id: order.body?.order?.id }),
});
check('POST /api/payments/verify activates plan', verifyPay.status === 200 && verifyPay.body?.status === 'paid');

const mePlan = await req('/api/auth/me', { headers: AUTH });
check('plan persisted on the account', mePlan.body?.user?.plan_id === 'gold');

// ---------------------------------------------------------------- result ---
console.log(`\n${'-'.repeat(60)}`);
console.log(`${passed} passed, ${failed} failed   (database: ${usingSupabase ? 'Supabase' : 'in-memory'})`);
console.log(`${'-'.repeat(60)}\n`);

process.exit(failed === 0 ? 0 : 1);
