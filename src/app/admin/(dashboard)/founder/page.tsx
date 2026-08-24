import React from "react";
import { getFounderDashboardDataAction } from "../../actions";
import FounderDashboardClient from "./FounderDashboardClient";

export const revalidate = 0;

export default async function FounderDashboardPage() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const initialData = await getFounderDashboardDataAction(startStr, endStr);

  return (
    <FounderDashboardClient
      cellsWithProjects={initialData.cellsWithProjects || []}
      unassignedProjects={initialData.unassignedProjects || []}
      leaderboard={initialData.leaderboard || []}
      taskLogs={initialData.taskLogs || []}
      totalRevenueUah={initialData.totalRevenueUah || 0}
      totalSpendUah={initialData.totalSpendUah || 0}
      totalProfitUah={initialData.totalProfitUah || 0}
      globalRoi={initialData.globalRoi || 0}
      initialStartDate={startStr}
      initialEndDate={endStr}
      isDevOrAdmin={initialData.isDevOrAdmin}
    />
  );
}
