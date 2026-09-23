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

  { field: 'motherTongue', labels: ['mother tongue', 'mothertongue', 'native language', 'language', 'languages', 'languages spoken', 'languages known'] },
  { field: 'religion', labels: ['religion', 'dharma'] },
  { field: 'community', labels: ['community', 'caste', 'sub caste', 'sub-caste', 'subcaste', 'jati'] },
  { field: 'gothram', labels: ['gothram', 'gotra', 'gothra', 'gotram'] },
  { field: 'manglik', labels: ['manglik', 'mangalik', 'manglik status', 'mangal dosha', 'chevvai dosham'] },
  { field: 'rashi', labels: ['rashi', 'raasi', 'moon sign', 'zodiac', 'zodiac sign'] },
  { field: 'nakshatra', labels: ['nakshatra', 'nakshatram', 'star', 'birth star'] },

  { field: 'country', labels: ['country'] },
  { field: 'state', labels: ['state'] },
  { field: 'city', labels: ['city', 'current city', 'residing city', 'location', 'place'] },
  { field: 'address', labels: ['address', 'residence', 'residential address', 'current address', 'permanent address', 'family residence'] },
  { field: 'pincode', labels: ['pincode', 'pin code', 'postal code', 'zip'] },

  { field: 'highestEducation', labels: ['education', 'qualification', 'educational qualification', 'highest education', 'highest qualification', 'degree', 'academics', 'academic qualification', 'education details'] },
  { field: 'college', labels: ['college', 'university', 'institute', 'institution', 'alma mater'] },
  { field: 'occupation', labels: ['occupation', 'profession', 'job', 'designation', 'working as', 'job title', 'professional summary', 'work experience', 'professional details', 'career'] },
  { field: 'employer', labels: ['employer', 'company', 'organisation', 'organization', 'working at', 'company name', 'employed at'] },
  { field: 'annualIncome', labels: ['income', 'annual income', 'salary', 'annual salary', 'package', 'ctc', 'salaried income', 'income per annum'] },

  { field: 'fatherName', labels: ["father's name", 'father name', 'fathers name', 'father'] },
  { field: 'fatherOccupation', labels: ["father's occupation", 'father occupation', 'fathers occupation', "father's profession"] },
  { field: 'fatherEmail', labels: ["father's email", 'father email', 'fathers email', "father's e-mail", 'father e-mail'] },
  { field: 'motherName', labels: ["mother's name", 'mother name', 'mothers name', 'mother'] },
  { field: 'motherOccupation', labels: ["mother's occupation", 'mother occupation', 'mothers occupation', "mother's profession"] },
  { field: 'motherEmail', labels: ["mother's email", 'mother email', 'mothers email', "mother's e-mail", 'mother e-mail'] },
  { field: 'siblings', labels: ['siblings', 'brothers', 'sisters', 'brothers/sisters', 'brother/sister', 'no of siblings', 'siblings details', 'younger brother', 'elder brother', 'younger sister', 'elder sister', 'brother', 'sister'] },
  { field: 'familyType', labels: ['family type', 'type of family'] },
  { field: 'familyStatus', labels: ['family status'] },
  { field: 'familyValues', labels: ['family values'] },

  { field: 'phone', labels: ['phone', 'mobile', 'contact', 'contact no', 'contact number', 'mobile no', 'mobile number', 'phone no', 'cell', 'contact details', 'contact detail'] },
  { field: 'email', labels: ['email', 'e-mail', 'email id', 'email address'] },

  { field: 'aboutMe', labels: ['about me', 'about', 'about myself', 'brief', 'introduction', 'hobbies', 'interests'] },
  { field: 'partnerExpectations', labels: ['partner expectations', 'partner preference', 'partner preferences', 'expectations', 'looking for', 'desired partner', 'expectations from partner'] },

  { field: 'referenceName', labels: ['reference name', 'ref name', 'reference person', 'referee name', 'reference', 'ref'] },
  { field: 'referencePhone', labels: ['reference phone', 'reference contact', 'reference mobile', 'ref phone', 'ref mobile', 'referee contact', 'reference contact no'] },
  { field: 'referredBy', labels: ['referred by', 'reference relation', 'referral', 'who referred you', 'ref relation', 'reference relationship', 'reference details'] },
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

// Fields whose value is prose and routinely wraps across several lines. Only
// these absorb continuation lines; doing it for short fields like `height`
// would swallow the row that follows.
const MULTILINE_FIELDS = new Set([
  'aboutMe', 'partnerExpectations', 'highestEducation', 'college', 'occupation',
  'employer', 'siblings', 'address', 'fatherOccupation', 'motherOccupation',
]);

// Bullet glyphs and list markers PDF extraction leaves at the head of a line.
const BULLET = /^[\s••▪●*\-–—]+|^\d+[.)]\s+/;

const stripBullet = (line) => line.replace(BULLET, '').trim();

/**
 * Finds a label at the very start of a line, longest match first.
 *
 * This is what makes colon-free biodata work: real documents are full of
 * table rows that extract as "Date of Birth 30th August 1995", with no
 * separator at all between label and value.
 */
function matchLabelPrefix(line) {
  const words = line.split(' ').filter(Boolean);
  const max = Math.min(4, words.length - 1); // always leave at least one word of value
  for (let n = max; n >= 1; n -= 1) {
    const candidate = words.slice(0, n);

    // normaliseLabel strips digits, so "Height 179" would otherwise reduce to
    // "height" and swallow the value it was supposed to introduce.
    if (candidate.some((w) => /\d/.test(w))) continue;

    // A label word carrying a trailing comma is prose, not a table row:
    // "University, Tempe, Arizona" is a wrapped address, not a College field.
    if (/[,;]$/.test(candidate[n - 1])) continue;

    const field = matchLabel(candidate.join(' '));
    if (!field) continue;
    const value = words.slice(n).join(' ').trim();
    if (!value) continue;

    // A one-word label matching mid-sentence prose is the main false-positive
    // risk ("Mother of two children moved to Delhi"). Real table rows start
    // their value with a capital, a digit or a currency/symbol; prose
    // continues in lower case. Multi-word labels are specific enough to trust.
    if (n === 1 && !/^[A-Z0-9₹+"']/.test(value)) continue;

    return { field, value };
  }
  return null;
}

/** Any way this line could be read as the start of a labelled row. */
function lineStartsRow(line) {
  const bare = stripBullet(line);
  const colon = bare.search(/[:：]/);
  if (colon > 0 && matchLabel(bare.slice(0, colon))) return true;
  if (matchLabel(bare)) return true;
  return Boolean(matchLabelPrefix(bare));
}

/** Whether a label begins at `index`, including one split across two lines. */
function rowStartsAt(lines, index) {
  const line = stripBullet(lines[index] || '');
  if (!line) return false;
  if (lineStartsRow(line)) return true;

  // "Professional" / "Summary" only reads as a label once joined. Without
  // this, a preceding multi-line field absorbs the label and the section it
  // introduces is lost entirely.
  if (index + 1 < lines.length && /^[A-Za-z\s]{2,20}$/.test(line)) {
    const joined = `${line} ${stripBullet(lines[index + 1])}`;
    if (matchLabel(joined) || matchLabelPrefix(joined)) return true;
  }
  return false;
}

/**
 * Splits document text into `{ field, value }` rows.
 *
 * Handles the four layouts that turn up in practice: inline
 * ("Height : 5'10\""), colon-free table rows ("Height 179 cms"),
 * column-split tables where the label and value land on consecutive lines,
 * and prose values that wrap over several lines.
 */
function collectRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const rows = [];
  const push = (field, value, index) => {
    const v = value.trim();
    if (v) rows.push({ field, value: v, index });
  };

  /** Absorbs following non-label lines into a prose value. */
  const absorb = (field, startIndex) => {
    if (!MULTILINE_FIELDS.has(field)) return { extra: '', consumed: 0 };
    const parts = [];
    let j = startIndex;
    while (j < lines.length && parts.length < 12 && !rowStartsAt(lines, j)) {
      parts.push(stripBullet(lines[j]));
      j += 1;
    }
    return { extra: parts.join(' '), consumed: j - startIndex };
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = stripBullet(lines[i]);
    if (!line) continue;

    let field = null;
    let value = '';

    const colon = line.search(/[:：]/);
    if (colon > 0 && matchLabel(line.slice(0, colon))) {
      field = matchLabel(line.slice(0, colon));
      value = line.slice(colon + 1).trim();
    } else if (matchLabel(line)) {
      // The whole line is a label; its value is on the following line(s).
      field = matchLabel(line);
      value = '';
    } else {
      const prefix = matchLabelPrefix(line);
      if (prefix) {
        field = prefix.field;
        value = prefix.value;
      }
    }

    // A label wrapped across two lines by a narrow table column — "Professional"
    // / "Summary", "Maternal" / "Grandparents". Only tried when the line alone
    // means nothing, and only for a short, digit-free fragment.
    if (!field && i + 1 < lines.length && /^[A-Za-z\s]{2,20}$/.test(line)) {
      const joined = `${line} ${stripBullet(lines[i + 1])}`;
      const twoLine = matchLabel(joined) || matchLabelPrefix(joined)?.field;
      if (twoLine) {
        field = twoLine;
        value = matchLabel(joined) ? '' : matchLabelPrefix(joined).value;
        i += 1;
      }
    }

    if (!field) continue;

    // A bare label takes the next line as its value, provided that line is
    // not itself a labelled row.
    if (!value && i + 1 < lines.length && !rowStartsAt(lines, i + 1)) {
      value = stripBullet(lines[i + 1]);
      i += 1;
    }

    const { extra, consumed } = absorb(field, i + 1);
    if (extra) {
      value = `${value} ${extra}`.trim();
      i += consumed;
    }

    push(field, value, i);
  }

  return rows;
}

/* --------------------------------------------------------------- inference -- */

// Words that look like a name to a naive check but head a section instead.
const HEADING_WORDS = new RegExp(
  '\\b(bio\\s*data|biodata|marriage|matrimonial|personal|information|details|profile|' +
    'resume|curriculum|vitae|about|family|contact|introduction|namah|namaha|shri|sri|' +
    'ganesh|ganesha|swastik|om)\\b',
  'i'
);

/**
 * Recovers the candidate's name when no "Name:" row exists.
 *
 * Many designed biodata put the name alone at the top as a title. Restricted
 * to the opening lines and to things that actually look like a person's name,
 * because a wrong name is worse than none.
 */
function inferName(lines) {
  for (const raw of lines.slice(0, 12)) {
    const line = raw.replace(/[“”"‘’']/g, '').trim();
    if (!line || line.length > 60) continue;
    if (HEADING_WORDS.test(line)) continue;
    if (lineStartsRow(line)) continue;
    if (/[:：0-9@]/.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!words.every((w) => /^[A-Z][a-z'’-]+\.?$/.test(w))) continue;

    return line;
  }
  return undefined;
}

/**
 * Recovers gender from third-person pronouns in the prose.
 *
 * Plenty of biodata never state it — they just describe the candidate. Needs
 * a decisive margin, since a wrong gender puts someone in front of entirely
 * the wrong audience.
 */
function inferGender(text) {
  const count = (re) => (text.match(re) || []).length;
  const male = count(/\b(he|his|him|himself|son|groom|bachelor|brother)\b/gi);
  const female = count(/\b(she|her|hers|herself|daughter|bride|spinster|sister)\b/gi);

  if (male >= 3 && male >= female * 2) return 'male';
  if (female >= 3 && female >= male * 2) return 'female';
  return undefined;
}

// Two-letter codes and full names for the Indian states that show up in
// addresses, used to split a trailing "Noida UP" into city and state.
const STATES = new Map([
  ['up', 'Uttar Pradesh'], ['mp', 'Madhya Pradesh'], ['hp', 'Himachal Pradesh'],
  ['ap', 'Andhra Pradesh'], ['tn', 'Tamil Nadu'], ['wb', 'West Bengal'],
  ['mh', 'Maharashtra'], ['dl', 'Delhi'], ['ncr', 'Delhi NCR'], ['hr', 'Haryana'],
  ['pb', 'Punjab'], ['rj', 'Rajasthan'], ['gj', 'Gujarat'], ['ka', 'Karnataka'],
  ['kl', 'Kerala'], ['ts', 'Telangana'], ['tg', 'Telangana'], ['od', 'Odisha'],
  ['jh', 'Jharkhand'], ['cg', 'Chhattisgarh'], ['uk', 'Uttarakhand'],
  ['br', 'Bihar'], ['as', 'Assam'], ['ga', 'Goa'],
]);

/** Pulls a city (and state, if present) out of a free-form address. */
function cityFromAddress(address) {
  const chunks = address
    .split(',')
    .map((c) => c.replace(/[–—-]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!chunks.length) return {};

  const last = chunks[chunks.length - 1];
  const words = last.split(' ');
  const tail = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, '');

  if (words.length >= 2 && STATES.has(tail)) {
    return { city: words.slice(0, -1).join(' '), state: STATES.get(tail) };
  }
  if (STATES.has(tail) && chunks.length >= 2) {
    return { city: chunks[chunks.length - 2], state: STATES.get(tail) };
  }
  // No recognisable state — the last chunk is the best city candidate, as
  // long as it reads like a place name rather than a street line.
  if (words.length <= 3 && /^[A-Za-z\s]+$/.test(last)) return { city: last };
  return {};
}

/**
 * Parses biodata text into canonical fields.
 *
 * @returns {{ fields: object, warnings: string[], rows: number }}
 */
export function parseBiodataText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const raw = {};
  for (const { field, value } of collectRows(text)) {
    // First occurrence wins: biodata repeats labels in partner-preference
    // sections at the bottom, and those describe someone else entirely.
    if (raw[field] === undefined) raw[field] = value;
  }

  // Titles and prose carry the name and gender in documents that never label
  // them. Only consulted where the labelled pass found nothing.
  if (!raw.name && !raw.firstName) {
    const inferred = inferName(lines);
    if (inferred) raw.name = inferred;
  }
  if (!raw.gender) {
    const inferred = inferGender(text);
    if (inferred) raw.gender = inferred;
  }

  const fields = {};
  const warnings = [];
  const set = (key, value) => {
    if (value !== undefined && value !== null && value !== '') fields[key] = value;
  };
  // Truncates on a word boundary — schema limits are tight enough that a
  // hard slice routinely lands mid-word ("Bachelor of Technolog").
  const str = (key, max) => {
    const v = raw[key];
    if (typeof v !== 'string' || !v.trim()) return;
    let out = v.trim();
    if (out.length > max) {
      const cut = out.slice(0, max);
      const space = cut.lastIndexOf(' ');
      out = (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;.-]+$/, '');
    }
    set(key, out);
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
  // Contact blocks routinely list an address on its own bare line with no
  // "Email" label. An email pattern is unambiguous enough to take from
  // anywhere in the document.
  if (!fields.email) {
    const found = text.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)?.[0];
    set('email', found?.toLowerCase());
  }
  str('aboutMe', 2000);
  str('partnerExpectations', 2000);

  /* reference from biodata */
  if (raw.referenceName) set('referenceName', cleanName(raw.referenceName));
  if (raw.referencePhone) {
    const digits = String(raw.referencePhone).replace(/[^\d+]/g, '');
    if (digits.replace(/\D/g, '').length >= 7) set('referencePhone', digits.slice(0, 20));
    else str('referencePhone', 30);
  }
  str('referredBy', 150);

  // "About Abhivyakt" reads as label "About" + value starting with the name,
  // so the name ends up duplicated at the head of the text. Drop the stray
  // copy rather than showing the member "Abhivyakt Abhivyakt is a…".
  if (fields.aboutMe && fields.firstName) {
    const dup = new RegExp(`^${fields.firstName}\\s+(?=${fields.firstName}\\b)`, 'i');
    fields.aboutMe = fields.aboutMe.replace(dup, '');
  }

  // Fall back to the free text for a city when only a combined location was
  // given ("Pune, Maharashtra") and no explicit state row existed.
  if (fields.city && fields.city.includes(',') && !fields.state) {
    const [city, ...rest] = fields.city.split(',');
    fields.city = city.trim();
    if (rest.length) set('state', rest.join(',').trim().slice(0, 60));
  }

  // Many biodata give only a residential address; the city and state the
  // directory filters on have to come out of it.
  if (!fields.city && fields.address) {
    const derived = cityFromAddress(fields.address);
    set('city', derived.city?.slice(0, 60));
    if (!fields.state) set('state', derived.state?.slice(0, 60));
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
  'fatherName', 'fatherOccupation', 'fatherEmail', 'motherName', 'motherOccupation', 'motherEmail', 'siblings',
  'familyType', 'familyStatus', 'familyValues',
  'referenceName', 'referencePhone', 'referredBy',
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
// Everything a biodata carries that has no column on `profiles` — kept on
// the profile's `details` jsonb so an admin-uploaded biodata loses nothing.
export const PROFILE_DETAIL_KEYS = [
  'dob', 'timeOfBirth', 'placeOfBirth', 'weightKg', 'complexion', 'bloodGroup',
  'smoking', 'drinking', 'disability', 'gothram', 'manglik', 'rashi', 'nakshatra',
  'state', 'country', 'address', 'pincode', 'college', 'employer', 'annualIncome',
  'fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'siblings',
  'familyType', 'familyStatus', 'familyValues', 'phone', 'email',
  'referenceName', 'referencePhone', 'referredBy', 'partnerExpectations',
];

/** Shapes parsed fields for a directory profile's `details` blob. */
export function toProfileDetails(fields) {
  const details = {};
  for (const key of PROFILE_DETAIL_KEYS) {
    const v = fields[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') details[key] = String(v).trim().slice(0, 2000);
  }
  return details;
}

export function missingRequired(fields) {
  const missing = [];
  if (!fields.name) missing.push('name');
  if (!fields.age) missing.push('age or date of birth');
  if (!fields.gender) missing.push('gender');
  return missing;
}
