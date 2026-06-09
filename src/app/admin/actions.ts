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
      .select("id, name, slug, is_active")
      .order("name");
    const projectsList = allProj || [];

    const { data: explicitAssignments } = await supabase
      .from("profile_projects")
      .select("project_id")
      .eq("profile_id", user.id);

    const assignedProjectIds = new Set((explicitAssignments || []).map((a) => a.project_id));

    allowedProjects = projectsList.filter((p) => {
      if (!p.is_active) return false;
      if (p.slug === "bw_main") {
        return isSuperman || assignedProjectIds.has(p.id);
      }
      return true;
    });
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

    // 1. Superman Global Hub mode
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
          let eur_revenue = 0;

          paidOrders.forEach((o) => {
            const amt = Number(o.amount || 0);
            const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();

            const isUsd = ["usd", "$"].includes(metaCurrency) || proj.slug === "sofia" || proj.slug === "valeria" || proj.slug === "svitlana";
            const isEur = ["eur", "€"].includes(metaCurrency);

            if (isUsd) {
              usd_revenue += amt;
            } else if (isEur) {
              eur_revenue += amt;
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
        let eur_revenue = 0;

        prodPaidOrders.forEach((o) => {
          const amt = Number(o.amount || 0);
          const metaCurrency = String(o.metadata?.currency || o.metadata?.lead?.currency || "").trim().toLowerCase();

          const orderProj = projects.find(p => p.id === o.project_id);
          const isUsd = ["usd", "$"].includes(metaCurrency) || orderProj?.slug === "sofia" || orderProj?.slug === "valeria" || orderProj?.slug === "svitlana";
          const isEur = ["eur", "€"].includes(metaCurrency);

          if (isUsd) {
            usd_revenue += amt;
          } else if (isEur) {
            eur_revenue += amt;
          } else {
            uah_revenue += amt;
          }
        });

        const uniqueProdCusts = new Set(prodOrders.map((o) => o.customer_id).filter(Boolean));
        const totalLeads = uniqueProdCusts.size;

        // Aggregate spend
        const prodCosts = costs.filter((c) => assignedIds.includes(c.project_id));
        const totalSpend = prodCosts.reduce((sum, c) => sum + Number(c.spend || 0), 0);

        const blendedRevenue = usd_revenue + (uah_revenue / 41.0) + (eur_revenue * 1.08);
        const netProfit = blendedRevenue - totalSpend;
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

    // Fetch all customers with automatic pagination to bypass PostgREST 1000 limit
    const fetchAllCustomers = async () => {
      let results: any[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from("unified_customers")
          .select("*")
          .eq("project_id", activeProject.id);

        if (profile.role === "sales") {
          query = query.eq("assigned_manager_id", user.id);
        }

        const { data, error } = await query.range(from, from + limit - 1);
        if (error) throw error;
        results = [...results, ...(data || [])];
        if ((data || []).length < limit) hasMore = false;
        else from += limit;
      }
      return results;
    };

    // Fetch all orders with automatic pagination to bypass PostgREST 1000 limit
    const fetchAllOrders = async (customerIds: string[]) => {
      let results: any[] = [];
      let from = 0;
      const limit = 1000;
      let hasMore = true;
      while (hasMore) {
        let query = supabase
          .from("unified_orders")
          .select("*")
          .eq("project_id", activeProject.id);

        if (profile.role === "sales") {
          if (customerIds.length === 0) {
            return [];
          }
          query = query.in("customer_id", customerIds);
        }

        const { data, error } = await query
          .order("created_at", { ascending: false })
          .range(from, from + limit - 1);
        if (error) throw error;
        results = [...results, ...(data || [])];
        if ((data || []).length < limit) hasMore = false;
        else from += limit;
      }
      return results;
    };

    // Fetch single project data in sequence/parallel
    const allCustomers = await fetchAllCustomers();
    const [allOrders, costsRes] = await Promise.all([
      fetchAllOrders(allCustomers.map((c) => c.id)),
      supabase.from("daily_traffic_and_costs").select("*").eq("project_id", activeProject.id).order("date", { ascending: false }),
    ]);

    const costs = costsRes.data || [];

    // Separate real leads from raw traffic click session logs
    const leads = allOrders.filter((o) => o.status !== "Клик" && o.status !== "КликФормы");
    const traffic = allOrders.filter((o) => o.status === "Клик" || o.status === "КликФормы");

    // Fetch all profiles to map sales manager names
    const { data: allProfiles } = await adminSupabase
      .from("profiles")
      .select("id, email, full_name");
    const profilesList = allProfiles || [];

    // Format leads with customer fields
    const formattedLeads = leads.map((lead) => {
      const cust = allCustomers.find((c) => c.id === lead.customer_id) || {};
      const manager = profilesList.find((p) => p.id === cust.assigned_manager_id);
      const managerName = manager ? (manager.full_name || manager.email) : "";

      return {
        ...lead,
        name: cust.name || lead.metadata?.name || lead.metadata?.lead?.name || "Невідомий",
        phone: cust.phone || lead.metadata?.phone || lead.metadata?.lead?.phone || "",
        telegram: cust.telegram || lead.metadata?.telegram || lead.metadata?.lead?.telegram || "",
        email: cust.email || lead.metadata?.email || lead.metadata?.lead?.email || "",
        managerComment: cust.manager_comment || "",
        customerId: lead.customer_id || null,
        assigned_manager_id: cust.assigned_manager_id || null,
        assigned_manager_name: managerName,
      };
    });

    // Fetch sales managers for the active project
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

    return {
      viewType: "single",
      role: profile.role,
      allowedProjects,
      activeSlug,
      activeProject,
      leads: formattedLeads,
      traffic: traffic,
      costs: costs,
      salesManagers,
      unresolvedOrders: unresolvedOrders.filter((o) => o.projectId === activeProject.id),
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

// Server action to update customer manager comments
export async function updateCustomerCommentAction(customerId: string, comment: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
      .from("unified_customers")
      .update({ manager_comment: comment })
      .eq("id", customerId);

    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update comment" };
  }
}

// Server action to assign a lead/customer to a sales manager
export async function assignLeadToManagerAction(customerId: string, managerId: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { error } = await supabase
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

    // Fetch existing order metadata
    const { data: order, error: fetchError } = await adminSupabase
      .from("unified_orders")
      .select("metadata")
      .eq("id", orderId)
      .single();

    if (fetchError) throw fetchError;

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
        .select("id, metadata")
        .eq("amount", bulk.amount)
        .not("status", "in", "('Клик', 'КликФормы')");

      if (matchingOrders && matchingOrders.length > 0) {
        const toUpdate = matchingOrders.filter((o: any) => {
          const lName = o.metadata?.target_sheet || o.metadata?.lead?.target_sheet || o.metadata?.original_sheet || o.metadata?.lead?.original_sheet || "";
          return lName === bulk.landingName;
        });

        for (const orderToUpdate of toUpdate) {
          const updatedMeta = {
            ...(orderToUpdate.metadata || {}),
            currency: currency,
          };
          await adminSupabase
            .from("unified_orders")
            .update({ metadata: updatedMeta })
            .eq("id", orderToUpdate.id);
        }
      }
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update order currency." };
  }
}
