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

const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Find Utkin's user ID and profile
const { data: utkinProfile } = await adminSupabase.from('profiles').select('*').eq('email', 'utkindmitriij@gmail.com').single();
console.log('Utkin Profile:', utkinProfile);

// Check cell for Utkin
const { data: utkinCell } = await adminSupabase.from('cells').select('*').eq('cell_leader_id', utkinProfile.id);
console.log('Utkin Cells:', utkinCell);

// Check projects for Utkin's cell
const { data: cellProjects } = await adminSupabase.from('projects').select('*').in('cell_id', (utkinCell || []).map(c => c.id));
console.log('Projects in Utkin Cell:');
console.table(cellProjects?.map(p => ({ id: p.id, name: p.name, slug: p.slug, cell_id: p.cell_id, is_active: p.is_active })));

// Check RLS policies on tables
const { data: policies, error: polErr } = await adminSupabase.rpc('execute_sql', {
  query: `SELECT schemaname, tablename, policyname, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public';`
}).catch(() => ({ data: null, error: 'No execute_sql' }));

console.log('Policies check:', polErr || policies);
