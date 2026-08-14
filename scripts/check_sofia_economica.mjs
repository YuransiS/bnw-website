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

const { count: sofiaOrders } = await supabase.from('unified_orders').select('*', { count: 'exact', head: true }).eq('project_id', 'd4bf0cb1-b851-460d-85fa-80df4fcf85c7');
const { count: economicaOrders } = await supabase.from('unified_orders').select('*', { count: 'exact', head: true }).eq('project_id', '5bc81e08-dc6b-4625-9219-6f5e8ee0a08f');

console.log('Sofia orders count:', sofiaOrders);
console.log('Economica orders count:', economicaOrders);
