"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { statusMapper, isPaidStatus } from "@/lib/statusMapper";
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
  let allowedProjects: { id: string; name: string; slug: string; cell_id?: string | null; default_currency?: string; expert_share_percent?: number; survey_landing_paths?: string[] }[] = [];

  if (isSuperman) {
    // Superman role sees all active projects without checking profile_projects mapping and RLS
    const { data: allProj } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent, survey_landing_paths")
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
        .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent, survey_landing_paths")
        .in("cell_id", cellIds)
        .order("name");
      const projectsList = cellProj || [];
      allowedProjects = projectsList.filter((p) => p.is_active);
    }
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug, is_active, cell_id, default_currency, expert_share_percent, survey_landing_paths)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.is_active !== false);
  }

  // Filter out sandbox and bw_main for non-dev/admin users
  const isDevOrAdmin = ["developer", "admin", "superman"].includes(profile.role);
  if (!isDevOrAdmin) {
    allowedProjects = allowedProjects.filter((p) => p.slug !== "sandbox" && p.slug !== "bw_main");
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
  const utmCampaign = String(lead.utm_campaign || lead.utmCampaign || "").trim().toLowerCase();
  const utmMedium = String(lead.utm_medium || lead.utmMedium || "").trim().toLowerCase();
  const utmSource = String(lead.utm_source || lead.utmSource || "").trim().toLowerCase();
  const campaignId = String(lead.campaign_id || lead.campaignId || lead.metadata?.campaign_id || "").trim().toLowerCase();
  const path = String(lead.page_path || "").trim().toLowerCase();
  const url = String(lead.page_url || "").trim().toLowerCase();
  const landings = (lead.visited_landings || lead.visitedLandings || []).map((l: string) => String(l).toLowerCase());
  const targetSheet = String(lead.target_sheet || lead.targetSheet || "").trim().toLowerCase();

  for (const funnel of funnels) {
    const campaignIds = (funnel.campaign_ids || []).map((c: string) => c.trim().toLowerCase()).filter(Boolean);
    const landingSlugs = (funnel.landing_slugs || []).map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    const funnelName = String(funnel.name || "").trim().toLowerCase();

    // 1. Match by campaign (supports utm_campaign, utm_medium, utm_source, and campaign_id)
    const hasCampaignMatch = campaignIds.some((cid: string) => 
      (utmCampaign && (utmCampaign.includes(cid) || cid.includes(utmCampaign))) ||
      (utmMedium && (utmMedium.includes(cid) || cid.includes(utmMedium))) ||
      (utmSource && (utmSource.includes(cid) || cid.includes(utmSource))) ||
      (campaignId && (campaignId === cid || cid.includes(campaignId)))
    );
    if (hasCampaignMatch) {
      return funnel;
    }

    // 2. Match by landing slug
    if (landingSlugs.some((slug: string) => {
      if (!slug) return false;
      return path.includes(slug) || url.includes(slug) || landings.some((l: string) => l.includes(slug));
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

      const startIso = filters?.startDate ? new Date(filters.startDate).toISOString() : null;
      const endIso = filters?.endDate ? new Date(`${filters.endDate}T23:59:59.999Z`).toISOString() : null;
      const hasDateFilter = Boolean(startIso || endIso);

      if (!hasDateFilter && globalSupermanSummaryCache && (now - globalSupermanSummaryCache.timestamp < 10000)) {
        summary = globalSupermanSummaryCache.data.summaryData;
        campaigns = globalSupermanSummaryCache.data.campaignsData;
        leaderboard = globalSupermanSummaryCache.data.producersLeaderboard;
      } else {
        const [summaryRes, campaignRes, leaderboardRes] = await Promise.all([
          adminSupabase.rpc("get_superman_summary", { p_start_date: startIso, p_end_date: endIso }),
          supabase.rpc("get_campaigns_summary"),
          adminSupabase.rpc("get_producers_leaderboard", { p_start_date: startIso, p_end_date: endIso })
        ]);

        const rawSummary = summaryRes.data || [];
        summary = rawSummary.map((p: any) => ({
          project_id: p.project_id,
          project_name: p.project_name,
          project_slug: p.project_slug,
          cell_id: p.cell_id,
          revenue_uah: Number(p.uah_revenue || 0),
          revenue_usd: Number(p.usd_revenue || 0),
          revenue_eur: Number(p.eur_revenue || 0),
          expenses_uah: Number(p.spend_uah || 0),
          expenses_usd: Number(p.spend_usd || p.spend || 0),
          leads_count: Number(p.leads_count || 0),
          cpl: Number(p.cpl_usd || p.cpl || 0),
          cpl_uah: Number(p.cpl_uah || 0),
          profit_uah: Number(p.profit_uah || 0),
          profit_usd: Number(p.profit_usd || 0),
          roi: Number(p.roi || 0)
        }));

        campaigns = campaignRes.data || [];
        leaderboard = (leaderboardRes.data || []).map((l: any, idx: number) => ({
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
          isLeaderOfMonth: idx === 0 && Number(l.blended_revenue || 0) > 0,
        }));

        if (!hasDateFilter) {
          globalSupermanSummaryCache = {
            timestamp: now,
            data: {
              summaryData: summary,
              campaignsData: campaigns,
              producersLeaderboard: leaderboard
            }
          };
        }
      }

      // Filter summary data based on user's allowed projects if they are not Superman
      let filteredSummary = summary;
      let filteredCampaigns = campaigns;
      let filteredLeaderboard = leaderboard;

      const isDevOrAdmin = ["developer", "admin", "superman"].includes(profile.role);
      if (!isDevOrAdmin) {
        filteredSummary = filteredSummary.filter((p: any) => p.project_slug !== "sandbox" && p.project_slug !== "bw_main");
        filteredCampaigns = filteredCampaigns.filter((c: any) => c.project_slug !== "sandbox" && c.project_slug !== "bw_main");
      }

      if (!isSuperman) {
        const allowedIds = new Set(allowedProjects.map((p) => p.id));
        filteredSummary = filteredSummary.filter((p: any) => allowedIds.has(p.project_id));
        filteredCampaigns = filteredCampaigns.filter((c: any) => allowedProjects.some(ap => ap.slug === c.project_slug));
        
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
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const defaultStartStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const defaultLastDay = new Date(year, month + 1, 0).getDate();
    const defaultEndStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(defaultLastDay).padStart(2, "0")}`;

    const startDate = filters?.startDate !== undefined ? filters.startDate : defaultStartStr;
    const endDate = filters?.endDate !== undefined ? filters.endDate : defaultEndStr;
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
        funnels.forEach((funnel: any) => {
          const campaignIds = funnel.campaign_ids || [];
          const landingSlugs = funnel.landing_slugs || [];
          campaignIds.forEach((c: string) => {
            if (c && c.trim()) {
              const val = `%${c.trim()}%`;
              q = q.not("utm_campaign", "ilike", val).not("utm_medium", "ilike", val).not("utm_source", "ilike", val);
              aq = aq.not("utm_campaign", "ilike", val).not("utm_medium", "ilike", val).not("utm_source", "ilike", val);
            }
          });
          landingSlugs.forEach((s: string) => {
            if (s && s.trim() && s.trim() !== "/") {
              q = q.not("page_path", "ilike", `%${s.trim()}%`);
              q = q.not("page_url", "ilike", `%${s.trim()}%`);
              q = q.not("visited_landings", "cs", `{"${s.trim()}"}`);
              aq = aq.not("page_path", "ilike", `%${s.trim()}%`);
              aq = aq.not("page_url", "ilike", `%${s.trim()}%`);
              aq = aq.not("visited_landings", "cs", `{"${s.trim()}"}`);
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
            if (c && c.trim()) {
              const val = `%${c.trim()}%`;
              orConditions.push(`utm_campaign.ilike.${val}`);
              orConditions.push(`utm_medium.ilike.${val}`);
              orConditions.push(`utm_source.ilike.${val}`);
            }
          });

          landingSlugs.forEach((s: string) => {
            if (s && s.trim()) {
              orConditions.push(`page_path.ilike.%${s.trim()}%`);
              orConditions.push(`page_url.ilike.%${s.trim()}%`);
              orConditions.push(`visited_landings.cs.{"${s.trim()}"}`);
            }
          });

          const funnelName = funnel.name ? funnel.name.trim() : "";
          if (funnelName) {
            orConditions.push(`target_sheet.ilike.%${funnelName}%`);
          }

          if (funnel.start_date) {
            const sDate = parseClientDateRange(funnel.start_date, false);
            if (sDate) {
              query = query.gte("created_at", sDate.toISOString());
              aggQuery = aggQuery.gte("created_at", sDate.toISOString());
            }
          }
          if (funnel.end_date) {
            const eDate = parseClientDateRange(funnel.end_date, true);
            if (eDate) {
              query = query.lte("created_at", eDate.toISOString());
              aggQuery = aggQuery.lte("created_at", eDate.toISOString());
            }
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
    const startIso = startDate ? parseClientDateRange(startDate, false).toISOString() : null;
    const endIso = endDate ? parseClientDateRange(endDate, true).toISOString() : null;

    const [leadsRes, projectKpiRes, trafficSummaryRes, costsRes, allProfilesRes, utmLeadsSummaryRes, funnelsRes, campaignsRes, filtersSummaryRes] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to),
      adminSupabase.rpc("get_project_aggregated_kpi", {
        p_project_id: activeProject.id,
        p_start_date: startIso,
        p_end_date: endIso
      }),
      (() => {
        if (filters?.skipTraffic) return Promise.resolve({ data: [], error: null } as any);
        return adminSupabase.rpc("get_traffic_clicks_summary", {
          p_project_id: activeProject.id,
          p_start_date: startIso,
          p_end_date: endIso
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
        p_start_date: startIso,
        p_end_date: endIso,
        p_selected_landing: selectedLanding,
        p_assigned_manager_id: isSalesFiltered ? user.id : null
      }),
      adminSupabase.from("funnels").select("*").eq("project_id", activeProject.id),
      adminSupabase.rpc("get_campaigns_summary"),
      adminSupabase.rpc("get_crm_filters_summary", {
        p_project_id: activeProject.id,
        p_start_date: startIso,
        p_end_date: endIso
      })
    ]);
    const dbQueryEnd = performance.now();
    const dbQueryMs = dbQueryEnd - dbQueryStart;

    const rawFunnels = funnelsRes.data || [];
    const funnelsList = await Promise.all(
      rawFunnels.map(async (funnel: any) => {
        const { data: kpi } = await adminSupabase.rpc("get_funnel_analytics_aggregated", {
          p_funnel_id: funnel.id
        });
        const s = kpi || {};
        return {
          ...funnel,
          stats: {
            leadsCount: Number(s.total_leads || 0),
            salesCount: Number(s.paid_orders || 0),
            quizzesCount: Number(s.quizzes_count || 0),
            totalClicks: Number(s.total_clicks || 0),
            impressions: Number(s.impressions || 0),
            revenue: Number(s.total_revenue_uah || 0),
            revenueUSD: Number(s.total_revenue_usd || 0),
            spend: Number(s.spend_uah || 0),
            spendUSD: Number(s.spend_usd || 0),
            profit: Number(s.profit_uah || 0),
            profitUSD: Number(s.profit_usd || 0),
            roi: Number(s.roi || 0),
            cr: Number(s.conversion_rate || 0),
            cplUSD: Number(s.cpl_usd || 0),
            cpaUSD: Number(s.cpa_usd || 0),
            manualSpend: Number(s.manual_expense_uah || 0),
            manualIncome: Number(s.manual_income_uah || 0)
          }
        };
      })
    );

    const rawPaginatedLeads = leadsRes.data || [];
    const paginatedLeads = rawPaginatedLeads.map((lead: any) => {
      const matchedFunnel = matchLeadToFunnel(lead, funnelsList);
      return {
        ...lead,
        funnelId: matchedFunnel ? matchedFunnel.id : null,
        funnelName: matchedFunnel ? matchedFunnel.name : null
      };
    });

    const kpiData = projectKpiRes.data || {};
    const totalCount = Number(kpiData.total_leads || leadsRes.count || 0);
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

    // Clicks summary
    const groupedTraffic = trafficSummaryRes.data || [];
    const totalClicks = groupedTraffic.reduce((sum: number, t: any) => sum + Number(t.clicks_count || 0), 0);

    const totalLeads = Number(kpiData.total_leads || 0);
    const totalCostsSpend = Number(kpiData.spend_usd || 0);
    const totalCostsSpendUah = Number(kpiData.total_spend_uah || 0);
    const totalRevenueUah = Number(kpiData.total_revenue_uah || 0);
    const totalRevenueUsd = Number(kpiData.total_revenue_usd || 0);
    const courseRevenueUah = Number(kpiData.course_revenue_uah || 0);
    const courseRevenueUsd = Number(kpiData.course_revenue_usd || 0);
    const tripwireRevenueUah = Number(kpiData.tripwire_revenue_uah || 0);
    const tripwireRevenueUsd = Number(kpiData.tripwire_revenue_usd || 0);
    const subscriptionRevenueUah = Number(kpiData.subscription_revenue_uah || 0);
    const subscriptionRevenueUsd = Number(kpiData.subscription_revenue_usd || 0);

    const paidLeadsCount = Number(kpiData.paid_leads || kpiData.paid_orders || (Number(kpiData.course_orders || 0) + Number(kpiData.tripwire_orders || 0)));
    const paidTripwiresCount = Number(kpiData.tripwire_orders || 0);
    const totalSales = Number(kpiData.paid_orders || 0);

    const netProfitUsd = totalRevenueUsd - totalCostsSpend;
    const netProfitUah = Number(kpiData.total_profit_uah || 0);
    const roi = Number(kpiData.roi || 0);

    const singleProjectStats = {
      totalLeads,
      totalClicks,
      totalSpend: totalCostsSpend,
      totalSpendUah: totalCostsSpendUah,
      totalApplications: totalLeads,
      conversionRate: totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0,
      cpl: Number(kpiData.cpl_usd || 0),
      cplUah: Number(kpiData.cpl_uah || 0),
      usdRevenue: totalRevenueUsd,
      uahRevenue: totalRevenueUah,
      eurRevenue: 0,
      usdCourseRevenue: courseRevenueUsd,
      uahCourseRevenue: courseRevenueUah,
      eurCourseRevenue: 0,
      usdTripwireRevenue: tripwireRevenueUsd,
      uahTripwireRevenue: tripwireRevenueUah,
      eurTripwireRevenue: 0,
      subscriptionRevenueUah,
      subscriptionRevenueUsd,
      netProfitUsd,
      netProfitUah,
      roi,
      totalSales,
      paidLeadsCount,
      paidTripwiresCount,
      leadToSaleConv: Number(kpiData.conversion_rate || 0),
      leadToSaleConvUsd: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0,
      leadToSaleConvUah: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0,
      leadToSaleConvEur: 0,
      aovUsd: totalSales > 0 ? totalRevenueUsd / totalSales : 0,
      aovUah: totalSales > 0 ? totalRevenueUah / totalSales : 0,
      aovEur: 0
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
        usdPaid: Number(lead.usd_paid || 0) + Number(lead.usd_tripwire_paid || 0),
        uahPaid: Number(lead.uah_paid || 0) + Number(lead.uah_tripwire_paid || 0),
        eurPaid: Number(lead.eur_paid || 0) + Number(lead.eur_tripwire_paid || 0),
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
      userEmail: user?.email || profile?.email || "",
      allowedProjects,
      activeSlug,
      activeProject,
      leads,
      totalCount,
      totalRevenueUAH: singleProjectStats.uahRevenue,
      totalSpendUAH: singleProjectStats.totalSpend,
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
      filtersSummary: filtersSummaryRes?.data || null,
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

export async function getFounderDashboardDataAction(startDate?: string, endDate?: string) {
  try {
    const { isSuperman, allowedProjects, profile, user } = await getSessionAndAccess("all");
    const isDevOrAdmin = ["developer", "admin", "superman"].includes(profile.role);
    const adminSupabase = createAdminClient();

    const startIso = startDate ? new Date(startDate).toISOString() : null;
    const endIso = endDate ? new Date(`${endDate}T23:59:59.999Z`).toISOString() : null;

    const [summaryRes, leaderboardRes, cellsRes, taskLogsRes, dbProjectsRes] = await Promise.all([
      adminSupabase.rpc("get_superman_summary", { p_start_date: startIso, p_end_date: endIso }),
      adminSupabase.rpc("get_producers_leaderboard", { p_start_date: startIso, p_end_date: endIso }),
      getCellsAction(),
      getGlobalTaskLogsAction(),
      adminSupabase.from("projects").select("id, cell_id, slug, is_active")
    ]);

    const rawSummary = summaryRes.data || [];
    let summary = rawSummary.map((p: any) => ({
      project_id: p.project_id,
      project_name: p.project_name,
      project_slug: p.project_slug,
      cell_id: p.cell_id,
      revenue_uah: Number(p.uah_revenue || 0),
      revenue_usd: Number(p.usd_revenue || 0),
      revenue_eur: Number(p.eur_revenue || 0),
      expenses_uah: Number(p.spend_uah || 0),
      expenses_usd: Number(p.spend_usd || p.spend || 0),
      leads_count: Number(p.leads_count || 0),
      cpl: Number(p.cpl_usd || p.cpl || 0),
      cpl_uah: Number(p.cpl_uah || 0),
      profit_uah: Number(p.profit_uah || 0),
      profit_usd: Number(p.profit_usd || 0),
      roi: Number(p.roi || 0)
    }));

    if (!isDevOrAdmin) {
      summary = summary.filter((p: any) => p.project_slug !== "sandbox" && p.project_slug !== "bw_main");
    }

    const cells = Array.isArray(cellsRes) ? cellsRes : [];
    const taskLogs = Array.isArray(taskLogsRes) ? taskLogsRes : [];
    const projectCellMap = new Map((dbProjectsRes.data || []).map((p: any) => [p.id, p.cell_id]));

    const summaryDataWithCell = summary.map((p: any) => ({
      ...p,
      cell_id: projectCellMap.get(p.project_id) || p.cell_id || null
    }));

    let totalRevenueUah = 0;
    let totalSpendUah = 0;
    // Strictly sum commercial holding projects only (excluding sandbox and bw_main)
    const commercialProjects = summaryDataWithCell.filter(
      (p: any) => p.project_slug !== "sandbox" && p.project_slug !== "bw_main"
    );
    commercialProjects.forEach((p: any) => {
      totalRevenueUah += Number(p.revenue_uah || 0);
      totalSpendUah += Number(p.expenses_uah || 0);
    });
    const totalProfitUah = totalRevenueUah - totalSpendUah;
    const globalRoi = totalSpendUah > 0 ? (totalProfitUah / totalSpendUah) * 100 : 0;

    const cellsWithProjects = cells.map((cell: any) => {
      const cellProjects = summaryDataWithCell.filter((p: any) => p.cell_id === cell.id);
      let cellRevenue = 0;
      let cellSpend = 0;
      cellProjects.forEach((p: any) => {
        cellRevenue += Number(p.revenue_uah || 0);
        cellSpend += Number(p.expenses_uah || 0);
      });
      return {
        ...cell,
        projects: cellProjects,
        revenue: cellRevenue,
        spend: cellSpend,
        profit: cellRevenue - cellSpend
      };
    });

    const unassignedProjects = summaryDataWithCell.filter(
      (p: any) => !p.cell_id && (isDevOrAdmin ? true : p.project_slug !== "bw_main" && p.project_slug !== "sandbox")
    );

    const leaderboard = (leaderboardRes.data || []).map((l: any, idx: number) => ({
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
      isLeaderOfMonth: idx === 0 && Number(l.blended_revenue || 0) > 0
    }));

    return {
      success: true,
      cellsWithProjects,
      unassignedProjects,
      leaderboard,
      taskLogs,
      totalRevenueUah,
      totalSpendUah,
      totalProfitUah,
      globalRoi,
      startDate: startDate || "",
      endDate: endDate || "",
      isDevOrAdmin
    };
  } catch (err: any) {
    return {
      error: err.message || "Failed to load founder dashboard data",
      cellsWithProjects: [],
      unassignedProjects: [],
      leaderboard: [],
      taskLogs: [],
      totalRevenueUah: 0,
      totalSpendUah: 0,
      totalProfitUah: 0,
      globalRoi: 0,
      startDate: "",
      endDate: "",
      isDevOrAdmin: false
    };
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

// Submit error report or improvement suggestion with rich metadata
export async function submitCrmFeedbackAction(
  typeOrPayload: "error" | "improvement" | {
    type: "error" | "improvement";
    message: string;
    title?: string;
    category?: string;
    priority?: string;
    metadata?: any;
  },
  maybeMessage?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Неавторизовано.");

    let type: "error" | "improvement" = "error";
    let message = "";
    let title: string | null = null;
    let category: string | null = null;
    let priority = "medium";
    let metadata: any = {};

    if (typeof typeOrPayload === "object") {
      type = typeOrPayload.type;
      message = typeOrPayload.message;
      title = typeOrPayload.title || null;
      category = typeOrPayload.category || null;
      priority = typeOrPayload.priority || "medium";
      metadata = typeOrPayload.metadata || {};
    } else {
      type = typeOrPayload;
      message = maybeMessage || "";
    }

    if (!message.trim()) {
      throw new Error("Текст повідомлення обов'язковий.");
    }

    const { data, error } = await supabase
      .from("crm_feedback")
      .insert({
        user_id: user.id,
        user_email: user.email,
        type,
        title,
        message: message.trim(),
        category,
        priority,
        metadata,
        status: "pending"
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/admin");
    return { success: true, message: "Дякуємо! Ваш запит успішно зареєстровано в системі.", item: data };
  } catch (err: any) {
    return { error: err.message || "Не вдалося надіслати запит." };
  }
}

// Retrieve feedback items (Full list for admins/devs/founders, personal history for others)
export async function getCrmFeedbackList() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Неавторизовано.");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isPrivileged =
      ["admin", "superman", "developer", "founder"].includes(profile?.role || "") ||
      user.email === "yura3zaxar@gmail.com" ||
      user.email === "yura3zaxar@outlook.com";

    let query = supabase
      .from("crm_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (!isPrivileged) {
      query = query.eq("user_id", user.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err: any) {
    console.error("Failed to load crm feedback:", err);
    return [];
  }
}

// Update feedback item status (Privileged users: admin, superman, developer, founder)
export async function updateFeedbackStatusAction(feedbackId: string, status: string, adminNote?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("403 Доступ заборонено.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isPrivileged =
      ["admin", "superman", "developer", "founder"].includes(profile?.role || "") ||
      user.email === "yura3zaxar@gmail.com" ||
      user.email === "yura3zaxar@outlook.com";

    if (!isPrivileged) {
      throw new Error("403 Недостатньо прав для оновлення статусу.");
    }

    const updatePayload: any = { status };
    if (adminNote !== undefined) {
      const { data: current } = await supabase
        .from("crm_feedback")
        .select("metadata")
        .eq("id", feedbackId)
        .single();
      updatePayload.metadata = {
        ...(current?.metadata || {}),
        admin_note: adminNote,
        resolved_by: user.email,
        resolved_at: new Date().toISOString()
      };
    }

    const { error } = await supabase
      .from("crm_feedback")
      .update(updatePayload)
      .eq("id", feedbackId);

    if (error) throw error;
    revalidatePath("/admin");
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

    const adminSupabase = createAdminClient();

    // 1. Fetch exchange rate dynamically from NBU
    const { getExchangeRates } = await import("@/lib/exchange-rate");
    const todayRates = await getExchangeRates();

    // 2. Fetch Meta Ads daily records strictly from daily_traffic_and_costs
    let costsQuery = adminSupabase
      .from("daily_traffic_and_costs")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: false })
      .limit(10000);

    if (startDateStr) {
      costsQuery = costsQuery.gte("date", startDateStr);
    }
    if (endDateStr) {
      costsQuery = costsQuery.lte("date", endDateStr);
    }

    const { data: costsData, error: costsError } = await costsQuery;
    if (costsError) throw costsError;

    // 3. Fetch real Meta campaign statuses from Meta Graph API
    const metaCampaignStatuses: Record<string, string> = {};
    try {
      const { data: mapping } = await adminSupabase
        .from("ad_spend_mappings")
        .select("rule_value")
        .eq("project_slug", projectSlug)
        .eq("rule_type", "account")
        .maybeSingle();

      const tokens = await getAllActiveMetaTokens(adminSupabase, projectSlug);
      if (mapping?.rule_value && tokens.length > 0) {
        const accId = mapping.rule_value;
        for (const token of tokens) {
          try {
            const campRes = await fetch(
              `https://graph.facebook.com/v25.0/${accId}/campaigns?fields=id,name,effective_status&limit=100&access_token=${token}`
            );
            if (campRes.ok) {
              const campData = await campRes.json();
              campData.data?.forEach((c: any) => {
                if (c.id) metaCampaignStatuses[c.id] = c.effective_status;
                if (c.name) metaCampaignStatuses[c.name] = c.effective_status;
              });
              break;
            }
          } catch (err) {}
        }
      }
    } catch (e) {
      console.warn("Could not fetch live Meta campaign statuses:", e);
    }

    // Helper to resolve lead count from actions if meta_leads is 0 but actions exist
    const resolveMetaLeads = (row: any) => {
      if (Number(row.meta_leads || 0) > 0) return Number(row.meta_leads);
      const actions = row.actions || [];
      if (!Array.isArray(actions) || actions.length === 0) return 0;
      const leadAction = actions.find((a: any) =>
        [
          "offsite_conversion.fb_pixel_lead",
          "onsite_web_lead",
          "lead",
          "onsite_conversion.lead_grouped",
          "offsite_lead_add_20_s_calls",
          "onsite_conversion.messaging_conversation_started_7d",
          "onsite_conversion.total_messaging_connection"
        ].includes(a.action_type) || (typeof a.action_type === "string" && a.action_type.startsWith("offsite_conversion.custom."))
      );
      return leadAction ? Number(leadAction.value || 0) : 0;
    };

    // Helper to resolve purchase count from actions if meta_purchases is 0 but actions exist
    const resolveMetaPurchases = (row: any) => {
      if (Number(row.meta_purchases || 0) > 0) return Number(row.meta_purchases);
      const actions = row.actions || [];
      if (!Array.isArray(actions) || actions.length === 0) return 0;
      const purchaseAction = actions.find((a: any) =>
        [
          "offsite_conversion.fb_pixel_purchase",
          "onsite_web_purchase",
          "omni_purchase",
          "purchase",
          "onsite_web_app_purchase",
          "web_in_store_purchase",
          "web_app_in_store_purchase",
          "offsite_purchase_add_20_s_calls"
        ].includes(a.action_type)
      );
      return purchaseAction ? Number(purchaseAction.value || 0) : 0;
    };

    // Helper to resolve purchase value from action_values
    const resolveMetaPurchaseValue = (row: any) => {
      if (Number(row.meta_purchase_value_usd || 0) > 0) return Number(row.meta_purchase_value_usd);
      const actionValues = row.action_values || [];
      if (!Array.isArray(actionValues) || actionValues.length === 0) return 0;
      const purchaseValAction = actionValues.find((a: any) =>
        [
          "offsite_conversion.fb_pixel_purchase",
          "onsite_web_purchase",
          "omni_purchase",
          "purchase",
          "onsite_web_app_purchase",
          "web_in_store_purchase",
          "web_app_in_store_purchase",
          "offsite_purchase_add_20_s_calls"
        ].includes(a.action_type)
      );
      return purchaseValAction ? Number(purchaseValAction.value || 0) : 0;
    };

    // Helper to resolve consultation events from actions
    const resolveMetaConsultations = (row: any) => {
      const actions = row.actions || [];
      if (!Array.isArray(actions) || actions.length === 0) return 0;
      const consultAction = actions.find((a: any) => {
        const type = String(a.action_type || "").toLowerCase();
        return (
          type.includes("schedule") ||
          type.includes("contact") ||
          type.includes("submit_application") ||
          type.includes("consultation") ||
          type.includes("anketa") ||
          type.includes("diagnostik") ||
          type.includes("appointment")
        );
      });
      return consultAction ? Number(consultAction.value || 0) : 0;
    };

    // Helper to resolve applications / checkout intents from actions
    const resolveMetaApplications = (row: any) => {
      const actions = row.actions || [];
      if (!Array.isArray(actions) || actions.length === 0) return 0;
      const appAction = actions.find((a: any) => {
        const type = String(a.action_type || "").toLowerCase();
        return (
          type.includes("initiate_checkout") ||
          type.includes("complete_registration") ||
          type.includes("zayavka") ||
          type.includes("add_to_cart")
        );
      });
      return appAction ? Number(appAction.value || 0) : 0;
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

      const spend = Number(c.spend_usd || c.spend || 0);
      const clicks = Number(c.clicks || 0);
      const impressions = Number(c.impressions || 0);
      const leads = resolveMetaLeads(c);
      const sales = resolveMetaPurchases(c);
      const purchaseValue = resolveMetaPurchaseValue(c);
      const metaConsultations = resolveMetaConsultations(c);
      const metaApps = resolveMetaApplications(c);

      campaignMap[campId].spend += spend;
      campaignMap[campId].clicks += clicks;
      campaignMap[campId].impressions += impressions;
      campaignMap[campId].leads_count += leads;
      campaignMap[campId].sales += sales;
      campaignMap[campId].usd_revenue += purchaseValue;
      campaignMap[campId].consultations += metaConsultations;
      campaignMap[campId].applications += (metaApps > 0 ? metaApps : leads);
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

      const spend = Number(c.spend_usd || c.spend || 0);
      const clicks = Number(c.clicks || 0);
      const impressions = Number(c.impressions || 0);
      const leads = resolveMetaLeads(c);
      const sales = resolveMetaPurchases(c);
      const purchaseValue = resolveMetaPurchaseValue(c);
      const metaConsultations = resolveMetaConsultations(c);
      const metaApps = resolveMetaApplications(c);

      dailyMap[dateStr].spend += spend;
      dailyMap[dateStr].clicks += clicks;
      dailyMap[dateStr].impressions += impressions;
      dailyMap[dateStr].leads_count += leads;
      dailyMap[dateStr].sales += sales;
      dailyMap[dateStr].usd_revenue += purchaseValue;
      dailyMap[dateStr].consultations += metaConsultations;
      dailyMap[dateStr].applications += (metaApps > 0 ? metaApps : leads);
    });

    // Helper to calculate ratios and metrics
    const computeCalculatedFields = (item: any) => {
      const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
      const cpm = item.impressions > 0 ? (item.spend / item.impressions) * 1000 : 0;
      const cpc = item.clicks > 0 ? item.spend / item.clicks : 0;
      const siteCr = item.clicks > 0 ? (item.leads_count / item.clicks) * 100 : 0;
      const cpl = item.leads_count > 0 ? item.spend / item.leads_count : 0;
      const appCr = item.leads_count > 0 ? (item.applications / item.leads_count) * 100 : 0;
      const cpa = item.sales > 0 ? item.spend / item.sales : (item.applications > 0 ? item.spend / item.applications : 0);
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
      const metaStatus = metaCampaignStatuses[item.campaign_id] || metaCampaignStatuses[item.campaign_name];
      const is_active = metaStatus ? metaStatus === "ACTIVE" : false;
      
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
  stages?: any[],
  botUsername?: string | null,
  botSteps?: any[]
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
        bot_username: botUsername || null,
        bot_steps: botSteps || [],
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
    botUsername?: string | null;
    botSteps?: any[];
    description?: string;
    plannedRevenue?: number;
    plannedSpend?: number;
    stages?: any[];
  }
) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const updatePayload: any = {
      name: updates.name,
      start_date: updates.startDate,
      end_date: updates.endDate || null,
      campaign_ids: updates.campaignIds,
      landing_slugs: updates.landingSlugs,
      bot_username: updates.botUsername !== undefined ? updates.botUsername : null,
      description: updates.description || "",
      planned_revenue: updates.plannedRevenue || 0,
      planned_spend: updates.plannedSpend || 0,
      stages: updates.stages || []
    };
    if (updates.botSteps !== undefined) {
      updatePayload.bot_steps = updates.botSteps;
    }

    const { data, error } = await adminSupabase
      .from("funnels")
      .update(updatePayload)
      .eq("id", funnelId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, funnel: data };
  } catch (err: any) {
    return { error: err.message || "Failed to update funnel" };
  }
}

export async function saveProjectSendPulseCredentialsAction(
  projectId: string,
  clientId: string,
  clientSecret: string
) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from("projects")
      .update({
        sendpulse_client_id: clientId.trim(),
        sendpulse_client_secret: clientSecret.trim()
      })
      .eq("id", projectId)
      .select("id, slug, name, sendpulse_client_id")
      .single();

    if (error) throw error;
    return { success: true, project: data };
  } catch (err: any) {
    return { error: err.message || "Failed to save SendPulse credentials" };
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

    const funnelsWithStats = await Promise.all(
      (funnels || []).map(async (funnel: any) => {
        const { data: kpi } = await adminSupabase.rpc("get_funnel_analytics_aggregated", {
          p_funnel_id: funnel.id
        });

        const s = kpi || {};
        return {
          ...funnel,
          stats: {
            leadsCount: Number(s.total_leads || 0),
            salesCount: Number(s.paid_orders || 0),
            quizzesCount: Number(s.quizzes_count || 0),
            totalClicks: Number(s.total_clicks || 0),
            impressions: Number(s.impressions || 0),
            revenue: Number(s.total_revenue_uah || 0),
            revenueUSD: Number(s.total_revenue_usd || 0),
            spend: Number(s.spend_uah || 0),
            spendUSD: Number(s.spend_usd || 0),
            profit: Number(s.profit_uah || 0),
            profitUSD: Number(s.profit_usd || 0),
            roi: Number(s.roi || 0),
            cr: Number(s.conversion_rate || 0),
            cplUSD: Number(s.cpl_usd || 0),
            cpaUSD: Number(s.cpa_usd || 0),
            manualSpend: Number(s.manual_expense_uah || 0),
            manualIncome: Number(s.manual_income_uah || 0)
          }
        };
      })
    );

    return {
      funnels: funnelsWithStats || [],
      transactions: transactions || []
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch funnels" };
  }
}

export async function getFunnelAnalyticsAction(
  projectId: string,
  funnelId: string,
  startDate?: string | null,
  endDate?: string | null
) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    const { data: kpi, error } = await adminSupabase.rpc("get_funnel_analytics_aggregated", {
      p_funnel_id: funnelId,
      p_start_date: startDate ? new Date(startDate).toISOString() : null,
      p_end_date: endDate ? new Date(endDate).toISOString() : null
    });

    if (error) throw error;

    return {
      success: true,
      stats: kpi
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch funnel analytics" };
  }
}

export async function getFunnelDetailsAction(projectId: string, funnelId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    // 1. Fetch funnel definition
    const { data: funnel, error: fErr } = await adminSupabase
      .from("funnels")
      .select("*")
      .eq("id", funnelId)
      .single();

    if (fErr || !funnel) throw new Error("Funnel not found: " + (fErr?.message || ""));

    // 2. Fetch all project orders
    const { data: orders, error: oErr } = await adminSupabase
      .from("unified_orders")
      .select("*")
      .eq("project_id", projectId);

    if (oErr) throw oErr;

    // 3. Fetch all daily traffic costs
    const { data: costs, error: cErr } = await adminSupabase
      .from("daily_traffic_and_costs")
      .select("*")
      .eq("project_id", projectId);

    if (cErr) throw cErr;

    // 4. Fetch financial transactions
    const { data: txs, error: txErr } = await adminSupabase
      .from("financial_transactions")
      .select("*")
      .eq("project_id", projectId)
      .eq("funnel_id", funnelId);

    if (txErr) throw txErr;

    // Parse start and end date
    const startIso = funnel.start_date ? new Date(funnel.start_date).toISOString() : null;
    const endIso = funnel.end_date ? new Date(funnel.end_date + "T23:59:59Z").toISOString() : null;
    const startTs = startIso ? new Date(startIso).getTime() : null;
    const endTs = endIso ? new Date(endIso).getTime() : null;

    const campaignIds = (funnel.campaign_ids || []).map((c: string) => c.toLowerCase().trim()).filter(Boolean);
    const landingSlugs = (funnel.landing_slugs || []).map((s: string) => {
      let clean = s.toLowerCase().trim();
      if (clean.startsWith("http://") || clean.startsWith("https://")) {
        try {
          const u = new URL(clean);
          clean = u.pathname;
        } catch {
          // ignore
        }
      }
      return clean.replace(/^\/+|\/+$/g, "");
    }).filter(Boolean);

    const hasCampaigns = campaignIds.length > 0;
    const hasLandings = landingSlugs.length > 0;

    // Filter matched orders
    const matchedOrders = (orders || []).filter((o: any) => {
      const orderTs = new Date(o.created_at).getTime();
      if (startTs && orderTs < startTs) return false;
      if (endTs && orderTs > endTs) return false;

      const pUrl = String(o.page_url || o.metadata?.page_url || o.metadata?.raw_row?.page_url || "").toLowerCase();
      const pPath = String(o.page_path || o.metadata?.page_path || o.metadata?.raw_row?.page_path || "").toLowerCase();
      const sFlag = String(o.source_flag || o.metadata?.source_flag || o.metadata?.raw_row?.source_flag || "").toLowerCase();
      const tSheet = String(o.metadata?.target_sheet || o.metadata?.raw_row?.target_sheet || "").toLowerCase();
      const uMedium = String(o.utm_medium || o.metadata?.raw_row?.utm_medium || "").toLowerCase();
      const uCamp = String(o.utm_campaign || o.metadata?.raw_row?.utm_campaign || "").toLowerCase();
      const uSrc = String(o.utm_source || o.metadata?.raw_row?.utm_source || "").toLowerCase();
      const cId = String(o.campaign_id || o.metadata?.campaign_id || "").toLowerCase();

      // Clean path check: DO NOT match checkout or unrelated paths
      if (pPath.includes("checkout") || pUrl.includes("/checkout")) {
        return false;
      }

      const campMatch = hasCampaigns && campaignIds.some((cid: string) => (
        uCamp.includes(cid) || cid.includes(uCamp) ||
        uMedium.includes(cid) || cid.includes(uMedium) ||
        uSrc.includes(cid) || cid.includes(uSrc) ||
        cId === cid || cid.includes(cId)
      ));

      const landMatch = hasLandings && landingSlugs.some((slug: string) => {
        if (!slug) return false;
        return pPath.includes(slug) || pUrl.includes(slug) || tSheet.includes(slug) || sFlag.includes(slug);
      });

      if (hasCampaigns && hasLandings) {
        return Boolean(campMatch || landMatch);
      }
      if (hasCampaigns) return campMatch;
      if (hasLandings) return landMatch;
      return true;
    });

    // Group into Offer Variants
    // Rule: Default is ALWAYS Offer 1 (?o=1) if not explicitly ?o=2 or ?o=3!
    const variantMap: Record<string, {
      key: string;
      name: string;
      url: string;
      leadsCount: number;
      salesCount: number;
      revenueUAH: number;
      revenueUSD: number;
      percentage: number;
      cr: number;
      color: string;
    }> = {
      o1: { key: "o1", name: "Оффер 1 (?o=1)", url: "?o=1", leadsCount: 0, salesCount: 0, revenueUAH: 0, revenueUSD: 0, percentage: 0, cr: 0, color: "cyan" },
      o2: { key: "o2", name: "Оффер 2 (?o=2)", url: "?o=2", leadsCount: 0, salesCount: 0, revenueUAH: 0, revenueUSD: 0, percentage: 0, cr: 0, color: "emerald" },
      o3: { key: "o3", name: "Оффер 3 (?o=3)", url: "?o=3", leadsCount: 0, salesCount: 0, revenueUAH: 0, revenueUSD: 0, percentage: 0, cr: 0, color: "purple" }
    };

    let salesCount = 0;
    let revenueUAH = 0;
    let revenueUSD = 0;

    matchedOrders.forEach((o: any) => {
      const pUrl = String(o.page_url || o.metadata?.page_url || o.metadata?.raw_row?.page_url || "").toLowerCase();
      const sFlag = String(o.source_flag || o.metadata?.source_flag || o.metadata?.raw_row?.source_flag || "").toLowerCase();
      const uCamp = String(o.utm_campaign || o.metadata?.raw_row?.utm_campaign || "").toLowerCase();

      let targetKey = "o1"; // ALWAYS DEFAULT TO OFFER 1
      if (pUrl.includes("?o=2") || pUrl.includes("&o=2") || sFlag.includes("offer 2") || uCamp.includes("offer2") || uCamp.includes("offer 2")) {
        targetKey = "o2";
      } else if (pUrl.includes("?o=3") || pUrl.includes("&o=3") || sFlag.includes("offer 3") || uCamp.includes("offer3") || uCamp.includes("offer 3")) {
        targetKey = "o3";
      }

      variantMap[targetKey].leadsCount++;

      // Check if lead paid for something explicitly tied to this funnel
      const isPaid = (o.status && o.status.toLowerCase().includes("оплат") && !o.metadata?.raw_row?.is_free) && Number(o.amount || 0) > 0;
      if (isPaid) {
        const amt = Number(o.amount || 0);
        salesCount++;
        revenueUAH += amt;
        revenueUSD += amt / 41.5;
        variantMap[targetKey].salesCount++;
        variantMap[targetKey].revenueUAH += amt;
        variantMap[targetKey].revenueUSD += amt / 41.5;
      }
    });

    const leadsCount = matchedOrders.length;
    const offerVariants = Object.values(variantMap)
      .map(v => ({
        ...v,
        percentage: leadsCount > 0 ? (v.leadsCount / leadsCount) * 100 : 0,
        cr: v.leadsCount > 0 ? (v.salesCount / v.leadsCount) * 100 : 0
      }))
      .filter(v => v.leadsCount > 0)
      .sort((a, b) => b.leadsCount - a.leadsCount);

    // Matching traffic ad spends
    const matchedCosts = (costs || []).filter((c: any) => {
      const cName = String(c.campaign_name || "").toLowerCase();
      const cId = String(c.campaign_id || "").toLowerCase();

      if (hasCampaigns) {
        return campaignIds.some((cid: string) => cName.includes(cid) || cid.includes(cName) || cId === cid || cid.includes(cId));
      }
      return true;
    });

    let totalSpendUSD = 0;
    let totalSpendUAH = 0;
    let totalClicks = 0;
    let totalImpressions = 0;

    const dailyMap: Record<string, any> = {};

    matchedCosts.forEach((c: any) => {
      const d = c.date;
      const sUsd = Number(c.spend_usd || c.spend || 0);
      const clk = Number(c.clicks || 0);
      const imp = Number(c.impressions || 0);

      totalSpendUSD += sUsd;
      totalSpendUAH += sUsd * 41.5;
      totalClicks += clk;
      totalImpressions += imp;

      if (!dailyMap[d]) {
        dailyMap[d] = {
          date: d,
          campaignName: c.campaign_name || "Кампанія",
          spendUSD: 0,
          spendUAH: 0,
          clicks: 0,
          impressions: 0,
          leadsCount: 0
        };
      }
      dailyMap[d].spendUSD += sUsd;
      dailyMap[d].spendUAH += sUsd * 41.5;
      dailyMap[d].clicks += clk;
      dailyMap[d].impressions += imp;
    });

    // Count daily leads
    matchedOrders.forEach((o: any) => {
      const d = (o.created_at || "").split("T")[0];
      if (d && dailyMap[d]) {
        dailyMap[d].leadsCount++;
      }
    });

    const dailyBreakdown = Object.values(dailyMap)
      .map(d => ({
        ...d,
        ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
        cpcUSD: d.clicks > 0 ? d.spendUSD / d.clicks : 0,
        cpcUAH: d.clicks > 0 ? d.spendUAH / d.clicks : 0,
        cplUSD: d.leadsCount > 0 ? d.spendUSD / d.leadsCount : 0,
        cplUAH: d.leadsCount > 0 ? d.spendUAH / d.leadsCount : 0
      }))
      .sort((a: any, b: any) => b.date.localeCompare(a.date));

    // Manual transactions
    let manualSpendUAH = 0;
    let manualIncomeUAH = 0;
    (txs || []).forEach((tx: any) => {
      const amt = Number(tx.amount || 0);
      const isUAH = tx.currency === "UAH";
      const amtUAH = isUAH ? amt : amt * 41.5;
      const amtUSD = isUAH ? amt / 41.5 : amt;
      if (tx.type === "expense") {
        totalSpendUAH += amtUAH;
        totalSpendUSD += amtUSD;
        manualSpendUAH += amtUAH;
      } else {
        revenueUAH += amtUAH;
        revenueUSD += amtUSD;
        manualIncomeUAH += amtUAH;
      }
    });

    const profitUAH = revenueUAH - totalSpendUAH;
    const profitUSD = revenueUSD - totalSpendUSD;
    const roi = totalSpendUAH > 0 ? (profitUAH / totalSpendUAH) * 100 : 0;
    const cr = leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpcUSD = totalClicks > 0 ? totalSpendUSD / totalClicks : 0;
    const cpcUAH = totalClicks > 0 ? totalSpendUAH / totalClicks : 0;
    const cpmUSD = totalImpressions > 0 ? (totalSpendUSD / totalImpressions) * 1000 : 0;
    const cpmUAH = totalImpressions > 0 ? (totalSpendUAH / totalImpressions) * 1000 : 0;
    const cplUSD = leadsCount > 0 ? totalSpendUSD / leadsCount : 0;
    const cplUAH = leadsCount > 0 ? totalSpendUAH / leadsCount : 0;

    return {
      success: true,
      funnel,
      stats: {
        leadsCount,
        salesCount,
        quizzesCount: 0,
        totalClicks,
        impressions: totalImpressions,
        revenueUAH,
        revenueUSD,
        spendUAH: totalSpendUAH,
        spendUSD: totalSpendUSD,
        profitUAH,
        profitUSD,
        roi,
        cr,
        cplUSD,
        cplUAH,
        cpcUSD,
        cpcUAH,
        cpmUSD,
        cpmUAH,
        ctr,
        manualSpend: manualSpendUAH,
        manualIncome: manualIncomeUAH,
        offerVariants,
        trafficAnalytics: {
          totalSpendUSD,
          totalSpendUAH,
          totalClicks,
          impressions: totalImpressions,
          ctr,
          cpcUSD,
          cpcUAH,
          cpmUSD,
          cpmUAH,
          cplUSD,
          cplUAH,
          dailyBreakdown
        }
      }
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch funnel details" };
  }
}

function checkJunkPath(rawPath: string): boolean {
  if (!rawPath || typeof rawPath !== "string") return true;
  const p = rawPath.toLowerCase().trim();
  if (
    p === "/payment" ||
    p === "/thanks" ||
    p === "/thank-you" ||
    p === "/success" ||
    p === "/processing" ||
    p === "/privacy" ||
    p === "/offer" ||
    p === "/login" ||
    p === "/admin" ||
    p.startsWith("/admin/") ||
    p.startsWith("/api/") ||
    p.startsWith("/tg_id=") ||
    p.startsWith("/order/") ||
    p.includes("telegram_id") ||
    p.includes("%7b%7b")
  ) {
    return true;
  }
  return false;
}

export async function isJunkOrSatelliteInternalPath(rawPath: string): Promise<boolean> {
  return checkJunkPath(rawPath);
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
      if (checkJunkPath(pathVal)) return;

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
        if (checkJunkPath(pathVal)) return;

        if (!pagesMap.has(pathVal)) {
          pagesMap.set(pathVal, {
            id: `default-${pathVal}`,
            path: pathVal,
            slug: pathVal,
            title: land.label || pathVal,
            type: land.type || "discovered",
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
        if (!checkJunkPath(c.page_path) && !pagesMap.has(c.page_path)) {
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
            if (!checkJunkPath(v) && !pagesMap.has(v)) {
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
        title: "Головна",
        type: "default",
        source: "fallback"
      });
    }

    return {
      success: true,
      pages: Array.from(pagesMap.values())
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch project landing pages" };
  }
}

/**
 * Fetches all known and live Meta campaigns for a project to assist with funnel builder attribution
 */
export async function getProjectCampaignsForFunnelAction(projectId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, slug, name")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) throw new Error("Project not found");

    const campaignMap = new Map<string, any>();

    // 1. Fetch all-time daily_traffic_and_costs
    const { data: costs } = await adminSupabase
      .from("daily_traffic_and_costs")
      .select("campaign_name, campaign_id, spend_usd, spend, clicks, impressions")
      .eq("project_id", projectId);

    (costs || []).forEach((c) => {
      const name = String(c.campaign_name || "").trim();
      if (name && !name.includes("{{") && !name.includes("null")) {
        const existing = campaignMap.get(name) || {
          campaign_name: name,
          campaign_id: c.campaign_id,
          spend: 0,
          clicks: 0,
          impressions: 0,
          leads_count: 0
        };
        existing.spend += Number(c.spend_usd || c.spend || 0);
        existing.clicks += Number(c.clicks || 0);
        existing.impressions += Number(c.impressions || 0);
        campaignMap.set(name, existing);
      }
    });

    // 2. Fetch distinct utm_medium and utm_campaign from crm_leads_cache
    const { data: leads } = await adminSupabase
      .from("crm_leads_cache")
      .select("utm_medium, utm_campaign")
      .eq("project_id", projectId)
      .limit(2000);

    (leads || []).forEach((l) => {
      [l.utm_medium, l.utm_campaign].forEach((raw) => {
        const name = String(raw || "").trim();
        if (name && !name.includes("{{") && !name.includes("null") && name.length > 2) {
          if (!campaignMap.has(name)) {
            campaignMap.set(name, {
              campaign_name: name,
              campaign_id: null,
              spend: 0,
              clicks: 0,
              impressions: 0,
              leads_count: 0
            });
          }
          const existing = campaignMap.get(name);
          existing.leads_count += 1;
        }
      });
    });

    // 3. Fetch live Meta Campaigns if ad account is mapped
    const { data: mapping } = await adminSupabase
      .from("ad_spend_mappings")
      .select("rule_value")
      .eq("project_slug", project.slug)
      .eq("rule_type", "account")
      .maybeSingle();

    const tokens = await getAllActiveMetaTokens(adminSupabase, project.slug);
    if (mapping?.rule_value && tokens.length > 0) {
      for (const token of tokens) {
        try {
          const res = await fetch(
            `https://graph.facebook.com/v25.0/${mapping.rule_value}/campaigns?fields=id,name,effective_status&limit=50&access_token=${token}`
          );
          if (res.ok) {
            const json = await res.json();
            if (json.data && Array.isArray(json.data) && json.data.length > 0) {
              json.data.forEach((c: any) => {
                const name = String(c.name || "").trim();
                if (name) {
                  if (!campaignMap.has(name)) {
                    campaignMap.set(name, {
                      campaign_name: name,
                      campaign_id: c.id,
                      spend: 0,
                      clicks: 0,
                      impressions: 0,
                      leads_count: 0,
                      effective_status: c.effective_status
                    });
                  } else {
                    const existing = campaignMap.get(name);
                    existing.campaign_id = c.id;
                    existing.effective_status = c.effective_status;
                  }
                }
              });
              break; // Stop after first working token
            }
          }
        } catch (err) {}
      }
    }

    const campaigns = Array.from(campaignMap.values()).sort(
      (a, b) => b.spend - a.spend || b.leads_count - a.leads_count
    );

    return {
      success: true,
      campaigns
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch project campaigns" };
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
 * Loads full persistent registry of landings and projects from DB with clean verified configs
 */
export async function getProjectLandingsRegistryAction() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: projects, error: projErr } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent")
      .order("name", { ascending: true });

    if (projErr) throw projErr;

    const { DEFAULT_PROJECT_LANDINGS } = await import("@/lib/projectLandings");

    const { data: allDbPages } = await adminSupabase
      .from("discovered_pages")
      .select("*")
      .order("path", { ascending: true });

    const dbPagesByProject = new Map<string, any[]>();
    (allDbPages || []).forEach((p: any) => {
      if (checkJunkPath(p.path)) return;
      const list = dbPagesByProject.get(p.project_id) || [];
      list.push(p);
      dbPagesByProject.set(p.project_id, list);
    });

    const results = (projects || []).map((proj) => {
      const slug = proj.slug;
      const defaultLandings = DEFAULT_PROJECT_LANDINGS[slug] || [];
      const rootUrl = defaultLandings[0]?.url || `https://${slug.replace(/_/g, "-")}.vercel.app`;
      const domain = rootUrl.replace(/\/$/, "");

      const pagesMap = new Map<string, any>();

      // 1. Add DB saved pages
      const dbPages = dbPagesByProject.get(proj.id) || [];
      dbPages.forEach((p: any) => {
        const path = p.path || "/";
        const isPaid = path.includes("course") || path.includes("practicum") || path.includes("price") || path.includes("club") || path.includes("marathon") || path.includes("waist");
        const isQuiz = path.includes("diagnostic") || path.includes("anketa") || path.includes("consultation") || path.includes("rozbir");
        pagesMap.set(path, {
          id: p.id,
          label: p.title || (path === "/" ? "Головна" : path),
          path: path,
          url: `${domain}${path}`,
          badgeColor: isPaid ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : isQuiz ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          type: isPaid ? "paid" : isQuiz ? "quiz" : "free",
          parameters: [],
          source: p.source || "db",
          lastPingAt: p.last_seen_at
        });
      });

      // 2. Merge with DEFAULT_PROJECT_LANDINGS
      defaultLandings.forEach((d) => {
        const path = d.path || "/";
        if (checkJunkPath(path)) return;
        if (!pagesMap.has(path)) {
          pagesMap.set(path, {
            ...d,
            url: d.url || `${domain}${path}`,
            source: "config"
          });
        }
      });

      // Ensure at least "/" is present
      if (pagesMap.size === 0) {
        pagesMap.set("/", {
          label: "Головна",
          path: "/",
          url: `${domain}/`,
          badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          type: "free",
          parameters: [],
          source: "fallback"
        });
      }

      const landings = Array.from(pagesMap.values());

      return {
        id: proj.id,
        slug,
        name: proj.name,
        cell_id: proj.cell_id,
        default_currency: proj.default_currency || "UAH",
        expert_share_percent: proj.expert_share_percent ?? 50,
        domain,
        isLive: true,
        status: "live",
        latencyMs: 0,
        discoveredCount: landings.length,
        landings,
        message: "Синхронізовано з базою",
        lastPingAt: null
      };
    });

    return {
      success: true,
      results
    };
  } catch (err: any) {
    return { error: err.message || "Failed to load project landings registry" };
  }
}

/**
 * Pings all satellite websites live, queries /api/v1/discovery or root domains,
 * discovers all routes/landings, validates 404s and filters internal routes, and updates project status.
 */
export async function pingAllProjectsAction() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { data: projects, error: projErr } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent");

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
            // Filter out junk / internal post-checkout paths
            discoveredPages = data.pages.filter((p: any) => {
              const path = p.path || p.url || "/";
              return !checkJunkPath(path);
            });
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

      // Merge verified default landings with discovered pages
      const pagesMap = new Map<string, any>();

      // 1. Add defaults
      defaultLandings.forEach((d) => {
        const path = d.path || "/";
        if (!checkJunkPath(path)) {
          pagesMap.set(path, {
            label: d.label,
            path: path,
            url: d.url || `${domain}${path}`,
            badgeColor: d.badgeColor,
            type: d.type || "free",
            parameters: []
          });
        }
      });

      // 2. Add discovered pages
      discoveredPages.forEach((p) => {
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
        if (checkJunkPath(normalizedPath)) return;

        const isPaid = p.type === "paid" || normalizedPath.includes("course") || normalizedPath.includes("practicum") || normalizedPath.includes("price") || normalizedPath.includes("club");
        const isQuiz = p.type === "quiz" || normalizedPath.includes("diagnostic") || normalizedPath.includes("anketa") || normalizedPath.includes("consultation") || normalizedPath.includes("rozbir");

        pagesMap.set(normalizedPath, {
          label: p.label || p.title || (normalizedPath === "/" ? "Головна" : normalizedPath),
          path: normalizedPath,
          url: p.url || `${domain}${normalizedPath}`,
          badgeColor: isPaid ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : isQuiz ? "bg-pink-500/10 text-pink-400 border border-pink-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          type: isPaid ? "paid" : isQuiz ? "quiz" : "free",
          parameters: []
        });
      });

      // Fallback "/"
      if (pagesMap.size === 0) {
        pagesMap.set("/", {
          label: "Головна",
          path: "/",
          url: `${domain}/`,
          badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          type: "free",
          parameters: []
        });
      }

      const activeLandings = Array.from(pagesMap.values());

      // Persist active valid landings into DB
      for (const p of activeLandings) {
        try {
          await adminSupabase.from("discovered_pages").upsert({
            project_id: proj.id,
            path: p.path,
            title: p.label || p.path,
            source: discoveredPages.length > 0 ? "external" : "config",
            last_seen_at: new Date().toISOString()
          }, { onConflict: "project_id,path" });
        } catch (landErr) {
          // Non-blocking fallback
        }
      }

      results.push({
        id: proj.id,
        slug,
        name: proj.name,
        cell_id: proj.cell_id,
        default_currency: proj.default_currency || "UAH",
        expert_share_percent: proj.expert_share_percent ?? 50,
        domain,
        isLive,
        status: isLive ? "live" : "unresponsive",
        latencyMs,
        discoveredCount: activeLandings.length,
        landings: activeLandings,
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
    survey_landing_paths?: string[];
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

    if (!profile || !["admin", "superman", "founder", "developer", "producer", "cell_leader", "marketer"].includes(profile.role)) {
      throw new Error("Немає прав для збереження налаштувань проекту");
    }

    const { data: updated, error } = await adminSupabase
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .select("id, name, slug, is_active, cell_id, default_currency, expert_share_percent, survey_landing_paths")
      .single();

    if (error) throw error;

    try {
      revalidatePath("/admin");
      if (updated?.slug) {
        revalidatePath(`/admin/project/${updated.slug}`, "page");
      }
    } catch {}

    return { success: true, project: updated };
  } catch (err: any) {
    return { error: err.message || "Failed to update project settings" };
  }
}

/**
 * Resolves the effective Meta Access Token from DB (ad_spend_mappings) or env
/**
 * Returns all active Meta Access Tokens from DB and ENV
 */
export async function getAllActiveMetaTokens(adminSupabase: any, projectSlug?: string): Promise<string[]> {
  const tokens: string[] = [];
  try {
    const { data: dbTokens } = await adminSupabase
      .from("ad_spend_mappings")
      .select("rule_value, project_slug")
      .eq("rule_type", "meta_token")
      .order("created_at", { ascending: false });

    if (dbTokens && Array.isArray(dbTokens)) {
      if (projectSlug) {
        const specific = dbTokens.find((t: any) => t.project_slug === projectSlug);
        if (specific?.rule_value && !tokens.includes(specific.rule_value.trim())) {
          tokens.push(specific.rule_value.trim());
        }
      }
      dbTokens.forEach((t: any) => {
        if (t.rule_value && t.rule_value.trim().length > 10 && !tokens.includes(t.rule_value.trim())) {
          tokens.push(t.rule_value.trim());
        }
      });
    }
  } catch (err) {
    console.warn("Could not query DB for meta_tokens:", err);
  }

  if (process.env.META_ACCESS_TOKEN && !tokens.includes(process.env.META_ACCESS_TOKEN.trim())) {
    tokens.push(process.env.META_ACCESS_TOKEN.trim());
  }

  return tokens;
}

/**
 * Returns the primary Meta Access Token for project or global fallback
 */
export async function getEffectiveMetaToken(adminSupabase: any, projectSlug?: string): Promise<string | null> {
  const tokens = await getAllActiveMetaTokens(adminSupabase, projectSlug);
  return tokens[0] || null;
}

/**
 * Updates or sets the global Meta Access Token in ad_spend_mappings
 */
export async function updateMetaTokenAction(newToken: string) {
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
      throw new Error("Only developers, founders and admins can update Meta tokens");
    }

    const cleanToken = (newToken || "").trim();
    if (!cleanToken) throw new Error("Токен не може бути порожнім");

    // Test token with Meta Graph API
    const testUrl = `https://graph.facebook.com/v25.0/me?access_token=${cleanToken}`;
    const testRes = await fetch(testUrl);
    if (!testRes.ok) {
      const errJson = await testRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Meta API HTTP ${testRes.status}: Недійсний токен`);
    }

    const { data: existing } = await adminSupabase
      .from("ad_spend_mappings")
      .select("id")
      .eq("rule_type", "meta_token")
      .maybeSingle();

    if (existing) {
      const { error: updErr } = await adminSupabase
        .from("ad_spend_mappings")
        .update({ rule_value: cleanToken })
        .eq("id", existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await adminSupabase
        .from("ad_spend_mappings")
        .insert({
          project_slug: "bw_main",
          rule_type: "meta_token",
          rule_value: cleanToken
        });
      if (insErr) throw insErr;
    }

    return { success: true, message: "Токен Meta Graph API успішно перевірено та оновлено в системі!" };
  } catch (err: any) {
    return { error: err.message || "Failed to update Meta token" };
  }
}

/**
 * Fetches all accessible Meta Ad Accounts via Meta Graph API with DB fallback
 */
export async function getMetaAdAccountsAction() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // 1. Get current mappings and known accounts from DB
    const { data: mappings } = await adminSupabase
      .from("ad_spend_mappings")
      .select("project_slug, rule_value")
      .neq("rule_type", "meta_token");

    const mappingMap = new Map((mappings || []).map((m: any) => [m.project_slug, m.rule_value]));

    // Known default accounts map for quick fallback
    const knownAccounts: Record<string, { name: string; currency: string }> = {
      "act_1451088823442765": { name: "Sergiy.Chernyavskyy.Business (Сергій)", currency: "USD" },
      "act_1363085972126749": { name: "Тейпування 1 (Світлана)", currency: "USD" },
      "act_338278609686728": { name: "338278609686728 (Вікторія Візуал)", currency: "USD" },
      "act_964399519877110": { name: "Вікторія Ч (Черниш)", currency: "USD" },
      "act_181400377513509": { name: "Matviyko (Софія)", currency: "USD" },
      "act_450528287913104": { name: "Clean Klinom", currency: "USD" },
      "act_474408336377296": { name: "Юрий Захарчук", currency: "USD" }
    };

    let accountsList: any[] = [];
    let apiWarning: string | null = null;
    const seenAccountIds = new Set<string>();

    const tokens = await getAllActiveMetaTokens(adminSupabase);
    for (const token of tokens) {
      try {
        const url = `https://graph.facebook.com/v25.0/me/adaccounts?fields=name,account_id,id,account_status,currency,amount_spent,business&limit=50&access_token=${token}`;
        const res = await fetch(url, { next: { revalidate: 300 } });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            json.data.forEach((acc: any) => {
              if (acc.id && !seenAccountIds.has(acc.id)) {
                seenAccountIds.add(acc.id);
                accountsList.push({
                  id: acc.id,
                  accountId: acc.account_id,
                  name: acc.business?.name ? `${acc.name} (${acc.business.name})` : acc.name,
                  currency: acc.currency,
                  amountSpent: acc.amount_spent,
                  status: acc.account_status
                });
              }
            });
          }
        }
      } catch (err: any) {
        apiWarning = err.message;
      }
    }

    // If API returned 0 accounts or had warning, populate from known DB mappings
    if (accountsList.length === 0) {
      const allAccIds = new Set<string>([
        ...Object.keys(knownAccounts),
        ...(mappings || []).map((m: any) => m.rule_value).filter(Boolean)
      ]);

      accountsList = Array.from(allAccIds).map((accId) => {
        const info = knownAccounts[accId] || { name: accId, currency: "USD" };
        return {
          id: accId.startsWith("act_") ? accId : `act_${accId}`,
          accountId: accId.replace("act_", ""),
          name: info.name,
          currency: info.currency,
          amountSpent: "0",
          status: 1
        };
      });
    }

    return {
      success: true,
      accounts: accountsList,
      mappings: Object.fromEntries(mappingMap),
      apiWarning
    };
  } catch (err: any) {
    return { error: err.message || "Failed to fetch Meta ad accounts" };
  }
}

/**
 * Fetches campaigns for a specific Meta Ad Account with DB fallback
 */
export async function getMetaAccountCampaignsAction(adAccountId: string) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const cleanAccountId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const tokens = await getAllActiveMetaTokens(adminSupabase);
    let campaigns: any[] = [];
    let apiWarning: string | null = null;

    for (const token of tokens) {
      try {
        const url = `https://graph.facebook.com/v25.0/${cleanAccountId}/campaigns?fields=id,name,status,effective_status,objective,created_time&limit=50&access_token=${token}`;
        const res = await fetch(url, { next: { revalidate: 60 } });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            campaigns = json.data.map((c: any) => ({
              id: c.id,
              name: c.name,
              status: c.status,
              effectiveStatus: c.effective_status,
              objective: c.objective,
              createdTime: c.created_time
            }));
            break; // Successfully fetched from working token
          }
        }
      } catch (err: any) {
        apiWarning = err.message;
      }
    }

    // Fallback to daily_traffic_and_costs in database if Graph API returned 0 campaigns
    if (campaigns.length === 0) {
      // Find project slug from mapping
      const { data: mapping } = await adminSupabase
        .from("ad_spend_mappings")
        .select("project_slug")
        .eq("rule_value", cleanAccountId)
        .maybeSingle();

      let projectQuery = adminSupabase.from("daily_traffic_and_costs").select("campaign_id, campaign_name").not("campaign_name", "is", null);

      if (mapping?.project_slug) {
        const { data: project } = await adminSupabase.from("projects").select("id").eq("slug", mapping.project_slug).maybeSingle();
        if (project?.id) {
          projectQuery = projectQuery.eq("project_id", project.id);
        }
      }

      const { data: dbCosts } = await projectQuery.limit(200);
      const uniqueMap = new Map<string, any>();

      (dbCosts || []).forEach((r: any) => {
        const name = String(r.campaign_name || "").trim();
        if (name && !uniqueMap.has(name)) {
          uniqueMap.set(name, {
            id: r.campaign_id || name,
            name: name,
            status: "ACTIVE",
            effectiveStatus: "ACTIVE",
            objective: "LEAD_GENERATION",
            createdTime: new Date().toISOString()
          });
        }
      });

      campaigns = Array.from(uniqueMap.values());
    }

    return { success: true, campaigns, apiWarning };
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

    // Trigger immediate background sync for this project
    (async () => {
      try {
        const tokens = await getAllActiveMetaTokens(adminSupabase, projectSlug);
        if (tokens.length > 0) {
          const apiVersion = process.env.META_API_VERSION || "v25.0";
          const today = new Date();
          const until = today.toISOString().split("T")[0];
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

          const { data: project } = await adminSupabase
            .from("projects")
            .select("id")
            .eq("slug", projectSlug)
            .single();

          if (project?.id) {
            const { getExchangeRates } = await import("@/lib/exchange-rate");
            const todayRates = await getExchangeRates();

            for (const token of tokens) {
              const url = `https://graph.facebook.com/${apiVersion}/${cleanAccountId}/insights?access_token=${token}&level=ad&fields=campaign_id,campaign_name,adset_id,ad_id,spend,impressions,clicks,actions,action_values,date_start&time_increment=1&time_range=${JSON.stringify({ since, until })}&limit=500`;
              const res = await fetch(url);
              if (res.ok) {
                const data = await res.json();
                const insights = data.data || [];
                if (insights.length > 0) {
                  const recordsToInsert = insights.map((item: any) => {
                    const spend = Number(item.spend || 0);
                    const actions = item.actions || [];
                    const actionValues = item.action_values || [];

                    // Primary web & instant leads
                    const primaryLeadAction = actions.find((a: any) =>
                      [
                        "offsite_conversion.fb_pixel_lead",
                        "onsite_web_lead",
                        "lead",
                        "onsite_conversion.lead_grouped",
                        "offsite_lead_add_20_s_calls"
                      ].includes(a.action_type)
                    );

                    const messagingLeadAction = actions.find((a: any) =>
                      [
                        "onsite_conversion.messaging_conversation_started_7d",
                        "onsite_conversion.total_messaging_connection"
                      ].includes(a.action_type)
                    );

                    const customLeadAction = actions.find((a: any) =>
                      typeof a.action_type === "string" && a.action_type.startsWith("offsite_conversion.custom.")
                    );

                    let metaLeads = 0;
                    if (primaryLeadAction) {
                      metaLeads = Number(primaryLeadAction.value || 0);
                    } else if (messagingLeadAction) {
                      metaLeads = Number(messagingLeadAction.value || 0);
                    } else if (customLeadAction) {
                      metaLeads = Number(customLeadAction.value || 0);
                    }

                    const purchaseAction = actions.find((a: any) =>
                      [
                        "offsite_conversion.fb_pixel_purchase",
                        "onsite_web_purchase",
                        "omni_purchase",
                        "purchase",
                        "onsite_web_app_purchase",
                        "web_in_store_purchase",
                        "web_app_in_store_purchase",
                        "offsite_purchase_add_20_s_calls"
                      ].includes(a.action_type)
                    );
                    const metaPurchases = purchaseAction ? Number(purchaseAction.value || 0) : 0;

                    const purchaseValAction = actionValues.find((a: any) =>
                      [
                        "offsite_conversion.fb_pixel_purchase",
                        "onsite_web_purchase",
                        "omni_purchase",
                        "purchase",
                        "onsite_web_app_purchase",
                        "web_in_store_purchase",
                        "web_app_in_store_purchase",
                        "offsite_purchase_add_20_s_calls"
                      ].includes(a.action_type)
                    );
                    const metaPurchaseValueUsd = purchaseValAction ? Number(purchaseValAction.value || 0) : 0;

                    return {
                      project_id: project.id,
                      date: item.date_start,
                      utm_source: "meta",
                      spend_usd: Number(spend.toFixed(2)),
                      spend: Number(spend.toFixed(2)),
                      spend_uah: Number((spend * todayRates.usdRate).toFixed(2)),
                      clicks: Number(item.clicks || 0),
                      impressions: Number(item.impressions || 0),
                      campaign_id: item.campaign_id,
                      campaign_name: item.campaign_name,
                      adset_id: item.adset_id || "",
                      ad_id: item.ad_id || "",
                      actions,
                      action_values: actionValues,
                      meta_leads: metaLeads,
                      meta_purchases: metaPurchases,
                      meta_purchase_value_usd: Number(metaPurchaseValueUsd.toFixed(2))
                    };
                  });

                  await adminSupabase
                    .from("daily_traffic_and_costs")
                    .upsert(recordsToInsert, { onConflict: "project_id,date,utm_source,campaign_id,ad_id" });
                }
                break;
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("Could not immediately sync Meta spend after binding:", syncErr);
      }
    })();

    return { success: true, projectSlug, adAccountId: cleanAccountId };
  } catch (err: any) {
    return { error: err.message || "Failed to bind Meta ad account" };
  }
}

export async function getSendPulseBotsAction(projectId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: project } = await supabase
      .from("projects")
      .select("id, slug")
      .eq("id", projectId)
      .single();

    if (!project) return { error: "Project not found" };

    const { getProjectSendPulseBots } = await import("@/lib/sendpulse/service");
    const bots = await getProjectSendPulseBots(project.slug || "sergiy");

    return { success: true, bots };
  } catch (err: any) {
    console.error("Error in getSendPulseBotsAction:", err);
    return { error: err.message || "Failed to fetch SendPulse bots" };
  }
}

export async function getFunnelBotEventsAction(projectId: string, funnelId?: string, botUsername?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const adminSupabase = createAdminClient();
    let query = adminSupabase
      .from("bot_funnel_events")
      .select("*")
      .eq("project_id", projectId);

    if (funnelId && funnelId !== "all" && funnelId !== "unassigned") {
      query = query.eq("funnel_id", funnelId);
    } else if (botUsername && botUsername !== "all") {
      const cleanBot = botUsername.replace("@", "").trim();
      query = query.or(`bot_id.eq.${cleanBot},bot_id.eq.@${cleanBot}`);
    }

    const { data: events, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    // Aggregate by step (unique users per step)
    const stepCounts: Record<string, number> = {};
    const stepUserSets: Record<string, Set<string>> = {};

    (events || []).forEach((e: any) => {
      const s = (e.step || "other").toLowerCase();
      const userKey = e.telegram_id 
        ? `tg_${e.telegram_id}` 
        : e.customer_id 
        ? `cust_${e.customer_id}` 
        : e.bw_cid 
        ? `bw_${e.bw_cid}` 
        : `ev_${e.id}`;

      if (!stepUserSets[s]) stepUserSets[s] = new Set();
      stepUserSets[s].add(userKey);
    });

    Object.keys(stepUserSets).forEach((s) => {
      stepCounts[s] = stepUserSets[s].size;
    });

    return {
      success: true,
      events: events || [],
      stepCounts
    };
  } catch (err: any) {
    console.error("Error in getFunnelBotEventsAction:", err);
    return { error: err.message || "Failed to fetch bot events" };
  }
}
export async function getSendPulseBotContactsAction(projectId: string, botUsernameOrId: string, limit: number = 100, funnelId?: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, slug, name, sendpulse_client_id, sendpulse_client_secret")
      .eq("id", projectId)
      .single();

    if (!project) return { error: "Project not found" };

    const { getSendPulseAccessToken } = await import("@/lib/sendpulse/service");
    const token = await getSendPulseAccessToken(project.slug || "sergiy");

    // 1. Get bot
    const botsRes = await fetch("https://api.sendpulse.com/telegram/bots", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const botsData = await botsRes.json();
    const cleanBotQuery = botUsernameOrId.replace(/^@/, "").toLowerCase().trim();
    const bot = (botsData.data || []).find((b: any) => {
      const u = (b.channel_data?.username || b.name || "").replace(/^@/, "").toLowerCase().trim();
      return u === cleanBotQuery || b.id === botUsernameOrId;
    });

    if (!bot) {
      return { error: `Бот @${cleanBotQuery} не знайдений у SendPulse акаунті проєкту` };
    }

    // 2. Get bot contacts from SendPulse
    const contactsRes = await fetch(`https://api.sendpulse.com/telegram/contacts?bot_id=${bot.id}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contactsJson = await contactsRes.json();
    const rawContacts = contactsJson.data || [];

    // 3. Fetch CRM customers, orders, and project-specific club subscriptions
    const isViktoria = project.slug === "viktoria_chernysh";

    const [customersRes, ordersRes, clubSubsRes, leadsRes, botEventsRes] = await Promise.all([
      adminSupabase
        .from("unified_customers")
        .select("id, name, phone, email, telegram, telegram_id, created_at")
        .eq("project_id", project.id),
      adminSupabase
        .from("unified_orders")
        .select("id, customer_id, order_id, amount, status, metadata, funnel_id, created_at")
        .eq("project_id", project.id),
      isViktoria
        ? adminSupabase.from("viktoria_club_subscriptions").select("*").order("created_at", { ascending: false })
        : adminSupabase.from("club_subscriptions").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      isViktoria
        ? adminSupabase.from("viktoria_chernysh_leads").select("name, phone, telegram, amount, status, order_id")
        : Promise.resolve({ data: [] }),
      adminSupabase
        .from("bot_funnel_events")
        .select("id, step, funnel_id, customer_id, bw_cid, telegram_id, created_at, payload")
        .eq("project_id", project.id)
    ]);

    const customers = customersRes.data || [];
    const orders = ordersRes.data || [];
    const clubSubs = clubSubsRes.data || [];
    const projectLeads = leadsRes.data || [];
    const botEvents = botEventsRes.data || [];

    // Helper to format tariff
    const formatTariff = (t: string) => {
      if (!t || t === "none") return "Без тарифу";
      if (t === "trial_1_week") return "Тріал 7 днів (1 ₴)";
      if (t === "standard_1_month") return "Стандарт 1 міс";
      if (t === "standard_3_months") return "Стандарт 3 міс";
      if (t === "vip_1_month") return "VIP 1 міс";
      if (t === "mini_course_279") return "Практикум (279 ₴)";
      if (t === "individual_consultation") return "Консультація";
      return t;
    };

    // Helper to format club status
    const formatClubStatus = (s: string, t?: string) => {
      if (!s) return "Не визначено";
      if (s === "active") return t === "trial_1_week" ? "🟡 Тріал активний" : "🟢 Активна підписка";
      if (s === "expired") return "🔴 Закінчилась";
      if (s === "pending_payment") return "⏳ Очікує оплати";
      if (s === "payment_failed") return "⚠️ Помилка оплати";
      if (s === "funnel_day_1") return "Воронка: День 1";
      if (s === "funnel_day_2") return "Воронка: День 2";
      if (s === "funnel_day_3") return "Воронка: День 3";
      if (s === "funnel_trial_offer_1") return "Офер тріалу 1";
      if (s === "funnel_trial_offer_2") return "Офер тріалу 2";
      if (s === "funnel_completed") return "Воронку завершено";
      return s;
    };

    const seenContactIds = new Set<string>();
    const seenTgUserIds = new Set<string>();
    const seenUsernames = new Set<string>();

    const isPhoneMatch = (p1?: string | null, p2?: string | null) => {
      if (!p1 || !p2) return false;
      const c1 = String(p1).replace(/[^0-9]/g, "");
      const c2 = String(p2).replace(/[^0-9]/g, "");
      if (c1.length < 9 || c2.length < 9) return false;
      return c1 === c2 || c1.endsWith(c2.slice(-9)) || c2.endsWith(c1.slice(-9));
    };

    // 4. Map contacts with CRM, Club Subscriptions, and Bot Funnel Events
    const matchedContacts = rawContacts.map((c: any) => {
      seenContactIds.add(c.id);
      const spUsername = (c.username || c.channel_data?.username || "").replace(/^@/, "").toLowerCase().trim();
      const spPhone = (c.phone || c.channel_data?.phone || c.variables?.phone || "").replace(/[^0-9]/g, "");
      const spOrderId = (c.variables?.order_id || "").trim();
      const spTgId = c.telegram_id || c.channel_data?.id || null;

      if (spTgId) seenTgUserIds.add(String(spTgId));
      if (spUsername) seenUsernames.add(spUsername);

      // Match in Club Subscriptions
      const matchedClubSub = clubSubs.find((sub: any) => {
        if (spTgId && sub.tg_user_id && String(sub.tg_user_id) === String(spTgId)) return true;
        const subTg = (sub.telegram_username || "").replace(/^@/, "").toLowerCase().trim();
        if (spUsername && subTg && spUsername === subTg) return true;
        if (isPhoneMatch(spPhone, sub.phone)) return true;
        if (spOrderId && sub.order_id === spOrderId) return true;
        return false;
      });

      // Match in Project Leads
      const matchedLead = projectLeads.find((l: any) => {
        const lTg = (l.telegram || "").replace(/^@/, "").toLowerCase().trim();
        if (spUsername && lTg && spUsername === lTg) return true;
        if (isPhoneMatch(spPhone, l.phone)) return true;
        if (spOrderId && l.order_id === spOrderId) return true;
        return false;
      });

      // Match in Unified CRM Customers
      const matchedCustomer = customers.find((cust: any) => {
        if (spTgId && cust.telegram_id && String(cust.telegram_id) === String(spTgId)) return true;
        const custTg = (cust.telegram || "").replace(/^@/, "").toLowerCase().trim();
        if (spUsername && custTg && spUsername === custTg) return true;
        if (isPhoneMatch(spPhone, cust.phone)) return true;
        if (spOrderId) {
          const orderMatch = orders.find((o: any) => o.order_id === spOrderId || o.id === spOrderId);
          if (orderMatch && orderMatch.customer_id === cust.id) return true;
        }
        return false;
      });

      const bwCid = matchedCustomer
        ? `bw_${matchedCustomer.id.replace(/-/g, "").substring(0, 16)}`
        : matchedClubSub
        ? `bw_${matchedClubSub.id.replace(/-/g, "").substring(0, 16)}`
        : (c.variables?.bw_cid || null);

      // Match in bot_funnel_events
      const contactEvents = botEvents.filter((e: any) => {
        if (spTgId && e.telegram_id && String(e.telegram_id) === String(spTgId)) return true;
        if (matchedCustomer && e.customer_id && e.customer_id === matchedCustomer.id) return true;
        if (bwCid && e.bw_cid && e.bw_cid === bwCid) return true;
        const eTgUser = (e.payload?.['0']?.contact?.username || e.payload?.contact?.username || "").replace(/^@/, "").toLowerCase().trim();
        if (spUsername && eTgUser && spUsername === eTgUser) return true;
        return false;
      });

      const funnelSpecificEvents = funnelId 
        ? contactEvents.filter((e: any) => e.funnel_id === funnelId)
        : contactEvents;

      const passedSteps = Array.from(new Set(funnelSpecificEvents.map((e: any) => e.step)));
      const allFunnelSteps = Array.from(new Set(contactEvents.map((e: any) => e.step)));
      
      const stepTimestamps: Record<string, string> = {};
      funnelSpecificEvents.forEach((e: any) => {
        if (!stepTimestamps[e.step] || new Date(e.created_at) > new Date(stepTimestamps[e.step])) {
          stepTimestamps[e.step] = e.created_at;
        }
      });

      // Calculate paid amounts scoped by funnel
      const customerOrders = matchedCustomer ? orders.filter((o: any) => o.customer_id === matchedCustomer.id) : [];
      const funnelOrders = customerOrders.filter((o: any) => !funnelId || o.funnel_id === funnelId);
      const otherFunnelOrders = customerOrders.filter((o: any) => funnelId && o.funnel_id && o.funnel_id !== funnelId);

      let funnelPaidAmount = funnelOrders
        .filter((o: any) => ["closed_won", "paid", "Approved", "Оплачено"].includes(o.status))
        .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

      const otherFunnelPaidAmount = otherFunnelOrders
        .filter((o: any) => ["closed_won", "paid", "Approved", "Оплачено"].includes(o.status))
        .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

      let totalPaidAmount = customerOrders
        .filter((o: any) => ["closed_won", "paid", "Approved", "Оплачено"].includes(o.status))
        .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

      if (totalPaidAmount === 0 && matchedLead && ["Оплачено", "Купив курс", "Купив(-ла) Трипвайер"].includes(matchedLead.status)) {
        totalPaidAmount = Number(matchedLead.amount || 0);
        if (!funnelId) funnelPaidAmount = totalPaidAmount;
      }

      const isMatched = !!(matchedCustomer || matchedClubSub || matchedLead);

      const resolvedName =
        matchedClubSub?.name ||
        matchedLead?.name ||
        matchedCustomer?.name ||
        (c.name && c.name !== "Telegram User" && c.name !== "Пользователь Telegram" ? c.name : null) ||
        (spUsername ? `@${spUsername}` : "Учасник клубу");

      const resolvedPhone = matchedClubSub?.phone || matchedLead?.phone || matchedCustomer?.phone || spPhone || null;

      return {
        id: c.id,
        telegramId: spTgId,
        name: resolvedName,
        username: spUsername ? `@${spUsername}` : (matchedClubSub?.telegram_username ? `@${matchedClubSub.telegram_username.replace(/^@/, '')}` : (matchedCustomer?.telegram ? `@${matchedCustomer.telegram.replace(/^@/, '')}` : null)),
        phone: resolvedPhone,
        email: matchedCustomer?.email || null,
        bwCid,
        isMatched,
        matchedCustomerId: matchedCustomer?.id || matchedClubSub?.id || null,
        ordersCount: customerOrders.length || (totalPaidAmount > 0 ? 1 : 0),
        totalPaidAmount,
        funnelPaidAmount,
        otherFunnelPaidAmount,
        hasOtherFunnelOrders: otherFunnelOrders.length > 0 || otherFunnelPaidAmount > 0,
        passedSteps,
        allFunnelSteps,
        stepTimestamps,
        hasEventsInThisFunnel: passedSteps.length > 0,
        tariff: matchedClubSub?.tariff ? formatTariff(matchedClubSub.tariff) : null,
        rawTariff: matchedClubSub?.tariff || null,
        clubStatus: matchedClubSub?.status ? formatClubStatus(matchedClubSub.status, matchedClubSub.tariff) : null,
        rawClubStatus: matchedClubSub?.status || null,
        isSubscription: Boolean(matchedClubSub?.is_subscription),
        expiresAt: matchedClubSub?.expires_at || null,
        variables: c.variables || {},
        tags: c.tags || [],
        lastActivity: c.last_activity_at || matchedClubSub?.updated_at || c.created_at
      };
    });

    // 5. Append Club Subscriptions that were not present in the SendPulse page
    if (clubSubs.length > 0) {
      for (const sub of clubSubs) {
        const subTgId = sub.tg_user_id ? String(sub.tg_user_id) : null;
        const subUsername = (sub.telegram_username || "").replace(/^@/, "").toLowerCase().trim();

        if (subTgId && seenTgUserIds.has(subTgId)) continue;
        if (subUsername && seenUsernames.has(subUsername)) continue;

        // Find customer/orders/leads for this club sub
        const matchedCust = customers.find((c: any) =>
          (subTgId && c.telegram_id && String(c.telegram_id) === subTgId) ||
          (subUsername && c.telegram && c.telegram.toLowerCase().replace(/^@/, '') === subUsername) ||
          (sub.phone && c.phone && (c.phone.includes(sub.phone) || sub.phone.includes(c.phone)))
        );

        const matchedLead = projectLeads.find((l: any) =>
          (subUsername && l.telegram && l.telegram.toLowerCase().replace(/^@/, '') === subUsername) ||
          (sub.phone && l.phone && (l.phone.includes(sub.phone) || sub.phone.includes(l.phone))) ||
          (sub.order_id && l.order_id === sub.order_id)
        );

        const custOrders = matchedCust ? orders.filter((o: any) => o.customer_id === matchedCust.id) : [];
        let totalPaid = custOrders
          .filter((o: any) => ["closed_won", "paid", "Approved", "Оплачено"].includes(o.status))
          .reduce((sum: number, o: any) => sum + Number(o.amount || 0), 0);

        if (totalPaid === 0 && matchedLead && ["Оплачено", "Купив курс", "Купив(-ла) Трипвайер"].includes(matchedLead.status)) {
          totalPaid = Number(matchedLead.amount || 0);
        }

        const bwCid = matchedCust
          ? `bw_${matchedCust.id.replace(/-/g, "").substring(0, 16)}`
          : `bw_${sub.id.replace(/-/g, "").substring(0, 16)}`;

        matchedContacts.push({
          id: sub.id,
          telegramId: sub.tg_user_id,
          name: sub.name || matchedCust?.name || matchedLead?.name || (subUsername ? `@${subUsername}` : "Учасник клубу"),
          username: sub.telegram_username ? `@${sub.telegram_username.replace(/^@/, '')}` : null,
          phone: sub.phone || matchedCust?.phone || matchedLead?.phone || null,
          email: matchedCust?.email || null,
          bwCid,
          isMatched: true,
          matchedCustomerId: matchedCust?.id || sub.id,
          ordersCount: custOrders.length || (totalPaid > 0 ? 1 : 0),
          totalPaidAmount: totalPaid,
          funnelPaidAmount: totalPaid,
          otherFunnelPaidAmount: 0,
          hasOtherFunnelOrders: false,
          passedSteps: [],
          allFunnelSteps: [],
          stepTimestamps: {},
          hasEventsInThisFunnel: false,
          tariff: formatTariff(sub.tariff),
          rawTariff: sub.tariff,
          clubStatus: formatClubStatus(sub.status, sub.tariff),
          rawClubStatus: sub.status,
          isSubscription: Boolean(sub.is_subscription),
          expiresAt: sub.expires_at,
          variables: { tariff: sub.tariff, status: sub.status, order_id: sub.order_id },
          tags: [sub.tariff, sub.status].filter(Boolean),
          lastActivity: sub.updated_at || sub.created_at
        });
      }
    }

    return {
      success: true,
      bot: {
        id: bot.id,
        name: bot.name,
        username: bot.channel_data?.username || bot.username,
        totalSubscribers: Math.max(bot.inbox?.total || 0, matchedContacts.length)
      },
      contacts: matchedContacts
    };
  } catch (err: any) {
    console.error("Error in getSendPulseBotContactsAction:", err);
    return { error: err.message || "Failed to fetch SendPulse bot contacts" };
  }
}

export async function syncSendPulseBotContactsAction(projectId: string, botUsernameOrId: string) {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();
    const { data: project } = await adminSupabase
      .from("projects")
      .select("id, slug, name, sendpulse_client_id, sendpulse_client_secret")
      .eq("id", projectId)
      .single();

    if (!project) return { error: "Project not found" };

    const { getSendPulseAccessToken } = await import("@/lib/sendpulse/service");
    const token = await getSendPulseAccessToken(project.slug || "sergiy");

    // 1. Get bot
    const botsRes = await fetch("https://api.sendpulse.com/telegram/bots", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const botsData = await botsRes.json();
    const cleanBotQuery = botUsernameOrId.replace(/^@/, "").toLowerCase().trim();
    const bot = (botsData.data || []).find((b: any) => {
      const u = (b.channel_data?.username || b.name || "").replace(/^@/, "").toLowerCase().trim();
      return u === cleanBotQuery || b.id === botUsernameOrId;
    });

    if (!bot) {
      return { error: `Бот @${cleanBotQuery} не знайдений` };
    }

    // 2. Fetch bot contacts
    const contactsRes = await fetch(`https://api.sendpulse.com/telegram/contacts?bot_id=${bot.id}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contactsJson = await contactsRes.json();
    const rawContacts = contactsJson.data || [];

    const isViktoria = project.slug === "viktoria_chernysh";

    // 3. Fetch CRM customers & club subscriptions
    const [customersRes, ordersRes, clubSubsRes] = await Promise.all([
      adminSupabase
        .from("unified_customers")
        .select("id, name, phone, email, telegram, telegram_id")
        .eq("project_id", project.id),
      adminSupabase
        .from("unified_orders")
        .select("id, customer_id, order_id, amount, status")
        .eq("project_id", project.id),
      isViktoria
        ? adminSupabase.from("viktoria_club_subscriptions").select("*")
        : adminSupabase.from("club_subscriptions").select("*").eq("project_id", project.id)
    ]);

    const customers = customersRes.data || [];
    const orders = ordersRes.data || [];
    const clubSubs = clubSubsRes.data || [];

    const isPhoneMatch = (p1?: string | null, p2?: string | null) => {
      if (!p1 || !p2) return false;
      const c1 = String(p1).replace(/[^0-9]/g, "");
      const c2 = String(p2).replace(/[^0-9]/g, "");
      if (c1.length < 9 || c2.length < 9) return false;
      return c1 === c2 || c1.endsWith(c2.slice(-9)) || c2.endsWith(c1.slice(-9));
    };

    let syncedCount = 0;

    for (const c of rawContacts) {
      const spUsername = (c.username || c.channel_data?.username || "").replace(/^@/, "").toLowerCase().trim();
      const spPhone = (c.phone || c.channel_data?.phone || c.variables?.phone || "").replace(/[^0-9]/g, "");
      const spOrderId = (c.variables?.order_id || "").trim();
      const spTgId = c.telegram_id || c.channel_data?.id || null;

      const matchedClubSub = clubSubs.find((sub: any) => {
        if (spTgId && sub.tg_user_id && String(sub.tg_user_id) === String(spTgId)) return true;
        const subTg = (sub.telegram_username || "").replace(/^@/, "").toLowerCase().trim();
        if (spUsername && subTg && spUsername === subTg) return true;
        if (isPhoneMatch(spPhone, sub.phone)) return true;
        if (spOrderId && sub.order_id === spOrderId) return true;
        return false;
      });

      let matchedCustomer = customers.find((cust: any) => {
        if (spTgId && cust.telegram_id && String(cust.telegram_id) === String(spTgId)) return true;
        const custTg = (cust.telegram || "").replace(/^@/, "").toLowerCase().trim();
        if (spUsername && custTg && spUsername === custTg) return true;
        if (isPhoneMatch(spPhone, cust.phone)) return true;
        if (spOrderId) {
          const orderMatch = orders.find((o: any) => o.order_id === spOrderId || o.id === spOrderId);
          if (orderMatch && orderMatch.customer_id === cust.id) return true;
        }
        return false;
      });

      // If no customer is matched, auto-create a new profile in unified_customers so they have a persistent bw_cid everywhere!
      if (!matchedCustomer && !matchedClubSub) {
        const newName = (c.name && c.name !== "Telegram User" && c.name !== "Пользователь Telegram" ? c.name : (spUsername ? `@${spUsername}` : "Підписник Telegram")).trim();
        const { data: createdCust } = await adminSupabase
          .from("unified_customers")
          .insert({
            project_id: project.id,
            name: newName,
            telegram: spUsername ? `@${spUsername}` : null,
            telegram_id: spTgId ? Number(spTgId) : null,
            phone: spPhone ? `+${spPhone}` : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select("id, name, phone, email, telegram, telegram_id")
          .single();

        if (createdCust) {
          matchedCustomer = createdCust;
          customers.push(createdCust);

          const newBwCid = `bw_${createdCust.id.replace(/-/g, "").substring(0, 16)}`;
          // Also create initial lead order in unified_orders for CRM visibility
          await adminSupabase.from("unified_orders").insert({
            project_id: project.id,
            customer_id: createdCust.id,
            amount: 0.00,
            status: "lead",
            order_id: `SP_BOT_${spTgId || c.id}`,
            bw_cid: newBwCid,
            page_path: "/bot",
            metadata: {
              source: "sendpulse_bot_sync",
              bot_name: bot.name,
              username: spUsername
            },
            created_at: new Date().toISOString()
          });
        }
      }

      if (matchedCustomer || matchedClubSub) {
        syncedCount++;
        const targetPhone = matchedCustomer?.phone || matchedClubSub?.phone;
        const targetName = matchedCustomer?.name || matchedClubSub?.name;
        const targetBwCid = matchedCustomer
          ? `bw_${matchedCustomer.id.replace(/-/g, "").substring(0, 16)}`
          : `bw_${matchedClubSub.id.replace(/-/g, "").substring(0, 16)}`;

        // Update customer telegram_id if missing
        if (matchedCustomer && spTgId && !matchedCustomer.telegram_id) {
          await adminSupabase
            .from("unified_customers")
            .update({ telegram_id: spTgId })
            .eq("id", matchedCustomer.id);
        }

        // Set variables in SendPulse
        if (targetPhone && !c.variables?.phone) {
          try {
            await fetch("https://api.sendpulse.com/telegram/contacts/setVariable", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                bot_id: bot.id,
                contact_id: c.id,
                variable_name: "phone",
                variable_value: targetPhone
              })
            });
          } catch {}
        }

        if (targetBwCid && (!c.variables?.bw_cid || c.variables?.bw_cid !== targetBwCid)) {
          try {
            await fetch("https://api.sendpulse.com/telegram/contacts/setVariable", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                bot_id: bot.id,
                contact_id: c.id,
                variable_name: "bw_cid",
                variable_value: targetBwCid
              })
            });
          } catch {}
        }
      }
    }

    return {
      success: true,
      totalContacts: rawContacts.length,
      syncedCount
    };
  } catch (err: any) {
    console.error("Error in syncSendPulseBotContactsAction:", err);
    return { error: err.message || "Failed to sync SendPulse bot contacts" };
  }
}



