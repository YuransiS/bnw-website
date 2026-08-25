"use server";

import { createAdminClient } from "@/utils/supabase/server";

export interface ProducerProjectData {
  project_id: string;
  project_name: string;
  project_slug: string;
  cell_id: string | null;
  revenue_uah: number;
  revenue_usd: number;
  expenses_uah: number;
  expenses_usd: number;
  profit_uah: number;
  profit_usd: number;
  roi: number;
  leads_count: number;
  cpl_uah: number;
  cpl_usd: number;
}

export interface ProducerDashboardData {
  producerId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  periodPreset: string;
  startDate: string | null;
  endDate: string | null;
  assignedCells: string[];
  producerProjects: ProducerProjectData[];
  producerTaskLogs: any[];
  totalRevenueUah: number;
  totalRevenueUsd: number;
  totalSpendUah: number;
  totalSpendUsd: number;
  totalProfitUah: number;
  totalProfitUsd: number;
  globalRoi: number;
  totalLeads: number;
  avgCplUah: number;
  avgCplUsd: number;
}

export async function getProducerPerformanceDataAction(
  producerId: string,
  periodPreset: string = "this_month",
  customStartDate?: string,
  customEndDate?: string
): Promise<{ success: boolean; data?: ProducerDashboardData; error?: string }> {
  try {
    const adminSupabase = createAdminClient();

    // 1. Fetch producer profile info
    const { data: producerProfile, error: profileErr } = await adminSupabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role")
      .eq("id", producerId)
      .single();

    if (profileErr || !producerProfile) {
      return { success: false, error: "Producer profile not found" };
    }

    // 2. Resolve date range strings
    let startDateStr: string | null = null;
    let endDateStr: string | null = null;
    const now = new Date();

    if (periodPreset === "today") {
      startDateStr = now.toISOString().split("T")[0];
      endDateStr = startDateStr;
    } else if (periodPreset === "7d") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDateStr = past7.toISOString().split("T")[0];
      endDateStr = now.toISOString().split("T")[0];
    } else if (periodPreset === "30d") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDateStr = past30.toISOString().split("T")[0];
      endDateStr = now.toISOString().split("T")[0];
    } else if (periodPreset === "this_month") {
      startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      endDateStr = now.toISOString().split("T")[0];
    } else if (periodPreset === "last_month") {
      startDateStr = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      endDateStr = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
    } else if (periodPreset === "this_year") {
      startDateStr = `${now.getFullYear()}-01-01`;
      endDateStr = now.toISOString().split("T")[0];
    } else if (periodPreset === "all") {
      startDateStr = null;
      endDateStr = null;
    } else if (periodPreset === "custom" && customStartDate) {
      startDateStr = customStartDate;
      endDateStr = customEndDate || customStartDate;
    }

    const startIso = startDateStr ? new Date(startDateStr).toISOString() : null;
    const endIso = endDateStr ? new Date(`${endDateStr}T23:59:59.999Z`).toISOString() : null;

    // 3. Find managed projects
    const { data: dbProfileProjects } = await adminSupabase
      .from("profile_projects")
      .select("project_id")
      .eq("profile_id", producerId);

    const managedProjectIds = (dbProfileProjects || []).map((pp: any) => pp.project_id);

    // Fetch projects details
    let projects: any[] = [];
    if (managedProjectIds.length > 0) {
      const { data: dbProjects } = await adminSupabase
        .from("projects")
        .select("id, name, slug, cell_id, is_active")
        .in("id", managedProjectIds)
        .eq("is_active", true)
        .order("name");
      projects = dbProjects || [];
    }

    // 4. Fetch cell names
    const projectCellIds = Array.from(new Set(projects.map(p => p.cell_id).filter(Boolean)));
    let assignedCells: string[] = [];
    if (projectCellIds.length > 0) {
      const { data: dbCells } = await adminSupabase
        .from("cells")
        .select("id, name")
        .in("id", projectCellIds);
      assignedCells = (dbCells || []).map(c => c.name);
    }

    // 5. Fetch canonical KPI for each managed project in parallel
    const kpiResults = await Promise.all(
      projects.map(async (p) => {
        const { data } = await adminSupabase.rpc("get_project_aggregated_kpi", {
          p_project_id: p.id,
          p_start_date: startIso,
          p_end_date: endIso
        });
        return { projectId: p.id, kpi: data || {} };
      })
    );

    const kpiMap = new Map(kpiResults.map(r => [r.projectId, r.kpi]));

    // 6. Fetch task logs
    let producerTaskLogs: any[] = [];
    if (managedProjectIds.length > 0) {
      const { data: logs } = await adminSupabase
        .from("task_logs")
        .select("*, tasks!inner(title, project_id), profiles(email)")
        .in("tasks.project_id", managedProjectIds)
        .order("created_at", { ascending: false })
        .limit(30);
      producerTaskLogs = logs || [];
    }

    // 7. Aggregate metrics
    let totalRevenueUah = 0;
    let totalRevenueUsd = 0;
    let totalSpendUah = 0;
    let totalSpendUsd = 0;
    let totalLeads = 0;

    const producerProjects: ProducerProjectData[] = projects.map(p => {
      const kpi = kpiMap.get(p.id) || {};
      const revUah = Number(kpi.total_revenue_uah || 0);
      const revUsd = Number(kpi.total_revenue_usd || 0);
      const spUah = Number(kpi.total_spend_uah || kpi.spend_uah || 0);
      const spUsd = Number(kpi.spend_usd || 0);
      const profUah = Number(kpi.total_profit_uah || (revUah - spUah));
      const profUsd = Number(revUsd - spUsd);
      const roi = Number(kpi.roi || (spUah > 0 ? (profUah / spUah) * 100 : 0));
      const leads = Number(kpi.total_leads || 0);
      const cplUah = Number(kpi.cpl_uah || (leads > 0 ? spUah / leads : 0));
      const cplUsd = Number(kpi.cpl_usd || (leads > 0 ? spUsd / leads : 0));

      totalRevenueUah += revUah;
      totalRevenueUsd += revUsd;
      totalSpendUah += spUah;
      totalSpendUsd += spUsd;
      totalLeads += leads;

      return {
        project_id: p.id,
        project_name: p.name,
        project_slug: p.slug,
        cell_id: p.cell_id,
        revenue_uah: revUah,
        revenue_usd: revUsd,
        expenses_uah: spUah,
        expenses_usd: spUsd,
        profit_uah: profUah,
        profit_usd: profUsd,
        roi: Number(roi.toFixed(1)),
        leads_count: leads,
        cpl_uah: Math.round(cplUah),
        cpl_usd: Number(cplUsd.toFixed(2))
      };
    });

    const totalProfitUah = totalRevenueUah - totalSpendUah;
    const totalProfitUsd = totalRevenueUsd - totalSpendUsd;
    const globalRoi = totalSpendUah > 0 ? (totalProfitUah / totalSpendUah) * 100 : 0;
    const avgCplUah = totalLeads > 0 ? totalSpendUah / totalLeads : 0;
    const avgCplUsd = totalLeads > 0 ? totalSpendUsd / totalLeads : 0;

    return {
      success: true,
      data: {
        producerId,
        name: producerProfile.full_name || producerProfile.email?.split("@")[0] || "Продюсер",
        email: producerProfile.email || "",
        avatarUrl: producerProfile.avatar_url || null,
        role: producerProfile.role || "producer",
        periodPreset,
        startDate: startDateStr,
        endDate: endDateStr,
        assignedCells,
        producerProjects,
        producerTaskLogs,
        totalRevenueUah,
        totalRevenueUsd,
        totalSpendUah,
        totalSpendUsd,
        totalProfitUah,
        totalProfitUsd,
        globalRoi: Number(globalRoi.toFixed(1)),
        totalLeads,
        avgCplUah: Math.round(avgCplUah),
        avgCplUsd: Number(avgCplUsd.toFixed(2))
      }
    };
  } catch (err: any) {
    console.error("Error in getProducerPerformanceDataAction:", err);
    return { success: false, error: err.message || "Failed to load producer performance data" };
  }
}
