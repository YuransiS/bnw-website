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

const DEFAULT_PROJECT_LANDINGS = {
  bw_main: [
    { label: "Основний", url: "https://bnw-prod.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] }
  ],
  victoria: [
    { label: "Майстер-клас", url: "https://victoria-mc.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "VSL", url: "https://victoria-mc.vercel.app/free-lection/", path: "/free-lection/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", path: "/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "розбір", url: "https://victoria-mc.vercel.app/rozbir", path: "/rozbir", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid", parameters: [] },
    { label: "Броні", url: "https://victoria-mc.vercel.app/price", path: "/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid", parameters: [] },
    { label: "Практикум", url: "https://victoria-mc.vercel.app/practicum", path: "/practicum", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [{ key: "o", description: "Оффер" }] }
  ],
  sofia: [
    { label: "Основний", url: "https://sofifinsight.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Інтенсив", url: "https://sofifinsight.vercel.app/intensive", path: "/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] },
    { label: "Вебінар", url: "https://sofifinsight.vercel.app/web", path: "/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] },
    { label: "Броні", url: "https://sofifinsight.vercel.app/price", path: "/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid", parameters: [] },
    { label: "VSL", url: "https://sofifinsight.vercel.app/sofia-invest", path: "/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] },
    { label: "VSL-форма", url: "https://sofifinsight.vercel.app/sofia-invest/lesson", path: "/sofia-invest/lesson", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "Міні-курс", url: "https://sofifinsight.vercel.app/minicourse", path: "/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid", parameters: [] }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid", parameters: [] },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", path: "/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid", parameters: [] },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", path: "/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid", parameters: [] },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", path: "/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", path: "/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free", parameters: [] },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", path: "/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free", parameters: [] },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", path: "/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid", parameters: [] },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", path: "/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free", parameters: [] }
  ],
  anastasia_sych: [
    { label: "Основний", url: "https://anastasia-sych.vercel.app/", path: "/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free", parameters: [] }
  ],
  economica: [
    { label: "Основний", url: "https://economica.vercel.app/", path: "/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free", parameters: [] }
  ],
  nesoniaa: [
    { label: "Основний", url: "https://nesoniaa.vercel.app/", path: "/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free", parameters: [] }
  ],
  clean_klinom: [
    { label: "Основний", url: "https://clean-klinom.vercel.app/", path: "/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free", parameters: [] }
  ],
  sergiy: [
    { label: "Основний", url: "https://sergiy-chernyavskyy.vercel.app/", path: "/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free", parameters: [] }
  ]
};

const { data: projects } = await supabase.from('projects').select('id, slug');
const slugToId = new Map(projects.map(p => [p.slug, p.id]));

let totalInserted = 0;
for (const [slug, landings] of Object.entries(DEFAULT_PROJECT_LANDINGS)) {
  const projectId = slugToId.get(slug);
  if (!projectId) continue;

  for (const land of landings) {
    const { data: existing } = await supabase
      .from('project_landings')
      .select('id')
      .eq('project_id', projectId)
      .eq('path', land.path)
      .maybeSingle();

    if (!existing) {
      const { error: insErr } = await supabase
        .from('project_landings')
        .insert({
          project_id: projectId,
          label: land.label,
          url: land.url,
          path: land.path,
          type: land.type,
          badge_color: land.badgeColor,
          parameters: land.parameters || [],
          is_active: true,
          last_ping_at: new Date().toISOString()
        });

      if (!insErr) {
        totalInserted++;
        console.log(`Inserted landing ${land.label} (${land.path}) for ${slug}`);
      } else {
        console.error(`Error inserting ${land.path} for ${slug}:`, insErr);
      }
    }
  }
}

console.log(`\nSeeded ${totalInserted} landings into project_landings table!`);
