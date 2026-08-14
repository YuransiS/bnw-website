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

const { data: mappings } = await supabase.from('profile_projects').select('*, profiles(email, role), projects(name, slug)');
console.log('--- PROFILE_PROJECTS MAPPINGS ---');
console.table(mappings?.map(m => ({
  id: m.id,
  email: m.profiles?.email,
  role: m.profiles?.role,
  project_name: m.projects?.name,
  slug: m.projects?.slug
})));
