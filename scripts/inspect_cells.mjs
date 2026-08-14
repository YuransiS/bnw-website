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

const { data: cells } = await supabase.from('cells').select('*, profiles(email, full_name, role)');
console.log('--- CELLS ---');
console.table(cells?.map(c => ({
  id: c.id,
  name: c.name,
  leader_id: c.cell_leader_id,
  leader_email: c.profiles?.email,
  leader_name: c.profiles?.full_name
})));

const { data: projs } = await supabase.from('projects').select('id, name, slug, cell_id, is_active').eq('is_active', true);
console.log('\n--- ACTIVE PROJECTS & THEIR CELLS ---');
console.table(projs);
