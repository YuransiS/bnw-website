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

console.log('=== Adding missing ad_spend_mapping for viktoria_chernysh ===');
const { data, error } = await supabase.from('ad_spend_mappings').upsert({
  project_slug: 'viktoria_chernysh',
  rule_type: 'account',
  rule_value: 'act_964399519877110'
}, { onConflict: 'project_slug,rule_type,rule_value' }).select();

if (error) {
  // If unique constraint is on rule_value or similar
  console.log('Upsert note/error:', error);
  const { data: insData, error: insErr } = await supabase.from('ad_spend_mappings').insert({
    project_slug: 'viktoria_chernysh',
    rule_type: 'account',
    rule_value: 'act_964399519877110'
  }).select();
  console.log('Insert result:', insData, insErr);
} else {
  console.log('Mapping added successfully:', data);
}

const { data: allMappings } = await supabase.from('ad_spend_mappings').select('*');
console.log('All ad_spend_mappings now:', allMappings);
