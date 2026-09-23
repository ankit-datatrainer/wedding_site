// Loads the design-screen content into Supabase. Run once after applying
// supabase/schema.sql:  npm run seed
import { config } from './config.js';
import { supabase, usingSupabase } from './store.js';
import { profiles, stories } from './data/seed.js';

if (!usingSupabase) {
  console.error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env first.'
  );
  process.exit(1);
}

console.log(`Seeding ${config.supabase.url} ...`);

// Delete any existing directory profiles so only the curated 8 Indian profiles remain
const { error: dErr } = await supabase.from('profiles').delete().neq('id', '');
if (dErr) {
  console.warn('Warning when deleting existing profiles:', dErr.message);
} else {
  console.log('  cleared existing profiles table');
}

const { error: pErr } = await supabase.from('profiles').upsert(profiles, { onConflict: 'id' });
if (pErr) throw pErr;
console.log(`  profiles: ${profiles.length} rows inserted`);

const { error: sErr } = await supabase
  .from('success_stories')
  .upsert(stories, { onConflict: 'id' });
if (sErr) throw sErr;
console.log(`  success_stories: ${stories.length} rows`);

console.log('Done.');
