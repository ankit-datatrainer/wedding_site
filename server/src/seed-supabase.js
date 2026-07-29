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

const { error: pErr } = await supabase.from('profiles').upsert(profiles, { onConflict: 'id' });
if (pErr) throw pErr;
console.log(`  profiles: ${profiles.length} rows`);

const { error: sErr } = await supabase
  .from('success_stories')
  .upsert(stories, { onConflict: 'id' });
if (sErr) throw sErr;
console.log(`  success_stories: ${stories.length} rows`);

console.log('Done.');
