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

// Get definition of get_superman_summary
const { data: funcDef, error } = await adminSupabase.from('projects').select('*').limit(1);

// Let's check RLS on projects, daily_traffic_and_costs, leads, orders
const tables = ['projects', 'cells', 'profiles', 'profile_projects', 'orders', 'leads', 'daily_traffic_and_costs'];

for (const t of tables) {
  const { data: pols } = await adminSupabase.from('profiles').select('*').limit(1); // placeholder
}

// Let's query using anon client or check user auth
const anonSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: anonSummary, error: anonErr } = await anonSupabase.rpc('get_superman_summary');
console.log('get_superman_summary via ANON client:', { error: anonErr, count: anonSummary?.length });

// Let's check if get_superman_summary uses SECURITY DEFINER
