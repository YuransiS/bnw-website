"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "pending") {
    throw new Error("Access Pending Approval");
  }

  const isSuperman = profile.role === "admin" || profile.role === "superman";

  // Fetch allowed projects mapping
  let allowedProjects: { id: string; name: string; slug: string }[] = [];

  if (isSuperman) {
    // Superman role sees all projects except isolated 'bw_main' unless explicitly assigned
    const { data: allProj } = await supabase
      .from("projects")
      .select("id, name, slug")
      .order("name");
    const projectsList = allProj || [];

    const { data: explicitAssignments } = await supabase
      .from("profile_projects")
      .select("project_id")
      .eq("profile_id", user.id);

    const assignedProjectIds = new Set((explicitAssignments || []).map((a) => a.project_id));

    allowedProjects = projectsList.filter((p) => {
      if (p.slug === "vova_win") return false;
      if (p.slug === "bw_main") {
        return isSuperman || assignedProjectIds.has(p.id);
      }
      return true;
    });
  } else {
    const { data } = await supabase
      .from("profile_projects")
      .select("projects(id, name, slug)")
      .eq("profile_id", user.id);

    allowedProjects = (data || [])
      .map((item: any) => item.projects)
      .filter(Boolean)
      .filter((p: any) => p.slug !== "vova_win");
  }

  // Resolve current active project slug
  let activeSlug = selectedProjectSlug;
  if (!activeSlug && allowedProjects.length > 0) {
    activeSlug = isSuperman ? "all" : allowedProjects[0].slug;
  }

  // Verify access to requested slug
  if (activeSlug && activeSlug !== "all" && !allowedProjects.some((p) => p.slug === activeSlug)) {
    activeSlug = allowedProjects.length > 0 ? allowedProjects[0].slug : undefined;
  }

  return {
    user,
    profile,
    isSuperman,
    allowedProjects,
    activeSlug,
  };
}

// Fetch unified CRM dashboard and analytics data
export async function getUnifiedCRMData(selectedProjectSlug?: string) {
  try {
    const { isSuperman, allowedProjects, activeSlug, profile } = await getSessionAndAccess(selectedProjectSlug);

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Superman Global Hub mode
    if (isSuperman && activeSlug === "all") {
      // Run Запрос 1: Cross-project summary
      const summaryQuery = `
        WITH project_leads AS (
            SELECT 
                project_id,
                COUNT(id) FILTER (WHERE status NOT IN ('Клик', 'КликФормы')) AS total_orders,
                SUM(amount) FILTER (
                    WHERE LOWER(status) IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер') 
                    AND (LOWER(COALESCE(metadata->>'currency', metadata->'lead'->>'currency', '')) IN ('usd', '$') OR project_id IN (SELECT id FROM projects WHERE slug IN ('sofia', 'valeria', 'svitlana')))
                ) AS usd_revenue,
                SUM(amount) FILTER (
                    WHERE LOWER(status) IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер') 
                    AND NOT (LOWER(COALESCE(metadata->>'currency', metadata->'lead'->>'currency', '')) IN ('usd', '$') OR project_id IN (SELECT id FROM projects WHERE slug IN ('sofia', 'valeria', 'svitlana')))
                ) AS uah_revenue
            FROM unified_orders
            GROUP BY project_id
        ),
        project_costs AS (
            SELECT 
                project_id,
                SUM(spend) AS total_spend
            FROM daily_traffic_and_costs
            GROUP BY project_id
        )
        SELECT 
            p.id AS project_id,
            p.name AS "project_name",
            p.slug AS "project_slug",
            COALESCE(c.total_spend, 0) AS "spend",
            COALESCE(l.total_orders, 0) AS "leads_count",
            CASE 
                WHEN COALESCE(l.total_orders, 0) > 0 THEN ROUND(COALESCE(c.total_spend, 0) / l.total_orders, 2)
                ELSE 0 
            END AS "cpl",
            COALESCE(l.usd_revenue, 0) AS "usd_revenue",
            COALESCE(l.uah_revenue, 0) AS "uah_revenue"
        FROM projects p
        LEFT JOIN project_leads l ON l.project_id = p.id
        LEFT JOIN project_costs c ON c.project_id = p.id
        ORDER BY "usd_revenue" DESC, "uah_revenue" DESC;
      `;

      const campaignQuery = `
        WITH campaign_revenue AS (
            SELECT 
                project_id,
                campaign_id,
                utm_campaign,
                SUM(amount) FILTER (
                    WHERE LOWER(status) IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер')
                    AND (LOWER(COALESCE(metadata->>'currency', metadata->'lead'->>'currency', '')) IN ('usd', '$') OR project_id IN (SELECT id FROM projects WHERE slug IN ('sofia', 'valeria', 'svitlana')))
                ) AS usd_revenue,
                SUM(amount) FILTER (
                    WHERE LOWER(status) IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер')
                    AND NOT (LOWER(COALESCE(metadata->>'currency', metadata->'lead'->>'currency', '')) IN ('usd', '$') OR project_id IN (SELECT id FROM projects WHERE slug IN ('sofia', 'valeria', 'svitlana')))
                ) AS uah_revenue,
                COUNT(id) FILTER (
                    WHERE LOWER(status) IN ('closed_won', 'approved', 'aprooved', 'оплачено', 'купив курс', 'купив_курс', 'купив трипвайєр', 'купив трипвайер', 'купив(-ла) трипвайер')
                ) AS total_sales
            FROM unified_orders
            WHERE campaign_id IS NOT NULL AND status NOT IN ('Клик', 'КликФормы')
            GROUP BY project_id, campaign_id, utm_campaign
        ),
        campaign_spend AS (
            SELECT 
                project_id,
                campaign_id,
                campaign_name,
                SUM(spend) AS total_spend,
                SUM(clicks) AS total_clicks
            FROM daily_traffic_and_costs
            GROUP BY project_id, campaign_id, campaign_name
        )
        SELECT 
            p.name AS "project_name",
            p.slug AS "project_slug",
            COALESCE(s.campaign_name, r.utm_campaign) AS "campaign_name",
            s.campaign_id AS "campaign_id",
            COALESCE(s.total_spend, 0) AS "spend",
            COALESCE(s.total_clicks, 0) AS "clicks",
            COALESCE(r.total_sales, 0) AS "sales",
            COALESCE(r.usd_revenue, 0) AS "usd_revenue",
            COALESCE(r.uah_revenue, 0) AS "uah_revenue",
            (COALESCE(r.usd_revenue, 0) + COALESCE(r.uah_revenue, 0) / 41.0) - COALESCE(s.total_spend, 0) AS "profit",
            CASE 
                WHEN COALESCE(s.total_spend, 0) > 0 THEN ROUND(((COALESCE(r.usd_revenue, 0) + COALESCE(r.uah_revenue, 0) / 41.0) / s.total_spend) * 100, 2)
                ELSE 0 
            END AS "roi"
        FROM projects p
        LEFT JOIN campaign_spend s ON s.project_id = p.id
        LEFT JOIN campaign_revenue r ON r.campaign_id = s.campaign_id AND r.project_id = p.id
        WHERE s.campaign_id IS NOT NULL OR r.campaign_id IS NOT NULL
        ORDER BY "profit" DESC
        LIMIT 50;
      `;

      // Fetch all orders with automatic pagination to bypass PostgREST 1000 limit
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

      // Fallback to JS queries if RPC does not exist in Supabase
      let summary = summaryRes.data || [];
      let campaigns = campaignRes.data || [];

      if (summaryRes.error || campaignRes.error) {
        // Fallback manual JS logic with full paginated fetching
        const [allProjects, allOrders, allSpends] = await Promise.all([
          supabase.from("projects").select("*").then(r => r.data || []),
          fetchAllOrdersForSummary(),
          supabase.from("daily_traffic_and_costs").select("*").then(r => r.data || []),
        ]);

        summary = (allProjects || []).map((proj) => {
          const projOrders = (allOrders || []).filter((o) => o.project_id === proj.id && o.status !== "Клик" && o.status !== "КликФормы");
          const projSpends = (allSpends || []).filter((s) => s.project_id === proj.id);

          const paidOrders = projOrders.filter((o) => {
            if (!o.status) return false;
            const sLower = o.status.toLowerCase().trim();
            return ["closed_won", "approved", "aprooved", "оплачено", "купив курс", "купив_курс", "купив трипвайєр", "купив трипвайер", "купив(-ла) трипвайер"].includes(sLower);
          });
          
          let usd_revenue = 0;
          let uah_revenue = 0;

          paidOrders.forEach((o) => {
            const amt = Number(o.amount || 0);
            const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim();

            const isUsd = ["usd", "$"].includes(metaCurrency.toLowerCase().trim()) || proj.slug === "sofia" || proj.slug === "valeria" || proj.slug === "svitlana";

            if (isUsd) {
              usd_revenue += amt;
            } else {
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
          };
        }).sort((a, b) => b.usd_revenue - a.usd_revenue || b.uah_revenue - a.uah_revenue);
      }

      // Calculate OP Leaderboard
      // Fetch all orders using our page loop instead of truncating at 1000 rows
      const [producersRes, profileProjectsRes, allProjRes, allOrdersForLeaderboard, allCostsRes] = await Promise.all([
        adminSupabase.from("profiles").select("id, email").eq("role", "producer"),
        adminSupabase.from("profile_projects").select("profile_id, project_id"),
        adminSupabase.from("projects").select("id, name, slug"),
        fetchAllOrdersForSummary(),
        adminSupabase.from("daily_traffic_and_costs").select("project_id, spend"),
      ]);

      const producers = producersRes.data || [];
      const mappings = profileProjectsRes.data || [];
      const projects = allProjRes.data || [];
      const orders = (allOrdersForLeaderboard || []).filter((o) => o.status !== "Клик" && o.status !== "КликФормы");
      const costs = allCostsRes.data || [];

      const leaderboard = producers.map((prod) => {
        // Find assigned projects
        const assignedIds = mappings
          .filter((m) => m.profile_id === prod.id)
          .map((m) => m.project_id);

        const assignedProjDetails = projects.filter((p) => assignedIds.includes(p.id));
        const projectNames = assignedProjDetails.map((p) => p.name).join(", ") || "—";

        // Aggregate orders revenue and leads count
        const prodOrders = orders.filter((o) => assignedIds.includes(o.project_id));
        const prodPaidOrders = prodOrders.filter((o) => {
          if (!o.status) return false;
          const sLower = o.status.toLowerCase().trim();
          return ["closed_won", "approved", "aprooved", "оплачено", "купив курс", "купив_курс", "купив трипвайєр", "купив трипвайер", "купив(-ла) трипвайер"].includes(sLower);
        });
        
        let usd_revenue = 0;
        let uah_revenue = 0;

        prodPaidOrders.forEach((o) => {
          const amt = Number(o.amount || 0);
          const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim();

          const orderProj = projects.find(p => p.id === o.project_id);
          const isUsd = ["usd", "$"].includes(metaCurrency.toLowerCase().trim()) || orderProj?.slug === "sofia" || orderProj?.slug === "valeria" || orderProj?.slug === "svitlana";

          if (isUsd) {
            usd_revenue += amt;
          } else {
            uah_revenue += amt;
          }
        });

        const uniqueProdCusts = new Set(prodOrders.map((o) => o.customer_id).filter(Boolean));
        const totalLeads = uniqueProdCusts.size;

        // Aggregate spend
        const prodCosts = costs.filter((c) => assignedIds.includes(c.project_id));
        const totalSpend = prodCosts.reduce((sum, c) => sum + Number(c.spend || 0), 0);

        const blendedRevenue = usd_revenue + (uah_revenue / 41.0);
        const netProfit = blendedRevenue - totalSpend;
        const roi = totalSpend > 0 ? (blendedRevenue / totalSpend) * 100 : 0;
        const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

        return {
          producerId: prod.id,
          email: prod.email,
          projectNames,
          spend: totalSpend,
          leadsCount: totalLeads,
          cpl,
          usd_revenue,
          uah_revenue,
          blended_revenue: blendedRevenue,
          profit: netProfit,
          roi,
          isLeaderOfMonth: false,
        };
      });

      // Sort by blended revenue descending
      leaderboard.sort((a, b) => b.blended_revenue - a.blended_revenue);

      // Mark the top one as leader of the month if they have some revenue
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
      };
    }

    const activeProject = allowedProjects.find((p) => p.slug === activeSlug)!;

    // Fetch all orders with automatic pagination to bypass PostgREST 1000 limit
    const fetchAllOrders = async () => {
      let results: any[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("unified_orders")
          .select("*")
          .eq("project_id", activeProject.id)
          .order("created_at", { ascending: false })
          .range(from, from + limit - 1);
        if (error) throw error;
        results = [...results, ...(data || [])];
        if ((data || []).length < limit) hasMore = false;
        else from += limit;
      }
      return results;
    };

    // Fetch all customers with automatic pagination to bypass PostgREST 1000 limit
    const fetchAllCustomers = async () => {
      let results: any[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("unified_customers")
          .select("*")
          .eq("project_id", activeProject.id)
          .range(from, from + limit - 1);
        if (error) throw error;
        results = [...results, ...(data || [])];
        if ((data || []).length < limit) hasMore = false;
        else from += limit;
      }
      return results;
    };

    // Fetch single project data in parallel
    const [allOrders, allCustomers, costsRes] = await Promise.all([
      fetchAllOrders(),
      fetchAllCustomers(),
      supabase.from("daily_traffic_and_costs").select("*").eq("project_id", activeProject.id).order("date", { ascending: false }),
    ]);

    const costs = costsRes.data || [];

    // Separate real leads from raw traffic click session logs
    const leads = allOrders.filter((o) => o.status !== "Клик" && o.status !== "КликФормы");
    const traffic = allOrders.filter((o) => o.status === "Клик" || o.status === "КликФормы");

    // Format leads with customer fields
    const formattedLeads = leads.map((lead) => {
      const cust = allCustomers.find((c) => c.id === lead.customer_id) || {};
      return {
        ...lead,
        name: cust.name || lead.metadata?.name || lead.metadata?.lead?.name || "Невідомий",
        phone: cust.phone || lead.metadata?.phone || lead.metadata?.lead?.phone || "",
        telegram: cust.telegram || lead.metadata?.telegram || lead.metadata?.lead?.telegram || "",
        email: cust.email || lead.metadata?.email || lead.metadata?.lead?.email || "",
      };
    });

    return {
      viewType: "single",
      role: profile.role,
      allowedProjects,
      activeSlug,
      activeProject,
      leads: formattedLeads,
      traffic: traffic,
      costs: costs,
    };
  } catch (err: any) {
    console.error("Unified CRM fetching error:", err.message);
    throw err;
  }
}

// Server action to update a unified lead's status/stage
export async function updateUnifiedLeadStatusAction(orderId: string, newStatus: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
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
