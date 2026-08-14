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

// Set env vars in process.env so crmCache can read them
Object.assign(process.env, env);

const { rebuildProjectCache } = await import('../src/lib/crmCache.js').catch(async () => {
  // If importing ts directly fails, use tsx
  return { rebuildProjectCache: null };
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: projects } = await supabase.from('projects').select('id, slug, name').eq('is_active', true);
console.log('--- Triggering cache rebuild queue for all active projects ---');

for (const p of projects || []) {
  const { error } = await supabase
    .from('crm_cache_dirty_queue')
    .upsert({ project_id: p.id, is_dirty: true }, { onConflict: 'project_id' });
  console.log(`Queued dirty cache for ${p.slug} (${p.name}):`, error ? error.message : 'OK');
}
