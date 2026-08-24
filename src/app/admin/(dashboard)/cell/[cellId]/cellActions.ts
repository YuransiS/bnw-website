"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { checkProjectAccess } from "../../../actions";
import { isPaidStatus } from "@/lib/statusMapper";

export interface CellAnalyticsResult {
  cellId: string;
  periodPreset: string;
  startDate: string | null;
  endDate: string | null;
  cellRevenueUah: number;
  cellRevenueUsd: number;
  cellTrafficSpendUsd: number;
  cellOpexSpendUah: number;
  cellTotalSpendUah: number;
  cellProfitUah: number;
  cellRoi: number;
  cellProjects: any[];
  producersWithProjects: any[];
}

export async function getCellAnalyticsAction(
  cellId: string,
  periodPreset: string = "all",
  customStartDate?: string,
  customEndDate?: string
): Promise<{ success: boolean; data?: CellAnalyticsResult; error?: string }> {
  try {
    const adminSupabase = createAdminClient();

    // 1. Resolve date range strings
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
    } else if (periodPreset === "custom" && customStartDate) {
      startDateStr = customStartDate;
      endDateStr = customEndDate || customStartDate;
    }

    // 2. Fetch projects belonging to cell
    const { data: dbProjects, error: projErr } = await adminSupabase
      .from("projects")
      .select("id, name, slug, cell_id, financial_goal_plan_usd, is_active")
      .eq("cell_id", cellId)
      .eq("is_active", true)
      .order("name");

    if (projErr) throw projErr;
    const projects = dbProjects || [];
    const projectIds = projects.map(p => p.id);

    if (projectIds.length === 0) {
      return {
        success: true,
        data: {
          cellId,
          periodPreset,
          startDate: startDateStr,
          endDate: endDateStr,
          cellRevenueUah: 0,
          cellRevenueUsd: 0,
          cellTrafficSpendUsd: 0,
          cellOpexSpendUah: 0,
          cellTotalSpendUah: 0,
          cellProfitUah: 0,
          cellRoi: 0,
          cellProjects: [],
          producersWithProjects: []
        }
      };
    }

    // 3. Fetch canonical KPI for each project in parallel
    const startIso = startDateStr ? new Date(startDateStr).toISOString() : null;
    const endIso = endDateStr ? new Date(`${endDateStr}T23:59:59.999Z`).toISOString() : null;

    const [kpiResults, txRes, profileProjectsRes] = await Promise.all([
      Promise.all(
        projectIds.map(async (pid) => {
          const { data } = await adminSupabase.rpc("get_project_aggregated_kpi", {
            p_project_id: pid,
            p_start_date: startIso,
            p_end_date: endIso
          });
          return { projectId: pid, kpi: data || {} };
        })
      ),
      (async () => {
        let txQ = adminSupabase
          .from("financial_transactions")
          .select("project_id, amount, currency, type, date")
          .in("project_id", projectIds)
          .eq("type", "expense");
        if (startDateStr) txQ = txQ.gte("date", startDateStr);
        if (endDateStr) txQ = txQ.lte("date", endDateStr);
        return txQ;
      })(),
      adminSupabase
        .from("profile_projects")
        .select("profile_id, project_id, profiles(id, email, full_name, avatar_url, role)")
    ]);

    const kpiMap = new Map(kpiResults.map((r) => [r.projectId, r.kpi]));
    const dbTransactions = txRes.data || [];
    const dbProfileProjects = profileProjectsRes.data || [];

    const cellProfileProjects = (dbProfileProjects || []).filter((pp: any) =>
      projectIds.includes(pp.project_id) && pp.profiles?.role === "producer"
    );

    // Standard conversion rate fallback
    const USD_TO_UAH = 41.50;
    const EUR_TO_UAH = 44.80;

    // Aggregate OPEX by project
    const opexByProject = new Map<string, number>();
    projectIds.forEach(id => opexByProject.set(id, 0));
    dbTransactions.forEach((tx: any) => {
      const rawAmount = Number(tx.amount || 0);
      const curr = String(tx.currency || "UAH").toUpperCase();
      let uahVal = rawAmount;
      if (curr === "USD") uahVal = rawAmount * USD_TO_UAH;
      else if (curr === "EUR") uahVal = rawAmount * EUR_TO_UAH;
      opexByProject.set(tx.project_id, (opexByProject.get(tx.project_id) || 0) + uahVal);
    });

    let totalCellRevenueUah = 0;
    let totalCellRevenueUsd = 0;
    let totalCellTrafficUsd = 0;
    let totalCellOpexUah = 0;
    let totalCellSpendUah = 0;

    const cellProjectsList = projects.map(p => {
      const kpi = kpiMap.get(p.id) || {};
      const revenueUah = Number(kpi.total_revenue_uah || 0);
      const revenueUsd = Number(kpi.total_revenue_usd || 0);
      const trafficSpendUsd = Number(kpi.spend_usd || 0);
      const trafficSpendUah = Number(kpi.spend_uah || 0);
      const opexSpendUah = Number(kpi.opex_uah || (opexByProject.get(p.id) || 0));
      const totalSpend = Number(kpi.total_spend_uah || (trafficSpendUah + opexSpendUah));
      const profit = Number(kpi.total_profit_uah || (revenueUah - totalSpend));
      const roi = Number(kpi.roi || (totalSpend > 0 ? (profit / totalSpend) * 100 : 0));
      const leadsCount = Number(kpi.total_leads || 0);
      const cpl = Number(kpi.cpl_uah || (leadsCount > 0 ? totalSpend / leadsCount : 0));

      totalCellRevenueUah += revenueUah;
      totalCellRevenueUsd += revenueUsd;
      totalCellTrafficUsd += trafficSpendUsd;
      totalCellOpexUah += opexSpendUah;
      totalCellSpendUah += totalSpend;

      return {
        project_id: p.id,
        project_name: p.name,
        project_slug: p.slug,
        cell_id: p.cell_id,
        financial_goal_plan_usd: Number(p.financial_goal_plan_usd || 0),
        revenue_uah: revenueUah,
        revenue_usd: revenueUsd,
        expenses_uah: totalSpend,
        traffic_spend_usd: trafficSpendUsd,
        opex_spend_uah: opexSpendUah,
        profit_uah: profit,
        leads_count: leadsCount,
        cpl: Math.round(cpl),
        roi: Number(roi.toFixed(1))
      };
    });

    const totalCellProfitUah = totalCellRevenueUah - totalCellSpendUah;
    const totalCellRoi = totalCellSpendUah > 0 ? (totalCellProfitUah / totalCellSpendUah) * 100 : 0;

    // Map producers with their calculated metrics
    const producerMap = new Map<string, any>();
    cellProfileProjects.forEach((pp: any) => {
      const pId = pp.profile_id;
      if (!producerMap.has(pId)) {
        producerMap.set(pId, {
          producerId: pId,
          name: pp.profiles?.full_name || pp.profiles?.email?.split("@")[0] || "Продюсер",
          email: pp.profiles?.email || "",
          photoUrl: pp.profiles?.avatar_url || null,
          projects: [],
          revenueUah: 0,
          spendUah: 0,
          profitUah: 0,
          targetRevenueUsd: 0,
          targetRevenueUah: 0,
          planFulfillmentPct: null
        });
      }

      const prodObj = producerMap.get(pId);
      const projSummary = cellProjectsList.find(cp => cp.project_id === pp.project_id);
      if (projSummary && !prodObj.projects.some((p: any) => p.project_id === projSummary.project_id)) {
        prodObj.projects.push(projSummary);
        prodObj.revenueUah += projSummary.revenue_uah;
        prodObj.spendUah += projSummary.expenses_uah;
        prodObj.profitUah += projSummary.profit_uah;

        const goalUSD = Number(projSummary.financial_goal_plan_usd || 0);
        prodObj.targetRevenueUsd += goalUSD;
        prodObj.targetRevenueUah += goalUSD * USD_TO_UAH;
      }
    });

    const producersWithProjects = Array.from(producerMap.values()).map(prod => {
      let fulfillment: number | null = null;
      if (prod.targetRevenueUah > 0) {
        fulfillment = Math.round((prod.revenueUah / prod.targetRevenueUah) * 100);
      }
      return {
        ...prod,
        planFulfillmentPct: fulfillment
      };
    });

    return {
      success: true,
      data: {
        cellId,
        periodPreset,
        startDate: startDateStr,
        endDate: endDateStr,
        cellRevenueUah: totalCellRevenueUah,
        cellRevenueUsd: totalCellRevenueUsd,
        cellTrafficSpendUsd: totalCellTrafficUsd,
        cellOpexSpendUah: totalCellOpexUah,
        cellTotalSpendUah: totalCellSpendUah,
        cellProfitUah: totalCellProfitUah,
        cellRoi: Number(totalCellRoi.toFixed(1)),
        cellProjects: cellProjectsList,
        producersWithProjects
      }
    };
  } catch (err: any) {
    console.error("Error in getCellAnalyticsAction:", err);
    return { success: false, error: err.message || "Failed to load cell analytics" };
  }
}

export async function updateProjectPlanAction(
  projectId: string,
  financialGoalPlanUSD: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await checkProjectAccess(projectId);
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("projects")
      .update({
        financial_goal_plan_usd: Number(financialGoalPlanUSD) || 0
      })
      .eq("id", projectId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Error updating project plan:", err);
    return { success: false, error: err.message || "Failed to update project plan" };
  }
}
