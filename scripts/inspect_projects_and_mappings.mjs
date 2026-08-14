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

const { data: allProjects } = await supabase.from('projects').select('*');
console.log('--- ALL PROJECTS IN DB ---');
console.log(allProjects.map(p => ({ id: p.id, name: p.name, slug: p.slug, is_active: p.is_active, cell_id: p.cell_id })));

const { data: mappings } = await supabase.from('ad_spend_mappings').select('*');
console.log('\n--- AD SPEND MAPPINGS ---');
console.log(mappings);
