import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300; // 5 minutes timeout on Vercel
export const revalidate = 0;

// Helper to fetch exchange rates from NBU and cache in Supabase
async function getExchangeRatesForDate(dateStr: string, supabase: any) {
  // 1. Check database first
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

  // 2. Fetch from NBU
  const formattedDate = dateStr.replace(/-/g, ""); // 'YYYYMMDD'
  let usdToUah = 41.0; // fallback default
  let eurToUah = 44.0; // fallback default
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
    console.error(`Error fetching exchange rates for ${dateStr} from NBU:`, err);
  }

  if (!fetched) {
    // 3. Fallback: get latest available from DB
    const { data: latestData } = await supabase
      .from("exchange_rates")
      .select("*")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestData) {
      usdToUah = Number(latestData.usd_to_uah);
      eurToUah = Number(latestData.eur_to_uah);
    }
  }

  // Save to DB so we don't query NBU again
  try {
    await supabase.from("exchange_rates").upsert({
      date: dateStr,
      usd_to_uah: usdToUah,
      eur_to_uah: eurToUah
    }, { onConflict: "date" });
  } catch (err) {
    console.error("Failed to cache exchange rates to DB:", err);
  }

  return { usdToUah, eurToUah };
}

// Helper to poll Meta Async Insights
async function fetchMetaInsightsAsync(
  accId: string,
  apiVersion: string,
  metaToken: string,
  since: string,
  until: string
): Promise<any[]> {
  const timeRange = JSON.stringify({ since, until });
  const url = `https://graph.facebook.com/${apiVersion}/${accId}/insights`;

  // 1. Start the async job
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
    throw new Error(`Failed to start async insights job for ${accId}: ${await startRes.text()}`);
  }

  const startData = await startRes.json();
  const runId = startData.report_run_id;
  if (!runId) {
    throw new Error(`Async insights job did not return report_run_id: ${JSON.stringify(startData)}`);
  }

  // 2. Poll the job status
  const pollUrl = `https://graph.facebook.com/${apiVersion}/${runId}?access_token=${metaToken}`;
  let status = "Job Running";
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max (5s * 60)

  while (attempts < maxAttempts) {
    const pollRes = await fetch(pollUrl);
    if (!pollRes.ok) {
      throw new Error(`Failed to poll job status for run_id ${runId}: ${await pollRes.text()}`);
    }
    const pollData = await pollRes.json();
    status = pollData.async_status;

    if (status === "Job Completed") {
      break;
    }
    if (status === "Job Failed" || status === "Job Skipped") {
      throw new Error(`Job ${runId} failed or was skipped with status: ${status}`);
    }

    // Wait 5 seconds before next poll
    await new Promise((resolve) => setTimeout(resolve, 5000));
    attempts++;
  }

  if (status !== "Job Completed") {
    throw new Error(`Async job ${runId} timed out after 5 minutes`);
  }

  // 3. Retrieve the results (with simple pagination)
  let results: any[] = [];
  let nextUrl: string | null = `https://graph.facebook.com/${apiVersion}/${runId}/insights?access_token=${metaToken}&limit=500`;

  while (nextUrl) {
    const dataRes = await fetch(nextUrl);
    if (!dataRes.ok) {
      throw new Error(`Failed to fetch insights data for job ${runId}: ${await dataRes.text()}`);
    }
    const data: any = await dataRes.json();
    if (data.data) {
      results = results.concat(data.data);
    }
    nextUrl = data.paging?.next || null;
  }

  return results;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const authHeader = req.headers.get("Authorization");

    const expectedSecret = process.env.CRON_SECRET;
    const isAuthorized =
      (expectedSecret && secret === expectedSecret) ||
      (expectedSecret && authHeader === `Bearer ${expectedSecret}`) ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metaToken = process.env.META_ACCESS_TOKEN;
    if (!metaToken) {
      return NextResponse.json({ error: "Missing META_ACCESS_TOKEN" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Missing Supabase configuration" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const apiVersion = process.env.META_API_VERSION || "v25.0";

    // 1. Fetch projects and mapping rules
    const [projectsRes, rulesRes] = await Promise.all([
      supabase.from("projects").select("id, name, slug"),
      supabase.from("ad_spend_mappings").select("*").eq("rule_type", "account")
    ]);

    if (projectsRes.error) throw projectsRes.error;
    if (rulesRes.error) throw rulesRes.error;

    const projects = projectsRes.data || [];
    const rules = rulesRes.data || [];

    const slugToId = new Map(projects.map((p) => [p.slug, p.id]));
    const accountToSlug = new Map(rules.map((r) => [r.rule_value, r.project_slug]));

    // 2. Fetch Meta ad accounts from Graph API (including currency field)
    const accountsUrl = `https://graph.facebook.com/${apiVersion}/me/adaccounts?access_token=${metaToken}&fields=id,name,currency&limit=100`;
    const accountsRes = await fetch(accountsUrl);
    if (!accountsRes.ok) {
      throw new Error(`Failed to fetch Meta accounts: ${await accountsRes.text()}`);
    }
    const accountsData = await accountsRes.json();
    const accounts = accountsData.data || [];

    // Date range: last 3 days
    const today = new Date();
    const until = today.toISOString().split("T")[0];
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const allRecords: any[] = [];
    const summary: Record<string, number> = {};

    for (const acc of accounts) {
      const accId = acc.id;
      if (!accountToSlug.has(accId)) continue;

      const slug = accountToSlug.get(accId)!;
      const projectId = slugToId.get(slug);
      if (!projectId) continue;

      const currency = (acc.currency || "USD").toUpperCase();

      // Fetch daily insights for the mapped account using Async API
      console.log(`Starting async insights job for account: ${accId} (${acc.name})`);
      let insights: any[] = [];
      try {
        insights = await fetchMetaInsightsAsync(accId, apiVersion, metaToken, since, until);
      } catch (err: any) {
        console.error(`Failed to fetch async insights for account ${accId}:`, err);
        continue;
      }

      for (const ins of insights) {
        const spend = Number(ins.spend || 0);
        if (spend <= 0) continue;

        // Resolve exchange rates for the specific date of spend
        const rates = await getExchangeRatesForDate(ins.date_start, supabase);
        
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
        } else {
          spendUsd = spend;
          spendUah = spend * rates.usdToUah;
          spendEur = spend * (rates.usdToUah / rates.eurToUah);
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
    }

    if (allRecords.length > 0) {
      // Chunk and upsert to daily_traffic_and_costs
      const chunkSize = 200;
      for (let i = 0; i < allRecords.length; i += chunkSize) {
        const chunk = allRecords.slice(i, i + chunkSize);
        const { error: upsertErr } = await supabase
          .from("daily_traffic_and_costs")
          .upsert(chunk, { onConflict: "project_id,date,utm_source,campaign_id,ad_id" });

        if (upsertErr) throw upsertErr;
      }
    }

    return NextResponse.json({
      success: true,
      recordsSynced: allRecords.length,
      summary
    });
  } catch (error: any) {
    console.error("Cron spend sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
