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

console.log('=== 1. Clean up duplicate economica project ===');
const { data: econProj } = await supabase.from('projects').select('id, slug').eq('slug', 'economica').maybeSingle();
if (econProj) {
  // Check if any orders exist before deleting
  const { count } = await supabase.from('unified_orders').select('*', { count: 'exact', head: true }).eq('project_id', econProj.id);
  if (count === 0) {
    const { error: delErr } = await supabase.from('projects').delete().eq('id', econProj.id);
    console.log('Deleted empty duplicate project economica:', delErr ? delErr.message : 'OK');
  } else {
    console.log(`Cannot delete economica, has ${count} orders`);
  }
}

console.log('=== 2. Update Official Project Display Names ===');
const projectRenames = {
  sofia: 'Софія (Economica)',
  victoria: 'Вікторія Візуал',
  viktoria_chernysh: 'Вікторія Черниш',
  svitlana: 'Світлана Тейп',
  anastasia_sych: 'Анастасія Сич',
  clean_klinom: 'clean.klinom',
  sergiy: 'Сергій Чернявський',
  nesoniaa: 'Nesoniaa',
  bw_main: 'B&W Main'
};

for (const [slug, newName] of Object.entries(projectRenames)) {
  const { error } = await supabase.from('projects').update({ name: newName }).eq('slug', slug);
  if (error) {
    console.error(`Error renaming ${slug}:`, error.message);
  } else {
    console.log(`Updated ${slug} -> "${newName}"`);
  }
}

const { data: allProjects } = await supabase.from('projects').select('id, name, slug, is_active, cell_id').eq('is_active', true);
console.log('\n--- ACTIVE PROJECTS IN DB NOW ---');
console.log(allProjects);
