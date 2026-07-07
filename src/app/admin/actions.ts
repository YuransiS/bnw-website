"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { statusMapper } from "@/lib/statusMapper";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { devLogger } from "@/utils/logger";
import { rebuildProjectCache } from "@/lib/crmCache";

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
    (profile && (profile.role === "admin" || profile.role === "superman"));

  if (isActualDev) {
    const cookieStore = await cookies();
    const impersonated = cookieStore.get("crm_impersonated_role")?.value;
    if (impersonated && ["superman", "producer", "rop", "sales", "pending"].includes(impersonated)) {
      profile = profile ? { ...profile, role: impersonated } : { id: user.id, email: user.email || "", role: impersonated };
    }
  }

  if (!profile || profile.role === "pending") {
    throw new Error("Access Pending Approval");
  }

  const isSuperman = profile.role === "admin" || profile.role === "superman";

  // Fetch allowed projects mapping
  let allowedProjects: { id: string; name: string; slug: string }[] = [];

  if (isSuperman) {
    // Superman role sees all active projects without checking profile_projects mapping and RLS
    const { data: allProj } = await adminSupabase
      .from("projects")
      .select("id, name, slug, is_active")
      .order("name");
    const projectsList = allProj || [];

    allowedProjects = projectsList.filter((p) => p.is_active);
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug, is_active)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.is_active !== false);
  }

  // Resolve current active project slug
  let activeSlug = selectedProjectSlug;
  if (!activeSlug && allowedProjects.length > 0) {
    activeSlug = isSuperman ? "all" : allowedProjects[0].slug;
  }

  // Verify access to requested slug
  if (activeSlug === "all" && !isSuperman) {
    activeSlug = allowedProjects.length > 0 ? allowedProjects[0].slug : undefined;
  }

  if (activeSlug && activeSlug !== "all" && !allowedProjects.some((p) => p.slug === activeSlug)) {
    activeSlug = allowedProjects.length > 0 ? allowedProjects[0].slug : undefined;
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
  if (profile.role === "admin" || profile.role === "superman") return true;

  const { data } = await supabase
    .from("profile_projects")
    .select("project_id")
    .eq("profile_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!data) throw new Error("Access Denied: You do not have access to this project.");
  return true;
}

const getUkraineOffset = (year: number, month: number, day: number): string => {
  if (month > 2 && month < 9) return "+03:00";
  if (month < 2 || month > 9) return "+02:00";
  
  const lastSunday = (m: number) => {
    const d = new Date(year, m + 1, 0);
    const dayOfWeek = d.getDay();
    return d.getDate() - dayOfWeek;
  };
  
  if (month === 2) {
    return day >= lastSunday(2) ? "+03:00" : "+02:00";
  }
  if (month === 9) {
    return day < lastSunday(9) ? "+03:00" : "+02:00";
  }
  return "+02:00";
};

const parseClientDateRange = (dateStr: string, isEnd: boolean): Date => {
  if (!dateStr) return new Date();
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const offset = getUkraineOffset(year, month, day);
      const timeStr = isEnd ? "23:59:59.999" : "00:00:00.000";
      return new Date(`${dateStr}T${timeStr}${offset}`);
    }
  }
  const d = new Date(dateStr);
  if (isEnd) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
};

const statusPriority = (s: string): number => {
  if (s === "Купив курс") return 10;
  if (s === "Вирішив подумати") return 8;
  if (s === "Дзвінок проведено") return 7;
  if (s === "Назначено Дзвінок") return 6;
  if (s === "Купив(-ла) Трипвайер") return 5;
  if (s === "Списались") return 4;
  if (s === "Залишив заявку") return 3;
  if (s === "Зацікавлений лід") return 2;
  if (s === "Новий лід") return 1;
  if (s === "Відмова") return -1;
  return 0;
};

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
    if (["admin", "superman", "producer", "rop"].includes(profile.role)) {
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

    // 1. Superman Global Hub mode (direct fast RPC)
    if (isSuperman && activeSlug === "all") {
      const fetchAllOrdersForSummary = async () => {
        let results: any[] = [];
        let from = 0;
        const limit = 1000;
        let hasMore = true;
        while (hasMore) {
          const { data, error } = await adminSupabase
            .from("unified_orders")
            .select("id, project_id, amount, status, metadata, campaign_id, utm_campaign")
            .range(from, from + limit - 1);
          if (error) throw error;
          results = [...results, ...(data || [])];
          if ((data || []).length < limit) hasMore = false;
          else from += limit;
        }
        return results;
      };

      const [summaryRes, campaignRes] = await Promise.all([
        supabase.rpc("get_projects_summary"),
        supabase.rpc("get_campaigns_summary"),
      ]);

      let summary = summaryRes.data || [];
      let campaigns = campaignRes.data || [];

      if (summaryRes.error || campaignRes.error) {
        const [allProjects, allOrders, allSpends] = await Promise.all([
          supabase.from("projects").select("*").then(r => r.data || []),
          fetchAllOrdersForSummary(),
          supabase.from("daily_traffic_and_costs").select("*").then(r => r.data || []),
        ]);

        summary = (allProjects || []).map((proj) => {
          const projOrders = (allOrders || []).filter((o) => o.project_id === proj.id && o.status !== "Клик" && o.status !== "КликФормы");
          const projSpends = (allSpends || []).filter((s) => s.project_id === proj.id);

          const paidOrders = projOrders.filter((o) => {
            return statusMapper.normalize(o.status) === "closed_won";
          });

          const coursePaidOrders = paidOrders.filter((o) => {
            const originalSheet = String(o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "").trim();
            const targetSheet = String(o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || "").trim();
            const courseName = String(o.metadata?.leadData?.course || o.metadata?.lead?.leadData?.course || "").trim();
            const orderSlug = proj.slug || "";

            const isTripwire =
              ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(originalSheet) ||
              ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(targetSheet) ||
              courseName.includes("Mini-Course") ||
              courseName.includes("Practicum") ||
              courseName.includes("Практикум") ||
              courseName.includes("Міні-курс") ||
              orderSlug === "sofia" ||
              orderSlug === "valeria";

            return !isTripwire;
          });

          let usd_revenue = 0;
          let uah_revenue = 0;
          let eur_revenue = 0;

          coursePaidOrders.forEach((o) => {
            const amt = Number(o.amount || 0);
            const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();

            const isUsd = ["usd", "$"].includes(metaCurrency);
            const isEur = ["eur", "€"].includes(metaCurrency);
            const isUah = ["uah", "₴"].includes(metaCurrency);

            if (isUsd) {
              usd_revenue += amt;
            } else if (isEur) {
              eur_revenue += amt;
            } else if (isUah) {
              uah_revenue += amt;
            }
          });

          const spend = projSpends.reduce((sum, s) => sum + Number(s.spend || 0), 0);
          const uniqueCusts = new Set(projOrders.map((o) => o.customer_id).filter(Boolean));
          const leads_count = uniqueCusts.size;
          const cpl = leads_count > 0 ? Number((spend / leads_count).toFixed(2)) : 0;

          return {
            project_id: proj.id,
            project_name: proj.name,
            project_slug: proj.slug,
            spend,
            leads_count,
            cpl,
            usd_revenue,
            uah_revenue,
            eur_revenue,
          };
        }).sort((a, b) => b.usd_revenue - a.usd_revenue || b.uah_revenue - a.uah_revenue);
      }

      // Calculate OP Leaderboard
      const [producersRes, profileProjectsRes, allProjRes, allOrdersForLeaderboard, allCostsRes] = await Promise.all([
        adminSupabase.from("profiles").select("id, email, full_name, avatar_url").eq("role", "producer"),
        adminSupabase.from("profile_projects").select("profile_id, project_id"),
        adminSupabase.from("projects").select("id, name, slug, is_active"),
        fetchAllOrdersForSummary(),
        adminSupabase.from("daily_traffic_and_costs").select("project_id, spend"),
      ]);

      const producers = producersRes.data || [];
      const mappings = profileProjectsRes.data || [];
      const projects = (allProjRes.data || []).filter((p) => p.is_active !== false);
      const orders = (allOrdersForLeaderboard || []).filter((o) => o.status !== "Клик" && o.status !== "КликФормы");
      const costs = allCostsRes.data || [];

      const leaderboard = producers.map((prod) => {
        const assignedIds = mappings
          .filter((m) => m.profile_id === prod.id)
          .map((m) => m.project_id);

        const assignedProjDetails = projects.filter((p) => assignedIds.includes(p.id));
        const projectNames = assignedProjDetails.map((p) => p.name).join(", ") || "—";

        const prodOrders = orders.filter((o) => assignedIds.includes(o.project_id));
        const prodPaidOrders = prodOrders.filter((o) => {
          return statusMapper.normalize(o.status) === "closed_won";
        });

        let usd_revenue = 0;
        let uah_revenue = 0;
        let eur_revenue = 0;

        prodPaidOrders.forEach((o) => {
          const amt = Number(o.amount || 0);
          const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();

          const isUsd = ["usd", "$"].includes(metaCurrency);
          const isEur = ["eur", "€"].includes(metaCurrency);
          const isUah = ["uah", "₴"].includes(metaCurrency);

          if (isUsd) {
            usd_revenue += amt;
          } else if (isEur) {
            eur_revenue += amt;
          } else if (isUah) {
            uah_revenue += amt;
          }
        });

        const uniqueProdCusts = new Set(prodOrders.map((o) => o.customer_id).filter(Boolean));
        const totalLeads = uniqueProdCusts.size;

        const prodCosts = costs.filter((c) => assignedIds.includes(c.project_id));
        const totalSpend = prodCosts.reduce((sum, c) => sum + Number(c.spend || 0), 0);

        const blendedRevenue = usd_revenue + (uah_revenue / 41.0) + (eur_revenue * 1.08);
        const netProfitNet = blendedRevenue - totalSpend;
        const roi = totalSpend > 0 ? (blendedRevenue / totalSpend) * 100 : 0;
        const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

        return {
          producerId: prod.id,
          email: prod.email,
          name: prod.full_name || prod.email,
          avatar_url: prod.avatar_url || "",
          projectNames,
          spend: totalSpend,
          leadsCount: totalLeads,
          cpl,
          usd_revenue,
          uah_revenue,
          eur_revenue,
          blended_revenue: blendedRevenue,
          profit: netProfitNet,
          roi,
          isLeaderOfMonth: false,
        };
      });

      leaderboard.sort((a, b) => b.blended_revenue - a.blended_revenue);

      if (leaderboard.length > 0 && leaderboard[0].blended_revenue > 0) {
        leaderboard[0].isLeaderOfMonth = true;
      }

      return {
        viewType: "all",
        role: profile.role,
        allowedProjects,
        activeSlug: "all",
        summaryData: summary,
        campaignsData: campaigns,
        producersLeaderboard: leaderboard,
        unresolvedOrders,
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

    const { data: assignedProfilesData } = await adminSupabase
      .from("profile_projects")
      .select("profiles(role)")
      .eq("project_id", activeProject.id);

    const hasRop = (assignedProfilesData || [])
      .map((item: any) => item.profiles)
      .some((p: any) => p && p.role === "rop");

    const isSalesFiltered = profile.role === "sales" && hasRop;

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
      query = query.eq("target_sheet", sourceFilter);
      aggQuery = aggQuery.eq("target_sheet", sourceFilter);
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
    const [leadsRes, aggRes, allTrafficRes, costsRes, allProfilesRes] = await Promise.all([
      query.order("created_at", { ascending: false }).range(from, to),
      aggQuery,
      (() => {
        if (filters?.skipTraffic) return Promise.resolve({ data: [], error: null } as any);
        let q = adminSupabase
          .from("traffic_clicks")
          .select("utm_source, utm_medium, utm_campaign, utm_content, created_at")
          .eq("project_id", activeProject.id);
        if (startDate) {
          const startStr = parseClientDateRange(startDate, false).toISOString();
          q = q.gte("created_at", startStr);
        }
        if (endDate) {
          const endStr = parseClientDateRange(endDate, true).toISOString();
          q = q.lte("created_at", endStr);
        }
        return q.order("created_at", { ascending: false });
      })(),
      (() => {
        let q = adminSupabase
          .from("daily_traffic_and_costs")
          .select("date, spend")
          .eq("project_id", activeProject.id);
        if (startDate) {
          q = q.gte("date", startDate);
        }
        if (endDate) {
          q = q.lte("date", endDate);
        }
        return q.order("date", { ascending: false });
      })(),
      adminSupabase.from("profiles").select("id, email, full_name")
    ]);
    const dbQueryEnd = performance.now();
    const dbQueryMs = dbQueryEnd - dbQueryStart;

    if (leadsRes.error) throw leadsRes.error;
    if (aggRes.error) throw aggRes.error;

    const paginatedLeads = leadsRes.data || [];
    const totalCount = leadsRes.count || 0;
    const filteredRows = aggRes.data || [];
    const allTraffic = allTrafficRes.data || [];
    const costs = costsRes.data || [];
    const profilesList = allProfilesRes.data || [];

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

    // Calculate aggregated stats on filtered rows
    const totalLeads = filteredRows.length;

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
    const totalCostsSpend = filteredCosts.reduce((sum: number, c: any) => sum + Number(c.spend || 0), 0);

    const totalApplications = filteredRows.filter((l: any) => statusPriority(l.status) >= 3).length;

    const usdCourseRevenue = filteredRows.reduce((sum, l) => sum + Number(l.usd_paid || 0), 0);
    const uahCourseRevenue = filteredRows.reduce((sum, l) => sum + Number(l.uah_paid || 0), 0);
    const eurCourseRevenue = filteredRows.reduce((sum, l) => sum + Number(l.eur_paid || 0), 0);
    const usdTripwireRevenue = filteredRows.reduce((sum, l) => sum + Number(l.usd_tripwire_paid || 0), 0);
    const uahTripwireRevenue = filteredRows.reduce((sum, l) => sum + Number(l.uah_tripwire_paid || 0), 0);
    const eurTripwireRevenue = filteredRows.reduce((sum, l) => sum + Number(l.eur_tripwire_paid || 0), 0);

    const totalUsdRevenue = usdCourseRevenue + usdTripwireRevenue;
    const totalUahRevenue = uahCourseRevenue + uahTripwireRevenue;
    const totalEurRevenue = eurCourseRevenue + eurTripwireRevenue;

    const netProfitUsd = totalUsdRevenue - totalCostsSpend;
    const blendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);
    const roi = totalCostsSpend > 0 ? (blendedRevenue / totalCostsSpend) * 100 : 0;

    const paidLeadsCount = filteredRows.reduce((sum, l) => sum + (l.usd_course_count || 0) + (l.uah_course_count || 0) + (l.eur_course_count || 0), 0);
    const paidTripwiresCount = filteredRows.reduce((sum, l) => sum + (l.usd_tripwire_count || 0) + (l.uah_tripwire_count || 0) + (l.eur_tripwire_count || 0), 0);
    const totalSales = paidLeadsCount + paidTripwiresCount;

    const usdSalesCount = filteredRows.reduce((sum, l) => sum + (l.usd_course_count || 0) + (l.usd_tripwire_count || 0), 0);
    const uahSalesCount = filteredRows.reduce((sum, l) => sum + (l.uah_course_count || 0) + (l.uah_tripwire_count || 0), 0);
    const eurSalesCount = filteredRows.reduce((sum, l) => sum + (l.eur_course_count || 0) + (l.eur_tripwire_count || 0), 0);

    const aovUsd = usdSalesCount > 0 ? (usdCourseRevenue + usdTripwireRevenue) / usdSalesCount : 0;
    const aovUah = uahSalesCount > 0 ? (uahCourseRevenue + uahTripwireRevenue) / uahSalesCount : 0;
    const aovEur = eurSalesCount > 0 ? (eurCourseRevenue + eurTripwireRevenue) / eurSalesCount : 0;

    // Filter traffic (Kyiv Timezone Aligned)
    const filteredTraffic = allTraffic.filter((t: any) => {
      if (startDate) {
        const tDate = new Date(t.created_at);
        const start = parseClientDateRange(startDate, false);
        if (tDate < start) return false;
      }
      if (endDate) {
        const tDate = new Date(t.created_at);
        const end = parseClientDateRange(endDate, true);
        if (tDate > end) return false;
      }
      return true;
    });
    const totalClicks = filteredTraffic.length;
    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    const cpl = totalLeads > 0 ? totalCostsSpend / totalLeads : 0;
    const leadToSaleConv = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;

    const singleProjectStats = {
      totalLeads,
      totalClicks,
      totalSpend: totalCostsSpend,
      totalApplications,
      conversionRate,
      cpl,
      usdRevenue: totalUsdRevenue,
      uahRevenue: totalUahRevenue,
      eurRevenue: totalEurRevenue,
      usdCourseRevenue,
      uahCourseRevenue,
      eurCourseRevenue,
      usdTripwireRevenue,
      uahTripwireRevenue,
      eurTripwireRevenue,
      netProfitUsd,
      roi,
      totalSales,
      paidLeadsCount,
      paidTripwiresCount,
      leadToSaleConv,
      leadToSaleConvUsd: totalLeads > 0 ? (usdSalesCount / totalLeads) * 100 : 0,
      leadToSaleConvUah: totalLeads > 0 ? (uahSalesCount / totalLeads) * 100 : 0,
      leadToSaleConvEur: totalLeads > 0 ? (eurSalesCount / totalLeads) * 100 : 0,
      aovUsd,
      aovUah,
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

    // --- UTM Attribution Tree ---
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

    filteredRows.forEach((lead: any) => {
      const source = lead.utm_source || "direct";
      const medium = lead.utm_medium || "";
      const campaign = lead.utm_campaign || "";
      const content = lead.utm_content || "";

      const path = [source, medium, campaign, content].filter(Boolean);
      let curr = utmTreeRoot;
      path.forEach((part) => {
        const node = getOrCreateUtmNode(curr, part);
        node.leads += 1;
        const usdPaid = Number(lead.usd_paid || 0) + Number(lead.usd_tripwire_paid || 0);
        const uahPaid = Number(lead.uah_paid || 0) + Number(lead.uah_tripwire_paid || 0);
        node.usd_revenue += usdPaid;
        node.uah_revenue += uahPaid;
        node.revenue += usdPaid + (uahPaid / 41.0);
        curr = node.children;
      });
    });

    filteredTraffic.forEach((t: any) => {
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
          curr[part].clicks += 1;
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

    const uniqueSources = Array.from(new Set(filteredRows.map((l: any) => l.target_sheet).filter(Boolean)));

    // Fetch sales managers for active project
    let salesManagers: { id: string; email: string; full_name: string }[] = [];
    if (activeProject && ["admin", "superman", "producer", "rop"].includes(profile.role)) {
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
      .from("unified_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

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
      .select("project_id, metadata")
      .eq("id", orderId)
      .single();

    if (fetchError) throw fetchError;
    await checkProjectAccess(order.project_id);

    const newMetadata = {
      ...(order?.metadata || {}),
      currency: currency,
    };

    const { error: updateError } = await adminSupabase
      .from("unified_orders")
      .update({ metadata: newMetadata })
      .eq("id", orderId);

    if (updateError) throw updateError;

    if (bulk && bulk.landingName) {
      const { data: matchingOrders } = await adminSupabase
        .from("unified_orders")
        .select("id, project_id, metadata")
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
            const updatedMeta = {
              ...(orderToUpdate.metadata || {}),
              currency: currency,
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

// Server action to override current role for debugging
export async function impersonateRoleAction(role: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const devEmails = ["yura3zaxar@outlook.com", "yura3zaxar@gmail.com"];
    const isActualDev = devEmails.includes(user.email?.toLowerCase() || "");

    let hasAccess = isActualDev;

    if (!hasAccess) {
      const adminSupabase = createAdminClient();
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role === "admin" || profile?.role === "superman") {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      throw new Error("403 Forbidden");
    }

    const cookieStore = await cookies();
    if (!role) {
      cookieStore.delete("crm_impersonated_role");
    } else {
      cookieStore.set("crm_impersonated_role", role, { maxAge: 60 * 60 * 24 });
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to override role" };
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
      .eq("project_id", projectId);

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
      .eq("project_id", projectId);

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
      campaignMap[campId].spend += Number(c.spend || 0);
      campaignMap[campId].clicks += Number(c.clicks || 0);
      campaignMap[campId].impressions += Number(c.impressions || 0);
    });

    (ordersData || []).forEach(o => {
      let campId = "unknown";
      if (o.campaign_id && campaignMap[o.campaign_id]) {
        campId = o.campaign_id;
      } else if (o.utm_campaign) {
        const match = Object.values(campaignMap).find(c => c.campaign_name === o.utm_campaign);
        if (match) {
          campId = match.campaign_id;
        }
      }

      const orderDate = o.created_at ? o.created_at.split('T')[0] : undefined;

      if (!campaignMap[campId]) {
        campaignMap[campId] = {
          campaign_id: campId,
          campaign_name: campId === "unknown" ? "Трафік без ID кампанії" : (o.utm_campaign || "Без назви"),
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
      dailyMap[dateStr].spend += Number(c.spend || 0);
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

