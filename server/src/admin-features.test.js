// End-to-end checks for the admin features: team roles & permissions,
// profile approval, biodata matching, branded exports, and the required
// registration reference + parent confirmation.
//
// Boots its own in-memory API on a spare port — never touches Supabase.
//   npm run test:admin

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 4917;
const BASE = `http://localhost:${PORT}`;

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  — ${detail}` : ''}`);
  if (!ok) failed++;
}

async function call(method, url, { token, body, raw } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return { status: res.status, headers: res.headers, buf: Buffer.from(await res.arrayBuffer()) };
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  return { status: res.status, body: json };
}

const server = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
  env: {
    ...process.env,
    PORT: String(PORT),
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SMTP_HOST: '',
    ADMIN_EMAIL: 'root@test.local',
    ADMIN_PASSWORD: 'RootPass123!',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('API did not start')), 15000);
  server.stdout.on('data', (d) => {
    if (String(d).includes('listening')) {
      clearTimeout(t);
      resolve();
    }
  });
  server.stderr.on('data', (d) => process.stderr.write(d));
});

try {
  // ---------------------------------------------------------- super admin
  const login = await call('POST', '/api/admin/login', { body: { email: 'root@test.local', password: 'RootPass123!' } });
  check('super admin logs in', login.status === 200);
  const root = login.body.token;

  const me = await call('GET', '/api/admin/me', { token: root });
  check('super admin holds every permission', me.body.isSuper && me.body.permissions.includes('profiles.approve') && me.body.permissions.includes('export.data'));

  const roles = await call('GET', '/api/admin/roles', { token: root });
  const names = roles.body.items.map((r) => r.name);
  check('default roles seeded (Staff, Manager, Developer, Content Editor)',
    ['Staff', 'Manager', 'Developer', 'Content Editor'].every((n) => names.includes(n)), names.join(','));
  const staffRole = roles.body.items.find((r) => r.name === 'Staff');

  const custom = await call('POST', '/api/admin/roles', {
    token: root,
    body: { name: 'Verifier', description: 'Approves only', permissions: ['profiles.view', 'profiles.approve', 'bogus.perm'] },
  });
  check('super admin creates a custom role', custom.status === 201);
  check('unknown permissions are dropped', JSON.stringify(custom.body.permissions) === '["profiles.view","profiles.approve"]');

  // ---------------------------------------------------------------- staff
  const addStaff = await call('POST', '/api/admin/team', {
    token: root,
    body: { firstName: 'Sita', lastName: 'Staff', email: 'sita@test.local', password: 'StaffPass1', roleId: staffRole.id },
  });
  check('super admin creates a Staff account', addStaff.status === 201 && addStaff.body.role_name === 'Staff');

  const staffLogin = await call('POST', '/api/admin/login', { body: { email: 'sita@test.local', password: 'StaffPass1' } });
  check('staff logs in to the admin panel', staffLogin.status === 200);
  const staff = staffLogin.body.token;

  const memberLoginAsStaff = await call('POST', '/api/auth/login', { body: { email: 'sita@test.local', password: 'StaffPass1' } });
  check('staff cannot use the member login', memberLoginAsStaff.status === 403);

  const staffMe = await call('GET', '/api/admin/me', { token: staff });
  check('staff sees only their role permissions', !staffMe.body.isSuper && staffMe.body.permissions.length === 3 && staffMe.body.roleName === 'Staff');

  check('staff blocked from members', (await call('GET', '/api/admin/members', { token: staff })).status === 403);
  check('staff blocked from export', (await call('POST', '/api/admin/export', { token: staff, body: { dataset: 'members', format: 'csv' } })).status === 403);
  check('staff blocked from roles', (await call('GET', '/api/admin/roles', { token: staff })).status === 403);
  check('staff blocked from payments', (await call('GET', '/api/admin/orders', { token: staff })).status === 403);

  const staffProfile = await call('POST', '/api/admin/profiles', {
    token: staff,
    body: {
      name: 'Kavya Iyer', age: 27, gender: 'female', religion: 'Hindu', community: 'Brahmin',
      location: 'Pune, Maharashtra', diet: 'Vegetarian', mother_tongue: 'Hindi',
      status: 'approved', verified: true,
      details: { fatherName: 'R. Iyer', referenceName: 'M. Rao', referencePhone: '9876543210', junk: 'x' },
    },
  });
  check('staff uploads a profile', staffProfile.status === 201);
  check('staff upload is forced to pending (cannot self-publish)', staffProfile.body.status === 'pending' && staffProfile.body.verified === false);
  check('profile keeps full biodata details (unknown keys dropped)',
    staffProfile.body.details.fatherName === 'R. Iyer' && !('junk' in staffProfile.body.details));
  const pid = staffProfile.body.id;

  check('staff cannot approve', (await call('POST', `/api/admin/profiles/${pid}/status`, { token: staff, body: { status: 'approved' } })).status === 403);
  check('staff cannot edit', (await call('PATCH', `/api/admin/profiles/${pid}`, { token: staff, body: { name: 'X' } })).status === 403);

  // --------------------------------------------------- approval → website
  const publicBefore = await call('GET', `/api/profiles/${pid}`);
  check('pending profile is hidden from the website', publicBefore.status === 404);
  const browseBefore = await call('GET', '/api/profiles?search=Kavya&pageSize=48');
  check('pending profile not in /browse', !browseBefore.body.items.some((p) => p.id === pid));

  const pendingList = await call('GET', '/api/admin/profiles?status=pending', { token: root });
  check('admin sees it in the pending queue', pendingList.body.items.some((p) => p.id === pid));

  const approve = await call('POST', `/api/admin/profiles/${pid}/status`, { token: root, body: { status: 'approved' } });
  check('super admin approves', approve.status === 200 && approve.body.status === 'approved' && approve.body.approved_by === 'root@test.local');

  const publicAfter = await call('GET', `/api/profiles/${pid}`);
  check('approved profile is visible on the website', publicAfter.status === 200 && publicAfter.body.name === 'Kavya Iyer');

  const reject = await call('POST', `/api/admin/profiles/${pid}/status`, { token: root, body: { status: 'rejected', note: 'Photo unclear' } });
  check('reject hides it again', reject.body.status === 'rejected' && (await call('GET', `/api/profiles/${pid}`)).status === 404);
  await call('POST', `/api/admin/profiles/${pid}/status`, { token: root, body: { status: 'approved' } });

  const edit = await call('PATCH', `/api/admin/profiles/${pid}`, { token: root, body: { details: { motherName: 'L. Iyer' } } });
  check('admin edits details (merged, not replaced)', edit.body.details.motherName === 'L. Iyer' && edit.body.details.fatherName === 'R. Iyer');

  // -------------------------------------------------------------- matches
  const matches = await call('GET', `/api/admin/profiles/${pid}/matches?limit=5`, { token: root });
  const items = matches.body.items;
  check('matches are ranked 1, 2, 3…', items.length > 0 && items.every((m, i) => m.rank === i + 1));
  check('matches are all the opposite gender', items.every((m) => m.gender === 'male'));
  check('matches sorted by score with reasons', items.every((m, i) => i === 0 || items[i - 1].score >= m.score) && items[0].reasons.length > 0);

  const preview = await call('POST', '/api/admin/profiles/match-preview', {
    token: staff, body: { name: 'Test', gender: 'male', age: 30, religion: 'Hindu', location: 'Mumbai, Maharashtra' },
  });
  check('staff can preview matches for an unsaved biodata', preview.status === 200 && preview.body.items.every((m) => m.gender === 'female'));

  // --------------------------------------------------------------- export
  const cols = await call('GET', '/api/admin/export/columns', { token: root });
  check('export column catalogue', cols.body.columns.members.length > 20 && cols.body.columns.profiles.length > 20);

  const csv = await call('POST', '/api/admin/export', {
    token: root, raw: true,
    body: { dataset: 'profiles', format: 'csv', columns: ['name', 'age', 'father_name'], ids: [pid] },
  });
  const csvText = csv.buf.toString('utf8');
  check('CSV export: selected rows and columns only',
    csv.status === 200 && csvText.includes('Full Name,Age,Father\'s Name') && csvText.includes('Kavya Iyer,27,R. Iyer') && csvText.trim().split('\r\n').length === 2,
    csvText.slice(0, 200));

  const xlsx = await call('POST', '/api/admin/export', {
    token: root, raw: true, body: { dataset: 'profiles', format: 'xlsx', columns: ['name', 'religion'] },
  });
  check('Excel export is a real .xlsx', xlsx.status === 200 && xlsx.buf.slice(0, 2).toString() === 'PK' && xlsx.buf.length > 5000);

  const pdf = await call('POST', '/api/admin/export', {
    token: root, raw: true, body: { dataset: 'profiles', format: 'pdf', columns: ['name', 'age', 'location'] },
  });
  check('PDF table export is a real PDF', pdf.status === 200 && pdf.buf.slice(0, 5).toString() === '%PDF-');

  const sheets = await call('POST', '/api/admin/export', {
    token: root, raw: true, body: { dataset: 'profiles', format: 'pdf', layout: 'sheets', ids: [pid, 'p1'] },
  });
  check('PDF biodata-sheet export', sheets.status === 200 && sheets.buf.slice(0, 5).toString() === '%PDF-');

  // --------------------------------------- registration: reference + parent
  const base = {
    firstName: 'Rahul', lastName: 'Verma', gender: 'male', dob: '1995-04-02',
    email: 'rahul@test.local', password: 'Password123',
  };
  const noRef = await call('POST', '/api/auth/register', { body: { ...base, details: {} } });
  check('registration without a reference is rejected', noRef.status === 400 && /reference/i.test(noRef.body.error));

  const shortPhone = await call('POST', '/api/auth/register', {
    body: { ...base, details: { referenceName: 'Mr Gupta', referencePhone: '12345', referredBy: 'Uncle' } },
  });
  check('reference phone must have 10+ digits', shortPhone.status === 400);

  const reg = await call('POST', '/api/auth/register', {
    body: {
      ...base,
      notifyFather: true,
      details: {
        referenceName: 'Mr S.K. Gupta', referencePhone: '+91 98765 43210', referredBy: 'Family friend',
        fatherEmail: 'father@test.local', motherEmail: 'mother@test.local',
      },
      notifyMother: false,
    },
  });
  check('registration with a reference succeeds', reg.status === 201);
  check('response carries the reference back', reg.body.reference?.name === 'Mr S.K. Gupta');
  check('father confirmation sent; mother skipped when user said no',
    reg.body.notifications.length === 1 && reg.body.notifications[0].relation === 'Father' && reg.body.notifications[0].email === 'father@test.local');

  const logs = await call('GET', '/api/admin/email-logs', { token: root });
  check('confirmation appears in the admin email log', logs.body.items.some((l) => l.to_email === 'father@test.local'));

  const member = await call('GET', `/api/admin/members/${reg.body.user.id}`, { token: root });
  check('admin sees the member reference', member.body.user.details.referenceName === 'Mr S.K. Gupta');

  // ------------------------------------------------------ team management
  const suspend = await call('PATCH', `/api/admin/team/${addStaff.body.id}`, { token: root, body: { suspended: true } });
  check('super admin suspends a staff account', suspend.body.suspended === true);
  check('suspended staff is locked out immediately', (await call('GET', '/api/admin/me', { token: staff })).status === 403);

  const delRoleInUse = await call('DELETE', `/api/admin/roles/${staffRole.id}`, { token: root });
  check('cannot delete a role that has members', delRoleInUse.status === 409);

  const stats = await call('GET', '/api/admin/stats', { token: root });
  check('stats include pending count', typeof stats.body.pendingProfiles === 'number');
} catch (err) {
  console.error(err);
  failed++;
} finally {
  server.kill();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll admin feature checks passed');
process.exit(failed ? 1 : 0);
