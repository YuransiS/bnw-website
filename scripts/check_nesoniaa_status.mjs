import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      env[clean.substring(0, idx).trim()] = clean.substring(idx + 1).trim();
    }
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: proj } = await supabase.from('projects').select('*').eq('slug', 'nesoniaa').maybeSingle();
console.log('Nesoniaa project in DB:', proj);

const { data: allActive } = await supabase.from('projects').select('id, name, slug, is_active, cell_id').eq('is_active', true);
console.log('\nAll active projects in DB:');
console.table(allActive);
