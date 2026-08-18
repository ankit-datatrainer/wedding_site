import assert from 'node:assert/strict';
import {
  createUser,
  getMatches,
  getProfile,
  listInterests,
  listProfiles,
  listShortlist,
  toggleShortlist,
  expressInterest,
  _mem,
} from './store.js';

let passed = 0;
let failed = 0;

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.error(err);
  }
}

console.log('\n--- Opposite-Gender Algorithm Unit Tests ---\n');

// Set up test users
const maleUser = await createUser({
  email: `test.male.${Date.now()}@example.com`,
  password_hash: 'hash',
  first_name: 'Rahul',
  last_name: 'Sharma',
  gender: 'male',
  dob: '1992-05-15',
  profile_for: 'self',
  role: 'member',
  details: { religion: 'Hindu', city: 'Mumbai', diet: 'Vegetarian' },
});

const femaleUser = await createUser({
  email: `test.female.${Date.now()}@example.com`,
  password_hash: 'hash',
  first_name: 'Pooja',
  last_name: 'Verma',
  gender: 'female',
  dob: '1995-08-20',
  profile_for: 'self',
  role: 'member',
  details: { religion: 'Hindu', city: 'Mumbai', diet: 'Vegetarian' },
});

const adminUser = await createUser({
  email: `test.admin.${Date.now()}@example.com`,
  password_hash: 'hash',
  first_name: 'Admin',
  last_name: 'User',
  gender: 'male',
  dob: '1990-01-01',
  profile_for: 'self',
  role: 'admin',
  details: {},
});

// Find a male profile and a female profile from seed
const femaleProfile = _mem.profiles.find((p) => p.gender === 'female');
const maleProfile = _mem.profiles.find((p) => p.gender === 'male');

assert(femaleProfile, 'Must have at least one female profile in memory');
assert(maleProfile, 'Must have at least one male profile in memory');

console.log('1. Directory Listing (listProfiles)');

await asyncTest('Anonymous viewer sees both male and female profiles when no gender filter', async () => {
  const result = await listProfiles({ pageSize: 48 });
  const hasMale = result.items.some((p) => p.gender === 'male');
  const hasFemale = result.items.some((p) => p.gender === 'female');
  assert.equal(hasMale, true, 'Anonymous should see male profiles');
  assert.equal(hasFemale, true, 'Anonymous should see female profiles');
});

await asyncTest('Anonymous viewer can filter explicitly by gender', async () => {
  const malesOnly = await listProfiles({ gender: 'male', pageSize: 48 });
  assert.ok(malesOnly.items.length > 0);
  assert.ok(malesOnly.items.every((p) => p.gender === 'male'));

  const femalesOnly = await listProfiles({ gender: 'female', pageSize: 48 });
  assert.ok(femalesOnly.items.length > 0);
  assert.ok(femalesOnly.items.every((p) => p.gender === 'female'));
});

await asyncTest('Male member viewer receives ONLY female profiles', async () => {
  const result = await listProfiles({ pageSize: 48 }, maleUser.id);
  assert.ok(result.items.length > 0, 'Should return candidate profiles');
  assert.ok(result.items.every((p) => p.gender === 'female'), 'All returned profiles must be female');
  assert.equal(result.items.some((p) => p.gender === 'male'), false, 'No male profiles allowed for male user');
});

await asyncTest('Male member viewer query cannot be overridden by ?gender=male', async () => {
  const result = await listProfiles({ gender: 'male', pageSize: 48 }, maleUser.id);
  assert.ok(result.items.length > 0, 'Should return profiles');
  assert.ok(result.items.every((p) => p.gender === 'female'), 'Algorithm must enforce female profiles for male user even if ?gender=male passed');
});

await asyncTest('Female member viewer receives ONLY male profiles', async () => {
  const result = await listProfiles({ pageSize: 48 }, femaleUser.id);
  assert.ok(result.items.length > 0, 'Should return candidate profiles');
  assert.ok(result.items.every((p) => p.gender === 'male'), 'All returned profiles must be male');
  assert.equal(result.items.some((p) => p.gender === 'female'), false, 'No female profiles allowed for female user');
});

await asyncTest('Female member viewer query cannot be overridden by ?gender=female', async () => {
  const result = await listProfiles({ gender: 'female', pageSize: 48 }, femaleUser.id);
  assert.ok(result.items.length > 0, 'Should return profiles');
  assert.ok(result.items.every((p) => p.gender === 'male'), 'Algorithm must enforce male profiles for female user even if ?gender=female passed');
});

await asyncTest('Admin viewer is not restricted by opposite-gender filter', async () => {
  const result = await listProfiles({ pageSize: 48 }, adminUser.id);
  const hasMale = result.items.some((p) => p.gender === 'male');
  const hasFemale = result.items.some((p) => p.gender === 'female');
  assert.equal(hasMale, true, 'Admin should be able to see male profiles');
  assert.equal(hasFemale, true, 'Admin should be able to see female profiles');
});

console.log('\n2. Profile Detail (getProfile)');

await asyncTest('Male member viewer CAN access female profile', async () => {
  const profile = await getProfile(femaleProfile.id, maleUser.id);
  assert.ok(profile, 'Should return female profile');
  assert.equal(profile.id, femaleProfile.id);
  assert.equal(profile.gender, 'female');
});

await asyncTest('Male member viewer CANNOT access male profile (returns null)', async () => {
  const profile = await getProfile(maleProfile.id, maleUser.id);
  assert.equal(profile, null, 'Male viewer accessing male profile should return null (inaccessible)');
});

await asyncTest('Female member viewer CAN access male profile', async () => {
  const profile = await getProfile(maleProfile.id, femaleUser.id);
  assert.ok(profile, 'Should return male profile');
  assert.equal(profile.id, maleProfile.id);
  assert.equal(profile.gender, 'male');
});

await asyncTest('Female member viewer CANNOT access female profile (returns null)', async () => {
  const profile = await getProfile(femaleProfile.id, femaleUser.id);
  assert.equal(profile, null, 'Female viewer accessing female profile should return null (inaccessible)');
});

await asyncTest('Admin viewer can access any profile', async () => {
  const male = await getProfile(maleProfile.id, adminUser.id);
  assert.ok(male, 'Admin can view male profile');
  const female = await getProfile(femaleProfile.id, adminUser.id);
  assert.ok(female, 'Admin can view female profile');
});

console.log('\n3. Matches Algorithm (getMatches)');

await asyncTest('Male member matches are 100% female and ranked by compatibility', async () => {
  const matches = await getMatches(maleUser.id, { pageSize: 50 });
  assert.ok(matches.items.length > 0);
  assert.ok(matches.items.every((p) => p.gender === 'female'), 'Matches for male must be 100% female');
  assert.ok(matches.items.every((p) => typeof p.match_score === 'number'));
  assert.equal(matches.viewerGender, 'male');
});

await asyncTest('Female member matches are 100% male and ranked by compatibility', async () => {
  const matches = await getMatches(femaleUser.id, { pageSize: 50 });
  assert.ok(matches.items.length > 0);
  assert.ok(matches.items.every((p) => p.gender === 'male'), 'Matches for female must be 100% male');
  assert.ok(matches.items.every((p) => typeof p.match_score === 'number'));
  assert.equal(matches.viewerGender, 'female');
});

console.log('\n4. Shortlist & Interests (toggle & list)');

await asyncTest('Male member can shortlist and express interest in female profile', async () => {
  const sl = await toggleShortlist(maleUser.id, femaleProfile.id);
  assert.equal(sl.active, true);

  const slList = await listShortlist(maleUser.id);
  assert.ok(slList.some((p) => p.id === femaleProfile.id));
  assert.ok(slList.every((p) => p.gender === 'female'));

  const interest = await expressInterest(maleUser.id, femaleProfile.id);
  assert.equal(interest.active, true);

  const intList = await listInterests(maleUser.id);
  assert.ok(intList.some((p) => p.id === femaleProfile.id));
  assert.ok(intList.every((p) => p.gender === 'female'));

  // clean up
  await toggleShortlist(maleUser.id, femaleProfile.id);
});

await asyncTest('Male member CANNOT shortlist same-gender profile (throws error)', async () => {
  await assert.rejects(
    async () => {
      await toggleShortlist(maleUser.id, maleProfile.id);
    },
    /incompatible gender/i
  );
});

await asyncTest('Female member CANNOT shortlist same-gender profile (throws error)', async () => {
  await assert.rejects(
    async () => {
      await toggleShortlist(femaleUser.id, femaleProfile.id);
    },
    /incompatible gender/i
  );
});

console.log(`\n${'-'.repeat(40)}`);
console.log(`${passed} passed, ${failed} failed`);
console.log(`${'-'.repeat(40)}\n`);

if (failed > 0) process.exit(1);
