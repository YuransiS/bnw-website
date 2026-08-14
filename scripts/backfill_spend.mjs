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

// Helper to fetch exchange rates from NBU and cache in Supabase
async function getExchangeRatesForDate(dateStr) {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("*")
    .eq("date", dateStr)
    .maybeSingle();

  if (data && !error) {
    return {
      usdToUah: Number(data.usd_to_uah),
      eurToUah: Number(data.eur_to_uah)
    };
  }

  const formattedDate = dateStr.replace(/-/g, "");
  let usdToUah = 41.2;
  let eurToUah = 44.8;
  let fetched = false;

  try {
    const [usdRes, eurRes] = await Promise.all([
      fetch(`https://bank.gov.ua/NBUStatService/v1/statistichny/exchange?valcode=USD&date=${formattedDate}&json`),
      fetch(`https://bank.gov.ua/NBUStatService/v1/statistichny/exchange?valcode=EUR&date=${formattedDate}&json`)
    ]);

    if (usdRes.ok && eurRes.ok) {
      const usdData = await usdRes.json();
      const eurData = await eurRes.json();
      if (usdData?.[0]?.rate && eurData?.[0]?.rate) {
        usdToUah = Number(usdData[0].rate);
        eurToUah = Number(eurData[0].rate);
        fetched = true;
      }
    }
  } catch (err) {
    console.error(`Error fetching rates for ${dateStr}:`, err);
  }

  try {
    await supabase.from("exchange_rates").upsert({
      date: dateStr,
      usd_to_uah: usdToUah,
      eur_to_uah: eurToUah
    }, { onConflict: "date" });
  } catch (e) {}

  return { usdToUah, eurToUah };
}

// Fetch insights directly / async
async function fetchMetaInsights(accId, since, until) {
  const timeRange = JSON.stringify({ since, until });
  const url = `https://graph.facebook.com/${apiVersion}/${accId}/insights`;

  const startRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: metaToken,
      level: "ad",
      fields: "campaign_id,campaign_name,adset_id,ad_id,spend,impressions,clicks,date_start",
      time_increment: 1,
      time_range: timeRange,
      limit: 500
    })
  });

  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Failed to start job: ${text}`);
  }

  const startData = await startRes.json();
  const runId = startData.report_run_id;
  if (!runId) throw new Error('No run_id returned');

  let status = "Job Running";
  let attempts = 0;
  while (attempts < 60) {
    const pollRes = await fetch(`https://graph.facebook.com/${apiVersion}/${runId}?access_token=${metaToken}`);
    const pollData = await pollRes.json();
    status = pollData.async_status;
    if (status === "Job Completed") break;
    if (status === "Job Failed" || status === "Job Skipped") throw new Error(`Job status: ${status}`);
    await new Promise(r => setTimeout(r, 3000));
    attempts++;
  }

  let results = [];
  let nextUrl = `https://graph.facebook.com/${apiVersion}/${runId}/insights?access_token=${metaToken}&limit=500`;
  while (nextUrl) {
    const dataRes = await fetch(nextUrl);
    const data = await dataRes.json();
    if (data.data) results = results.concat(data.data);
    nextUrl = data.paging?.next || null;
  }
  return results;
}

console.log('=== Running Backfill Sync for All Mapped Accounts (July 1st to August 14th) ===');
const [projectsRes, rulesRes, funnelsRes] = await Promise.all([
  supabase.from("projects").select("id, name, slug"),
  supabase.from("ad_spend_mappings").select("*").eq("rule_type", "account"),
  supabase.from("funnels").select("id, project_id, campaign_ids, landing_slugs")
]);

const projects = projectsRes.data || [];
const rules = rulesRes.data || [];
const funnels = funnelsRes.data || [];
const slugToId = new Map(projects.map(p => [p.slug, p.id]));

const accountsRes = await fetch(`https://graph.facebook.com/${apiVersion}/me/adaccounts?access_token=${metaToken}&fields=id,name,currency&limit=100`);
const accountsData = await accountsRes.json();
const accounts = accountsData.data || [];

const since = '2026-07-01';
const until = '2026-08-14';

const allRecords = [];
const summary = {};

for (const acc of accounts) {
  const rule = rules.find(r => r.rule_value === acc.id || r.rule_value === acc.account_id);
  if (!rule) continue;

  const slug = rule.project_slug;
  const projectId = slugToId.get(slug);
  if (!projectId) continue;

  const currency = (acc.currency || "USD").toUpperCase();
  console.log(`\nFetching insights for ${slug} (${acc.name} - ${acc.id}) [${since} -> ${until}]...`);

  try {
    const insights = await fetchMetaInsights(acc.id, since, until);
    console.log(`  Received ${insights.length} insight rows.`);

    for (const ins of insights) {
      const spend = Number(ins.spend || 0);
      if (spend <= 0) continue;

      const rates = await getExchangeRatesForDate(ins.date_start);
      let spendUsd = 0;
      let spendUah = 0;
      let spendEur = 0;

      if (currency === "USD") {
        spendUsd = spend;
        spendUah = spend * rates.usdToUah;
        spendEur = spend * (rates.usdToUah / rates.eurToUah);
      } else if (currency === "EUR") {
        spendEur = spend;
        spendUah = spend * rates.eurToUah;
        spendUsd = spend * (rates.eurToUah / rates.usdToUah);
      } else if (currency === "UAH") {
        spendUah = spend;
        spendUsd = spend / rates.usdToUah;
        spendEur = spend / rates.eurToUah;
      }

      const campaignNameLower = String(ins.campaign_name || "").toLowerCase().trim();
      const projectFunnels = funnels.filter(f => f.project_id === projectId);
      let resolvedFunnelId = null;
      for (const funnel of projectFunnels) {
        if (Array.isArray(funnel.campaign_ids) && funnel.campaign_ids.some(id => campaignNameLower.includes(id.toLowerCase().trim()))) {
          resolvedFunnelId = funnel.id;
          break;
        }
      }

      allRecords.push({
        project_id: projectId,
        date: ins.date_start,
        utm_source: "meta",
        campaign_id: ins.campaign_id,
        campaign_name: ins.campaign_name || "",
        adset_id: ins.adset_id || "",
        ad_id: ins.ad_id || "",
        clicks: Number(ins.clicks || 0),
        impressions: Number(ins.impressions || 0),
        spend: spend,
        spend_usd: Number(spendUsd.toFixed(2)),
        spend_uah: Number(spendUah.toFixed(2)),
        spend_eur: Number(spendEur.toFixed(2))
      });

      summary[slug] = (summary[slug] || 0) + spend;
    }
  } catch (err) {
    console.error(`  Error for ${slug}:`, err.message);
  }
}

console.log(`\nTotal records to upsert: ${allRecords.length}`);
console.log('Spend summary by project (USD):', summary);

if (allRecords.length > 0) {
  const chunkSize = 200;
  for (let i = 0; i < allRecords.length; i += chunkSize) {
    const chunk = allRecords.slice(i, i + chunkSize);
    const { error: upsertErr } = await supabase
      .from("daily_traffic_and_costs")
      .upsert(chunk, { onConflict: "project_id,date,utm_source,campaign_id,ad_id" });

    if (upsertErr) {
      console.error('Upsert chunk error:', upsertErr);
      break;
    }
  }
  console.log('Successfully upserted all spend records to Supabase!');
}
