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

const newProjects = [
  {
    name: 'Anastasia Sych',
    slug: 'anastasia_sych',
    api_key_hash: 'bw_analytics_anastasia_sych_key_112244',
    is_active: true,
    cell_id: 'fdb33227-45ea-493f-b04b-de954c6d84da',
    default_currency: 'UAH',
    revenue_model: '50_50',
    expert_share_percent: 50,
    fixed_fee_amount: 0,
    contract_model: '50/50_profit',
    target_currency: 'USD',
    traffic_budget_plan: 0,
    financial_goal_plan_usd: 0,
    acquiring_fee_percent: 2
  },
  {
    name: 'Economica',
    slug: 'economica',
    api_key_hash: 'bw_analytics_economica_key_889900',
    is_active: true,
    cell_id: '4944b399-429f-423e-a4ab-e24b49c71d32',
    default_currency: 'UAH',
    revenue_model: '50_50',
    expert_share_percent: 50,
    fixed_fee_amount: 0,
    contract_model: '50/50_profit',
    target_currency: 'USD',
    traffic_budget_plan: 0,
    financial_goal_plan_usd: 0,
    acquiring_fee_percent: 2
  },
  {
    name: 'Nesoniaa',
    slug: 'nesoniaa',
    api_key_hash: 'bw_analytics_nesoniaa_key_556677',
    is_active: true,
    cell_id: '53baab06-b780-4db8-b3a2-9ff31d32070e',
    default_currency: 'UAH',
    revenue_model: '50_50',
    expert_share_percent: 50,
    fixed_fee_amount: 0,
    contract_model: '50/50_profit',
    target_currency: 'USD',
    traffic_budget_plan: 0,
    financial_goal_plan_usd: 0,
    acquiring_fee_percent: 2
  }
];

for (const p of newProjects) {
  const { data: existing } = await supabase.from('projects').select('id, slug').eq('slug', p.slug).maybeSingle();
  if (existing) {
    console.log(`Project ${p.slug} already exists with ID: ${existing.id}`);
  } else {
    const { data: inserted, error: insErr } = await supabase.from('projects').insert(p).select().single();
    if (insErr) {
      console.error(`Error inserting ${p.slug}:`, insErr);
    } else {
      console.log(`Inserted project ${p.slug}:`, inserted.id);
    }
  }
}

const { data: allProjects } = await supabase.from('projects').select('id, name, slug, is_active, cell_id');
console.log('\nAll projects in DB now:', allProjects);
