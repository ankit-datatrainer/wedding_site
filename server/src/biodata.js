/**
 * Biodata PDF → structured profile.
 *
 * Indian marriage biodata is a de-facto format, not a standard: a stack of
 * "Label : Value" rows, sometimes in a table, with wildly inconsistent
 * labelling ("DOB", "Date of Birth", "Birth Date", "Janma Dinank"). This
 * module extracts the text, matches rows against a wide alias table, and
 * normalises the values into the exact shapes the rest of the app already
 * uses — the member `details` blob and the admin `profiles` row.
 *
 * Two hard rules, because both consumers are schema-validated downstream:
 *   1. A field we cannot confidently normalise is omitted, never guessed.
 *      A missing field asks the user one question; a wrong one silently
 *      corrupts their profile.
 *   2. Enum-backed fields only ever emit values from the allowed set, so a
 *      parsed biodata can never make PATCH /api/auth/me fail validation.
 */

import { PDFParse } from 'pdf-parse';

/* ------------------------------------------------------------------ text -- */

export async function extractText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    // pdf-parse appends a "-- 1 of 3 --" page marker per page; it is not
    // part of the document and would otherwise pollute the free-text fields.
    return String(text || '').replace(/^\s*--\s*\d+\s*of\s*\d+\s*--\s*$/gim, '');
  } finally {
    await parser.destroy?.();
  }
}

/* ----------------------------------------------------------------- labels -- */

// Longest-match-wins: `field` is the canonical key, `labels` every spelling
// seen in the wild. Order within the array does not matter — matching sorts
// by length so "Father's Occupation" beats "Occupation".
const LABELS = [
  { field: 'name', labels: ['name', 'full name', 'candidate name', 'bride name', 'groom name', 'naam'] },
  { field: 'firstName', labels: ['first name', 'given name'] },
  { field: 'lastName', labels: ['last name', 'surname', 'family name'] },
  { field: 'gender', labels: ['gender', 'sex'] },
  { field: 'dob', labels: ['dob', 'date of birth', 'birth date', 'birthdate', 'd.o.b', 'janma dinank', 'date of birth (dd/mm/yyyy)'] },
  { field: 'age', labels: ['age'] },
  { field: 'timeOfBirth', labels: ['time of birth', 'birth time', 'tob'] },
  { field: 'placeOfBirth', labels: ['place of birth', 'birth place'] },

  { field: 'heightCm', labels: ['height', 'ht'] },
  { field: 'weightKg', labels: ['weight', 'wt'] },
  { field: 'complexion', labels: ['complexion', 'skin tone'] },
  { field: 'bloodGroup', labels: ['blood group'] },
  { field: 'maritalStatus', labels: ['marital status', 'martial status', 'status'] },
  { field: 'diet', labels: ['diet', 'dietary habits', 'food habit', 'food habits', 'eating habits'] },
  { field: 'smoking', labels: ['smoking', 'smoke', 'smoking habits'] },
  { field: 'drinking', labels: ['drinking', 'drink', 'drinking habits', 'alcohol'] },
  { field: 'disability', labels: ['disability', 'physical status', 'handicap'] },

  { field: 'motherTongue', labels: ['mother tongue', 'mothertongue', 'native language', 'language'] },
  { field: 'religion', labels: ['religion', 'dharma'] },
  { field: 'community', labels: ['community', 'caste', 'sub caste', 'sub-caste', 'subcaste', 'jati'] },
  { field: 'gothram', labels: ['gothram', 'gotra', 'gothra', 'gotram'] },
  { field: 'manglik', labels: ['manglik', 'mangalik', 'manglik status', 'mangal dosha', 'chevvai dosham'] },
  { field: 'rashi', labels: ['rashi', 'raasi', 'moon sign', 'zodiac', 'zodiac sign'] },
  { field: 'nakshatra', labels: ['nakshatra', 'nakshatram', 'star', 'birth star'] },

  { field: 'country', labels: ['country'] },
  { field: 'state', labels: ['state'] },
  { field: 'city', labels: ['city', 'current city', 'residing city', 'location', 'place'] },
  { field: 'address', labels: ['address', 'residence', 'residential address', 'current address', 'permanent address'] },
  { field: 'pincode', labels: ['pincode', 'pin code', 'postal code', 'zip'] },

  { field: 'highestEducation', labels: ['education', 'qualification', 'educational qualification', 'highest education', 'highest qualification', 'degree'] },
  { field: 'college', labels: ['college', 'university', 'institute', 'institution', 'alma mater'] },
  { field: 'occupation', labels: ['occupation', 'profession', 'job', 'designation', 'working as', 'job title'] },
  { field: 'employer', labels: ['employer', 'company', 'organisation', 'organization', 'working at', 'company name', 'employed at'] },
  { field: 'annualIncome', labels: ['income', 'annual income', 'salary', 'annual salary', 'package', 'ctc'] },

  { field: 'fatherName', labels: ["father's name", 'father name', 'fathers name', 'father'] },
  { field: 'fatherOccupation', labels: ["father's occupation", 'father occupation', 'fathers occupation', "father's profession"] },
  { field: 'motherName', labels: ["mother's name", 'mother name', 'mothers name', 'mother'] },
  { field: 'motherOccupation', labels: ["mother's occupation", 'mother occupation', 'mothers occupation', "mother's profession"] },
  { field: 'siblings', labels: ['siblings', 'brothers', 'sisters', 'brothers/sisters', 'brother/sister', 'no of siblings', 'siblings details'] },
  { field: 'familyType', labels: ['family type', 'type of family'] },
  { field: 'familyStatus', labels: ['family status'] },
  { field: 'familyValues', labels: ['family values'] },

  { field: 'phone', labels: ['phone', 'mobile', 'contact', 'contact no', 'contact number', 'mobile no', 'mobile number', 'phone no', 'cell'] },
  { field: 'email', labels: ['email', 'e-mail', 'email id', 'email address'] },

  { field: 'aboutMe', labels: ['about me', 'about', 'about myself', 'brief', 'introduction', 'hobbies', 'interests'] },
  { field: 'partnerExpectations', labels: ['partner expectations', 'partner preference', 'partner preferences', 'expectations', 'looking for', 'desired partner', 'expectations from partner'] },
];

const LABEL_INDEX = LABELS.flatMap(({ field, labels }) =>
  labels.map((label) => ({ field, label }))
).sort((a, b) => b.label.length - a.label.length);

const normaliseLabel = (s) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'") // smart quotes → ASCII, so "Father’s" matches
    .replace(/[^a-z'/\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, '');

function matchLabel(text) {
  const norm = normaliseLabel(text);
  if (!norm) return null;
  const hit = LABEL_INDEX.find((entry) => entry.label === norm);
  return hit ? hit.field : null;
}

/* ------------------------------------------------------------ normalisers -- */

/** Picks the allowed enum value whose alias the text contains. */
function pickEnum(value, table) {
  const v = ` ${value.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ')} `;
  for (const [canonical, aliases] of table) {
    if (aliases.some((alias) => v.includes(` ${alias} `))) return canonical;
  }
  return undefined;
}

const DIET = [
  ['Non-Vegetarian', ['non vegetarian', 'non veg', 'nonveg', 'nonvegetarian', 'non vegeterian']],
  ['Eggetarian', ['eggetarian', 'eggitarian', 'egg']],
  ['Vegan', ['vegan']],
  ['Vegetarian', ['vegetarian', 'veg', 'pure veg', 'vegeterian', 'shakahari']],
];

const MARITAL = [
  ['Awaiting Divorce', ['awaiting divorce', 'separated']],
  ['Never Married', ['never married', 'unmarried', 'single', 'not married', 'bachelor', 'spinster']],
  ['Divorced', ['divorced', 'divorcee']],
  ['Widowed', ['widowed', 'widow', 'widower']],
];

const YES_NO_OCCASIONAL = [
  ['Occasionally', ['occasionally', 'occasional', 'sometimes', 'socially', 'social', 'rarely']],
  ['No', ['no', 'never', 'non', 'nil', 'none', 'teetotaler']],
  ['Yes', ['yes', 'regularly', 'daily', 'y']],
];

const MANGLIK = [
  ["Don't Know", ["don t know", 'dont know', 'not known', 'unknown', 'na', 'not sure']],
  ['No', ['no', 'non manglik', 'nil', 'none']],
  ['Yes', ['yes', 'manglik', 'mangalik', 'anshik']],
];

const FAMILY_TYPE = [
  ['Joint', ['joint', 'extended']],
  ['Nuclear', ['nuclear', 'small']],
];

const FAMILY_STATUS = [
  ['Upper Middle Class', ['upper middle class', 'upper middle']],
  ['Affluent', ['affluent']],
  ['Rich', ['rich', 'wealthy', 'high class']],
  ['Middle Class', ['middle class', 'middle']],
];

const FAMILY_VALUES = [
  ['Traditional', ['traditional', 'orthodox', 'conservative']],
  ['Moderate', ['moderate']],
  ['Liberal', ['liberal', 'modern']],
];

const GENDER = [
  ['female', ['female', 'f', 'woman', 'girl', 'bride', 'she', 'her', 'ms', 'miss', 'mrs', 'smt', 'kumari']],
  ['male', ['male', 'm', 'man', 'boy', 'groom', 'he', 'his', 'mr', 'shri', 'sri', 'kumar']],
];

const EDUCATION_LEVEL = [
  ['Doctorate', ['phd', 'ph d', 'doctorate', 'doctoral', 'md', 'ms surgery', 'dm']],
  ['Masters', ['masters', 'master', 'mtech', 'm tech', 'msc', 'm sc', 'mba', 'mca', 'ma', 'mcom', 'm com', 'me', 'm e', 'pg', 'post graduate', 'postgraduate', 'llm']],
  ['Bachelors', ['bachelors', 'bachelor', 'btech', 'b tech', 'bsc', 'b sc', 'bca', 'ba', 'bcom', 'b com', 'be', 'b e', 'bba', 'graduate', 'graduation', 'llb', 'mbbs', 'b arch']],
];

/** Height in any Indian-biodata dialect → centimetres, or undefined. */
export function parseHeightCm(raw) {
  const s = String(raw).toLowerCase();

  const cm = s.match(/(\d{2,3}(?:\.\d+)?)\s*(?:cm|cms|centimet)/);
  if (cm) {
    const n = Math.round(Number(cm[1]));
    return n >= 120 && n <= 230 ? n : undefined;
  }

  // 5'10", 5 ft 10 in, 5 feet 10 inches, 5-10
  const ftIn = s.match(/(\d)\s*(?:'|’|ft|feet|foot)\s*(\d{1,2})?\s*(?:"|”|''|in|inch|inches)?/);
  if (ftIn) {
    const feet = Number(ftIn[1]);
    const inches = ftIn[2] ? Number(ftIn[2]) : 0;
    if (feet >= 4 && feet <= 7 && inches < 12) {
      return Math.round(feet * 30.48 + inches * 2.54);
    }
  }

  // Bare "5.10" / "5.6" — Indian shorthand for feet.inches, not decimal feet.
  const dotted = s.match(/^\s*(\d)\.(\d{1,2})\s*$/);
  if (dotted) {
    const feet = Number(dotted[1]);
    const inches = Number(dotted[2]);
    if (feet >= 4 && feet <= 7 && inches < 12) return Math.round(feet * 30.48 + inches * 2.54);
  }

  // A bare plausible centimetre number.
  const bare = s.match(/^\s*(\d{3})\s*$/);
  if (bare) {
    const n = Number(bare[1]);
    return n >= 120 && n <= 230 ? n : undefined;
  }

  return undefined;
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Date in any common order → ISO `YYYY-MM-DD`, or undefined. */
export function parseDob(raw) {
  const s = String(raw).trim();

  const iso = (y, m, d) => {
    if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) return undefined;
    const year = Number(y);
    if (year < 1920 || year > new Date().getFullYear() - 15) return undefined;
    const dt = new Date(Date.UTC(year, m - 1, d));
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return undefined; // e.g. 31 Feb
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  // 1994-05-12
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(m[1], Number(m[2]), Number(m[3]));

  // 12 May 1994 / May 12, 1994
  m = s.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s*[-\s/]\s*([a-z]{3,9})\.?\s*[-,\s/]\s*(\d{4})/i);
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon) return iso(m[3], mon, Number(m[1]));
  }
  m = s.match(/([a-z]{3,9})\.?\s*[-\s/]\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s*[-,\s/]\s*(\d{4})/i);
  if (m) {
    const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mon) return iso(m[3], mon, Number(m[2]));
  }

  // 12/05/1994 — day-first, the Indian convention. Only read it the other way
  // when day-first is impossible (e.g. 05/22/1994).
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    return iso(m[3], b, a) ?? iso(m[3], a, b);
  }

  return undefined;
}

const ageFromDob = (isoDate) => {
  const dob = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const before =
    now.getUTCMonth() < dob.getUTCMonth() ||
    (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  if (before) age -= 1;
  return age >= 18 && age <= 100 ? age : undefined;
};

const titleCase = (s) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

/** Strips honorifics and trailing noise from a person's name. */
function cleanName(raw) {
  const cleaned = String(raw)
    .replace(/\b(mr|mrs|ms|miss|shri|sri|smt|kumari|km|dr|late)\b\.?/gi, ' ')
    .replace(/[^\p{L}\s.'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length >= 2 && cleaned.length <= 80 ? titleCase(cleaned) : undefined;
}

/* ------------------------------------------------------------------ parse -- */

const VALUE_SEPARATOR = /\s*[:：–—-]\s+|\s*:\s*/;

/**
 * Splits document text into `{ field, value }` rows.
 *
 * Handles both inline rows ("Height : 5'10\"") and the split layout PDF text
 * extraction often produces from tables, where the label and its value land
 * on consecutive lines.
 */
function collectRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const colon = line.search(/[:：]/);
    if (colon > 0) {
      const field = matchLabel(line.slice(0, colon));
      if (field) {
        let value = line.slice(colon + 1).trim();
        // "Label:" with the value wrapped onto the next line.
        if (!value && lines[i + 1] && !matchLabel(lines[i + 1].split(/[:：]/)[0])) {
          value = lines[i + 1];
          i += 1;
        }
        if (value) rows.push({ field, value });
        continue;
      }
    }

    // A whole line that is just a label — value follows on the next line.
    const bare = matchLabel(line);
    if (bare && lines[i + 1]) {
      const next = lines[i + 1];
      const nextIsLabel = matchLabel(next.split(/[:：]/)[0]) || matchLabel(next);
      if (!nextIsLabel) {
        rows.push({ field: bare, value: next });
        i += 1;
        continue;
      }
    }

    // Separator-delimited row without a colon: "Height   5'10\"".
    const dash = line.match(/^(.{2,30}?)\s{2,}(.+)$/) || line.match(/^(.{2,30}?)\s+[–—-]\s+(.+)$/);
    if (dash) {
      const field = matchLabel(dash[1]);
      if (field && dash[2].trim()) rows.push({ field, value: dash[2].trim() });
    }
  }
  return rows;
}

/**
 * Parses biodata text into canonical fields.
 *
 * @returns {{ fields: object, warnings: string[], rows: number }}
 */
export function parseBiodataText(text) {
  const raw = {};
  for (const { field, value } of collectRows(text)) {
    // First occurrence wins: biodata repeats labels in partner-preference
    // sections at the bottom, and those describe someone else entirely.
    if (raw[field] === undefined) raw[field] = value;
  }

  const fields = {};
  const warnings = [];
  const set = (key, value) => {
    if (value !== undefined && value !== null && value !== '') fields[key] = value;
  };
  const str = (key, max) => {
    const v = raw[key];
    if (typeof v === 'string' && v.trim()) set(key, v.trim().slice(0, max));
  };
  const enumOf = (key, table, source = key) => {
    if (!raw[source]) return;
    const picked = pickEnum(raw[source], table);
    if (picked) set(key, picked);
    else warnings.push(`Could not interpret ${key}: "${raw[source]}"`);
  };

  /* names */
  if (raw.firstName || raw.lastName) {
    set('firstName', cleanName(raw.firstName || ''));
    set('lastName', cleanName(raw.lastName || ''));
  }
  if (!fields.firstName && raw.name) {
    const full = cleanName(raw.name);
    if (full) {
      const parts = full.split(' ');
      set('firstName', parts[0]);
      set('lastName', parts.slice(1).join(' '));
    }
  }
  if (fields.firstName && !fields.lastName) fields.lastName = fields.firstName;
  set('name', [fields.firstName, fields.lastName].filter(Boolean).join(' ') || undefined);

  /* identity */
  if (raw.gender) {
    const g = pickEnum(raw.gender, GENDER);
    if (g) set('gender', g);
    else warnings.push(`Could not interpret gender: "${raw.gender}"`);
  }
  if (raw.dob) {
    const dob = parseDob(raw.dob);
    if (dob) set('dob', dob);
    else warnings.push(`Could not interpret date of birth: "${raw.dob}"`);
  }
  if (fields.dob) set('age', ageFromDob(fields.dob));
  if (!fields.age && raw.age) {
    const n = Number(String(raw.age).match(/\d{2}/)?.[0]);
    if (n >= 18 && n <= 100) set('age', n);
  }

  /* physical & lifestyle */
  if (raw.heightCm) {
    const cm = parseHeightCm(raw.heightCm);
    if (cm) set('heightCm', String(cm));
    else warnings.push(`Could not interpret height: "${raw.heightCm}"`);
  }
  if (raw.weightKg) {
    const kg = Number(String(raw.weightKg).match(/(\d{2,3})/)?.[1]);
    if (kg >= 30 && kg <= 200) set('weightKg', String(kg));
  }
  enumOf('maritalStatus', MARITAL);
  enumOf('diet', DIET);
  enumOf('smoking', YES_NO_OCCASIONAL);
  enumOf('drinking', YES_NO_OCCASIONAL);
  str('disability', 200);

  /* faith & horoscope */
  str('motherTongue', 60);
  str('religion', 60);
  str('community', 60);
  str('gothram', 60);
  enumOf('manglik', MANGLIK);
  str('rashi', 60);
  str('nakshatra', 60);

  /* location */
  str('country', 60);
  str('state', 60);
  str('city', 60);
  str('address', 300);
  if (raw.pincode) {
    const pin = String(raw.pincode).match(/\d{5,6}/)?.[0];
    set('pincode', pin);
  }

  /* education & career */
  str('highestEducation', 120);
  str('college', 150);
  str('occupation', 120);
  str('employer', 150);
  str('annualIncome', 60);
  if (fields.highestEducation) {
    const level = pickEnum(fields.highestEducation, EDUCATION_LEVEL);
    if (level) set('educationLevel', level);
  }

  /* family */
  if (raw.fatherName) set('fatherName', cleanName(raw.fatherName));
  str('fatherOccupation', 120);
  if (raw.motherName) set('motherName', cleanName(raw.motherName));
  str('motherOccupation', 120);
  str('siblings', 200);
  enumOf('familyType', FAMILY_TYPE);
  enumOf('familyStatus', FAMILY_STATUS);
  enumOf('familyValues', FAMILY_VALUES);

  /* contact & free text */
  if (raw.phone) {
    const digits = String(raw.phone).replace(/[^\d+]/g, '');
    if (digits.replace(/\D/g, '').length >= 10) set('phone', digits.slice(0, 20));
  }
  if (raw.email) {
    const email = String(raw.email).match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    set('email', email?.toLowerCase());
  }
  str('aboutMe', 2000);
  str('partnerExpectations', 2000);

  // Fall back to the free text for a city when only a combined location was
  // given ("Pune, Maharashtra") and no explicit state row existed.
  if (fields.city && fields.city.includes(',') && !fields.state) {
    const [city, ...rest] = fields.city.split(',');
    fields.city = city.trim();
    if (rest.length) set('state', rest.join(',').trim().slice(0, 60));
  }

  return { fields, warnings, rows: Object.keys(raw).length };
}

/** Parses a PDF buffer end-to-end. */
export async function parseBiodataPdf(buffer) {
  const text = await extractText(buffer);
  if (!text.trim()) {
    const err = new Error(
      'No text could be read from that PDF. If it is a scan or photo, please enter the details manually.'
    );
    err.status = 422;
    throw err;
  }
  const result = parseBiodataText(text);
  return { ...result, text };
}

/* --------------------------------------------------------------- adapters -- */

// The keys that belong in the member `details` jsonb blob, matching
// detailsSchema in routes/auth.js exactly.
const DETAIL_KEYS = [
  'heightCm', 'weightKg', 'maritalStatus', 'diet', 'smoking', 'drinking', 'disability',
  'motherTongue', 'religion', 'community', 'gothram', 'manglik', 'rashi', 'nakshatra',
  'country', 'state', 'city', 'address', 'pincode',
  'highestEducation', 'college', 'occupation', 'employer', 'annualIncome',
  'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'siblings',
  'familyType', 'familyStatus', 'familyValues',
  'aboutMe', 'partnerExpectations',
];

/** Shapes parsed fields for the registration wizard. */
export function toMemberDraft(fields) {
  const details = {};
  for (const key of DETAIL_KEYS) {
    if (fields[key] !== undefined) details[key] = fields[key];
  }
  return {
    firstName: fields.firstName ?? '',
    lastName: fields.lastName ?? '',
    gender: fields.gender ?? '',
    dob: fields.dob ?? '',
    email: fields.email ?? '',
    phone: fields.phone ?? '',
    details,
  };
}

/** Shapes parsed fields for an admin-created `profiles` row. */
export function toProfileRow(fields) {
  const location = [fields.city, fields.state].filter(Boolean).join(', ');
  const education = [fields.highestEducation, fields.college].filter(Boolean).join(', ');
  const row = {
    name: fields.name,
    age: fields.age,
    gender: fields.gender,
    profession: fields.occupation || '',
    location,
    city: fields.city || '',
    education,
    religion: fields.religion || '',
    community: fields.community || '',
    mother_tongue: fields.motherTongue || '',
    about: fields.aboutMe || '',
  };
  if (fields.educationLevel) row.education_level = fields.educationLevel;
  // `profiles.marital_status` has no "Awaiting Divorce" option.
  if (fields.maritalStatus && fields.maritalStatus !== 'Awaiting Divorce') {
    row.marital_status = fields.maritalStatus;
  }
  if (fields.heightCm) row.height_cm = Number(fields.heightCm);
  if (fields.diet) row.diet = fields.diet;
  return row;
}

/** The fields a `profiles` row cannot be created without. */
export function missingRequired(fields) {
  const missing = [];
  if (!fields.name) missing.push('name');
  if (!fields.age) missing.push('age or date of birth');
  if (!fields.gender) missing.push('gender');
  return missing;
}
