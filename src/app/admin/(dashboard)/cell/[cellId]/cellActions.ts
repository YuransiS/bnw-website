"use server";

import { createAdminClient } from "@/utils/supabase/server";
import { checkProjectAccess } from "../../../actions";

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

    // 3. Query orders for revenue
    let ordersQuery = adminSupabase
      .from("unified_orders")
      .select("id, project_id, amount, status, created_at, metadata")
      .in("project_id", projectIds)
      .gt("amount", 0);

    if (startDateStr) {
      ordersQuery = ordersQuery.gte("created_at", `${startDateStr}T00:00:00.000Z`);
    }
    if (endDateStr) {
      ordersQuery = ordersQuery.lte("created_at", `${endDateStr}T23:59:59.999Z`);
    }

    const { data: dbOrders, error: ordersErr } = await ordersQuery;
    if (ordersErr) throw ordersErr;

    // 4. Query daily traffic spend (Meta Ads)
    let trafficQuery = adminSupabase
      .from("daily_traffic_and_costs")
      .select("project_id, spend_usd, clicks, impressions, date")
      .in("project_id", projectIds);

    if (startDateStr) {
      trafficQuery = trafficQuery.gte("date", startDateStr);
    }
    if (endDateStr) {
      trafficQuery = trafficQuery.lte("date", endDateStr);
    }

    const { data: dbTraffic, error: trafficErr } = await trafficQuery;
    if (trafficErr) throw trafficErr;

    // 5. Query manual expense transactions (OPEX)
    let txQuery = adminSupabase
      .from("transactions")
      .select("project_id, amount, currency, exchange_rate, type, date")
      .in("project_id", projectIds)
      .eq("type", "expense");

    if (startDateStr) {
      txQuery = txQuery.gte("date", startDateStr);
    }
    if (endDateStr) {
      txQuery = txQuery.lte("date", endDateStr);
    }

    const { data: dbTransactions } = await txQuery;

    // 6. Query profile_projects to map producers
    const { data: dbProfileProjects } = await adminSupabase
      .from("profile_projects")
      .select("profile_id, project_id, profiles(id, email, full_name, avatar_url, role)");

    const cellProfileProjects = (dbProfileProjects || []).filter((pp: any) =>
      projectIds.includes(pp.project_id) && pp.profiles?.role === "producer"
    );

    // Standard CRM conversion rate: 1 USD = 41.80 UAH, 1 EUR = 44.50 UAH
    const USD_TO_UAH = 41.80;
    const EUR_TO_UAH = 44.50;

    // Build project-level stats
    const projectStatsMap = new Map<string, {
      revenueUah: number;
      revenueUsd: number;
      trafficSpendUsd: number;
      trafficSpendUah: number;
      opexSpendUah: number;
      totalSpendUah: number;
      leadsCount: number;
      salesCount: number;
    }>();

    projectIds.forEach(id => {
      projectStatsMap.set(id, {
        revenueUah: 0,
        revenueUsd: 0,
        trafficSpendUsd: 0,
        trafficSpendUah: 0,
        opexSpendUah: 0,
        totalSpendUah: 0,
        leadsCount: 0,
        salesCount: 0
      });
    });

    // Aggregate Orders
    (dbOrders || []).forEach((o: any) => {
      const pStats = projectStatsMap.get(o.project_id);
      if (!pStats) return;

      const rawAmount = Number(o.amount || 0);
      const meta = o.metadata || {};
      const curr = String(meta.currency || meta.lead?.currency || "UAH").toUpperCase();
      const statusLower = String(o.status || "").toLowerCase();

      // Check if not a bounce/click
      const isLead = !["клик", "кликформы", "отказ", "відмова"].includes(statusLower);
      if (isLead) {
        pStats.leadsCount += 1;
      }

      // Convert order amount to UAH & USD
      let uahVal = rawAmount;
      let usdVal = rawAmount / USD_TO_UAH;

      if (curr === "USD" || curr === "$") {
        uahVal = rawAmount * USD_TO_UAH;
        usdVal = rawAmount;
      } else if (curr === "EUR" || curr === "€") {
        uahVal = rawAmount * EUR_TO_UAH;
        usdVal = rawAmount * 1.08;
      }

      pStats.revenueUah += uahVal;
      pStats.revenueUsd += usdVal;
      pStats.salesCount += 1;
    });

    // Aggregate Traffic Spend
    (dbTraffic || []).forEach((t: any) => {
      const pStats = projectStatsMap.get(t.project_id);
      if (!pStats) return;

      const spendUSD = Number(t.spend_usd || 0);
      pStats.trafficSpendUsd += spendUSD;
      pStats.trafficSpendUah += spendUSD * USD_TO_UAH;
    });

    // Aggregate OPEX Transactions
    (dbTransactions || []).forEach((tx: any) => {
      const pStats = projectStatsMap.get(tx.project_id);
      if (!pStats) return;

      const rawAmount = Number(tx.amount || 0);
      const curr = String(tx.currency || "UAH").toUpperCase();
      let uahVal = rawAmount;

      if (curr === "USD") {
        uahVal = rawAmount * USD_TO_UAH;
      } else if (curr === "EUR") {
        uahVal = rawAmount * EUR_TO_UAH;
      }

      pStats.opexSpendUah += uahVal;
    });

    // Finalize Project stats array
    let totalCellRevenueUah = 0;
    let totalCellRevenueUsd = 0;
    let totalCellTrafficUsd = 0;
    let totalCellOpexUah = 0;
    let totalCellSpendUah = 0;

    const cellProjectsList = projects.map(p => {
      const stats = projectStatsMap.get(p.id)!;
      const totalSpend = stats.trafficSpendUah + stats.opexSpendUah;
      const profit = stats.revenueUah - totalSpend;
      const roi = totalSpend > 0 ? (profit / totalSpend) * 100 : 0;
      const cpl = stats.leadsCount > 0 ? totalSpend / stats.leadsCount : 0;

      totalCellRevenueUah += stats.revenueUah;
      totalCellRevenueUsd += stats.revenueUsd;
      totalCellTrafficUsd += stats.trafficSpendUsd;
      totalCellOpexUah += stats.opexSpendUah;
      totalCellSpendUah += totalSpend;

      return {
        project_id: p.id,
        project_name: p.name,
        project_slug: p.slug,
        cell_id: p.cell_id,
        financial_goal_plan_usd: Number(p.financial_goal_plan_usd || 0),
        revenue_uah: stats.revenueUah,
        revenue_usd: stats.revenueUsd,
        expenses_uah: totalSpend,
        traffic_spend_usd: stats.trafficSpendUsd,
        opex_spend_uah: stats.opexSpendUah,
        profit_uah: profit,
        leads_count: stats.leadsCount,
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
