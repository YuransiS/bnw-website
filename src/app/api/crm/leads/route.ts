import { NextResponse } from "next/server";
import { getSessionAndAccess } from "@/app/admin/actions";
import { parseClientDateRange, statusPriority } from "@/app/admin/utils";
import { createAdminClient, createClient } from "@/utils/supabase/server";
import { rebuildProjectCache } from "@/lib/crmCache";
import { statusMapper } from "@/lib/statusMapper";
import { headers } from "next/headers";

async function handleQueryLeads(request: Request) {
  try {
    const body = await request.json();
    const slug = body.slug;
    const filters = body.filters;

    const { isSuperman, allowedProjects, activeSlug, profile, user } = await getSessionAndAccess(slug);
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
        console.error("Failed to fetch unresolved orders in leads API:", err);
      }
    }

    // 1. Superman Global Hub mode
    if (isSuperman && activeSlug === "all") {
      const [summaryRes, campaignRes] = await Promise.all([
        supabase.rpc("get_superman_summary"),
        supabase.rpc("get_campaigns_summary"),
      ]);

      let summary = (summaryRes.data || []).map((s: any) => ({
        id: s.project_id,
        name: s.project_name,
        slug: s.project_slug,
        spend: Number(s.spend || 0),
        leads_count: Number(s.leads_count || 0),
        cpl: Number(s.cpl || 0),
        usd_revenue: Number(s.usd_revenue || 0),
        uah_revenue: Number(s.uah_revenue || 0),
        eur_revenue: Number(s.eur_revenue || 0)
      }));
      let campaigns = campaignRes.data || [];

      return {
        viewType: "all",
        role: profile.role,
        allowedProjects,
        activeSlug,
        summary,
        campaigns,
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
        const rebuildStart = performance.now();
        await rebuildProjectCache(activeProject.id, activeProject.slug);
        cacheRebuildMs = performance.now() - rebuildStart;
      } else {
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
              console.error(`Fallback Background CRM cache rebuild failed:`, err);
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
            console.error(`Background CRM cache rebuild failed:`, err);
            adminSupabase.from("crm_cache_dirty_queue").upsert({
              project_id: activeProject.id,
              is_dirty: true,
              updated_at: new Date().toISOString()
            });
          });
        }
      }
    }
    const cacheCheckEnd = performance.now();
    const cacheCheckMs = cacheCheckEnd - cacheCheckStart;

    const cachedMetadata = dirtyQueue?.metadata || {};
    const dataHealth = cachedMetadata.dataHealth || { leadsWithoutUuidCount: 0, ordersWithAmountAndClickStatusCount: 0, unparseableMetadataDatesCount: 0 };
    const diagnosticsIssues = cachedMetadata.diagnosticsIssues || { nameless: [], unmatchedUrls: [], currencyErrors: [] };

    // --- Query crm_leads_cache for paginated leads ---
    let query = adminSupabase
      .from("crm_leads_cache")
      .select("*", { count: "exact" })
      .eq("project_id", activeProject.id);

    if (isSalesFiltered) {
      query = query.eq("assigned_manager_id", user.id);
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
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (touchCountFilter !== "all") {
      if (touchCountFilter === "multi") {
        query = query.gte("touch_count", 2);
      } else if (touchCountFilter === "single") {
        query = query.eq("touch_count", 1);
      }
    }
    if (sourceFilter !== "all") {
      query = query.eq("target_sheet", sourceFilter);
    }
    if (unpaidIntentOnly) {
      query = query.eq("is_unpaid_intent", true);
    }
    if (startDate) {
      const startStr = parseClientDateRange(startDate, false).toISOString();
      query = query.gte("created_at", startStr);
    }
    if (endDate) {
      const endStr = parseClientDateRange(endDate, true).toISOString();
      query = query.lte("created_at", endStr);
    }
    if (selectedLanding !== "all") {
      query = query.contains("visited_landings", [selectedLanding]);
    }

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const fromRange = (page - 1) * pageSize;
    const toRange = fromRange + pageSize - 1;

    const dbQueryStart = performance.now();
    const [leadsRes, metricsRes, trafficSummaryRes, costsRes, allProfilesRes, utmLeadsSummaryRes] = await Promise.all([
      query.order("created_at", { ascending: false }).range(fromRange, toRange),
      adminSupabase.rpc("get_crm_metrics", {
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
      })
    ]);
    const dbQueryEnd = performance.now();
    const dbQueryMs = dbQueryEnd - dbQueryStart;

    if (leadsRes.error) throw leadsRes.error;
    if (metricsRes.error) throw metricsRes.error;

    const paginatedLeads = leadsRes.data || [];
    const totalCount = leadsRes.count || 0;
    const costs = costsRes.data || [];
    const profilesList = allProfilesRes.data || [];

    // Extract metrics row
    const metricsRow = metricsRes.data?.[0] || {
      total_leads: 0,
      total_applications: 0,
      usd_course_revenue: 0,
      uah_course_revenue: 0,
      eur_course_revenue: 0,
      usd_tripwire_revenue: 0,
      uah_tripwire_revenue: 0,
      eur_tripwire_revenue: 0,
      usd_course_count: 0,
      uah_course_count: 0,
      eur_course_count: 0,
      usd_tripwire_count: 0,
      uah_tripwire_count: 0,
      eur_tripwire_count: 0
    };

    const totalLeads = Number(metricsRow.total_leads || 0);
    const totalApplications = Number(metricsRow.total_applications || 0);
    const usdCourseRevenue = Number(metricsRow.usd_course_revenue || 0);
    const uahCourseRevenue = Number(metricsRow.uah_course_revenue || 0);
    const eurCourseRevenue = Number(metricsRow.eur_course_revenue || 0);
    const usdTripwireRevenue = Number(metricsRow.usd_tripwire_revenue || 0);
    const uahTripwireRevenue = Number(metricsRow.uah_tripwire_revenue || 0);
    const eurTripwireRevenue = Number(metricsRow.eur_tripwire_revenue || 0);

    const usdCourseCount = Number(metricsRow.usd_course_count || 0);
    const uahCourseCount = Number(metricsRow.uah_course_count || 0);
    const eurCourseCount = Number(metricsRow.eur_course_count || 0);
    const usdTripwireCount = Number(metricsRow.usd_tripwire_count || 0);
    const uahTripwireCount = Number(metricsRow.uah_tripwire_count || 0);
    const eurTripwireCount = Number(metricsRow.eur_tripwire_count || 0);

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
    const totalCostsSpend = filteredCosts.reduce((sum: number, c: any) => sum + Number(c.spend || 0), 0);
    const netProfitUsd = totalUsdRevenue - totalCostsSpend;
    const blendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);
    const roi = totalCostsSpend > 0 ? (blendedRevenue / totalCostsSpend) * 100 : 0;

    // Clicks summary
    const groupedTraffic = trafficSummaryRes.data || [];
    const totalClicks = groupedTraffic.reduce((sum: number, t: any) => sum + Number(t.clicks_count || 0), 0);

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

    // Fetch unique sources directly from UTM leads summary
    const uniqueSources = Array.from(new Set(utmLeadsSummary.map((l: any) => l.utm_source).filter(Boolean))) as string[];

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
    console.error("QUERY leads endpoint failed:", err);
    throw err;
  }
}

export async function QUERY(request: Request) {
  try {
    const data = await handleQueryLeads(request);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const methodOverride = request.headers.get("X-HTTP-Method-Override");
    if (methodOverride === "QUERY") {
      const data = await handleQueryLeads(request);
      return NextResponse.json(data);
    }
    return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 400 });
  }
}
