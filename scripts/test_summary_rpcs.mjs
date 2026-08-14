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

console.log('=== 1. Testing get_projects_summary() ===');
const { data: projSummary, error: pErr } = await supabase.rpc('get_projects_summary');
if (pErr) {
  console.error('get_projects_summary error:', pErr);
} else {
  console.log('Projects Summary Result:', projSummary);
}

console.log('\n=== 2. Testing get_campaigns_summary() ===');
const { data: campSummary, error: cErr } = await supabase.rpc('get_campaigns_summary');
if (cErr) {
  console.error('get_campaigns_summary error:', cErr);
} else {
  console.log(`Campaigns Summary Result (${campSummary?.length || 0} rows):`);
  console.log(campSummary?.slice(0, 10));
}
