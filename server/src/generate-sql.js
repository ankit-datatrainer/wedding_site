// Generates server/supabase/complete-setup.sql — schema.sql plus INSERTs for
// every seeded profile and success story, so a fresh Supabase project can be
// brought up with a single paste into the SQL editor.
//
// Regenerate after changing data/seed.js:  npm run gen:sql

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profiles, stories } from './data/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabaseDir = path.resolve(__dirname, '../supabase');

const q = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};

const PROFILE_COLS = [
  'id', 'name', 'age', 'gender', 'profession', 'location', 'city', 'education',
  'education_level', 'religion', 'community', 'marital_status', 'verified',
  'height_cm', 'mother_tongue', 'diet', 'photo', 'about', 'last_active_days',
];

const STORY_COLS = ['id', 'couple', 'rating', 'quote', 'photo'];

// Drop schema.sql's own header comment — it tells the reader to run `npm run
// seed` afterwards, which is exactly what this combined file makes unnecessary.
const schema = fs
  .readFileSync(path.join(supabaseDir, 'schema.sql'), 'utf8')
  .replace(/^(--[^\n]*\n)+\n/, '');

const profileRows = profiles
  .map((p) => `  (${PROFILE_COLS.map((c) => q(p[c])).join(', ')})`)
  .join(',\n');

const storyRows = stories
  .map((s) => `  (${STORY_COLS.map((c) => q(s[c])).join(', ')})`)
  .join(',\n');

// on conflict do update keeps this re-runnable: paste it again after changing
// seed data and existing rows are refreshed rather than erroring out.
const sql = `-- EverAfter — complete Supabase setup.
--
-- GENERATED FILE — do not edit by hand. Regenerate with:  npm run gen:sql
--
-- Paste this whole file into the Supabase SQL editor and run it once. It
-- creates every table, enables RLS, and loads all ${profiles.length} directory profiles
-- plus ${stories.length} success stories. Safe to re-run.

${schema.trim()}

-- ---------------------------------------------------------------------------
-- Directory profiles (${profiles.length}) — the pool the matching algorithm ranks over.
-- ---------------------------------------------------------------------------

insert into profiles (${PROFILE_COLS.join(', ')}) values
${profileRows}
on conflict (id) do update set
${PROFILE_COLS.filter((c) => c !== 'id').map((c) => `  ${c} = excluded.${c}`).join(',\n')};

-- ---------------------------------------------------------------------------
-- Success stories (${stories.length})
-- ---------------------------------------------------------------------------

insert into success_stories (${STORY_COLS.join(', ')}) values
${storyRows}
on conflict (id) do update set
${STORY_COLS.filter((c) => c !== 'id').map((c) => `  ${c} = excluded.${c}`).join(',\n')};

-- Sanity check — should report ${profiles.filter((p) => p.gender === 'male').length} male and ${profiles.filter((p) => p.gender === 'female').length} female.
select gender, count(*) from profiles group by gender order by gender;
`;

const outPath = path.join(supabaseDir, 'complete-setup.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Wrote ${outPath}`);
console.log(`  ${profiles.length} profiles, ${stories.length} stories, ${(sql.length / 1024).toFixed(1)} KB`);
