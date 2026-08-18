"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { statusMapper } from "@/lib/statusMapper";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { devLogger } from "@/utils/logger";
import { rebuildProjectCache } from "@/lib/crmCache";
import { parseClientDateRange, statusPriority } from "./utils";
import { DEFAULT_PROJECT_LANDINGS } from "@/lib/projectLandings";

// Memory cache for Superman Global Hub mode
let globalSupermanSummaryCache: {
  timestamp: number;
  data: {
    summaryData: any[];
    campaignsData: any[];
    producersLeaderboard: any[];
  };
} | null = null;

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Helper to check user session, role, and allowed projects
export async function getSessionAndAccess(selectedProjectSlug?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Fetch profile using admin client to bypass RLS or session latency
  const adminSupabase = createAdminClient();
  const { data: profileData } = await adminSupabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  let profile = profileData;

  const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
  const isActualDev = (user.email && devEmails.includes(user.email.toLowerCase())) ||
    (profile && (profile.role === "admin" || profile.role === "superman" || profile.role === "founder" || profile.role === "developer"));

  if (isActualDev) {
    const cookieStore = await cookies();
    const impersonated = cookieStore.get("crm_impersonated_role")?.value;
    if (impersonated && ["founder", "cell_leader", "producer", "developer", "pending"].includes(impersonated)) {
      profile = profile ? { ...profile, role: impersonated } : { id: user.id, email: user.email || "", role: impersonated };
    }
  }

  if (!profile || profile.role === "pending") {
    throw new Error("Access Pending Approval");
  }

  const isSuperman = ["admin", "superman", "founder", "developer"].includes(profile.role);
  const isCellLeader = profile.role === "cell_leader";

  // Fetch allowed projects mapping
  let allowedProjects: { id: string; name: string; slug: string; cell_id?: string | null; default_currency?: string; expert_share_percent?: number }[] = [];

  if (isSuperman) {
    // Superman role sees all active projects without checking profile_projects mapping and RLS
    const { data: allProj } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent")
      .order("name");
    const projectsList = allProj || [];

    allowedProjects = projectsList.filter((p) => p.is_active);
  } else if (isCellLeader) {
    // Cell Leader role sees all projects belonging to their cells
    const { data: cells } = await adminSupabase
      .from("cells")
      .select("id")
      .eq("cell_leader_id", user.id);
    const cellIds = (cells || []).map((c) => c.id);

    if (cellIds.length > 0) {
      const { data: cellProj } = await adminSupabase
        .from("projects")
        .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent")
        .in("cell_id", cellIds)
        .order("name");
      const projectsList = cellProj || [];
      allowedProjects = projectsList.filter((p) => p.is_active);
    }
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug, is_active, cell_id, default_currency, expert_share_percent)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.is_active !== false);
  }

  // Resolve current active project slug
  let activeSlug = selectedProjectSlug;
  if (!activeSlug && allowedProjects.length > 0) {
    activeSlug = isSuperman || isCellLeader ? "all" : allowedProjects[0].slug;
  }

  // Verify access to requested slug
  if (activeSlug === "all") {
    if (allowedProjects.length === 0) {
      activeSlug = undefined;
    }
  } else if (activeSlug && !allowedProjects.some((p) => p.slug === activeSlug)) {
    activeSlug = allowedProjects.length > 0 ? (isSuperman || isCellLeader ? "all" : allowedProjects[0].slug) : undefined;
  }

  devLogger.info(
    "Auth & Session",
    `User ${user.email} authenticated. Role: ${profile.role}. Active Project: ${activeSlug}`,
    { allowedProjects: allowedProjects.map((p) => p.slug) }
  );

  return {
    user,
    profile,
    isSuperman,
    allowedProjects,
    activeSlug,
  };
}

export async function checkProjectAccess(projectId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminSupabase = createAdminClient();
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") throw new Error("Access Pending Approval");
  if (["admin", "superman", "founder", "developer"].includes(profile.role)) return true;

  if (profile.role === "cell_leader") {
    const { data: project } = await adminSupabase
      .from("projects")
      .select("cell_id")
      .eq("id", projectId)
      .single();
    if (project?.cell_id) {
      const { data: cell } = await adminSupabase
        .from("cells")
        .select("id")
        .eq("id", project.cell_id)
        .eq("cell_leader_id", user.id)
        .maybeSingle();
      if (cell) return true;
    }
    throw new Error("Access Denied: You do not have access to this project.");
  }

  const { data } = await supabase
    .from("profile_projects")
    .select("project_id")
    .eq("profile_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) throw new Error("Access Denied: You do not have access to this project.");
  return true;
}

// Helper to match lead to funnel in actions.ts
function matchLeadToFunnel(lead: any, funnels: any[]) {
  const campaign = String(lead.utm_campaign || lead.utmCampaign || "").trim().toLowerCase();
  const path = String(lead.page_path || "").trim().toLowerCase();
  const url = String(lead.page_url || "").trim().toLowerCase();
  const landings = lead.visited_landings || lead.visitedLandings || [];
  const targetSheet = String(lead.target_sheet || lead.targetSheet || "").trim().toLowerCase();

  for (const funnel of funnels) {
    const campaignIds = (funnel.campaign_ids || []).map((c: string) => c.trim().toLowerCase());
    const landingSlugs = (funnel.landing_slugs || []).map((s: string) => s.trim().toLowerCase());
    const funnelName = String(funnel.name || "").trim().toLowerCase();

    // 1. Match by campaign
    if (campaign && campaignIds.some((cid: string) => campaign.includes(cid))) {
      return funnel;
    }

    // 2. Match by landing slug
    if (landingSlugs.some((slug: string) => {
      if (!slug) return false;
      return path.includes(slug) || url.includes(slug) || landings.some((l: string) => l.toLowerCase().includes(slug));
    })) {
      return funnel;
    }

    // 3. Match by target sheet name
    if (targetSheet && (targetSheet.includes(funnelName) || funnelName.includes(targetSheet))) {
      return funnel;
    }
  }

  return null;
}

export async function getUnifiedCRMData(
  selectedProjectSlug?: string,
  filters?: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    statusFilter?: string;
    touchCountFilter?: string;
    sourceFilter?: string;
    unpaidIntentOnly?: boolean;
    startDate?: string;
    endDate?: string;
    selectedLanding?: string;
    skipTraffic?: boolean;
  }
) {
  try {
    const { isSuperman, allowedProjects, activeSlug, profile, user } = await getSessionAndAccess(selectedProjectSlug);

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Fetch unresolved transactions (amount > 0 and missing/invalid currency metadata)
    let unresolvedOrders: any[] = [];
    if (["admin", "superman", "founder", "developer", "producer"].includes(profile.role)) {
      try {
        const { data: rawUnresolved, error: unresolvedErr } = await adminSupabase
          .from("unified_orders")
          .select("id, amount, status, created_at, customer_id, project_id, metadata")
          .not("status", "in", "('Клик', 'КликФормы')")
          .gt("amount", 0);

        if (!unresolvedErr && rawUnresolved) {
          const filtered = rawUnresolved.filter((o: any) => {
            const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();
            return !["usd", "$", "uah", "₴", "eur", "€"].includes(metaCurrency);
          });

          if (filtered.length > 0) {
            const customerIds = Array.from(new Set(filtered.map((o) => o.customer_id).filter(Boolean)));
            const projectIds = Array.from(new Set(filtered.map((o) => o.project_id).filter(Boolean)));

            const [custs, projs] = await Promise.all([
              customerIds.length > 0
                ? adminSupabase.from("unified_customers").select("id, name, phone").in("id", customerIds).then((r) => r.data || [])
                : Promise.resolve([]),
              projectIds.length > 0
                ? adminSupabase.from("projects").select("id, name").in("id", projectIds).then((r) => r.data || [])
                : Promise.resolve([]),
            ]);

            unresolvedOrders = filtered.map((o) => {
              const customer = (custs.find((c: any) => c.id === o.customer_id) || {}) as any;
              const project = (projs.find((p: any) => p.id === o.project_id) || {}) as any;
              const landingName = o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "";
              return {
                id: o.id,
                amount: Number(o.amount || 0),
                status: o.status,
                created_at: o.created_at,
                projectId: o.project_id,
                projectName: project.name || "Невідомий проект",
                customerName: customer.name || "Невідомий клієнт",
                customerPhone: customer.phone || "",
                landingName,
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch unresolved orders:", err);
      }
    }

    // 1. All-projects summary mode (direct fast cached RPC)
    if (activeSlug === "all") {
      const now = Date.now();
      let summary = [];
      let campaigns = [];
      let leaderboard = [];

      if (globalSupermanSummaryCache && (now - globalSupermanSummaryCache.timestamp < 10000)) {
        summary = globalSupermanSummaryCache.data.summaryData;
        campaigns = globalSupermanSummaryCache.data.campaignsData;
        leaderboard = globalSupermanSummaryCache.data.producersLeaderboard;
      } else {
        const [summaryRes, campaignRes, leaderboardRes] = await Promise.all([
          supabase.rpc("get_superman_summary"),
          supabase.rpc("get_campaigns_summary"),
          adminSupabase.rpc("get_producers_leaderboard")
        ]);

        const rawSummary = summaryRes.data || [];
        summary = rawSummary.map((p: any) => ({
          project_id: p.project_id,
          project_name: p.project_name,
          project_slug: p.project_slug,
          cell_id: p.cell_id,
          revenue_uah: Number(p.uah_revenue || 0),
          expenses_uah: Number(p.spend || 0),
          revenue_usd: Number(p.usd_revenue || 0),
          revenue_eur: Number(p.eur_revenue || 0),
          leads_count: Number(p.leads_count || 0),
          cpl: Number(p.cpl || 0),
          roi: Number(p.spend || 0) > 0 ? ((Number(p.uah_revenue || 0) - Number(p.spend || 0)) / Number(p.spend || 0)) * 100 : 0
        }));

        campaigns = campaignRes.data || [];
        leaderboard = (leaderboardRes.data || []).map((l: any) => ({
          producerId: l.producer_id,
          email: l.email,
          name: l.name,
          avatar_url: l.avatar_url,
          projectNames: l.project_names,
          spend: Number(l.spend || 0),
          leadsCount: Number(l.leads_count || 0),
          cpl: Number(l.cpl || 0),
          usd_revenue: Number(l.usd_revenue || 0),
          uah_revenue: Number(l.uah_revenue || 0),
          eur_revenue: Number(l.eur_revenue || 0),
          blended_revenue: Number(l.blended_revenue || 0),
          profit: Number(l.profit || 0),
          roi: Number(l.roi || 0),
          isLeaderOfMonth: false,
        }));

        if (leaderboard.length > 0 && leaderboard[0].blended_revenue > 0) {
          leaderboard[0].isLeaderOfMonth = true;
        }

        globalSupermanSummaryCache = {
          timestamp: now,
          data: {
            summaryData: summary,
            campaignsData: campaigns,
            producersLeaderboard: leaderboard
          }
        };
      }

      // Filter summary data based on user's allowed projects if they are not Superman
      let filteredSummary = summary;
      let filteredCampaigns = campaigns;
      let filteredLeaderboard = leaderboard;

      if (!isSuperman) {
        const allowedIds = new Set(allowedProjects.map((p) => p.id));
        filteredSummary = summary.filter((p: any) => allowedIds.has(p.project_id));
        filteredCampaigns = campaigns.filter((c: any) => allowedProjects.some(ap => ap.slug === c.project_slug));
        
        filteredLeaderboard = leaderboard.map((l: any) => {
          const lProjects = String(l.projectNames || "").split(", ").map(p => p.trim());
          const hasSharedProject = lProjects.some(lpName => 
            allowedProjects.some(ap => ap.name === lpName)
          );
          if (hasSharedProject) return l;
          return null;
        }).filter(Boolean);
      }

      return {
        viewType: "all",
        role: profile.role,
        allowedProjects,
        activeSlug: "all",
        summaryData: filteredSummary,
        campaignsData: filteredCampaigns,
        producersLeaderboard: filteredLeaderboard,
        unresolvedOrders: isSuperman ? unresolvedOrders : [],
      };
    }

    // 2. Focused Single Project mode
    if (!activeSlug) {
      return {
        viewType: "none",
        role: profile.role,
        allowedProjects: [],
        activeSlug: "",
        leads: [],
        traffic: [],
        costs: [],
        unresolvedOrders,
      };
    }

    const activeProject = allowedProjects.find((p) => p.slug === activeSlug)!;

    const isSalesFiltered = false;

    // --- Caching Rebuild Trigger Check ---
    const cacheCheckStart = performance.now();
    const { data: dirtyQueue } = await adminSupabase
      .from("crm_cache_dirty_queue")
      .select("is_dirty, metadata")
      .eq("project_id", activeProject.id)
      .maybeSingle();

    const { count: cachedCount } = await adminSupabase
      .from("crm_leads_cache")
      .select("*", { count: "exact", head: true })
      .eq("project_id", activeProject.id);

    let cacheRebuildMs = 0;
    const needsRebuild = !dirtyQueue || dirtyQueue.is_dirty;
    const needsSyncRebuild = !dirtyQueue;

    if (needsRebuild) {
      // Set dirty to false immediately to lock and prevent concurrent rebuilds
      await adminSupabase.from("crm_cache_dirty_queue").upsert({
        project_id: activeProject.id,
        is_dirty: false,
        updated_at: new Date().toISOString()
      });

      if (needsSyncRebuild) {
        // Build synchronously on first load so user gets data
        const rebuildStart = performance.now();
        await rebuildProjectCache(activeProject.id, activeProject.slug);
        cacheRebuildMs = performance.now() - rebuildStart;
      } else {
        // Build in the background asynchronously so page loads instantly
        const qstashToken = process.env.QSTASH_TOKEN;
        if (qstashToken) {
          try {
            const headersList = await headers();
            const host = headersList.get("host") || "localhost:3000";
            const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
            const appUrl = `${protocol}://${host}`;
            
            console.log(`📡 Triggering background cache rebuild via Upstash QStash for project: ${activeProject.slug}`);
            
            fetch(`https://qstash.upstash.io/v2/publish/${appUrl}/api/crm/rebuild-cache`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${qstashToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                projectId: activeProject.id,
                activeSlug: activeProject.slug
              })
            }).catch(fetchErr => {
              console.error("Failed to publish background rebuild job to QStash asynchronously:", fetchErr);
            });
          } catch (headerErr) {
            console.error("Failed to get headers or publish job, falling back to local async:", headerErr);
            rebuildProjectCache(activeProject.id, activeProject.slug).catch((err) => {
              console.error(`Fallback Background CRM cache rebuild failed for project ${activeProject.slug}:`, err);
              adminSupabase.from("crm_cache_dirty_queue").upsert({
                project_id: activeProject.id,
                is_dirty: true,
                updated_at: new Date().toISOString()
              });
            });
          }
        } else {
          console.warn("⚠️ QStash credentials are not configured in environment variables. Falling back to local asynchronous cache rebuild.");
          rebuildProjectCache(activeProject.id, activeProject.slug).catch((err) => {
            console.error(`Background CRM cache rebuild failed for project ${activeProject.slug}:`, err);
            // Re-mark as dirty so it tries again on next request
            adminSupabase.from("crm_cache_dirty_queue").upsert({
              project_id: activeProject.id,
              is_dirty: true,
              updated_at: new Date().toISOString()
            }).then(({ error }) => {
              if (error) console.error("Failed to re-mark cache as dirty:", error.message);
            });
          });
        }
      }
    }
    const cacheCheckEnd = performance.now();
    const cacheCheckMs = cacheCheckEnd - cacheCheckStart;

    // Get diagnostics issues and data health from pre-calculated cache queue metadata
    const { data: refreshedQueue } = await adminSupabase
      .from("crm_cache_dirty_queue")
      .select("metadata")
      .eq("project_id", activeProject.id)
      .maybeSingle();
    
    const cachedMetadata = refreshedQueue?.metadata || {};
    const dataHealth = cachedMetadata.dataHealth || { leadsWithoutUuidCount: 0, ordersWithAmountAndClickStatusCount: 0, unparseableMetadataDatesCount: 0 };
    const diagnosticsIssues = cachedMetadata.diagnosticsIssues || { nameless: [], unmatchedUrls: [], currencyErrors: [] };

    // --- Query crm_leads_cache for paginated leads ---
    let query = adminSupabase
      .from("crm_leads_cache")
      .select("*", { count: "exact" })
      .eq("project_id", activeProject.id);

    // Apply exact same filters to aggregated light rows query
    let aggQuery = adminSupabase
      .from("crm_leads_cache")
      .select("usd_paid, uah_paid, eur_paid, usd_tripwire_paid, uah_tripwire_paid, eur_tripwire_paid, usd_course_count, uah_course_count, eur_course_count, usd_tripwire_count, uah_tripwire_count, eur_tripwire_count, status, utm_source, utm_medium, utm_campaign, utm_content, target_sheet, visited_landings, created_at, is_unpaid_intent, touch_count")
      .eq("project_id", activeProject.id);

    if (isSalesFiltered) {
      query = query.eq("assigned_manager_id", user.id);
      aggQuery = aggQuery.eq("assigned_manager_id", user.id);
    }

    const searchQuery = filters?.searchQuery || "";
    const statusFilter = filters?.statusFilter || "all";
    const touchCountFilter = filters?.touchCountFilter || "all";
    const sourceFilter = filters?.sourceFilter || "all";
    const unpaidIntentOnly = filters?.unpaidIntentOnly || false;
    const startDate = filters?.startDate || "";
    const endDate = filters?.endDate || "";
    const selectedLanding = filters?.selectedLanding || "all";

    // Build filter statements
    if (searchQuery) {
      const q = `%${searchQuery}%`;
      query = query.or(`name.ilike.${q},phone.ilike.${q},telegram.ilike.${q},email.ilike.${q}`);
      aggQuery = aggQuery.or(`name.ilike.${q},phone.ilike.${q},telegram.ilike.${q},email.ilike.${q}`);
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
      aggQuery = aggQuery.eq("status", statusFilter);
    }
    if (touchCountFilter !== "all") {
      if (touchCountFilter === "multi") {
        query = query.gte("touch_count", 2);
        aggQuery = aggQuery.gte("touch_count", 2);
      } else if (touchCountFilter === "single") {
        query = query.eq("touch_count", 1);
        aggQuery = aggQuery.eq("touch_count", 1);
      }
    }
    if (sourceFilter !== "all") {
      if (sourceFilter === "unassigned") {
        const { data: projectFunnels } = await adminSupabase
          .from("funnels")
          .select("*")
          .eq("project_id", activeProject.id);
        const funnels = projectFunnels || [];
        
        let q = query;
        let aq = aggQuery;
        funnels.forEach(funnel => {
          const campaignIds = funnel.campaign_ids || [];
          const landingSlugs = funnel.landing_slugs || [];
          campaignIds.forEach((c: string) => {
            if (c.trim()) {
              q = q.not("utm_campaign", "ilike", `%${c.trim()}%`);
              aq = aq.not("utm_campaign", "ilike", `%${c.trim()}%`);
            }
          });
          landingSlugs.forEach((s: string) => {
            if (s.trim()) {
              q = q.not("page_path", "ilike", `%${s.trim()}%`);
              q = q.not("page_url", "ilike", `%${s.trim()}%`);
              aq = aq.not("page_path", "ilike", `%${s.trim()}%`);
              aq = aq.not("page_url", "ilike", `%${s.trim()}%`);
            }
          });
        });
        query = q;
        aggQuery = aq;
      } else {
        const { data: funnel } = await adminSupabase
          .from("funnels")
          .select("*")
          .eq("id", sourceFilter)
          .maybeSingle();

        if (funnel) {
          const campaignIds = funnel.campaign_ids || [];
          const landingSlugs = funnel.landing_slugs || [];

          const orConditions: string[] = [];
          
          campaignIds.forEach((c: string) => {
            if (c.trim()) orConditions.push(`utm_campaign.ilike.%${c.trim()}%`);
          });

          landingSlugs.forEach((s: string) => {
            if (s.trim()) {
              orConditions.push(`page_path.ilike.%${s.trim()}%`);
              orConditions.push(`page_url.ilike.%${s.trim()}%`);
            }
          });

          const funnelName = funnel.name ? funnel.name.trim() : "";
          if (funnelName) {
            orConditions.push(`target_sheet.ilike.%${funnelName}%`);
          }

          if (orConditions.length > 0) {
            query = query.or(orConditions.join(","));
            aggQuery = aggQuery.or(orConditions.join(","));
          } else {
            query = query.eq("id", "00000000-0000-0000-0000-000000000000");
            aggQuery = aggQuery.eq("id", "00000000-0000-0000-0000-000000000000");
          }
        } else {
          // Fallback to legacy target_sheet filter
          query = query.eq("target_sheet", sourceFilter);
          aggQuery = aggQuery.eq("target_sheet", sourceFilter);
        }
      }
    }
    if (unpaidIntentOnly) {
      query = query.eq("is_unpaid_intent", true);
      aggQuery = aggQuery.eq("is_unpaid_intent", true);
    }
    if (startDate) {
      const startStr = parseClientDateRange(startDate, false).toISOString();
      query = query.gte("created_at", startStr);
      aggQuery = aggQuery.gte("created_at", startStr);
    }
    if (endDate) {
      const endStr = parseClientDateRange(endDate, true).toISOString();
      query = query.lte("created_at", endStr);
      aggQuery = aggQuery.lte("created_at", endStr);
    }
    if (selectedLanding !== "all") {
      query = query.contains("visited_landings", [selectedLanding]);
      aggQuery = aggQuery.contains("visited_landings", [selectedLanding]);
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const dbQueryStart = performance.now();
    const [leadsRes, aggLeadsRes, trafficSummaryRes, costsRes, allProfilesRes, utmLeadsSummaryRes, funnelsRes, campaignsRes] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to),
      (async () => {
        const { data, count, error } = await aggQuery.range(0, 999);
        if (error || !data) return { data: [], count: 0 };
        if (!count || count <= 1000) return { data, count };

        const pagesCount = Math.ceil(count / 1000);
        const tasks = [];
        for (let i = 1; i < pagesCount; i++) {
          const fromIdx = i * 1000;
          const toIdx = fromIdx + 999;
          tasks.push(aggQuery.range(fromIdx, toIdx));
        }

        const results = await Promise.all(tasks);
        const allRows = [...data];
        for (const res of results) {
          if (res.data) allRows.push(...res.data);
        }
        return { data: allRows, count };
      })(),
      (() => {
        if (filters?.skipTraffic) return Promise.resolve({ data: [], error: null } as any);
        return adminSupabase.rpc("get_traffic_clicks_summary", {
          p_project_id: activeProject.id,
          p_start_date: startDate ? parseClientDateRange(startDate, false).toISOString() : null,
          p_end_date: endDate ? parseClientDateRange(endDate, true).toISOString() : null
        });
      })(),
      (() => {
        let q = adminSupabase
          .from("daily_traffic_and_costs")
          .select("date, campaign_name, campaign_id, spend_usd, spend")
          .eq("project_id", activeProject.id);
        if (startDate) {
          q = q.gte("date", startDate);
        }
        if (endDate) {
          q = q.lte("date", endDate);
        }
        return q.order("date", { ascending: false });
      })(),
      adminSupabase.from("profiles").select("id, email, full_name"),
      adminSupabase.rpc("get_utm_leads_summary", {
        p_project_id: activeProject.id,
        p_search_query: searchQuery,
        p_status_filter: statusFilter,
        p_touch_count_filter: touchCountFilter,
        p_source_filter: sourceFilter,
        p_unpaid_intent_only: unpaidIntentOnly,
        p_start_date: startDate ? parseClientDateRange(startDate, false).toISOString() : null,
        p_end_date: endDate ? parseClientDateRange(endDate, true).toISOString() : null,
        p_selected_landing: selectedLanding,
        p_assigned_manager_id: isSalesFiltered ? user.id : null
      }),
      adminSupabase.from("funnels").select("*").eq("project_id", activeProject.id),
      adminSupabase.rpc("get_campaigns_summary")
    ]);
    const dbQueryEnd = performance.now();
    const dbQueryMs = dbQueryEnd - dbQueryStart;

    if (leadsRes.error) throw leadsRes.error;

    const funnelsList = funnelsRes.data || [];
    const rawPaginatedLeads = leadsRes.data || [];
    const paginatedLeads = rawPaginatedLeads.map((lead: any) => {
      const matchedFunnel = matchLeadToFunnel(lead, funnelsList);
      return {
        ...lead,
        funnelId: matchedFunnel ? matchedFunnel.id : null,
        funnelName: matchedFunnel ? matchedFunnel.name : null
      };
    });
    const totalCount = leadsRes.count || aggLeadsRes.count || 0;
    const costs = costsRes.data || [];
    
    // Consolidate campaigns from both get_campaigns_summary and daily_traffic_and_costs
    const campaignMap = new Map<string, any>();
    const rpcCampaigns = (campaignsRes.data || []).filter((c: any) => c.project_slug === activeProject.slug);
    rpcCampaigns.forEach((c: any) => {
      const name = String(c.campaign_name || "").trim();
      if (name) {
        campaignMap.set(name, {
          campaign_name: name,
          campaign_id: c.campaign_id,
          spend: Number(c.spend || 0),
          clicks: Number(c.clicks || 0),
          impressions: Number(c.impressions || 0),
          leads_count: Number(c.leads_count || 0),
          sales: Number(c.sales || 0),
          profit: Number(c.profit || 0),
          roi: Number(c.roi || 0)
        });
      }
    });

    costs.forEach((c: any) => {
      const name = String(c.campaign_name || "").trim();
      if (name && !campaignMap.has(name)) {
        campaignMap.set(name, {
          campaign_name: name,
          campaign_id: c.campaign_id,
          spend: Number(c.spend_usd || c.spend || 0),
          clicks: 0,
          impressions: 0,
          leads_count: 0,
          sales: 0,
          profit: 0,
          roi: 0
        });
      }
    });

    const campaignsData = Array.from(campaignMap.values());
    const profilesList = allProfilesRes.data || [];

    const aggLeads = aggLeadsRes.data || [];

    // Calculate aggregated metrics from aggLeads
    const totalLeads = totalCount || aggLeads.length;

    let totalApplications = 0;
    let usdCourseRevenue = 0;
    let uahCourseRevenue = 0;
    let eurCourseRevenue = 0;
    let usdTripwireRevenue = 0;
    let uahTripwireRevenue = 0;
    let eurTripwireRevenue = 0;

    let usdCourseCount = 0;
    let uahCourseCount = 0;
    let eurCourseCount = 0;
    let usdTripwireCount = 0;
    let uahTripwireCount = 0;
    let eurTripwireCount = 0;

    aggLeads.forEach((l: any) => {
      // Calculate applications (leads that filled form or paid)
      if (l.status !== "Клик" && l.status !== "КликФормы") {
        totalApplications++;
      }

      usdCourseRevenue += Number(l.usd_paid || 0);
      uahCourseRevenue += Number(l.uah_paid || 0);
      eurCourseRevenue += Number(l.eur_paid || 0);
      
      usdTripwireRevenue += Number(l.usd_tripwire_paid || 0);
      uahTripwireRevenue += Number(l.uah_tripwire_paid || 0);
      eurTripwireRevenue += Number(l.eur_tripwire_paid || 0);

      usdCourseCount += Number(l.usd_course_count || 0);
      uahCourseCount += Number(l.uah_course_count || 0);
      eurCourseCount += Number(l.eur_course_count || 0);
      usdTripwireCount += Number(l.usd_tripwire_count || 0);
      uahTripwireCount += Number(l.uah_tripwire_count || 0);
      eurTripwireCount += Number(l.eur_tripwire_count || 0);
    });

    const paidLeadsCount = usdCourseCount + uahCourseCount + eurCourseCount;
    const paidTripwiresCount = usdTripwireCount + uahTripwireCount + eurTripwireCount;
    const totalSales = paidLeadsCount + paidTripwiresCount;

    const totalUsdRevenue = usdCourseRevenue + usdTripwireRevenue;
    const totalUahRevenue = uahCourseRevenue + uahTripwireRevenue;
    const totalEurRevenue = eurCourseRevenue + eurTripwireRevenue;

    const usdSalesCount = usdCourseCount + usdTripwireCount;
    const uahSalesCount = uahCourseCount + uahTripwireCount;
    const eurSalesCount = eurCourseCount + eurTripwireCount;

    const aovUsd = usdSalesCount > 0 ? totalUsdRevenue / usdSalesCount : 0;
    const aovUah = uahSalesCount > 0 ? totalUahRevenue / uahSalesCount : 0;
    const aovEur = eurSalesCount > 0 ? totalEurRevenue / eurSalesCount : 0;

    // Filter costs
    const filteredCosts = costs.filter((c: any) => {
      if (startDate) {
        const cDate = parseClientDateRange(c.date, false);
        const start = parseClientDateRange(startDate, false);
        if (cDate < start) return false;
      }
      if (endDate) {
        const cDate = parseClientDateRange(c.date, true);
        const end = parseClientDateRange(endDate, true);
        if (cDate > end) return false;
      }
      return true;
    });
    const totalCostsSpend = filteredCosts.reduce((sum: number, c: any) => sum + Number(c.spend_usd || c.spend || 0), 0);

    // Helper for robust case-insensitive paid status detection
    const isPaidOrderStatus = (status: string) => {
      const s = String(status || "").toLowerCase().trim();
      return (
        ["closed_won", "approved", "aprooved", "paid", "success", "оплачено", "completed", "купив курс", "купив_курс", "купив трипвайєр", "купив трипвайер", "купив(-ла) трипвайер", "оплачено полностью"].includes(s) ||
        s.includes("оплач") ||
        s.includes("approved") ||
        s.includes("closed_won")
      );
    };

    let rawPaidOrdersQuery = adminSupabase
      .from("unified_orders")
      .select("id, amount, created_at, status, metadata")
      .eq("project_id", activeProject.id)
      .gt("amount", 0);

    if (startDate) {
      const startStr = parseClientDateRange(startDate, false).toISOString();
      rawPaidOrdersQuery = rawPaidOrdersQuery.gte("created_at", startStr);
    }
    if (endDate) {
      const endStr = parseClientDateRange(endDate, true).toISOString();
      rawPaidOrdersQuery = rawPaidOrdersQuery.lte("created_at", endStr);
    }

    const { data: rawPaidOrders } = await rawPaidOrdersQuery;
    const paidOrders = (rawPaidOrders || []).filter((o: any) => isPaidOrderStatus(o.status));

    const { getExchangeRates } = await import("@/lib/exchange-rate");
    const todayRates = await getExchangeRates();

    const missingDates = Array.from(
      new Set(
        (paidOrders || [])
          .filter((o: any) => !o.metadata?.usd_rate || !o.metadata?.usd_amount)
          .map((o: any) => o.created_at ? o.created_at.split("T")[0] : null)
          .filter(Boolean)
      )
    ) as string[];

    const localRateMap: Record<string, any> = {};
    if (missingDates.length > 0) {
      await Promise.all(
        missingDates.map(async (d) => {
          localRateMap[d] = await getExchangeRates(d);
        })
      );
    }

    let blendedCourseRevenueUsd = 0;
    let blendedCourseRevenueUah = 0;
    let blendedTripwireRevenueUsd = 0;
    let blendedTripwireRevenueUah = 0;
    let exactCourseCount = 0;
    let exactTripwireCount = 0;

    (paidOrders || []).forEach((o: any) => {
      const amount = Number(o.amount || 0);
      const currency = String(o.metadata?.currency || o.metadata?.lead?.currency || o.metadata?.raw_row?.currency || activeProject.default_currency || "uah").toLowerCase().trim();
      const dateStr = o.created_at ? o.created_at.split("T")[0] : "";
      
      const usdRate = Number(o.metadata?.usd_rate) || (dateStr && localRateMap[dateStr]?.usdRate) || todayRates.usdRate;
      const eurToUsd = Number(o.metadata?.eur_to_usd) || (dateStr && localRateMap[dateStr]?.eurToUsd) || todayRates.eurToUsd;
      const eurRate = usdRate * eurToUsd;

      let usdVal = amount;
      let uahVal = amount;

      if (Number(o.metadata?.usd_amount) > 0 && Number(o.metadata?.uah_amount) > 0) {
        usdVal = Number(o.metadata.usd_amount);
        uahVal = Number(o.metadata.uah_amount);
      } else {
        if (currency === 'uah' || currency === '₴') {
          usdVal = amount / usdRate;
          uahVal = amount;
        } else if (currency === 'eur' || currency === '€') {
          usdVal = amount * eurToUsd;
          uahVal = amount * eurRate;
        } else {
          usdVal = amount;
          uahVal = amount * usdRate;
        }
      }

      const origSheetLower = String(o.metadata?.original_sheet || o.metadata?.target_sheet || "").toLowerCase();
      const tariffLower = String(
        o.metadata?.raw_row?.tariffName ||
        o.metadata?.raw_row?.raw_payload?.tariffName ||
        o.metadata?.tariff ||
        o.metadata?.offer_title ||
        ""
      ).toLowerCase();
      const pagePathLower = String(o.metadata?.page_path || o.metadata?.raw_row?.page_path || "").toLowerCase();

      const isTripwire = 
        ['sofia', 'valeria'].includes(activeProject.slug) ||
        o.status === "Купив(-ла) Трипвайер" ||
        pagePathLower.includes("minicourse") ||
        pagePathLower.includes("intensive") ||
        pagePathLower.includes("tripwire") ||
        pagePathLower.includes("practicum") ||
        tariffLower.includes("міні-курс") ||
        tariffLower.includes("мини-курс") ||
        tariffLower.includes("трипвайер") ||
        tariffLower.includes("трипваер") ||
        origSheetLower.includes("практикум") ||
        origSheetLower.includes("міні-курс") ||
        origSheetLower.includes("мини-курс") ||
        (currency === 'uah' && amount <= 2500) ||
        (currency === 'usd' && amount <= 60) ||
        (currency === 'eur' && amount <= 60);

      if (isTripwire) {
        blendedTripwireRevenueUsd += usdVal;
        blendedTripwireRevenueUah += uahVal;
        exactTripwireCount++;
      } else {
        blendedCourseRevenueUsd += usdVal;
        blendedCourseRevenueUah += uahVal;
        exactCourseCount++;
      }
    });

    const totalBlendedRevenueUsd = blendedCourseRevenueUsd + blendedTripwireRevenueUsd;
    const totalBlendedRevenueUah = blendedCourseRevenueUah + blendedTripwireRevenueUah;
    const exactTotalSales = exactCourseCount + exactTripwireCount;

    const blendedProfitUsd = totalBlendedRevenueUsd - totalCostsSpend;
    const blendedProfitUah = totalBlendedRevenueUah - (totalCostsSpend * todayRates.usdRate);

    const effectiveSalesCount = exactTotalSales > 0 ? exactTotalSales : (paidLeadsCount + paidTripwiresCount);
    const blendedAovUsd = effectiveSalesCount > 0 ? totalBlendedRevenueUsd / effectiveSalesCount : 0;
    const blendedAovUah = effectiveSalesCount > 0 ? totalBlendedRevenueUah / effectiveSalesCount : 0;

    const roi = totalCostsSpend > 0 ? (totalBlendedRevenueUsd / totalCostsSpend) * 100 : 0;

    // Clicks summary
    const groupedTraffic = trafficSummaryRes.data || [];
    const totalClicks = groupedTraffic.reduce((sum: number, t: any) => sum + Number(t.clicks_count || 0), 0);

    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    const cpl = totalLeads > 0 ? totalCostsSpend / totalLeads : 0;
    const leadToSaleConv = totalLeads > 0 ? (effectiveSalesCount / totalLeads) * 100 : 0;

    const singleProjectStats = {
      totalLeads,
      totalClicks,
      totalSpend: totalCostsSpend,
      totalApplications,
      conversionRate,
      cpl,
      usdRevenue: totalBlendedRevenueUsd,
      uahRevenue: totalBlendedRevenueUah,
      eurRevenue: totalEurRevenue,
      usdCourseRevenue: blendedCourseRevenueUsd,
      uahCourseRevenue: blendedCourseRevenueUah,
      eurCourseRevenue,
      usdTripwireRevenue: blendedTripwireRevenueUsd,
      uahTripwireRevenue: blendedTripwireRevenueUah,
      eurTripwireRevenue,
      netProfitUsd: blendedProfitUsd,
      roi,
      totalSales: effectiveSalesCount,
      paidLeadsCount: exactCourseCount > 0 ? exactCourseCount : paidLeadsCount,
      paidTripwiresCount: exactTripwireCount > 0 ? exactTripwireCount : paidTripwiresCount,
      leadToSaleConv,
      leadToSaleConvUsd: totalLeads > 0 ? (usdSalesCount / totalLeads) * 100 : 0,
      leadToSaleConvUah: totalLeads > 0 ? (uahSalesCount / totalLeads) * 100 : 0,
      leadToSaleConvEur: totalLeads > 0 ? (eurSalesCount / totalLeads) * 100 : 0,
      aovUsd: blendedAovUsd,
      aovUah: blendedAovUah,
      aovEur
    };

    // Spline Trend Data via RPC
    let splineTrendData = [];
    let dbRpcMs = 0;
    if (!filters?.skipTraffic) {
      const startRpcDate = startDate ? parseClientDateRange(startDate, false) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endRpcDate = endDate ? parseClientDateRange(endDate, true) : new Date();
      const dbRpcStart = performance.now();
      const { data } = await adminSupabase.rpc("get_project_daily_stats", {
        p_project_id: activeProject.id,
        p_start_date: startRpcDate.toISOString(),
        p_end_date: endRpcDate.toISOString()
      });
      splineTrendData = (data || []).map((row: any) => ({
        name: row.date_str,
        leads: Number(row.leads_count || 0),
        clicks: Number(row.clicks_count || 0)
      }));
      const dbRpcEnd = performance.now();
      dbRpcMs = dbRpcEnd - dbRpcStart;
    }

    // Map manager names and format keys for paginated leads to support camelCase in client components
    const leads = paginatedLeads.map((lead: any) => {
      const manager = profilesList.find((p) => p.id === lead.assigned_manager_id);
      const managerName = manager ? (manager.full_name || manager.email) : "";
      return {
        ...lead,
        primaryCustomerId: lead.primary_customer_id,
        customerIds: lead.customer_ids,
        orderIds: lead.order_ids,
        touchCount: lead.touch_count,
        usdPaid: Number(lead.usd_paid || 0),
        uahPaid: Number(lead.uah_paid || 0),
        eurPaid: Number(lead.eur_paid || 0),
        usdTripwirePaid: Number(lead.usd_tripwire_paid || 0),
        uahTripwirePaid: Number(lead.uah_tripwire_paid || 0),
        eurTripwirePaid: Number(lead.eur_tripwire_paid || 0),
        usdAttempted: Number(lead.usd_attempted || 0),
        uahAttempted: Number(lead.uah_attempted || 0),
        eurAttempted: Number(lead.eur_attempted || 0),
        usdCourseCount: lead.usd_course_count || 0,
        uahCourseCount: lead.uah_course_count || 0,
        eurCourseCount: lead.eur_course_count || 0,
        usdTripwireCount: lead.usd_tripwire_count || 0,
        uahTripwireCount: lead.uah_tripwire_count || 0,
        eurTripwireCount: lead.eur_tripwire_count || 0,
        diagnosticsComment: lead.diagnostics_comment || "",
        managerComment: lead.manager_comment || "",
        assignedManagerId: lead.assigned_manager_id || null,
        assigned_manager_name: managerName,
        utmSource: lead.utm_source || "",
        utmMedium: lead.utm_medium || "",
        utmCampaign: lead.utm_campaign || "",
        utmContent: lead.utm_content || "",
        utmTerm: lead.utm_term || "",
        targetSheet: lead.target_sheet || "",
        isUnpaidIntent: lead.is_unpaid_intent || false,
        visitedLandings: lead.visited_landings || [],
        isMultiSource: lead.is_multi_source || false,
        tags: lead.tags || [],
        createdAt: lead.created_at,
        visitor_uuid: lead.visitor_uuid
      };
    });

    // Run diagnostics check nameless leads in cache directly (very fast count)
    const { data: namelessRows } = await adminSupabase
      .from("crm_leads_cache")
      .select("id, name, phone, telegram")
      .eq("project_id", activeProject.id)
      .eq("name", "Невідомий")
      .not("phone", "is", null)
      .limit(100);
    diagnosticsIssues.nameless = namelessRows || [];

    // --- UTM Attribution Tree (Optimized) ---
    const utmTreeRoot: Record<string, any> = {};
    const getOrCreateUtmNode = (parent: any, name: string) => {
      if (!parent[name]) {
        parent[name] = {
          name,
          clicks: 0,
          leads: 0,
          usd_revenue: 0,
          uah_revenue: 0,
          revenue: 0,
          children: {}
        };
      }
      return parent[name];
    };

    // Populate tree with leads summary
    const utmLeadsSummary = utmLeadsSummaryRes.data || [];
    utmLeadsSummary.forEach((row: any) => {
      const source = row.utm_source || "direct";
      const medium = row.utm_medium || "";
      const campaign = row.utm_campaign || "";
      const content = row.utm_content || "";

      const path = [source, medium, campaign, content].filter(Boolean);
      let curr = utmTreeRoot;
      path.forEach((part) => {
        const node = getOrCreateUtmNode(curr, part);
        node.leads += Number(row.leads_count || 0);
        node.usd_revenue += Number(row.usd_revenue || 0);
        node.uah_revenue += Number(row.uah_revenue || 0);
        node.revenue += Number(row.usd_revenue || 0) + (Number(row.uah_revenue || 0) / 41.0);
        curr = node.children;
      });
    });

    // Populate tree with clicks
    groupedTraffic.forEach((t: any) => {
      const source = t.utm_source || "direct";
      const medium = t.utm_medium || "";
      const campaign = t.utm_campaign || "";
      const content = t.utm_content || "";

      const path = [source, medium, campaign, content].filter(Boolean);
      let curr = utmTreeRoot;
      let possible = true;
      path.forEach((part) => {
        if (!possible) return;
        if (curr[part]) {
          curr[part].clicks += Number(t.clicks_count || 0);
          curr = curr[part].children;
        } else {
          possible = false;
        }
      });
    });

    const finalizeUtmNodes = (nodesRecord: Record<string, any>): any[] => {
      return Object.values(nodesRecord)
        .map((node: any) => {
          const cr = node.clicks > 0 ? (node.leads / node.clicks) * 100 : 0;
          return {
            ...node,
            cr,
            children: finalizeUtmNodes(node.children)
          };
        })
        .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
    };
    const utmAttributionTree = finalizeUtmNodes(utmTreeRoot);
    const uniqueSources = Array.from(new Set(utmLeadsSummary.map((l: any) => l.utm_source).filter(Boolean))) as string[];

    // Fetch sales managers for active project
    let salesManagers: { id: string; email: string; full_name: string }[] = [];
    if (activeProject && ["admin", "superman", "founder", "developer", "producer"].includes(profile.role)) {
      const { data: assignedSales } = await adminSupabase
        .from("profile_projects")
        .select("profile_id, profiles(id, email, role, full_name)")
        .eq("project_id", activeProject.id);

      salesManagers = (assignedSales || [])
        .map((item: any) => item.profiles)
        .filter((p: any) => p && p.role === "sales")
        .map((p: any) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name || p.email
        }));
    }

    const finalResult = {
      viewType: "single",
      role: profile.role,
      allowedProjects,
      activeSlug,
      activeProject,
      leads,
      totalCount,
      stats: singleProjectStats,
      splineTrendData: splineTrendData || [],
      utmAttributionTree,
      diagnosticsIssues,
      uniqueSources,
      salesManagers,
      unresolvedOrders: unresolvedOrders.filter((o) => o.projectId === activeProject.id),
      costs,
      campaignsData,
      filters: {
        page,
        pageSize,
        searchQuery,
        statusFilter,
        touchCountFilter,
        sourceFilter,
        unpaidIntentOnly,
        startDate,
        endDate,
        selectedLanding
      },
      dataHealth
    };

    const stringified = JSON.stringify(finalResult);
    const payloadSizeKb = Math.round((stringified.length / 1024) * 10) / 10;

    const totalDuration = cacheCheckMs + dbQueryMs + dbRpcMs;
    devLogger.perf("getUnifiedCRMData (Cached)", `Loaded Cached CRM Data for slug: ${activeSlug}`, totalDuration, {
      activeSlug,
      cacheCheckMs,
      dbQueryMs,
      dbRpcMs,
      payloadSizeKb,
      unresolvedOrdersCount: unresolvedOrders.length,
      leadsCount: finalResult.leads.length,
      skipTraffic: !!filters?.skipTraffic
    });

    return {
      ...finalResult,
      performance: {
        dbFetchMs: Math.round(cacheCheckMs),
        dbRpcMs: Math.round(dbRpcMs),
        jsClusteringMs: Math.round(dbQueryMs),
        cacheRebuildMs: Math.round(cacheRebuildMs),
        payloadSizeKb
      }
    };
  } catch (err: any) {
    devLogger.error("getUnifiedCRMData", `Failed to load CRM data: ${err.message}`, { error: err });
    console.error("Unified CRM fetching error:", err.message);
    throw err;
  }
}

// Server action to update a unified lead's status/stage
export async function updateUnifiedLeadStatusAction(orderId: string, newStatus: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch order first to check project_id for access validation
    const { data: order } = await adminSupabase
      .from("unified_orders")
      .select("project_id")
      .eq("id", orderId)
      .single();
    if (!order) throw new Error("Order not found");
    await checkProjectAccess(order.project_id);

    const { error } = await adminSupabase
      .rpc("update_lead_status_atomic", {
        p_order_id: orderId,
        p_project_id: order.project_id,
        p_new_status: newStatus
      });

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update lead status" };
  }
}

// Server action to manually create a new lead in unified system
export async function createUnifiedLeadAction(
  projectId: string,
  leadData: {
    name: string;
    phone: string;
    email?: string;
    telegram?: string;
    amount?: number;
    status: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Enforce access control
    await checkProjectAccess(projectId);

    // 1. Resolve or create customer inside unified_customers
    // First query if there is a match inside the same project
    let customerId = "";
    const cleanPhone = leadData.phone.replace(/\D/g, "");

    const { data: existingCust } = await adminSupabase
      .from("unified_customers")
      .select("id")
      .eq("project_id", projectId)
      .eq("phone", cleanPhone)
      .limit(1);

    if (existingCust && existingCust.length > 0) {
      customerId = existingCust[0].id;
    } else {
      // Create new customer profile
      const { data: newCust, error: custErr } = await adminSupabase
        .from("unified_customers")
        .insert({
          project_id: projectId,
          name: leadData.name,
          phone: cleanPhone || null,
          email: leadData.email || null,
          telegram: leadData.telegram || null,
        })
        .select()
        .single();

      if (custErr) throw custErr;
      customerId = newCust.id;
    }

    // 2. Insert the lead transaction into unified_orders
    const { data: order, error: orderErr } = await adminSupabase
      .from("unified_orders")
      .insert({
        customer_id: customerId,
        project_id: projectId,
        amount: leadData.amount || 0.0,
        status: leadData.status || "Зареєстровано",
        utm_source: leadData.utm_source || "manual",
        utm_medium: leadData.utm_medium || "crm",
        utm_campaign: leadData.utm_campaign || "manual_insertion",
        metadata: {
          created_by: user.email,
          manual: true,
        },
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    return { success: true, orderId: order.id };
  } catch (err: any) {
    return { error: err.message || "Failed to create lead" };
  }
}

export async function getDashboardData() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch privilege details using admin client
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") {
    throw new Error("Unauthorized");
  }

  // Verify access to bw_main project
  const { data: bwMainProj } = await adminSupabase
    .from("projects")
    .select("id")
    .eq("slug", "bw_main")
    .single();

  if (!bwMainProj) {
    throw new Error("Project bw_main not found");
  }
  await checkProjectAccess(bwMainProj.id);

  // 3. Fetch all leads, page views, and button clicks in parallel
  const [leadsRes, pageViewsRes, clicksRes] = await Promise.all([
    adminSupabase.from("leads").select("*").order("created_at", { ascending: false }),
    adminSupabase.from("page_views").select("visitor_id"),
    adminSupabase.from("button_clicks").select("button_id"),
  ]);

  if (leadsRes.error) throw leadsRes.error;
  if (pageViewsRes.error) throw pageViewsRes.error;
  if (clicksRes.error) throw clicksRes.error;

  return {
    leads: leadsRes.data || [],
    pageViews: pageViewsRes.data || [],
    clicks: clicksRes.data || [],
  };
}

export async function updateLeadStatus(
  leadId: string,
  newDbStatus: "new" | "in_progress" | "completed" | "rejected",
  newButtonId: string
) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch privilege details
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") {
    throw new Error("Unauthorized");
  }

  // Verify access to bw_main project
  const { data: bwMainProj } = await adminSupabase
    .from("projects")
    .select("id")
    .eq("slug", "bw_main")
    .single();

  if (!bwMainProj) {
    throw new Error("Project bw_main not found");
  }
  await checkProjectAccess(bwMainProj.id);

  // 3. Perform database update
  const { data, error } = await adminSupabase
    .from("leads")
    .update({
      status: newDbStatus,
      button_id: newButtonId,
    })
    .eq("id", leadId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return { success: true, lead: data };
}

// Server action to update customer manager comments
export async function updateCustomerCommentAction(customerId: string, comment: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch the existing customer comment and project_id for access validation
    const { data: customer, error: fetchError } = await adminSupabase
      .from("unified_customers")
      .select("project_id, manager_comment")
      .eq("id", customerId)
      .single();

    if (fetchError) throw fetchError;
    await checkProjectAccess(customer.project_id);

    const rawComment = customer?.manager_comment;
    let comments: any[] = [];

    if (rawComment) {
      try {
        const parsed = JSON.parse(rawComment);
        if (Array.isArray(parsed)) {
          comments = parsed;
        } else {
          throw new Error("Not an array");
        }
      } catch (e) {
        // Treat as legacy plain text comment
        comments = [{
          id: "legacy",
          text: rawComment,
          authorEmail: "system",
          authorName: "Попередній коментар",
          createdAt: new Date().toISOString()
        }];
      }
    }

    // Fetch the current user's profile for author details
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Construct the new comment object
    const newComment = {
      id: Math.random().toString(36).substring(2, 9),
      text: comment.trim(),
      authorEmail: profile?.email || user.email || "unknown",
      authorName: profile?.full_name || profile?.email || user.email || "Менеджер",
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);

    // Limit to 100 comments
    if (comments.length > 100) {
      comments = comments.slice(-100);
    }

    const updatedCommentStr = JSON.stringify(comments);

    const { error: updateError } = await adminSupabase
      .from("unified_customers")
      .update({ manager_comment: updatedCommentStr })
      .eq("id", customerId);

    if (updateError) throw updateError;

    return { success: true, managerComment: updatedCommentStr };
  } catch (err: any) {
    return { error: err.message || "Failed to update comment" };
  }
}

// Server action to assign a lead/customer to a sales manager
export async function assignLeadToManagerAction(customerId: string, managerId: string | null) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch customer to check project_id for access validation
    const { data: customer } = await adminSupabase
      .from("unified_customers")
      .select("project_id")
      .eq("id", customerId)
      .single();
    if (!customer) throw new Error("Customer not found");
    await checkProjectAccess(customer.project_id);

    // Verify target manager assignment access to project if target is not a Superman
    if (managerId) {
      const { data: managerProfile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", managerId)
        .single();

      const isSuperman = managerProfile?.role === "admin" || managerProfile?.role === "superman";

      if (!isSuperman) {
        const { data: hasAccess } = await adminSupabase
          .from("profile_projects")
          .select("project_id")
          .eq("profile_id", managerId)
          .eq("project_id", customer.project_id)
          .maybeSingle();

        if (!hasAccess) {
          throw new Error("Target manager does not have access to this project.");
        }
      }
    }

    const { error } = await adminSupabase
      .from("unified_customers")
      .update({ assigned_manager_id: managerId ? managerId : null })
      .eq("id", customerId);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to assign manager" };
  }
}

// Submit error report or improvement suggestion
export async function submitCrmFeedbackAction(type: "error" | "improvement", message: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Неавторизовано.");

    const { error } = await supabase
      .from("crm_feedback")
      .insert({
        user_id: user.id,
        user_email: user.email,
        type,
        message,
      });

    if (error) throw error;
    return { success: true, message: "Дякуємо! Ваш запит успішно надіслано." };
  } catch (err: any) {
    return { error: err.message || "Не вдалося надіслати запит." };
  }
}

// Retrieve feedback items (Only for yura3zaxar@gmail.com and yura3zaxar@outlook.com)
export async function getCrmFeedbackList() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (user.email !== "yura3zaxar@gmail.com" && user.email !== "yura3zaxar@outlook.com")) {
      throw new Error("403 Доступ заборонено.");
    }

    const { data, error } = await supabase
      .from("crm_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.error("Failed to load crm feedback:", err);
    return [];
  }
}

// Update feedback item status (Only for yura3zaxar@gmail.com and yura3zaxar@outlook.com)
export async function updateFeedbackStatusAction(feedbackId: string, status: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || (user.email !== "yura3zaxar@gmail.com" && user.email !== "yura3zaxar@outlook.com")) {
      throw new Error("403 Доступ заборонено.");
    }

    const { error } = await supabase
      .from("crm_feedback")
      .update({ status })
      .eq("id", feedbackId);

    if (error) throw error;
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update status." };
  }
}

// Server action to update currency of a transaction
export async function updateOrderCurrencyAction(
  orderId: string,
  currency: "usd" | "uah" | "eur",
  bulk?: { landingName: string; amount: number }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Fetch existing order metadata and project_id for access verification
    const { data: order, error: fetchError } = await adminSupabase
      .from("unified_orders")
      .select("project_id, metadata, amount, created_at")
      .eq("id", orderId)
      .single();

    if (fetchError) throw fetchError;
    await checkProjectAccess(order.project_id);

    const { getExchangeRates } = await import("@/lib/exchange-rate");
    const orderDateStr = order.created_at ? order.created_at.split("T")[0] : undefined;
    const rates = await getExchangeRates(orderDateStr);
    const amount = Number(order.amount || 0);

    let usdAmount = amount;
    let uahAmount = amount;

    const currencyLower = currency.toLowerCase().trim();
    if (currencyLower === 'uah' || currencyLower === '₴') {
      usdAmount = amount / rates.usdRate;
      uahAmount = amount;
    } else if (currencyLower === 'eur' || currencyLower === '€') {
      usdAmount = amount * rates.eurToUsd;
      uahAmount = amount * rates.eurRate;
    } else {
      usdAmount = amount;
      uahAmount = amount * rates.usdRate;
    }

    const newMetadata = {
      ...(order?.metadata || {}),
      currency: currency,
      usd_rate: Number(rates.usdRate.toFixed(4)),
      eur_to_usd: Number(rates.eurToUsd.toFixed(4)),
      usd_amount: Number(usdAmount.toFixed(2)),
      uah_amount: Number(uahAmount.toFixed(2))
    };

    const { error: updateError } = await adminSupabase
      .from("unified_orders")
      .update({ metadata: newMetadata })
      .eq("id", orderId);

    if (updateError) throw updateError;

    if (bulk && bulk.landingName) {
      const { data: matchingOrders } = await adminSupabase
        .from("unified_orders")
        .select("id, project_id, metadata, amount, created_at")
        .eq("amount", bulk.amount)
        .not("status", "in", "('Клик', 'КликФормы')");

      if (matchingOrders && matchingOrders.length > 0) {
        const toUpdate = matchingOrders.filter((o: any) => {
          const lName = o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "";
          return lName === bulk.landingName;
        });

        for (const orderToUpdate of toUpdate) {
          try {
            await checkProjectAccess(orderToUpdate.project_id);
            const oAmount = Number(orderToUpdate.amount || 0);
            const oDateStr = orderToUpdate.created_at ? orderToUpdate.created_at.split("T")[0] : undefined;
            const oRates = await getExchangeRates(oDateStr);

            let oUsdAmount = oAmount;
            let oUahAmount = oAmount;

            if (currencyLower === 'uah' || currencyLower === '₴') {
              oUsdAmount = oAmount / oRates.usdRate;
              oUahAmount = oAmount;
            } else if (currencyLower === 'eur' || currencyLower === '€') {
              oUsdAmount = oAmount * oRates.eurToUsd;
              oUahAmount = oAmount * oRates.eurRate;
            } else {
              oUsdAmount = oAmount;
              oUahAmount = oAmount * oRates.usdRate;
            }

            const updatedMeta = {
              ...(orderToUpdate.metadata || {}),
              currency: currency,
              usd_rate: Number(oRates.usdRate.toFixed(4)),
              eur_to_usd: Number(oRates.eurToUsd.toFixed(4)),
              usd_amount: Number(oUsdAmount.toFixed(2)),
              uah_amount: Number(oUahAmount.toFixed(2))
            };
            await adminSupabase
              .from("unified_orders")
              .update({ metadata: updatedMeta })
              .eq("id", orderToUpdate.id);
          } catch (accessErr) {
            console.warn(`Bulk currency update skipped for order ${orderToUpdate.id} due to project access restriction`);
          }
        }
      }
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update order currency." };
  }
}


export async function traceVisitorUuidAction(phoneOrUuid: string, projectId: string) {
  try {
    const { isSuperman } = await getSessionAndAccess();
    if (!isSuperman) throw new Error("Unauthorized");

    const adminSupabase = createAdminClient();
    const cleanInput = phoneOrUuid.trim();
    if (!cleanInput) return { chain: [] };

    let visitorUuids: string[] = [];
    let phoneMatch = "";

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(cleanInput)) {
      visitorUuids.push(cleanInput);
    } else {
      const digits = cleanInput.replace(/\D/g, "");
      if (digits.length >= 7) {
        phoneMatch = digits;
        const { data: orders } = await adminSupabase
          .from("unified_orders")
          .select("visitor_uuid, customer_id")
          .eq("project_id", projectId);

        const { data: customers } = await adminSupabase
          .from("unified_customers")
          .select("id, phone")
          .eq("project_id", projectId);

        const matchedCustomerIds = customers
          ?.filter(c => c.phone && c.phone.replace(/\D/g, "").includes(digits))
          .map(c => c.id) || [];

        if (orders) {
          orders.forEach(o => {
            if (o.visitor_uuid && (matchedCustomerIds.includes(o.customer_id))) {
              visitorUuids.push(o.visitor_uuid);
            }
          });
        }
      }
    }

    visitorUuids = Array.from(new Set(visitorUuids)).filter(Boolean);

    let clicks: any[] = [];
    let orders: any[] = [];

    if (visitorUuids.length > 0) {
      const [clicksRes, ordersRes] = await Promise.all([
        adminSupabase
          .from("traffic_clicks")
          .select("*")
          .eq("project_id", projectId)
          .in("visitor_uuid", visitorUuids),
        adminSupabase
          .from("unified_orders")
          .select("*")
          .eq("project_id", projectId)
          .in("visitor_uuid", visitorUuids)
      ]);
      clicks = clicksRes.data || [];
      orders = ordersRes.data || [];
    }

    if (phoneMatch) {
      const { data: customerData } = await adminSupabase
        .from("unified_customers")
        .select("id, phone")
        .eq("project_id", projectId);

      const matchedCustomerIds = customerData
        ?.filter(c => c.phone && c.phone.replace(/\D/g, "").includes(phoneMatch))
        .map(c => c.id) || [];

      if (matchedCustomerIds.length > 0) {
        const { data: phoneOrders } = await adminSupabase
          .from("unified_orders")
          .select("*")
          .eq("project_id", projectId)
          .in("customer_id", matchedCustomerIds);

        if (phoneOrders) {
          phoneOrders.forEach(o => {
            if (!orders.some(existing => existing.id === o.id)) {
              orders.push(o);
            }
          });
        }
      }
    }

    const chain: any[] = [];

    clicks.forEach(c => {
      chain.push({
        type: "click",
        id: c.id,
        created_at: c.created_at,
        status: c.status,
        utm_source: c.utm_source,
        utm_medium: c.utm_medium,
        utm_campaign: c.utm_campaign,
        utm_content: c.utm_content,
        utm_term: c.utm_term,
        page_path: c.page_path,
        page_url: c.page_url,
        visitor_uuid: c.visitor_uuid,
        is_broken: false,
      });
    });

    orders.forEach(o => {
      const isBroken = !o.visitor_uuid;
      chain.push({
        type: "order",
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        utm_source: o.utm_source,
        utm_medium: o.utm_medium,
        utm_campaign: o.utm_campaign,
        utm_content: o.utm_content,
        utm_term: o.utm_term,
        page_path: o.page_path,
        page_url: o.page_url,
        visitor_uuid: o.visitor_uuid,
        amount: o.amount,
        is_broken: isBroken,
        error_message: isBroken ? "Потерян трекер сессии" : null
      });
    });

    chain.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return { chain };
  } catch (err: any) {
    return { error: err.message || "Failed to trace visitor" };
  }
}

export async function getTrafficAnalyticsData(startDateStr: string, endDateStr: string, projectSlug: string) {
  try {
    const access = await getSessionAndAccess(projectSlug);
    const activeProject = access.allowedProjects.find((p) => p.slug === projectSlug);
    if (!activeProject) {
      throw new Error(`Project with slug ${projectSlug} not found or access denied`);
    }
    const projectId = activeProject.id;

    const supabase = await createClient();

    // 1. Fetch exchange rate dynamically from NBU (today's rate and historical rates in parallel)
    const { getExchangeRates } = await import("@/lib/exchange-rate");
    const todayRates = await getExchangeRates();

    // 2. Fetch daily spend records
    let costsQuery = supabase
      .from("daily_traffic_and_costs")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: false })
      .limit(5000);

    if (startDateStr) {
      costsQuery = costsQuery.gte("date", startDateStr);
    }
    if (endDateStr) {
      costsQuery = costsQuery.lte("date", endDateStr);
    }

    const { data: costsData, error: costsError } = await costsQuery;
    if (costsError) throw costsError;

    // 3. Fetch orders
    let ordersQuery = supabase
      .from("unified_orders")
      .select("id, amount, status, created_at, utm_campaign, utm_medium, utm_source, campaign_id, customer_id, metadata")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (startDateStr) {
      ordersQuery = ordersQuery.gte("created_at", `${startDateStr}T00:00:00Z`);
    }
    if (endDateStr) {
      ordersQuery = ordersQuery.lte("created_at", `${endDateStr}T23:59:59Z`);
    }

    const { data: ordersData, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    // Prefetch only unique order dates where UAH/EUR rates are missing in metadata
    const uniqueDates = Array.from(
      new Set(
        (ordersData || [])
          .filter((o: any) => {
            const currency = String(o.metadata?.currency || o.metadata?.lead?.currency || 'usd').toLowerCase().trim();
            if (currency === 'usd' || currency === '$') return false;
            // Only require rates if they are not already in metadata
            const hasRate = Number(o.metadata?.usd_rate) > 0 && Number(o.metadata?.eur_to_usd) > 0;
            return !hasRate;
          })
          .map((o: any) => o.created_at ? o.created_at.split("T")[0] : null)
          .filter(Boolean)
      )
    ) as string[];

    const rateMap: Record<string, { usdRate: number, eurRate: number, eurToUsd: number }> = {};
    if (uniqueDates.length > 0) {
      await Promise.all(
        uniqueDates.map(async (date) => {
          rateMap[date] = await getExchangeRates(date);
        })
      );
    }

    const closedWonStatuses = [
      'closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 
      'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер', 'оплачено полностью'
    ];

    const leadStatusesToExclude = ['Клик', 'КликФормы'];

    // Helper to convert amount to USD using historical rate map
    const getAmountInUsd = (amount: number, metadata: any, dateStr?: string) => {
      const currency = String(metadata?.currency || metadata?.lead?.currency || 'usd').toLowerCase();
      
      const metaUsdRate = Number(metadata?.usd_rate);
      const metaEurToUsd = Number(metadata?.eur_to_usd);

      const activeUsdRate = !isNaN(metaUsdRate) && metaUsdRate > 0 
        ? metaUsdRate 
        : (dateStr && rateMap[dateStr] ? rateMap[dateStr].usdRate : todayRates.usdRate);

      const activeEurToUsd = !isNaN(metaEurToUsd) && metaEurToUsd > 0
        ? metaEurToUsd
        : (dateStr && rateMap[dateStr] ? rateMap[dateStr].eurToUsd : todayRates.eurToUsd);

      if (currency === 'uah' || currency === '₴') {
        return amount / activeUsdRate;
      }
      if (currency === 'eur' || currency === '€') {
        return amount * activeEurToUsd;
      }
      return amount; // default to USD
    };

    // --- GROUP BY CAMPAIGN ---
    const campaignMap: Record<string, {
      campaign_id: string;
      campaign_name: string;
      spend: number;
      clicks: number;
      impressions: number;
      leads_count: number;
      sales: number;
      applications: number;
      consultations: number;
      usd_revenue: number;
      min_date: string;
      max_date: string;
    }> = {};

    (costsData || []).forEach(c => {
      const campId = c.campaign_id || "unknown";
      const dateStr = c.date;
      if (!campaignMap[campId]) {
        campaignMap[campId] = {
          campaign_id: campId,
          campaign_name: c.campaign_name || "Невідома кампанія",
          spend: 0,
          clicks: 0,
          impressions: 0,
          leads_count: 0,
          sales: 0,
          applications: 0,
          consultations: 0,
          usd_revenue: 0,
          min_date: dateStr || "",
          max_date: dateStr || ""
        };
      } else if (dateStr) {
        if (!campaignMap[campId].min_date || dateStr < campaignMap[campId].min_date) campaignMap[campId].min_date = dateStr;
        if (!campaignMap[campId].max_date || dateStr > campaignMap[campId].max_date) campaignMap[campId].max_date = dateStr;
      }
      campaignMap[campId].spend += Number(c.spend_usd || c.spend || 0);
      campaignMap[campId].clicks += Number(c.clicks || 0);
      campaignMap[campId].impressions += Number(c.impressions || 0);
    });

    const normSlug = (str: any) => String(str || "").toLowerCase().trim().replace(/%20/g, " ").replace(/[\s_\-\/\.\|\:\,\;\(\)]+/g, "");

    (ordersData || []).forEach((o: any) => {
      const rawUtm = String(o.utm_campaign || o.campaign_name || "").trim();

      const rawId = String(o.campaign_id || o.metadata?.campaign_id || "").trim();
      let matchedCampId: string | null = null;

      // Strategy 1: Direct ID match
      if (rawId && campaignMap[rawId]) {
        matchedCampId = rawId;
      } else if (rawUtm && campaignMap[rawUtm]) {
        matchedCampId = rawUtm;
      }

      // Strategy 2: Extract numeric Meta campaign ID from utm_campaign
      if (!matchedCampId && rawUtm) {
        const digitsMatch = rawUtm.match(/(\d{8,})/);
        if (digitsMatch && campaignMap[digitsMatch[1]]) {
          matchedCampId = digitsMatch[1];
        }
      }

      // Strategy 3: Normalized string slug exact match
      const normUtm = normSlug(rawUtm);
      if (!matchedCampId && normUtm) {
        for (const c of Object.values(campaignMap)) {
          const normName = normSlug(c.campaign_name);
          const normId = normSlug(c.campaign_id);
          if (normName === normUtm || normId === normUtm) {
            matchedCampId = c.campaign_id;
            break;
          }
        }
      }

      // Strategy 4: Substring / slug match
      if (!matchedCampId && normUtm) {
        for (const c of Object.values(campaignMap)) {
          const normName = normSlug(c.campaign_name);
          if (normName && (normUtm.includes(normName) || normName.includes(normUtm))) {
            matchedCampId = c.campaign_id;
            break;
          }
        }
      }

      // Strategy 5: Match to first active cost campaign if single active campaign
      if (!matchedCampId && Object.keys(campaignMap).length === 1) {
        matchedCampId = Object.keys(campaignMap)[0];
      }

      // Strategy 6: Fallback to lead's own utm_campaign name (or Meta Organic)
      const campId = matchedCampId || (rawUtm ? `custom_${normUtm}` : (Object.keys(campaignMap)[0] || "organic_meta"));
      const fallbackName = rawUtm || "Органічний трафік (Meta Direct)";

      const orderDate = o.created_at ? o.created_at.split('T')[0] : undefined;

      if (!campaignMap[campId]) {
        campaignMap[campId] = {
          campaign_id: campId,
          campaign_name: fallbackName,
          spend: 0,
          clicks: 0,
          impressions: 0,
          leads_count: 0,
          sales: 0,
          applications: 0,
          consultations: 0,
          usd_revenue: 0,
          min_date: orderDate || "",
          max_date: orderDate || ""
        };
      } else if (orderDate) {
        if (!campaignMap[campId].min_date || orderDate < campaignMap[campId].min_date) {
          campaignMap[campId].min_date = orderDate;
        }
        if (!campaignMap[campId].max_date || orderDate > campaignMap[campId].max_date) {
          campaignMap[campId].max_date = orderDate;
        }
      }


      const orderStatus = String(o.status || '').toLowerCase();
      const isLead = !leadStatusesToExclude.includes(o.status);
      const isSale = closedWonStatuses.includes(orderStatus);
      const amountUsd = getAmountInUsd(Number(o.amount || 0), o.metadata, orderDate);

      if (isLead) campaignMap[campId].leads_count += 1;
      if (isSale) {
        campaignMap[campId].sales += 1;
        campaignMap[campId].usd_revenue += amountUsd;
      }
      campaignMap[campId].applications += 1;
      if (orderStatus.includes('consult') || orderStatus.includes('консульт')) {
        campaignMap[campId].consultations += 1;
      }
    });

    // --- GROUP BY DATE ---
    const dailyMap: Record<string, {
      date: string;
      spend: number;
      clicks: number;
      impressions: number;
      leads_count: number;
      sales: number;
      applications: number;
      consultations: number;
      usd_revenue: number;
    }> = {};

    (costsData || []).forEach(c => {
      const dateStr = c.date || "unknown";
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          spend: 0,
          clicks: 0,
          impressions: 0,
          leads_count: 0,
          sales: 0,
          applications: 0,
          consultations: 0,
          usd_revenue: 0
        };
      }
      dailyMap[dateStr].spend += Number(c.spend_usd || c.spend || 0);
      dailyMap[dateStr].clicks += Number(c.clicks || 0);
      dailyMap[dateStr].impressions += Number(c.impressions || 0);
    });

    (ordersData || []).forEach(o => {
      const dateStr = o.created_at ? o.created_at.split('T')[0] : "unknown";
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          spend: 0,
          clicks: 0,
          impressions: 0,
          leads_count: 0,
          sales: 0,
          applications: 0,
          consultations: 0,
          usd_revenue: 0
        };
      }
      const orderStatus = String(o.status || '').toLowerCase();
      const isLead = !leadStatusesToExclude.includes(o.status);
      const isSale = closedWonStatuses.includes(orderStatus);
      const amountUsd = getAmountInUsd(Number(o.amount || 0), o.metadata, dateStr);

      if (isLead) dailyMap[dateStr].leads_count += 1;
      if (isSale) {
        dailyMap[dateStr].sales += 1;
        dailyMap[dateStr].usd_revenue += amountUsd;
      }
      dailyMap[dateStr].applications += 1;
      if (orderStatus.includes('consult') || orderStatus.includes('консульт')) {
        dailyMap[dateStr].consultations += 1;
      }
    });

    // Helper to calculate ratios and metrics
    const computeCalculatedFields = (item: any) => {
      const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
      const cpm = item.impressions > 0 ? (item.spend / item.impressions) * 1000 : 0;
      const cpc = item.clicks > 0 ? item.spend / item.clicks : 0;
      const siteCr = item.clicks > 0 ? (item.leads_count / item.clicks) * 100 : 0;
      const cpl = item.leads_count > 0 ? item.spend / item.leads_count : 0;
      const appCr = item.leads_count > 0 ? (item.applications / item.leads_count) * 100 : 0;
      const cpa = item.applications > 0 ? item.spend / item.applications : 0;
      const aov = item.sales > 0 ? item.usd_revenue / item.sales : 0;
      const roas = item.spend > 0 ? item.usd_revenue / item.spend : 0;
      const profit = item.usd_revenue - item.spend;

      return {
        ...item,
        ctr: Number(ctr.toFixed(2)),
        cpm: Number(cpm.toFixed(2)),
        cpc: Number(cpc.toFixed(2)),
        siteCr: Number(siteCr.toFixed(2)),
        cpl: Number(cpl.toFixed(2)),
        appCr: Number(appCr.toFixed(2)),
        cpa: Number(cpa.toFixed(2)),
        aov: Number(aov.toFixed(2)),
        roas: Number(roas.toFixed(2)),
        profit: Number(profit.toFixed(2))
      };
    };

    const campaigns = Object.values(campaignMap).map((item) => {
      const computed = computeCalculatedFields(item);
      const lastActiveDate = item.max_date ? new Date(item.max_date) : null;
      const today = new Date();
      const diffTime = lastActiveDate ? Math.abs(today.getTime() - lastActiveDate.getTime()) : Infinity;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const is_active = diffDays <= 3; // Active if had spend/activity in last 3 days
      
      return {
        ...computed,
        is_active,
        min_date: item.min_date || "",
        max_date: item.max_date || ""
      };
    });
    const daily = Object.values(dailyMap).map(computeCalculatedFields);

    // Sort campaigns by spend descending, daily by date descending
    campaigns.sort((a, b) => b.spend - a.spend);
    daily.sort((a, b) => b.date.localeCompare(a.date));

    // Compute totals
    const grandTotals = {
      spend: 0,
      clicks: 0,
      impressions: 0,
      leads_count: 0,
      sales: 0,
      applications: 0,
      consultations: 0,
      usd_revenue: 0
    };

    campaigns.forEach(c => {
      grandTotals.spend += c.spend;
      grandTotals.clicks += c.clicks;
      grandTotals.impressions += c.impressions;
      grandTotals.leads_count += c.leads_count;
      grandTotals.sales += c.sales;
      grandTotals.applications += c.applications;
      grandTotals.consultations += c.consultations;
      grandTotals.usd_revenue += c.usd_revenue;
    });

    const totals = computeCalculatedFields(grandTotals);

    return {
      campaigns,
      daily,
      totals,
      usdRate: todayRates.usdRate
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch traffic analytics data" };
  }
}

// ----------------------------------------------------
// NEW SERVER ACTIONS FOR CRM V3.1
// ----------------------------------------------------

export async function getCellsAction() {
  try {
    const adminSupabase = createAdminClient();
    let { data: cells, error } = await adminSupabase
      .from("cells")
      .select("*, profiles(email)")
      .order("name");

    if (error) throw error;

    const defaultCellNames = [
      "Слободянюк Саша",
      "Ставицкий Саша",
      "Уткин Дмитрий"
    ];

    const existingNames = (cells || []).map((c: any) => c.name);
    const missingNames = defaultCellNames.filter(name => !existingNames.includes(name));

    if (missingNames.length > 0) {
      for (const name of missingNames) {
        await adminSupabase.from("cells").insert({ name });
      }

      const { data: refetchedCells } = await adminSupabase
        .from("cells")
        .select("*, profiles(email)")
        .order("name");
      cells = refetchedCells || [];
    }

    return cells || [];
  } catch (err: any) {
    return { error: err.message || "Failed to fetch cells" };
  }
}

export async function createCellAction(name: string, leaderId: string) {
  try {
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("cells")
      .insert({ name, cell_leader_id: leaderId || null })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin");
    return { success: true, cell: data };
  } catch (err: any) {
    return { error: err.message || "Failed to create cell" };
  }
}

export async function createFunnelAction(
  projectId: string,
  name: string,
  startDate: string,
  campaignIds: string[],
  landingSlugs: string[],
  description?: string,
  endDate?: string | null,
  plannedRevenue?: number,
  plannedSpend?: number,
  stages?: any[]
) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("funnels")
      .insert({
        project_id: projectId,
        name,
        start_date: startDate,
        end_date: endDate || null,
        campaign_ids: campaignIds,
        landing_slugs: landingSlugs,
        description: description || "",
        planned_revenue: plannedRevenue || 0,
        planned_spend: plannedSpend || 0,
        stages: stages || []
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, funnel: data };
  } catch (err: any) {
    return { error: err.message || "Failed to create funnel" };
  }
}

export async function updateFunnelAction(
  projectId: string,
  funnelId: string,
  updates: {
    name: string;
    startDate: string;
    endDate?: string | null;
    campaignIds: string[];
    landingSlugs: string[];
    description?: string;
    plannedRevenue?: number;
    plannedSpend?: number;
    stages?: any[];
  }
) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("funnels")
      .update({
        name: updates.name,
        start_date: updates.startDate,
        end_date: updates.endDate || null,
        campaign_ids: updates.campaignIds,
        landing_slugs: updates.landingSlugs,
        description: updates.description || "",
        planned_revenue: updates.plannedRevenue || 0,
        planned_spend: updates.plannedSpend || 0,
        stages: updates.stages || []
      })
      .eq("id", funnelId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, funnel: data };
  } catch (err: any) {
    return { error: err.message || "Failed to update funnel" };
  }
}

export async function deleteFunnelAction(projectId: string, funnelId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("funnels")
      .delete()
      .eq("id", funnelId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete funnel" };
  }
}

export async function getFunnelsAction(projectId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data: funnels, error: funnelsErr } = await adminSupabase
      .from("funnels")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (funnelsErr) throw funnelsErr;

    const { data: transactions, error: txErr } = await adminSupabase
      .from("financial_transactions")
      .select("*")
      .eq("project_id", projectId)
      .not("funnel_id", "is", null);

    if (txErr) throw txErr;

    return {
      funnels: funnels || [],
      transactions: transactions || []
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch funnels" };
  }
}

export async function getDiscoveredPagesAction(projectId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    // 1. Fetch project info to get slug
    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, slug, name")
      .eq("id", projectId)
      .maybeSingle();

    const { data: dbPages } = await adminSupabase
      .from("discovered_pages")
      .select("*")
      .eq("project_id", projectId)
      .order("path", { ascending: true });

    // 2. Map existing pages
    const pagesMap = new Map<string, any>();

    (dbPages || []).forEach((p: any) => {
      const pathVal = p.path || p.slug || "/";
      pagesMap.set(pathVal, {
        id: p.id || `db-${pathVal}`,
        path: pathVal,
        slug: pathVal,
        title: p.title || pathVal,
        type: p.source === "external" ? "discovered" : "discovered",
        source: p.source || "auto"
      });
    });

    // 3. Merge with DEFAULT_PROJECT_LANDINGS
    if (project?.slug && DEFAULT_PROJECT_LANDINGS[project.slug]) {
      DEFAULT_PROJECT_LANDINGS[project.slug].forEach((land) => {
        const pathVal = land.path || "/";
        if (!pagesMap.has(pathVal)) {
          pagesMap.set(pathVal, {
            id: `default-${pathVal}`,
            path: pathVal,
            slug: pathVal,
            title: land.label || pathVal,
            type: "discovered",
            source: "config"
          });
        }
      });
    }

    // 4. Also discover distinct paths from crm_leads_cache
    const { data: cachePaths } = await adminSupabase
      .from("crm_leads_cache")
      .select("page_path, visited_landings")
      .eq("project_id", projectId)
      .limit(100);

    (cachePaths || []).forEach((c: any) => {
      if (c.page_path && typeof c.page_path === "string" && c.page_path.startsWith("/")) {
        if (!pagesMap.has(c.page_path)) {
          pagesMap.set(c.page_path, {
            id: `cache-${c.page_path}`,
            path: c.page_path,
            slug: c.page_path,
            title: c.page_path,
            type: "traffic",
            source: "leads"
          });
        }
      }
      if (Array.isArray(c.visited_landings)) {
        c.visited_landings.forEach((v: string) => {
          if (v && typeof v === "string" && v.startsWith("/")) {
            if (!pagesMap.has(v)) {
              pagesMap.set(v, {
                id: `cache-${v}`,
                path: v,
                slug: v,
                title: v,
                type: "traffic",
                source: "leads"
              });
            }
          }
        });
      }
    });

    // Fallback: If still empty, ensure at least "/" is present
    if (pagesMap.size === 0) {
      pagesMap.set("/", {
        id: "root-page",
        path: "/",
        slug: "/",
        title: "Головна сторінка (/)",
        type: "discovered",
        source: "auto"
      });
    }

    const pages = Array.from(pagesMap.values());
    return { success: true, pages };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch discovered pages" };
  }
}

const PROJECT_DOMAINS: Record<string, string> = {
  victoria: 'https://victoria-mc.vercel.app',
  sofia: 'https://sofifinsight.vercel.app',
  valeria: 'https://pix-ai-ua.vercel.app',
  svitlana: 'https://svitlanatape.vercel.app',
  clean_klinom: 'https://clean-klinom.vercel.app',
  vova_win: 'https://vova-win.club',
};

export async function syncProjectPagesAction(projectId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    const { data: project, error: projErr } = await adminSupabase
      .from("projects")
      .select("slug, name, api_key_hash")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr || !project) {
      throw new Error("Project not found");
    }

    const domain = PROJECT_DOMAINS[project.slug];
    if (!domain) {
      return { error: `No domain mapped for project slug: ${project.slug}` };
    }

    // Call the external pull endpoint with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    try {
      const targetUrl = `${domain}/api/discovered-pages`;
      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "x-api-key": project.api_key_hash || "",
          "Content-Type": "application/json"
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`External endpoint returned status: ${response.status}`);
      }

      const resBody = await response.json();
      if (!resBody || !Array.isArray(resBody.pages)) {
        throw new Error("Invalid response schema: pages array is required.");
      }

      if (resBody.pages.length === 0) {
        return { success: true, count: 0, message: "No active pages returned from external site." };
      }

      const upsertRows = resBody.pages.map((p: any) => {
        let pagePath = String(p.path || '').trim();
        if (pagePath && !pagePath.startsWith('/')) {
          pagePath = '/' + pagePath;
        }
        return {
          project_id: projectId,
          path: pagePath,
          title: p.title ? String(p.title).trim() : null,
          source: 'direct_register',
          last_seen_at: new Date().toISOString()
        };
      }).filter((r: any) => r.path);

      if (upsertRows.length > 0) {
        const { error: upsertErr } = await adminSupabase
          .from("discovered_pages")
          .upsert(upsertRows, { onConflict: "project_id,path" });

        if (upsertErr) {
          throw new Error(`Failed to save pages: ${upsertErr.message}`);
        }
      }

      return { success: true, count: upsertRows.length };

    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      throw new Error(`Connection to ${domain} failed: ${fetchErr.message}`);
    }

  } catch (err: any) {
    console.warn(`[Page Discovery Warning] Sync skipped for project ${projectId}:`, err.message);
    return { error: err.message || "Failed to synchronize pages" };
  }
}

export async function createTaskAction(
  projectId: string,
  funnelId: string | null,
  title: string,
  description: string,
  dueDate: string
) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("tasks")
      .insert({
        project_id: projectId,
        funnel_id: funnelId || null,
        title,
        description,
        due_date: dueDate,
        status: "TODO"
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, task: data };
  } catch (err: any) {
    return { error: err.message || "Failed to create task" };
  }
}

export async function getTasksAction(projectId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    
    // Fetch tasks
    const { data: tasks, error: tasksErr } = await adminSupabase
      .from("tasks")
      .select("*, funnels(name)")
      .eq("project_id", projectId)
      .order("due_date", { ascending: true });

    if (tasksErr) throw tasksErr;
    return tasks || [];
  } catch (err: any) {
    return { error: err.message || "Failed to fetch tasks" };
  }
}

export async function updateTaskStatusAction(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
  try {
    const adminSupabase = createAdminClient();
    const { data: task, error: fetchErr } = await adminSupabase
      .from("tasks")
      .select("project_id")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) throw new Error("Task not found");
    await checkProjectAccess(task.project_id);

    const { error: updateErr } = await adminSupabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);

    if (updateErr) throw updateErr;
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update task status" };
  }
}

export async function logTaskPostponementAction(
  taskId: string,
  newDueDate: string,
  reason: string
) {
  try {
    if (!reason || reason.trim().length < 10) {
      return { error: "Причина переносу повинна містити мінімум 10 символів." };
    }

    const adminSupabase = createAdminClient();
    const { data: task, error: fetchErr } = await adminSupabase
      .from("tasks")
      .select("id, project_id, due_date")
      .eq("id", taskId)
      .single();

    if (fetchErr || !task) throw new Error("Task not found");
    await checkProjectAccess(task.project_id);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Log the postponement
    const { error: logErr } = await adminSupabase
      .from("task_logs")
      .insert({
        task_id: taskId,
        changed_by: user.id,
        old_due_date: task.due_date,
        new_due_date: newDueDate,
        postponement_reason: reason
      });

    if (logErr) throw logErr;

    // 2. Update task due date
    const { error: updateErr } = await adminSupabase
      .from("tasks")
      .update({ due_date: newDueDate })
      .eq("id", taskId);

    if (updateErr) throw updateErr;

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to reschedule task" };
  }
}

export async function getTaskLogsAction(projectId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("task_logs")
      .select("*, tasks!inner(title, project_id), profiles(email)")
      .eq("tasks.project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err: any) {
    return { error: err.message || "Failed to fetch task postponement logs" };
  }
}

export async function getGlobalTaskLogsAction() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    
    // Auth check for founder/admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superman", "founder", "developer"].includes(profile.role)) {
      throw new Error("Forbidden");
    }

    const { data, error } = await adminSupabase
      .from("task_logs")
      .select("*, tasks!inner(title, project_id), profiles(email)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  } catch (err: any) {
    return { error: err.message || "Failed to fetch global task logs" };
  }
}

/**
 * Pings all satellite websites live, queries /api/v1/discovery or root domains,
 * discovers all routes/landings, and updates project status.
 */
export async function pingAllProjectsAction() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: projects, error: projErr } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active, cell_id");

    if (projErr) throw projErr;

    const { DEFAULT_PROJECT_LANDINGS } = await import("@/lib/projectLandings");

    const results = [];

    for (const proj of projects || []) {
      const slug = proj.slug;
      const defaultLandings = DEFAULT_PROJECT_LANDINGS[slug] || [];
      const rootUrl = defaultLandings[0]?.url || `https://${slug.replace(/_/g, "-")}.vercel.app`;
      const domain = rootUrl.replace(/\/$/, "");

      const start = performance.now();
      let isLive = false;
      let discoveredPages: any[] = [];
      let message = "";

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        let res = await fetch(`${domain}/api/v1/discovery`, {
          signal: controller.signal,
          headers: { "User-Agent": "BnW-CRM-Discovery/1.0" }
        });

        if (!res.ok && res.status === 404) {
          res = await fetch(`${domain}/api/discovery`, {
            signal: controller.signal,
            headers: { "User-Agent": "BnW-CRM-Discovery/1.0" }
          });
        }

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          isLive = true;
          if (Array.isArray(data.pages)) {
            discoveredPages = data.pages;
          }
          message = `Discovery OK (HTTP ${res.status})`;
        } else {
          const pingRes = await fetch(domain, { method: "HEAD", signal: AbortSignal.timeout(3500) });
          if (pingRes.ok || pingRes.status < 500) {
            isLive = true;
            message = `Domain alive (HTTP ${pingRes.status})`;
          } else {
            message = `HTTP ${pingRes.status}`;
          }
        }
      } catch (err: any) {
        try {
          const pingRes = await fetch(domain, { method: "HEAD", signal: AbortSignal.timeout(3500) });
          if (pingRes.ok || pingRes.status < 500) {
            isLive = true;
            message = `Domain alive (HTTP ${pingRes.status})`;
          } else {
            message = `Ping failed: ${err.name === "AbortError" ? "Timeout" : err.message}`;
          }
        } catch (subErr: any) {
          message = `Failed: ${err.name === "AbortError" ? "Timeout" : err.message}`;
        }
      }

      const latencyMs = Math.round(performance.now() - start);

      // Save discovered landings into DB if available
      if (isLive && discoveredPages.length > 0) {
        for (const p of discoveredPages) {
          const rawPath = p.path || p.url || "/";
          let normalizedPath = rawPath;
          if (rawPath.startsWith("http")) {
            try {
              normalizedPath = new URL(rawPath).pathname;
            } catch {
              normalizedPath = rawPath;
            }
          }
          if (!normalizedPath.startsWith("/")) normalizedPath = "/" + normalizedPath;
          normalizedPath = normalizedPath.toLowerCase();

          try {
            await adminSupabase.from("project_landings").upsert({
              project_id: proj.id,
              label: p.label || normalizedPath,
              url: p.url || `${domain}${normalizedPath}`,
              path: normalizedPath,
              type: p.type || "free",
              badge_color: p.badgeColor || "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
              parameters: p.parameters || [],
              is_active: true,
              last_ping_at: new Date().toISOString()
            }, { onConflict: "project_id,path" });
          } catch (landErr) {
            // Non-blocking fallback
          }
        }
      }

      results.push({
        id: proj.id,
        slug,
        name: proj.name,
        domain,
        isLive,
        status: isLive ? "live" : "unresponsive",
        latencyMs,
        discoveredCount: discoveredPages.length || defaultLandings.length,
        landings: discoveredPages.length > 0 ? discoveredPages : defaultLandings,
        message,
        lastPingAt: new Date().toISOString()
      });
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results
    };
  } catch (err: any) {
    return { error: err.message || "Failed to ping projects" };
  }
}

/**
 * Updates official project settings (name, cell_id, is_active, etc.)
 */
export async function updateProjectSettingsAction(
  projectId: string,
  payload: {
    name?: string;
    cell_id?: string | null;
    is_active?: boolean;
    default_currency?: string;
    target_currency?: string;
    expert_share_percent?: number;
  }
) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superman", "founder", "developer"].includes(profile.role)) {
      throw new Error("Only developers and founders can update project settings");
    }

    const { data: updated, error } = await adminSupabase
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, project: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update project settings" };
  }
}

/**
 * Fetches all accessible Meta Ad Accounts via Meta Graph API
 */
export async function getMetaAdAccountsAction() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const token = process.env.META_ACCESS_TOKEN;
    if (!token) throw new Error("META_ACCESS_TOKEN is not configured");

    const url = `https://graph.facebook.com/v25.0/me/adaccounts?fields=name,account_id,id,account_status,currency,amount_spent&limit=50&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error?.message || `Meta API HTTP ${res.status}`);
    }

    const json = await res.json();
    const accounts = json.data || [];

    // Also get current mappings from DB
    const { data: mappings } = await adminSupabase
      .from("ad_spend_mappings")
      .select("project_slug, rule_value");

    const mappingMap = new Map((mappings || []).map((m: any) => [m.project_slug, m.rule_value]));

    return {
      success: true,
      accounts: accounts.map((acc: any) => ({
        id: acc.id,
        accountId: acc.account_id,
        name: acc.name,
        currency: acc.currency,
        amountSpent: acc.amount_spent,
        status: acc.account_status
      })),
      mappings: Object.fromEntries(mappingMap)
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch Meta ad accounts" };
  }
}

/**
 * Fetches campaigns for a specific Meta Ad Account
 */
export async function getMetaAccountCampaignsAction(adAccountId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const token = process.env.META_ACCESS_TOKEN;
    if (!token) throw new Error("META_ACCESS_TOKEN is not configured");

    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const url = `https://graph.facebook.com/v25.0/${cleanAccountId}/campaigns?fields=id,name,status,effective_status,objective,created_time&limit=50&access_token=${token}`;

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error?.message || `Meta API HTTP ${res.status}`);
    }

    const json = await res.json();
    const campaigns = (json.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      effectiveStatus: c.effective_status,
      objective: c.objective,
      createdTime: c.created_time
    }));

    return { success: true, campaigns };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch Meta campaigns" };
  }
}

/**
 * Binds/Links a project to a Meta Ad Account in ad_spend_mappings
 */
export async function bindProjectAdAccountAction(projectSlug: string, adAccountId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "superman", "founder", "developer"].includes(profile.role)) {
      throw new Error("Only developers and founders can bind ad accounts");
    }

    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;

    // Check if mapping exists for this slug
    const { data: existing } = await adminSupabase
      .from("ad_spend_mappings")
      .select("id")
      .eq("project_slug", projectSlug)
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await adminSupabase
        .from("ad_spend_mappings")
        .update({ rule_value: cleanAccountId, rule_type: "account" })
        .eq("id", existing.id);

      if (updateErr) throw updateErr;
    } else {
      const { error: insErr } = await adminSupabase
        .from("ad_spend_mappings")
        .insert({
          project_slug: projectSlug,
          rule_type: "account",
          rule_value: cleanAccountId
        });

      if (insErr) throw insErr;
    }

    return { success: true, projectSlug, adAccountId: cleanAccountId };
  } catch (err: any) {
    return { error: err.message || "Failed to bind Meta ad account" };
  }
}



