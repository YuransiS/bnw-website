import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 300; // 5 minutes timeout on Vercel
export const revalidate = 0;

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

    // 2. Fetch Meta ad accounts from Graph API
    const accountsUrl = `https://graph.facebook.com/${apiVersion}/me/adaccounts?access_token=${metaToken}&fields=id,name&limit=100`;
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

      // Fetch daily insights for the mapped account
      const timeRange = JSON.stringify({ since, until });
      const insightsUrl = `https://graph.facebook.com/${apiVersion}/${accId}/insights?access_token=${metaToken}&level=ad&fields=campaign_id,campaign_name,adset_id,ad_id,spend,impressions,clicks,date_start&time_increment=1&time_range=${encodeURIComponent(timeRange)}&limit=100`;
      
      const insightsRes = await fetch(insightsUrl);
      if (!insightsRes.ok) {
        console.warn(`Failed to fetch insights for account ${accId}: ${await insightsRes.text()}`);
        continue;
      }

      const insightsData = await insightsRes.json();
      const insights = insightsData.data || [];

      for (const ins of insights) {
        const spend = Number(ins.spend || 0);
        if (spend <= 0) continue;

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
          spend: spend
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
