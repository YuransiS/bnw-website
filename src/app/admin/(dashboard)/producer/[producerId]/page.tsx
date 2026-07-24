import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { getUnifiedCRMData, getGlobalTaskLogsAction } from "@/app/admin/actions";
import { Award, Briefcase, Calendar, ShieldAlert, TrendingUp, DollarSign, Wallet, Users, Percent, ArrowRight } from "lucide-react";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ producerId: string }>;
}

export default async function ProducerPerformancePage({ params }: PageProps) {
  const { producerId } = await params;

  // 1. Authenticate user session
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // 2. Fetch privilege details and verify access borders
  const adminSupabase = createAdminClient();
  const { data: viewerProfile } = await adminSupabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSelf = user.id === producerId;
  const isSupervisor = ["founder", "developer", "cell_leader"].includes(viewerProfile?.role || "");

  if (!isSelf && !isSupervisor) {
    redirect("/admin");
  }

  // 3. Fetch producer's profile info
  const { data: producerProfile } = await adminSupabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", producerId)
    .single();

  if (!producerProfile) {
    redirect("/admin");
  }

  // 4. Fetch unified data and extract statistics
  const initialData = await getUnifiedCRMData("all");
  const taskLogsResult = await getGlobalTaskLogsAction();
  const taskLogs = Array.isArray(taskLogsResult) ? taskLogsResult : [];

  // Find dynamic project mapping
  const { data: dbProfileProjects } = await adminSupabase
    .from("profile_projects")
    .select("project_id")
    .eq("profile_id", producerId);
  const managedProjectIds = (dbProfileProjects || []).map((pp: any) => pp.project_id);

  // Extract producer's summary from leaderboard
  const leaderStats = (initialData.producersLeaderboard || []).find((p: any) => p.producerId === producerId);

  // Filter projects managed by this producer
  const producerProjects = (initialData.summaryData || []).filter((proj: any) =>
    managedProjectIds.includes(proj.project_id)
  );

  // Get cell names for this producer
  const { data: dbProjects } = await adminSupabase.from("projects").select("id, cell_id");
  const projectCellMap = new Map((dbProjects || []).map((p: any) => [p.id, p.cell_id]));

  const cellIds = Array.from(new Set(producerProjects.map((p: any) => projectCellMap.get(p.project_id)).filter(Boolean)));
  const { data: dbCells } = await adminSupabase.from("cells").select("id, name");
  const cellMap = new Map((dbCells || []).map((c: any) => [c.id, c.name]));
  const assignedCells = cellIds.map(cid => cellMap.get(cid)).filter(Boolean);

  // Filter task logs for this producer's projects
  const producerTaskLogs = taskLogs.filter((log: any) =>
    managedProjectIds.includes(log.tasks?.project_id)
  );

  // Aggregate metrics fallback if not in leaderboard (or sum directly)
  const revenueUah = leaderStats?.uah_revenue || producerProjects.reduce((sum: number, p: any) => sum + Number(p.revenue_uah || 0), 0);
  const spendUsd = leaderStats?.spend || producerProjects.reduce((sum: number, p: any) => sum + Number(p.expenses_usd || 0), 0);
  const profitUsd = leaderStats?.profit || (producerProjects.reduce((sum: number, p: any) => sum + Number(p.revenue_usd || 0), 0) - spendUsd);
  const roi = leaderStats?.roi || (spendUsd > 0 ? (profitUsd / spendUsd) * 100 : 0);
  const leadsCount = leaderStats?.leadsCount || producerProjects.reduce((sum: number, p: any) => sum + Number(p.leads_count || 0), 0);
  const cpl = leaderStats?.cpl || (leadsCount > 0 ? spendUsd / leadsCount : 0);

  return (
    <div className="space-y-8 text-white max-w-7xl mx-auto font-sans">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xl">
            {producerProfile.full_name ? producerProfile.full_name.charAt(0) : "P"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">{producerProfile.full_name || "Операційний продюсер"}</h1>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Продюсер
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5">{producerProfile.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {assignedCells.length > 0 ? (
            assignedCells.map((cellName, idx) => (
              <span key={idx} className="bg-white/5 border border-white/5 text-[10px] font-bold text-white/60 px-3 py-1.5 rounded-xl">
                📁 {cellName}
              </span>
            ))
          ) : (
            <span className="bg-white/5 border border-white/5 text-[10px] font-bold text-white/30 px-3 py-1.5 rounded-xl">
              Осередок не закріплено
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Загальний прибуток</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={`text-2xl font-black ${profitUsd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${Math.round(profitUsd).toLocaleString("uk-UA")}
          </p>
          <p className="text-[10px] text-white/30">Чистий опер. баланс</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Валова виручка</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-white">
            {Math.round(revenueUah).toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30">Загальний оборот у гривні</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Ефективність (ROI)</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-purple-400">
            {Math.round(roi)}%
          </p>
          <p className="text-[10px] text-white/30">Прибутковість витрат на рекламу</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Об'єм лідів / CPL</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {leadsCount} <span className="text-xs text-white/40 font-semibold">/ ${cpl.toFixed(2)}</span>
          </p>
          <p className="text-[10px] text-white/30">Кількість залучених контактів</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Managed Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <Briefcase className="w-5 h-5 text-emerald-500" />
              Проекти під керівництвом продюсера
            </h2>

            <div className="overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-white/[0.02] text-white/40 border-b border-white/5 uppercase tracking-widest font-black">
                    <th className="p-4">Назва проекту</th>
                    <th className="p-4 text-center">Витрати ($)</th>
                    <th className="p-4 text-center">Виручка (₴)</th>
                    <th className="p-4 text-center">ROI</th>
                    <th className="p-4 text-right">Кабінет</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {producerProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-white/30 italic">
                        За продюсером немає закріплених проектів
                      </td>
                    </tr>
                  ) : (
                    producerProjects.map((proj: any) => (
                      <tr key={proj.project_id} className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4 font-black text-sm">{proj.project_name}</td>
                        <td className="p-4 text-center font-bold text-red-400">
                          ${Math.round(proj.expenses_usd || 0).toLocaleString("uk-UA")}
                        </td>
                        <td className="p-4 text-center font-bold text-emerald-400">
                          {Math.round(proj.revenue_uah || 0).toLocaleString("uk-UA")} ₴
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            Number(proj.roi || 0) >= 100
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {Math.round(proj.roi || 0)}%
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/admin/project/${proj.project_id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            Вхід <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Deadlines Anti-sabotage Logs */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-lg flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Журнал дедлайнів продюсера
            </h2>

            <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
              {producerTaskLogs.map((log: any) => (
                <div key={log.id} className="border-b border-white/5 pb-3 last:border-0 space-y-1">
                  <p className="text-xs font-bold text-white leading-tight">
                    Задача: <span className="text-emerald-400">{log.tasks?.title}</span>
                  </p>
                  <p className="text-[10px] text-white/50 italic leading-snug">
                    Причина переносу: "{log.postponement_reason}"
                  </p>
                  <div className="flex justify-between items-center text-[9px] text-white/30 pt-1">
                    <span>
                      {log.old_due_date} → <b className="text-red-400">{log.new_due_date}</b>
                    </span>
                    <span>{new Date(log.created_at).toLocaleDateString("uk-UA")}</span>
                  </div>
                </div>
              ))}

              {producerTaskLogs.length === 0 && (
                <p className="text-xs text-white/30 italic py-6 text-center">Переносів дедлайнів по задачах не знайдено</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
