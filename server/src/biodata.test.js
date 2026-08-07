/**
 * Parser tests — `npm run test:biodata`.
 *
 * Every case round-trips through a real generated PDF and the same pdf-parse
 * path production uses, so text-extraction quirks are covered too, not just
 * the regexes.
 */

import assert from 'node:assert/strict';
import { makePdf } from './test-utils/make-pdf.js';
import {
  missingRequired,
  parseBiodataPdf,
  parseBiodataText,
  parseDob,
  parseHeightCm,
  toMemberDraft,
  toProfileRow,
} from './biodata.js';

let passed = 0;
let failed = 0;
const failures = [];

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

/* --------------------------------------------------------------- fixtures -- */

// The most common layout: plain "Label : Value" rows.
const CLASSIC = [
  'MARRIAGE BIODATA',
  '',
  'Name: Rohan Chatterjee',
  'Date of Birth: 12/05/1994',
  'Gender: Male',
  "Height: 5'10\"",
  'Weight: 72 kg',
  'Marital Status: Never Married',
  'Religion: Hindu',
  'Caste: Bengali Brahmin',
  'Gotra: Kashyap',
  'Manglik: No',
  'Rashi: Vrishabha',
  'Nakshatra: Rohini',
  'Mother Tongue: Bengali',
  'Diet: Vegetarian',
  'Smoking: No',
  'Drinking: Occasionally',
  '',
  'Education: B.Tech Computer Science',
  'College: NIT Surathkal',
  'Occupation: Software Architect',
  'Company: Infosys Ltd',
  'Annual Income: Rs 28,00,000',
  '',
  'City: Pune',
  'State: Maharashtra',
  'Country: India',
  'Pin Code: 411001',
  '',
  "Father's Name: Mr. Suresh Chatterjee",
  "Father's Occupation: Retired Bank Manager",
  "Mother's Name: Mrs. Anita Chatterjee",
  "Mother's Occupation: Homemaker",
  'Siblings: One younger sister, married',
  'Family Type: Nuclear',
  'Family Status: Upper Middle Class',
  'Family Values: Moderate',
  '',
  'Mobile: +91 98765 43210',
  'Email: rohan.chatterjee@example.com',
  '',
  'About Me: I enjoy trekking, classical music and cooking on weekends.',
  'Partner Expectations: Looking for an educated, family-oriented partner.',
];

// Table-style export: labels and values land on alternating lines.
const SPLIT_LAYOUT = [
  'Bio Data',
  'Full Name',
  'Priya Sharma',
  'D.O.B',
  '3rd August 1996',
  'Sex',
  'Female',
  'Height',
  '5 ft 4 in',
  'Religion',
  'Hindu',
  'Qualification',
  'MBA Finance',
  'Profession',
  'Financial Analyst',
  'Location',
  'Bengaluru, Karnataka',
  'Food Habits',
  'Pure Veg',
];

/* ------------------------------------------------------------------ tests -- */

section('Height parsing');

await test("5'10\" → 178cm", () => assert.equal(parseHeightCm(`5'10"`), 178));
await test('5 ft 4 in → 163cm', () => assert.equal(parseHeightCm('5 ft 4 in'), 163));
await test('5 feet 11 inches → 180cm', () => assert.equal(parseHeightCm('5 feet 11 inches'), 180));
await test('172 cm → 172cm', () => assert.equal(parseHeightCm('172 cm'), 172));
await test('bare 165 → 165cm', () => assert.equal(parseHeightCm('165'), 165));
await test('5.6 shorthand → 168cm (feet.inches, not decimal)', () =>
  assert.equal(parseHeightCm('5.6'), 168));
await test("5'10\" (178 cm) prefers the explicit cm", () =>
  assert.equal(parseHeightCm(`5'10" (178 cm)`), 178));
await test('nonsense height is rejected, not guessed', () =>
  assert.equal(parseHeightCm('tall'), undefined));
await test('implausible height is rejected', () => assert.equal(parseHeightCm('900 cm'), undefined));

section('Date of birth parsing');

await test('12/05/1994 reads day-first (Indian convention)', () =>
  assert.equal(parseDob('12/05/1994'), '1994-05-12'));
await test('05/22/1994 falls back to month-first when day-first is impossible', () =>
  assert.equal(parseDob('05/22/1994'), '1994-05-22'));
await test('1994-05-12 ISO', () => assert.equal(parseDob('1994-05-12'), '1994-05-12'));
await test('12 May 1994', () => assert.equal(parseDob('12 May 1994'), '1994-05-12'));
await test('3rd August 1996', () => assert.equal(parseDob('3rd August 1996'), '1996-08-03'));
await test('May 12, 1994', () => assert.equal(parseDob('May 12, 1994'), '1994-05-12'));
await test('31 Feb is rejected as a real calendar date', () =>
  assert.equal(parseDob('31/02/1994'), undefined));
await test('an implausible year is rejected', () =>
  assert.equal(parseDob('12/05/1850'), undefined));
await test('nonsense date is rejected, not guessed', () =>
  assert.equal(parseDob('sometime in the 90s'), undefined));

section('Classic biodata PDF (end-to-end through a real PDF)');

const classic = await parseBiodataPdf(makePdf(CLASSIC));
const c = classic.fields;

await test('extracts name into first and last', () => {
  assert.equal(c.firstName, 'Rohan');
  assert.equal(c.lastName, 'Chatterjee');
  assert.equal(c.name, 'Rohan Chatterjee');
});
await test('extracts gender and DOB', () => {
  assert.equal(c.gender, 'male');
  assert.equal(c.dob, '1994-05-12');
});
await test('derives age from date of birth', () => assert.equal(typeof c.age, 'number'));
await test('extracts height and weight', () => {
  assert.equal(c.heightCm, '178');
  assert.equal(c.weightKg, '72');
});
await test('normalises lifestyle enums', () => {
  assert.equal(c.maritalStatus, 'Never Married');
  assert.equal(c.diet, 'Vegetarian');
  assert.equal(c.smoking, 'No');
  assert.equal(c.drinking, 'Occasionally');
});
await test('extracts faith and horoscope', () => {
  assert.equal(c.religion, 'Hindu');
  assert.equal(c.community, 'Bengali Brahmin');
  assert.equal(c.gothram, 'Kashyap');
  assert.equal(c.manglik, 'No');
  assert.equal(c.rashi, 'Vrishabha');
  assert.equal(c.nakshatra, 'Rohini');
  assert.equal(c.motherTongue, 'Bengali');
});
await test('extracts education and career', () => {
  assert.equal(c.highestEducation, 'B.Tech Computer Science');
  assert.equal(c.college, 'NIT Surathkal');
  assert.equal(c.occupation, 'Software Architect');
  assert.equal(c.employer, 'Infosys Ltd');
  assert.equal(c.annualIncome, 'Rs 28,00,000');
});
await test('infers education level from the degree', () =>
  assert.equal(c.educationLevel, 'Bachelors'));
await test('extracts location', () => {
  assert.equal(c.city, 'Pune');
  assert.equal(c.state, 'Maharashtra');
  assert.equal(c.country, 'India');
  assert.equal(c.pincode, '411001');
});
await test('strips honorifics from parent names', () => {
  assert.equal(c.fatherName, 'Suresh Chatterjee');
  assert.equal(c.motherName, 'Anita Chatterjee');
});
await test('extracts family details', () => {
  assert.equal(c.fatherOccupation, 'Retired Bank Manager');
  assert.equal(c.motherOccupation, 'Homemaker');
  assert.equal(c.familyType, 'Nuclear');
  assert.equal(c.familyStatus, 'Upper Middle Class');
  assert.equal(c.familyValues, 'Moderate');
  assert.ok(c.siblings.includes('younger sister'));
});
await test('extracts contact details', () => {
  assert.equal(c.email, 'rohan.chatterjee@example.com');
  assert.ok(c.phone.includes('9876543210'));
});
await test('extracts free-text sections', () => {
  assert.ok(c.aboutMe.includes('trekking'));
  assert.ok(c.partnerExpectations.includes('family-oriented'));
});
await test('parses a full biodata without warnings', () =>
  assert.deepEqual(classic.warnings, []));

section('Split table layout (label and value on separate lines)');

const split = await parseBiodataPdf(makePdf(SPLIT_LAYOUT));
const s = split.fields;

await test('reads values from the following line', () => {
  assert.equal(s.firstName, 'Priya');
  assert.equal(s.lastName, 'Sharma');
  assert.equal(s.gender, 'female');
  assert.equal(s.dob, '1996-08-03');
});
await test('reads height and diet from a split layout', () => {
  assert.equal(s.heightCm, '163');
  assert.equal(s.diet, 'Vegetarian');
});
await test('splits a combined "City, State" location', () => {
  assert.equal(s.city, 'Bengaluru');
  assert.equal(s.state, 'Karnataka');
});
await test('maps alias labels (Qualification, Profession)', () => {
  assert.equal(s.highestEducation, 'MBA Finance');
  assert.equal(s.occupation, 'Financial Analyst');
  assert.equal(s.educationLevel, 'Masters');
});

section('Enum safety (never emit a value the API would reject)');

const DIET_CASES = [
  ['Non-Veg', 'Non-Vegetarian'],
  ['non vegetarian', 'Non-Vegetarian'],
  ['Pure Vegetarian', 'Vegetarian'],
  ['Eggetarian', 'Eggetarian'],
  ['Vegan', 'Vegan'],
];
for (const [input, expected] of DIET_CASES) {
  await test(`diet "${input}" → ${expected}`, () => {
    const { fields } = parseBiodataText(`Diet: ${input}`);
    assert.equal(fields.diet, expected);
  });
}

const MARITAL_CASES = [
  ['Unmarried', 'Never Married'],
  ['Single', 'Never Married'],
  ['Divorcee', 'Divorced'],
  ['Widower', 'Widowed'],
  ['Separated', 'Awaiting Divorce'],
];
for (const [input, expected] of MARITAL_CASES) {
  await test(`marital status "${input}" → ${expected}`, () => {
    const { fields } = parseBiodataText(`Marital Status: ${input}`);
    assert.equal(fields.maritalStatus, expected);
  });
}

await test('an uninterpretable enum is dropped and warned about, never guessed', () => {
  const { fields, warnings } = parseBiodataText('Diet: whatever is going');
  assert.equal(fields.diet, undefined);
  assert.ok(warnings.some((w) => w.includes('diet')));
});

await test('every emitted enum value is in the allowed set', () => {
  const allowed = {
    diet: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan'],
    maritalStatus: ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'],
    smoking: ['No', 'Occasionally', 'Yes'],
    drinking: ['No', 'Occasionally', 'Yes'],
    manglik: ['Yes', 'No', "Don't Know"],
    familyType: ['Nuclear', 'Joint'],
    familyStatus: ['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent'],
    familyValues: ['Traditional', 'Moderate', 'Liberal'],
    gender: ['male', 'female'],
  };
  const junk = ['???', 'n/a', 'to be confirmed', 'yes and no', ''];
  for (const [key, values] of Object.entries(allowed)) {
    for (const probe of [...values, ...junk]) {
      const { fields } = parseBiodataText(`${key === 'maritalStatus' ? 'Marital Status' : key}: ${probe}`);
      if (fields[key] !== undefined) {
        assert.ok(values.includes(fields[key]), `${key}="${probe}" produced "${fields[key]}"`);
      }
    }
  }
});

section('Partner-preference sections must not overwrite the candidate');

await test('the first occurrence of a label wins', () => {
  const { fields } = parseBiodataText(
    ['Name: Rohan Chatterjee', 'Religion: Hindu', '', 'PARTNER PREFERENCES', 'Religion: Any', 'Name: Not specified'].join('\n')
  );
  assert.equal(fields.religion, 'Hindu');
  assert.equal(fields.name, 'Rohan Chatterjee');
});

section('Adapters');

await test('toMemberDraft emits only known detail keys', () => {
  const draft = toMemberDraft(c);
  assert.equal(draft.firstName, 'Rohan');
  assert.equal(draft.gender, 'male');
  assert.equal(draft.details.religion, 'Hindu');
  // `name`, `age` and `educationLevel` are not part of the details blob.
  for (const stray of ['name', 'age', 'educationLevel', 'email', 'phone']) {
    assert.equal(draft.details[stray], undefined, `details leaked "${stray}"`);
  }
});

await test('toProfileRow builds a valid admin profile row', () => {
  const row = toProfileRow(c);
  assert.equal(row.name, 'Rohan Chatterjee');
  assert.equal(row.gender, 'male');
  assert.equal(row.location, 'Pune, Maharashtra');
  assert.equal(row.city, 'Pune');
  assert.equal(row.profession, 'Software Architect');
  assert.equal(row.height_cm, 178);
  assert.equal(row.marital_status, 'Never Married');
  assert.equal(row.education_level, 'Bachelors');
  assert.equal(typeof row.age, 'number');
});

await test('toProfileRow drops "Awaiting Divorce" (not a valid profiles value)', () => {
  const row = toProfileRow({ ...c, maritalStatus: 'Awaiting Divorce' });
  assert.equal(row.marital_status, undefined);
});

await test('missingRequired names what a profile row still needs', () => {
  assert.deepEqual(missingRequired(c), []);
  assert.deepEqual(missingRequired({}), ['name', 'age or date of birth', 'gender']);
});

section('Malformed input');

await test('a PDF with no extractable text raises a clear 422', async () => {
  await assert.rejects(
    () => parseBiodataPdf(makePdf([])),
    (err) => err.status === 422 && /enter the details manually/i.test(err.message)
  );
});

await test('a non-PDF buffer is rejected, not silently accepted', async () => {
  await assert.rejects(() => parseBiodataPdf(Buffer.from('this is not a pdf')));
});

await test('an unrelated document yields no fields rather than junk', async () => {
  const { fields } = await parseBiodataPdf(
    makePdf(['INVOICE #4417', 'Subtotal 1200.00', 'Tax 216.00', 'Total 1416.00'])
  );
  assert.equal(fields.firstName, undefined);
  assert.equal(fields.dob, undefined);
  assert.ok(missingRequired(fields).length > 0);
});

/* ---------------------------------------------------------------- summary -- */

console.log(
  `\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`
);
if (failed) {
  for (const { name, err } of failures) console.error(`\n✗ ${name}\n${err.stack}`);
  process.exit(1);
}
