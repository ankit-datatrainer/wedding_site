/**
 * Integration tests for the biodata endpoints — `npm run test:biodata:api`.
 *
 * Runs against a live server (API_URL, default http://127.0.0.1:4000) and
 * whatever database that server is configured with. Every profile it imports
 * is deleted again in the `finally` block, so it is safe to point at the real
 * Supabase project.
 */

import assert from 'node:assert/strict';
import { makePdf } from './test-utils/make-pdf.js';
import { config } from './config.js';

const BASE = process.env.API_URL || `http://127.0.0.1:${config.port}`;

let passed = 0;
let failed = 0;
const failures = [];
const createdProfileIds = [];
const createdMemberEmails = [];

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
    console.log(`  \x1b[31m✗\x1b[0m ${name}`);
    console.log(`    \x1b[31m${err.message.split('\n')[0]}\x1b[0m`);
  }
}

const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

/** Reads a response body exactly once — it cannot be read twice. */
async function read(res) {
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text), text };
  } catch {
    return { status: res.status, body: {}, text };
  }
}

const BIODATA = [
  'MARRIAGE BIODATA',
  'Name: Ishaan Raghunathan',
  'Date of Birth: 08/11/1993',
  'Gender: Male',
  "Height: 5'11\"",
  'Marital Status: Never Married',
  'Religion: Hindu',
  'Caste: Iyer',
  'Mother Tongue: Tamil',
  'Diet: Vegetarian',
  'Education: M.Tech Aerospace',
  'College: IIT Madras',
  'Occupation: Propulsion Engineer',
  'Company: ISRO',
  'City: Chennai',
  'State: Tamil Nadu',
  "Father's Name: Mr. Raghunathan Iyer",
  'Family Type: Nuclear',
  'Mobile: +91 90000 11122',
  'Email: ishaan.biodata.test@example.com',
  'About Me: Amateur astronomer and long-distance runner.',
];

const form = (files, field) => {
  const fd = new FormData();
  for (const [filename, lines] of files) {
    fd.append(field, new Blob([makePdf(lines)], { type: 'application/pdf' }), filename);
  }
  return fd;
};

async function main() {
  /* ------------------------------------------------------- member parse -- */

  section(`Member biodata parse — POST /api/uploads/biodata  (${BASE})`);

  let draft;
  await test('parses a biodata PDF without requiring a login', async () => {
    const res = await fetch(`${BASE}/api/uploads/biodata`, {
      method: 'POST',
      body: form([['biodata.pdf', BIODATA]], 'biodata'),
    });
    assert.equal(res.status, 200, `expected 200, got ${res.status}`);
    const body = await res.json();
    draft = body.draft;
    assert.ok(draft, 'no draft returned');
  });

  await test('returns registration fields ready for the wizard', () => {
    assert.equal(draft.firstName, 'Ishaan');
    assert.equal(draft.lastName, 'Raghunathan');
    assert.equal(draft.gender, 'male');
    assert.equal(draft.dob, '1993-11-08');
    assert.equal(draft.email, 'ishaan.biodata.test@example.com');
    assert.ok(draft.phone.includes('9000011122'));
  });

  await test('returns a details blob the profile API will accept', () => {
    assert.equal(draft.details.religion, 'Hindu');
    assert.equal(draft.details.community, 'Iyer');
    assert.equal(draft.details.motherTongue, 'Tamil');
    assert.equal(draft.details.diet, 'Vegetarian');
    assert.equal(draft.details.heightCm, '180');
    assert.equal(draft.details.occupation, 'Propulsion Engineer');
    assert.equal(draft.details.employer, 'ISRO');
    assert.equal(draft.details.city, 'Chennai');
    assert.equal(draft.details.state, 'Tamil Nadu');
    assert.equal(draft.details.fatherName, 'Raghunathan Iyer');
    assert.equal(draft.details.familyType, 'Nuclear');
  });

  await test('rejects a non-PDF upload', async () => {
    const fd = new FormData();
    fd.append('biodata', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
    const res = await fetch(`${BASE}/api/uploads/biodata`, { method: 'POST', body: fd });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /PDF/i);
  });

  await test('rejects a PDF with no readable profile details', async () => {
    const res = await fetch(`${BASE}/api/uploads/biodata`, {
      method: 'POST',
      body: form([['invoice.pdf', ['INVOICE 4417', 'Total 1416.00']]], 'biodata'),
    });
    assert.equal(res.status, 422);
    assert.match((await res.json()).error, /could not find/i);
  });

  await test('rejects a request with no file at all', async () => {
    const res = await fetch(`${BASE}/api/uploads/biodata`, {
      method: 'POST',
      body: new FormData(),
    });
    assert.equal(res.status, 400);
  });

  /* ------------------------------------------------ the parsed draft saves -- */

  section('The parsed draft is actually accepted by the profile API');

  const email = `biodata.test.${Date.now()}@example.com`;
  createdMemberEmails.push(email);
  let token;

  await test('a member can register and save the parsed draft end-to-end', async () => {
    const reg = await read(
      await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          profileFor: 'self',
          firstName: draft.firstName,
          lastName: draft.lastName,
          gender: draft.gender,
          dob: draft.dob,
          email,
          password: 'BiodataTest123!',
        }),
      })
    );
    assert.equal(reg.status, 201, `register failed: ${reg.text}`);
    token = reg.body.token;

    // This is the assertion that matters: every field the parser produced
    // must survive detailsSchema. A single bad enum would 400 the whole save.
    const patch = await read(
      await fetch(`${BASE}/api/auth/me`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: draft.phone, details: draft.details }),
      })
    );
    assert.equal(patch.status, 200, `patch failed: ${patch.text}`);

    const saved = patch.body.user;
    assert.equal(saved.details.religion, 'Hindu');
    assert.equal(saved.details.diet, 'Vegetarian');
    assert.equal(saved.details.employer, 'ISRO');
  });

  /* -------------------------------------------------------- admin import -- */

  section('Admin biodata import — POST /api/admin/profiles/import-biodata');

  let adminToken;
  await test('admin can log in', async () => {
    const res = await read(
      await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: config.admin.email, password: config.admin.password }),
      })
    );
    assert.equal(res.status, 200, `admin login failed: ${res.text}`);
    adminToken = res.body.token;
  });

  const importPdfs = (files) =>
    fetch(`${BASE}/api/admin/profiles/import-biodata`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: form(files, 'biodata'),
    });

  await test('the import endpoint refuses an unauthenticated caller', async () => {
    const res = await fetch(`${BASE}/api/admin/profiles/import-biodata`, {
      method: 'POST',
      body: form([['b.pdf', BIODATA]], 'biodata'),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  await test('the import endpoint refuses a non-admin member token', async () => {
    const res = await fetch(`${BASE}/api/admin/profiles/import-biodata`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form([['b.pdf', BIODATA]], 'biodata'),
    });
    assert.ok(res.status === 401 || res.status === 403, `expected 401/403, got ${res.status}`);
  });

  let imported;
  await test('imports a single biodata into a real profile row', async () => {
    const res = await read(await importPdfs([['ishaan.pdf', BIODATA]]));
    assert.equal(res.status, 201, `expected 201, got ${res.status}: ${res.text}`);
    const { body } = res;
    assert.equal(body.summary.imported, 1);
    assert.equal(body.summary.failed, 0);
    imported = body.imported[0].profile;
    createdProfileIds.push(imported.id);
  });

  await test('the imported row carries the parsed fields', () => {
    assert.equal(imported.name, 'Ishaan Raghunathan');
    assert.equal(imported.gender, 'male');
    assert.equal(imported.profession, 'Propulsion Engineer');
    assert.equal(imported.location, 'Chennai, Tamil Nadu');
    assert.equal(imported.city, 'Chennai', 'city must be set or /browse cannot filter it');
    assert.equal(imported.religion, 'Hindu');
    assert.equal(imported.community, 'Iyer');
    assert.equal(imported.height_cm, 180);
    assert.equal(imported.marital_status, 'Never Married');
    assert.equal(imported.education_level, 'Masters');
    assert.equal(typeof imported.age, 'number');
  });

  await test('the imported profile is listed in the admin panel', async () => {
    const { status, body } = await read(
      await fetch(
        `${BASE}/api/admin/profiles?search=${encodeURIComponent('Ishaan Raghunathan')}`,
        { headers: { authorization: `Bearer ${adminToken}` } }
      )
    );
    assert.equal(status, 200);
    const found = (body.items || []).some((p) => p.id === imported.id);
    assert.ok(found, 'imported profile did not appear in GET /api/admin/profiles');
  });

  await test('the imported profile is visible in the public directory', async () => {
    const { status, body } = await read(await fetch(`${BASE}/api/profiles/${imported.id}`));
    assert.equal(status, 200, `expected the profile to be browsable, got ${status}`);
    assert.equal(body.name, 'Ishaan Raghunathan');
  });

  await test('imports a batch of several PDFs at once', async () => {
    const { status, body } = await read(
      await importPdfs([
        ['a.pdf', BIODATA.map((l) => l.replace('Ishaan Raghunathan', 'Batch Alpha'))],
        ['b.pdf', BIODATA.map((l) => l.replace('Ishaan Raghunathan', 'Batch Bravo'))],
        ['c.pdf', BIODATA.map((l) => l.replace('Ishaan Raghunathan', 'Batch Charlie'))],
      ])
    );
    assert.equal(status, 201);
    assert.equal(body.summary.imported, 3, JSON.stringify(body.failures));
    for (const item of body.imported) createdProfileIds.push(item.profile.id);
    assert.deepEqual(
      body.imported.map((i) => i.profile.name).sort(),
      ['Batch Alpha', 'Batch Bravo', 'Batch Charlie']
    );
  });

  await test('one bad PDF does not lose the good ones in the same batch (207)', async () => {
    const { status, body } = await read(
      await importPdfs([
        ['good.pdf', BIODATA.map((l) => l.replace('Ishaan Raghunathan', 'Partial Success'))],
        ['bad.pdf', ['INVOICE 9910', 'Total 500.00']],
      ])
    );
    assert.equal(status, 207, `expected 207 Multi-Status, got ${status}`);
    assert.equal(body.summary.imported, 1);
    assert.equal(body.summary.failed, 1);
    assert.equal(body.failures[0].filename, 'bad.pdf');
    assert.match(body.failures[0].error, /name|read/i);
    for (const item of body.imported) createdProfileIds.push(item.profile.id);
  });

  await test('a batch where every file fails returns 400 and creates nothing', async () => {
    const { status, body } = await read(
      await importPdfs([
        ['x.pdf', ['INVOICE 1', 'Total 1.00']],
        ['y.pdf', ['INVOICE 2', 'Total 2.00']],
      ])
    );
    assert.equal(status, 400);
    assert.equal(body.summary.imported, 0);
    assert.equal(body.summary.failed, 2);
  });

  await test('a biodata missing gender is refused rather than half-imported', async () => {
    const { status, body } = await read(
      await importPdfs([
        ['nogender.pdf', ['Name: Nameonly Person', 'Date of Birth: 01/01/1995', 'Religion: Hindu']],
      ])
    );
    assert.equal(status, 400);
    assert.match(body.failures[0].error, /gender/i);
  });
}

/* ------------------------------------------------------------- teardown -- */

try {
  await main();
} catch (err) {
  failed += 1;
  failures.push({ name: 'test run', err });
  console.error(`\n\x1b[31mTest run aborted: ${err.message}\x1b[0m`);
} finally {
  if (createdProfileIds.length || createdMemberEmails.length) {
    section('Cleanup');
    let adminToken;
    try {
      const res = await fetch(`${BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: config.admin.email, password: config.admin.password }),
      });
      adminToken = (await res.json()).token;
    } catch {
      /* fall through to the warning below */
    }

    const auth = { authorization: `Bearer ${adminToken}` };

    let removed = 0;
    for (const id of createdProfileIds) {
      try {
        const res = await fetch(`${BASE}/api/admin/profiles/${id}`, { method: 'DELETE', headers: auth });
        if (res.ok) removed += 1;
      } catch {
        /* reported below */
      }
    }
    if (createdProfileIds.length) {
      const leaked = createdProfileIds.length - removed;
      console.log(`  removed ${removed}/${createdProfileIds.length} imported test profiles`);
      if (leaked) {
        console.log(`  \x1b[33m! ${leaked} test profile(s) left behind — delete them in the admin panel\x1b[0m`);
      }
    }

    // The end-to-end test registers a throwaway member; don't leave it behind
    // in the real member list.
    let membersRemoved = 0;
    for (const memberEmail of createdMemberEmails) {
      try {
        const list = await read(
          await fetch(`${BASE}/api/admin/members?search=${encodeURIComponent(memberEmail)}`, {
            headers: auth,
          })
        );
        for (const m of list.body.items || []) {
          if (m.email !== memberEmail) continue;
          const res = await fetch(`${BASE}/api/admin/members/${m.id}`, { method: 'DELETE', headers: auth });
          if (res.ok) membersRemoved += 1;
        }
      } catch {
        /* reported below */
      }
    }
    if (createdMemberEmails.length) {
      const leaked = createdMemberEmails.length - membersRemoved;
      console.log(`  removed ${membersRemoved}/${createdMemberEmails.length} test member accounts`);
      if (leaked) {
        console.log(`  \x1b[33m! ${leaked} test account(s) left behind — delete them in the admin panel\x1b[0m`);
      }
    }
  }
}

console.log(
  `\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`
);
if (failed) {
  for (const { name, err } of failures) console.error(`\n✗ ${name}\n${err.stack}`);
  process.exit(1);
}
