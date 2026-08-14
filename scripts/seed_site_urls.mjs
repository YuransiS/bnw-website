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

const projectUrls = {
  victoria: 'https://victoria-mc.vercel.app',
  svitlana: 'https://svitlanatape.vercel.app',
  sofia: 'https://sofifinsight.vercel.app',
  anastasia_sych: 'https://anastasia-sych.vercel.app',
  economica: 'https://economica.vercel.app',
  nesoniaa: 'https://nesoniaa.vercel.app',
  clean_klinom: 'https://clean-klinom.vercel.app',
  sergiy: 'https://sergiy-chernyavskyy.vercel.app',
  bw_main: 'https://bnw-prod.vercel.app'
};

console.log('=== 1. Checking columns on projects ===');
const { data: projSample } = await supabase.from('projects').select('*').limit(1);
console.log('Available columns in projects:', Object.keys(projSample?.[0] || {}));

// Try to update site_url, ping_status, missed_pings if present
for (const [slug, url] of Object.entries(projectUrls)) {
  const { data, error } = await supabase
    .from('projects')
    .update({ site_url: url })
    .eq('slug', slug)
    .select();
  
  if (error) {
    console.log(`Note: site_url update for ${slug}:`, error.message);
  } else {
    console.log(`Updated ${slug} site_url -> ${url}`);
  }
}
