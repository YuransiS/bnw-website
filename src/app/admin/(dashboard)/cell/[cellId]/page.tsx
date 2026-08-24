import React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { getSessionAndAccess } from "../../../actions";
import { getCellAnalyticsAction } from "./cellActions";
import CellDashboardClient from "./CellDashboardClient";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ cellId: string }>;
}

export default async function CellDashboardPage({ params }: PageProps) {
  const { cellId } = await params;
  
  // 1. Resolve session and permissions
  const { profile, user } = await getSessionAndAccess();
  const adminSupabase = createAdminClient();

  // Load cell details
  const { data: cell, error: cellError } = await adminSupabase
    .from("cells")
    .select("*, profiles(email)")
    .eq("id", cellId)
    .single();

  if (cellError || !cell) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-white">
        <div className="text-center p-8 bg-neutral-900 border border-white/5 rounded-2xl">
          <h1 className="text-xl font-bold mb-2">Ячейку не знайдено</h1>
          <p className="text-sm text-white/40">Осередок з вказаним ID не існує в базі даних.</p>
        </div>
      </div>
    );
  }

  // Verify access permissions: Founders/Supermen see all; Cell Leaders only see their own cell
  const isSupervisor = ["admin", "superman", "founder", "developer"].includes(profile.role);
  if (!isSupervisor) {
    if (profile.role !== "cell_leader" || cell.cell_leader_id !== user.id) {
      return (
        <div className="flex h-[50vh] items-center justify-center text-white">
          <div className="text-center p-8 bg-neutral-900 border border-white/5 rounded-2xl">
            <h1 className="text-xl font-bold mb-2">Доступ заборонено</h1>
            <p className="text-sm text-white/40">Ви не є керівником цієї ячейки.</p>
          </div>
        </div>
      );
    }
  }

  // 2. Fetch all active projects belonging to this cell directly from DB
  const { data: dbCellProjects } = await adminSupabase
    .from("projects")
    .select("id")
    .eq("cell_id", cellId)
    .eq("is_active", true);

  const cellProjIds = (dbCellProjects || []).map((p: any) => p.id);

  // 3. Fetch comprehensive multi-currency cell analytics for current month initial view
  const analyticsRes = await getCellAnalyticsAction(cellId, "this_month");
  const analytics = analyticsRes.data || {
    cellRevenueUah: 0,
    cellTotalSpendUah: 0,
    cellProfitUah: 0,
    cellRoi: 0,
    cellProjects: [],
    producersWithProjects: []
  };

  // Fetch task logs for this cell's projects
  let cellTaskLogs: any[] = [];
  if (cellProjIds.length > 0) {
    const { data } = await adminSupabase
      .from("task_logs")
      .select("*, tasks!inner(title, project_id), profiles(email)")
      .in("tasks.project_id", cellProjIds)
      .order("created_at", { ascending: false })
      .limit(50);
    cellTaskLogs = data || [];
  }

  return (
    <CellDashboardClient
      cell={cell}
      cellProjects={analytics.cellProjects}
      producersWithProjects={analytics.producersWithProjects}
      cellTaskLogs={cellTaskLogs}
      cellRevenue={analytics.cellRevenueUah}
      cellSpend={analytics.cellTotalSpendUah}
      cellProfit={analytics.cellProfitUah}
      cellRoi={analytics.cellRoi}
    />
  );
}
