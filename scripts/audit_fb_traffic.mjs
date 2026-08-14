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

const metaToken = env.META_ACCESS_TOKEN;
const apiVersion = env.META_API_VERSION || 'v25.0';
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== 1. Checking Active Meta Campaigns for Active Accounts ===');
const activeAccounts = [
  { slug: 'victoria', accId: 'act_338278609686728', name: 'Victoria' },
  { slug: 'svitlana', accId: 'act_1363085972126749', name: 'Svitlana' },
  { slug: 'sergiy', accId: 'act_1451088823442765', name: 'Sergiy' },
  { slug: 'viktoria_chernysh', accId: 'act_964399519877110', name: 'Viktoria Chernysh' }
];

for (const acc of activeAccounts) {
  try {
    const campUrl = `https://graph.facebook.com/${apiVersion}/${acc.accId}/campaigns?access_token=${metaToken}&fields=id,name,status,effective_status,objective,created_time&limit=20`;
    const res = await fetch(campUrl);
    const data = await res.json();
    console.log(`\nAccount ${acc.name} (${acc.accId}) - Campaigns:`);
    if (data.data) {
      data.data.forEach(c => {
        console.log(`  - [${c.effective_status}] ID: ${c.id} | Name: "${c.name}" | Created: ${c.created_time}`);
      });
    } else {
      console.log('  Error or no campaigns:', data);
    }
  } catch (e) {
    console.error(`Error for ${acc.accId}:`, e);
  }
}

console.log('\n=== 2. Checking Recent Traffic Clicks UTMs (Last 7 Days) ===');
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
const { data: clicks, error: cErr } = await supabase
  .from('traffic_clicks')
  .select('project_id, utm_source, utm_medium, utm_campaign, utm_content, created_at')
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(30);

if (cErr) {
  console.error('traffic_clicks error:', cErr);
} else {
  console.log(`Found ${clicks?.length} recent traffic clicks sample:`);
  const utmSources = new Set(clicks.map(c => c.utm_source));
  const utmCampaigns = new Set(clicks.map(c => c.utm_campaign));
  console.log('  Unique UTM sources:', Array.from(utmSources));
  console.log('  Unique UTM campaigns:', Array.from(utmCampaigns));
}

console.log('\n=== 3. Checking Recent Leads / Orders UTMs (Last 7 Days) ===');
const { data: orders, error: oErr } = await supabase
  .from('unified_orders')
  .select('id, project_id, amount, status, utm_source, utm_medium, utm_campaign, created_at')
  .gte('created_at', sevenDaysAgo)
  .order('created_at', { ascending: false })
  .limit(30);

if (oErr) {
  console.error('unified_orders error:', oErr);
} else {
  console.log(`Found ${orders?.length} recent orders/leads sample:`);
  const ordSources = new Set(orders.map(o => o.utm_source));
  const ordCampaigns = new Set(orders.map(o => o.utm_campaign));
  console.log('  Unique Lead UTM sources:', Array.from(ordSources));
  console.log('  Unique Lead UTM campaigns:', Array.from(ordCampaigns));
}

console.log('\n=== 4. Checking Funnels Configuration in Supabase ===');
const { data: funnels, error: fErr } = await supabase
  .from('funnels')
  .select('id, project_id, name, campaign_ids, landing_slugs');
if (fErr) {
  console.error('Funnels error:', fErr);
} else {
  console.log('Funnels:', funnels);
}
