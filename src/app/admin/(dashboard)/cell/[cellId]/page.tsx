import React from "react";
import Link from "next/link";
import { getUnifiedCRMData, getCellsAction } from "../../../actions";
import { createAdminClient } from "@/utils/supabase/server";
import { getSessionAndAccess } from "../../../actions";
import { Layers, ArrowRight, ShieldAlert, Award, ClipboardCheck } from "lucide-react";

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

  // 2. Fetch project metrics & filter for this cell
  const initialData = await getUnifiedCRMData("all");
  const summaryData = initialData.summaryData || [];
  const leaderboard = initialData.producersLeaderboard || [];

  // Filter projects belonging to this cell
  const cellProjects = summaryData.filter((p: any) => p.cell_id === cellId);
  const cellProjIds = cellProjects.map((p: any) => p.project_id);

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

  return (
    <div className="space-y-8 text-white max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">{cell.name}</h1>
        <p className="text-white/40 text-sm mt-1">Панель моніторингу осередку • Керівник: {cell.profiles?.email || "Не призначено"}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Виручка ячейки</p>
          <p className="text-2xl font-black mt-2 text-emerald-400">
            {cellRevenue.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">Оборот усіх проектів ячейки</p>
        </div>
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider font-bold">Витрати ячейки</p>
          <p className="text-2xl font-black mt-2 text-red-400">
            {cellSpend.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">Трафік та операційні витрати</p>
        </div>
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider font-bold">Прибуток ячейки</p>
          <p className="text-2xl font-black mt-2 text-emerald-500">
            {cellProfit.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">Маржинальність відділу</p>
        </div>
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider font-bold">ROI ячейки</p>
          <p className="text-2xl font-black mt-2 text-purple-400">
            {cellRoi.toFixed(2)} %
          </p>
          <p className="text-[10px] text-white/30 mt-1">Окупність рекламного бюджету</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Layers className="w-5 h-5 text-emerald-400" />
              Проекти осередку
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cellProjects.map((proj: any) => (
                <div key={proj.project_id} className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl p-4 transition-all">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-sm text-white">{proj.project_name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      Number(proj.roi || 0) >= 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
                    }`}>
                      ROI: {Math.round(proj.roi || 0)}%
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-white/60">
                    <div className="flex justify-between">
                      <span>Виручка:</span>
                      <span className="font-bold text-white">{proj.revenue_uah.toLocaleString("uk-UA")} ₴</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Витрати:</span>
                      <span className="font-bold text-white">{proj.expenses_uah.toLocaleString("uk-UA")} ₴</span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-1 mt-1 text-[11px]">
                      <span>Прибуток:</span>
                      <span className="font-black text-emerald-400">{(proj.revenue_uah - proj.expenses_uah).toLocaleString("uk-UA")} ₴</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                    <Link
                      href={`/admin/project/${proj.project_id}`}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 group"
                    >
                      Перейти до проекту
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  </div>
                </div>
              ))}

              {cellProjects.length === 0 && (
                <p className="text-xs text-white/30 italic col-span-2 py-6 text-center">Проектів у осередку не знайдено</p>
              )}
            </div>
          </div>
        </div>

        {/* Producers list */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Award className="w-5 h-5 text-emerald-400" />
              Продюсери осередку
            </h2>

            <div className="space-y-3">
              {cellProducers.map((op: any, index: number) => {
                const pEmail = op.email || "";
                const pName = op.name || pEmail.split("@")[0] || "Продюсер";
                const pCount = op.projectNames ? op.projectNames.split(",").length : 0;
                return (
                  <div
                    key={op.producerId || pEmail}
                    className="flex items-center justify-between p-3 border border-white/5 rounded-xl bg-white/[0.01]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-white/10 text-white/60 flex items-center justify-center text-[10px] font-black shrink-0">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate text-white" title={pEmail}>
                          {pName}
                        </p>
                        <p className="text-[10px] text-white/30 truncate">
                          {pCount} {pCount === 1 ? "проект" : "проекти"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <p className="text-xs font-black text-emerald-400">
                        {Math.round(op.uah_revenue || 0).toLocaleString("uk-UA")} ₴
                      </p>
                      <p className="text-[10px] text-white/30 font-semibold">
                        ROI: <span className="text-emerald-400">{Math.round(op.roi || 0)}%</span>
                      </p>
                    </div>
                  </div>
                );
              })}

              {cellProducers.length === 0 && (
                <p className="text-xs text-white/30 italic text-center py-4">Продюсери в осередку не закріплені</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task logs */}
      <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
        <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Журнал дедлайнів та анти-саботажу задач осередку
        </h2>

        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {cellTaskLogs.map((log: any) => (
            <div key={log.id} className="border-b border-white/5 pb-3 last:border-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  Задача: <b className="text-emerald-400">{log.tasks?.title}</b>
                </p>
                <p className="text-[11px] text-white/55">
                  Причина зміни: <span className="text-amber-400/90 font-medium italic">{log.postponement_reason}</span>
                </p>
                <p className="text-[9px] text-white/30">
                  Змінено: {log.profiles?.email || "Невідомий"} • {new Date(log.created_at).toLocaleString("uk-UA")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 md:text-right">
                <div className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5">
                  Старий дедлайн: <span className="text-white/60 font-mono">{log.old_due_date}</span>
                </div>
                <div className="text-[10px] bg-red-500/10 text-red-400 px-2 py-1 rounded border border-red-500/10 font-bold">
                  Новий дедлайн: <span className="font-mono">{log.new_due_date}</span>
                </div>
              </div>
            </div>
          ))}

          {(!cellTaskLogs || cellTaskLogs.length === 0) && (
            <p className="text-xs text-white/30 italic py-6 text-center">Переносів термінів завдань не зафіксовано</p>
          )}
        </div>
      </div>
    </div>
  );
}
