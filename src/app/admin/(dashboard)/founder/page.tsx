import React from "react";
import Link from "next/link";
import { getUnifiedCRMData, getGlobalTaskLogsAction, getCellsAction } from "../../actions";
import { createAdminClient } from "@/utils/supabase/server";
import { Layers, Users, BarChart4, ClipboardCheck, ArrowRight, ShieldAlert, Award, Calendar } from "lucide-react";
import FounderDashboardClient from "./FounderDashboardClient";

export const revalidate = 0;

export default async function FounderDashboardPage() {
  // 1. Fetch data
  const initialData = await getUnifiedCRMData("all");
  const taskLogsResult = await getGlobalTaskLogsAction();
  const cellsResult = await getCellsAction();

  const taskLogs = Array.isArray(taskLogsResult) ? taskLogsResult : [];
  const cells = Array.isArray(cellsResult) ? cellsResult : [];

  const summaryData = initialData.summaryData || [];
  const leaderboard = initialData.producersLeaderboard || [];
  
  // Load cell_id mappings for projects
  const adminSupabase = createAdminClient();
  const { data: dbProjects } = await adminSupabase.from("projects").select("id, cell_id");
  const projectCellMap = new Map((dbProjects || []).map((p: any) => [p.id, p.cell_id]));

  const summaryDataWithCell = summaryData.map((p: any) => ({
    ...p,
    cell_id: projectCellMap.get(p.project_id) || null
  }));

  // Calculate global metrics
  let totalRevenueUah = 0;
  let totalSpendUah = 0;
  summaryDataWithCell.forEach((p: any) => {
    totalRevenueUah += Number(p.revenue_uah || 0);
    totalSpendUah += Number(p.expenses_uah || 0);
  });
  const totalProfitUah = totalRevenueUah - totalSpendUah;
  const globalRoi = totalSpendUah > 0 ? (totalProfitUah / totalSpendUah) * 100 : 0;

  // Group projects by cells
  const cellsWithProjects = cells.map((cell: any) => {
    const projects = summaryDataWithCell.filter((p: any) => p.cell_id === cell.id);
    let cellRevenue = 0;
    let cellSpend = 0;
    projects.forEach((p: any) => {
      cellRevenue += Number(p.revenue_uah || 0);
      cellSpend += Number(p.expenses_uah || 0);
    });
    return {
      ...cell,
      projects,
      revenue: cellRevenue,
      spend: cellSpend,
      profit: cellRevenue - cellSpend
    };
  });

  const unassignedProjects = summaryDataWithCell.filter((p: any) => !p.cell_id && p.slug !== "bw_main");

  return (
    <FounderDashboardClient
      cellsWithProjects={cellsWithProjects}
      unassignedProjects={unassignedProjects}
      leaderboard={leaderboard}
      taskLogs={taskLogs}
      totalRevenueUah={totalRevenueUah}
      totalSpendUah={totalSpendUah}
      totalProfitUah={totalProfitUah}
      globalRoi={globalRoi}
    />
  );
}
