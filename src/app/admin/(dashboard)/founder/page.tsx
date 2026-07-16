import React from "react";
import Link from "next/link";
import { getUnifiedCRMData, getGlobalTaskLogsAction, getCellsAction } from "../../actions";
import { createAdminClient } from "@/utils/supabase/server";
import { Layers, Users, BarChart4, ClipboardCheck, ArrowRight, ShieldAlert, Award, Calendar } from "lucide-react";

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
    <div className="space-y-8 text-white max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Панель фаундерів</h1>
        <p className="text-white/40 text-sm mt-1">Верхньорівнева консолідована звітність холдингу B&W</p>
      </div>

      {/* Global Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Валова виручка</p>
          <p className="text-2xl font-black mt-2 text-emerald-400">
            {totalRevenueUah.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">Агреговано по всіх проектах</p>
        </div>
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Загальні витрати</p>
          <p className="text-2xl font-black mt-2 text-red-400">
            {totalSpendUah.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">Трафік та операційні кости</p>
        </div>
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Чистий прибуток</p>
          <p className="text-2xl font-black mt-2 text-emerald-500">
            {totalProfitUah.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">Маржинальний баланс</p>
        </div>
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Совокупний ROI</p>
          <p className="text-2xl font-black mt-2 text-purple-400">
            {globalRoi.toFixed(2)} %
          </p>
          <p className="text-[10px] text-white/30 mt-1">Ефективність вкладень</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Cells and Projects tree */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                Ячейки та підрозділи
              </h2>
              <span className="text-xs bg-white/5 px-2.5 py-1 rounded-full text-white/60">
                {cellsWithProjects.length} Ячейок
              </span>
            </div>

            <div className="space-y-6">
              {cellsWithProjects.map((cell) => (
                <div key={cell.id} className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/admin/cell/${cell.id}`}
                        className="font-bold text-base hover:text-emerald-400 flex items-center gap-1.5 group transition-colors"
                      >
                        {cell.name}
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                      </Link>
                      <p className="text-xs text-white/30 mt-0.5">Керівник: {cell.profiles?.email || "Не призначено"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">+{cell.revenue.toLocaleString("uk-UA")} ₴</p>
                      <p className="text-[10px] text-white/30">Прибуток: {cell.profit.toLocaleString("uk-UA")} ₴</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-white/5 pt-3">
                    {cell.projects.map((proj: any) => (
                      <Link
                        key={proj.project_id}
                        href={`/admin/project/${proj.project_id}`}
                        className="bg-white/5 border border-white/5 rounded-lg p-3 hover:border-emerald-500/30 hover:bg-white/[0.08] transition-all flex flex-col justify-between"
                      >
                        <p className="text-xs font-black truncate text-white">{proj.project_name}</p>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-white/40">
                          <span>Виручка: <b className="text-white">{Math.round(proj.revenue_uah / 1000)}k</b></span>
                          <span>ROI: <b className={Number(proj.roi || 0) >= 100 ? "text-emerald-400" : "text-white/60"}>{Math.round(proj.roi || 0)}%</b></span>
                        </div>
                      </Link>
                    ))}
                    {cell.projects.length === 0 && (
                      <p className="text-xs text-white/30 italic col-span-2">Проектів у ячейці не знайдено</p>
                    )}
                  </div>
                </div>
              ))}

              {unassignedProjects.length > 0 && (
                <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                  <p className="font-bold text-xs uppercase tracking-wider text-white/40 mb-3 pl-1">
                    Інші проекти (Без ячейки)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unassignedProjects.map((proj: any) => (
                      <Link
                        key={proj.project_id}
                        href={`/admin/project/${proj.project_id}`}
                        className="bg-white/5 border border-white/5 rounded-lg p-3 hover:border-emerald-500/30 hover:bg-white/[0.08] transition-all flex flex-col justify-between"
                      >
                        <p className="text-xs font-black truncate text-white">{proj.project_name}</p>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-white/40">
                          <span>Виручка: <b className="text-white">{Math.round(proj.revenue_uah / 1000)}k</b></span>
                          <span>ROI: <b className={Number(proj.roi || 0) >= 100 ? "text-emerald-400" : "text-white/60"}>{Math.round(proj.roi || 0)}%</b></span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: OP Leaderboard */}
        <div className="space-y-6">
          {/* OP Leaderboard */}
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Award className="w-5 h-5 text-emerald-400 animate-pulse" />
              🏆 Лідери ОП
            </h2>

            <div className="space-y-3">
              {leaderboard.map((op: any, index: number) => {
                const isLeader = index === 0;
                const pEmail = op.email || "";
                const pName = op.name || pEmail.split("@")[0] || "Продюсер";
                const pCount = op.projectNames ? op.projectNames.split(",").length : 0;
                return (
                  <div
                    key={op.producerId || pEmail}
                    className={`flex items-center justify-between p-3 border rounded-xl bg-white/[0.01] ${
                      isLeader ? "border-emerald-500/35 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "border-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isLeader ? "bg-emerald-500 text-black" : "bg-white/10 text-white/60"
                      }`}>
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

              {leaderboard.length === 0 && (
                <p className="text-xs text-white/30 italic text-center py-4">Рейтинг операційних продюсерів порожній</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Anti-Sabotage Audit Logs */}
      <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
        <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          Журнал анти-саботажу дедлайнів задач продюсерів
        </h2>

        <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {taskLogs.map((log: any) => (
            <div key={log.id} className="border-b border-white/5 pb-3 last:border-0 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  Перенос дедлайну по задачі: <b className="text-emerald-400">{log.tasks?.title}</b>
                </p>
                <p className="text-[11px] text-white/55">
                  Причина зміни: <span className="text-amber-400/90 font-medium italic">{log.postponement_reason}</span>
                </p>
                <p className="text-[9px] text-white/30">
                  Змінено: {log.profiles?.email || "Невідомий користувач"} • {new Date(log.created_at).toLocaleString("uk-UA")}
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

          {(!taskLogs || taskLogs.length === 0) && (
            <p className="text-xs text-white/30 italic py-6 text-center">Переносів термінів завдань не зафіксовано</p>
          )}
        </div>
      </div>
    </div>
  );
}
