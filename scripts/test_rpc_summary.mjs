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

console.log('--- TEST get_superman_summary ---');
const { data: superSummary, error: superErr } = await supabase.rpc('get_superman_summary');
if (superErr) console.error('get_superman_summary error:', superErr);
else console.table(superSummary);

console.log('--- TEST get_producers_leaderboard ---');
const { data: leadSummary, error: leadErr } = await supabase.rpc('get_producers_leaderboard');
if (leadErr) console.error('get_producers_leaderboard error:', leadErr);
else console.table(leadSummary);
