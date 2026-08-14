import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const clean = line.trim();
  if (clean && !clean.startsWith('#')) {
    const idx = clean.indexOf('=');
    if (idx !== -1) {
      const key = clean.substring(0, idx).trim();
      const val = clean.substring(idx + 1).trim();
      env[key] = val;
    }
  }
});

const metaToken = env.META_ACCESS_TOKEN;
const apiVersion = env.META_API_VERSION || 'v25.0';
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== 1. Checking Supabase Connection ===');
const supabase = createClient(supabaseUrl, supabaseKey);
const { data: projects, error: projErr } = await supabase.from('projects').select('id, name, slug');
if (projErr) {
  console.error('Supabase error:', projErr);
} else {
  console.log(`Found ${projects?.length} projects:`, projects?.map(p => `${p.slug} (${p.name})`));
}

const { data: mappings, error: mapErr } = await supabase.from('ad_spend_mappings').select('*');
if (mapErr) {
  console.error('ad_spend_mappings error:', mapErr);
} else {
  console.log(`Found ${mappings?.length} ad_spend_mappings:`, mappings);
}

console.log('\n=== 2. Checking Meta Access Token & Ad Accounts ===');
if (!metaToken) {
  console.error('Missing META_ACCESS_TOKEN in env!');
} else {
  try {
    const meRes = await fetch(`https://graph.facebook.com/${apiVersion}/me?access_token=${metaToken}&fields=id,name`);
    const meData = await meRes.json();
    console.log('Meta User/App:', meData);

    if (meData.error) {
      console.error('Meta API Error:', meData.error);
    } else {
      const accRes = await fetch(`https://graph.facebook.com/${apiVersion}/me/adaccounts?access_token=${metaToken}&fields=id,name,account_id,currency,account_status,amount_spent,disable_reason&limit=100`);
      const accData = await accRes.json();
      console.log(`Ad Accounts (${accData.data?.length || 0}):`);
      if (accData.data) {
        for (const acc of accData.data) {
          const matched = mappings?.find(m => m.rule_value === acc.id || m.rule_value === acc.account_id);
          console.log(` - ID: ${acc.id} (Act: ${acc.account_id}) | Name: "${acc.name}" | Currency: ${acc.currency} | Status: ${acc.account_status} | Mapped to: ${matched ? matched.project_slug : 'NONE'}`);
        }
      } else {
        console.log('No ad accounts found or error:', accData);
      }
    }
  } catch (e) {
    console.error('Meta fetch failed:', e);
  }
}

console.log('\n=== 3. Checking daily_traffic_and_costs in Supabase ===');
const { data: recentCosts, error: costErr } = await supabase
  .from('daily_traffic_and_costs')
  .select('date, utm_source, campaign_name, spend_usd, spend_uah, clicks, impressions')
  .order('date', { ascending: false })
  .limit(10);
if (costErr) {
  console.error('Costs error:', costErr);
} else {
  console.log(`Recent 10 daily_traffic_and_costs records:`, recentCosts);
}

console.log('\n=== 4. Checking traffic_clicks in Supabase ===');
const { data: recentClicks, error: clickErr } = await supabase
  .from('traffic_clicks')
  .select('created_at, utm_source, utm_campaign, page_path, visitor_uuid')
  .order('created_at', { ascending: false })
  .limit(5);
if (clickErr) {
  console.error('Clicks error:', clickErr);
} else {
  console.log(`Recent 5 traffic_clicks records:`, recentClicks);
}
