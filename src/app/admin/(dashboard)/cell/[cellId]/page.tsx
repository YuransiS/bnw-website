import React from "react";
import { getUnifiedCRMData } from "../../../actions";
import { createAdminClient } from "@/utils/supabase/server";
import { getSessionAndAccess } from "../../../actions";


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
    .select("*")
    .eq("cell_id", cellId)
    .eq("is_active", true)
    .order("name");

  const cellProjIds = (dbCellProjects || []).map((p: any) => p.id);

  // 3. Fetch project metrics & summary data
  const initialData = await getUnifiedCRMData("all");
  const summaryData = initialData.summaryData || [];
  const leaderboard = initialData.producersLeaderboard || [];

  // Merge DB project records with financial summary metrics
  const cellProjects = (dbCellProjects || []).map((dbP: any) => {
    const summaryItem = summaryData.find(
      (s: any) => s.project_id === dbP.id || s.project_slug === dbP.slug
    );
    const revUah = Number(summaryItem?.revenue_uah || 0);
    const expUah = Number(summaryItem?.expenses_uah || 0);
    const roiVal = expUah > 0 ? ((revUah - expUah) / expUah) * 100 : Number(summaryItem?.roi || 0);

    return {
      project_id: dbP.id,
      project_name: dbP.name,
      project_slug: dbP.slug,
      cell_id: dbP.cell_id,
      revenue_uah: revUah,
      expenses_uah: expUah,
      revenue_usd: Number(summaryItem?.revenue_usd || 0),
      revenue_eur: Number(summaryItem?.revenue_eur || 0),
      leads_count: Number(summaryItem?.leads_count || 0),
      cpl: Number(summaryItem?.cpl || 0),
      roi: roiVal
    };
  });

  // Sum cell metrics
  let cellRevenue = 0;
  let cellSpend = 0;
  cellProjects.forEach((p: any) => {
    cellRevenue += Number(p.revenue_uah || 0);
    cellSpend += Number(p.expenses_uah || 0);
  });
  const cellProfit = cellRevenue - cellSpend;
  const cellRoi = cellSpend > 0 ? (cellProfit / cellSpend) * 100 : 0;

  // Resolve producers and leaderboard for this cell
  let cellProducers: any[] = [];
  if (cellProjIds.length > 0) {
    const { data: projProfiles } = await adminSupabase
      .from("profile_projects")
      .select("profile_id, profiles(email, role)")
      .in("project_id", cellProjIds);
    
    const producerProfiles = (projProfiles || [])
      .map((p: any) => p.profiles)
      .filter((prof: any) => prof && prof.role === "producer");
    
    const uniqueProducerEmails = Array.from(new Set(producerProfiles.map((p: any) => p.email)));
    cellProducers = leaderboard.filter((l: any) => uniqueProducerEmails.includes(l.email));
  }

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

  // Map producers with their projects inside this cell
  const { data: dbProfileProjects } = await adminSupabase
    .from("profile_projects")
    .select("profile_id, project_id, profiles(id, email, full_name, role, avatar_url)");

  const cellProfileProjects = (dbProfileProjects || []).filter((pp: any) =>
    cellProjIds.includes(pp.project_id) && pp.profiles?.role === "producer"
  );

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
        planFulfillmentPct: 85
      });
    }

    const prodObj = producerMap.get(pId);
    const projSummary = cellProjects.find((cp: any) => cp.project_id === pp.project_id);
    if (projSummary && !prodObj.projects.some((p: any) => p.project_id === projSummary.project_id)) {
      prodObj.projects.push(projSummary);
      prodObj.revenueUah += Number(projSummary.revenue_uah || 0);
      prodObj.spendUah += Number(projSummary.expenses_uah || 0);
      prodObj.profitUah += (Number(projSummary.revenue_uah || 0) - Number(projSummary.expenses_uah || 0));
    }
  });

  const producersWithProjects = Array.from(producerMap.values());

  return (
    <CellDashboardClient
      cell={cell}
      cellProjects={cellProjects}
      producersWithProjects={producersWithProjects}
      cellTaskLogs={cellTaskLogs}
      cellRevenue={cellRevenue}
      cellSpend={cellSpend}
      cellProfit={cellProfit}
      cellRoi={cellRoi}
    />
  );
}

import CellDashboardClient from "./CellDashboardClient";
