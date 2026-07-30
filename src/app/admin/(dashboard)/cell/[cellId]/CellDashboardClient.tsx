"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers, 
  ArrowRight, 
  ShieldAlert, 
  Award, 
  ChevronRight
} from "lucide-react";

interface CellDashboardClientProps {

  cell: any;
  cellProjects: any[];
  producersWithProjects: any[];
  cellTaskLogs: any[];
  cellRevenue: number;
  cellSpend: number;
  cellProfit: number;
  cellRoi: number;
}



export default function CellDashboardClient({
  cell,
  cellProjects,
  producersWithProjects,
  cellTaskLogs,
  cellRevenue,
  cellSpend,
  cellProfit,
  cellRoi
}: CellDashboardClientProps) {
  const router = useRouter();
  const [selectedCurrency, setSelectedCurrency] = useState<"UAH" | "USD" | "EUR">("UAH");

  // CRM conversion rates: 1 USD = 41 UAH, 1 EUR = 44 UAH
  const convertAmount = (uahAmount: number) => {
    const val = Number(uahAmount || 0);
    if (selectedCurrency === "USD") {
      return { val: val / 41, symbol: "$" };
    }
    if (selectedCurrency === "EUR") {
      return { val: val / 44, symbol: "€" };
    }
    return { val: val, symbol: "₴" };
  };

  const formatConverted = (uahAmount: number) => {
    const { val, symbol } = convertAmount(uahAmount);
    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
    return symbol === "$" || symbol === "€" ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  };

  // Helper to handle Producer Tile Click
  const handleProducerClick = (producer: any) => {
    if (producer.projects.length === 1) {
      // If single project, open project directly
      const singleProj = producer.projects[0];
      router.push(`/admin/project/${singleProj.project_id}`);
    } else {
      // If multiple projects, open producer consolidated page
      router.push(`/admin/producer/${producer.producerId}`);
    }
  };

  return (
    <div className="space-y-8 text-white w-full mx-auto font-sans">
      
      {/* Header */}
      <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
            Осередок (Cell)
          </span>
          <h1 className="text-2xl font-black text-white mt-1">{cell.name}</h1>
          <p className="text-white/40 text-xs mt-0.5">Керівник ячейки: {cell.profiles?.email || "Не призначено"}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Currency Switcher */}
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 mr-2">
            {(["UAH", "USD", "EUR"] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg cursor-pointer transition-all ${
                  selectedCurrency === curr
                    ? "bg-white text-black font-black"
                    : "text-white/40 hover:text-white font-bold"
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          <span className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-extrabold text-white/70">
            {cellProjects.length} Проектів
          </span>
          <span className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-extrabold text-white/70">
            {producersWithProjects.length} Продюсерів
          </span>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Виручка ячейки</p>
          <p className="text-2xl font-black mt-2 text-emerald-400 font-mono">
            {formatConverted(cellRevenue)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Оборот усіх проектів ячейки</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Витрати ячейки</p>
          <p className="text-2xl font-black mt-2 text-rose-400 font-mono">
            {formatConverted(cellSpend)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Трафік та опекс</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Прибуток ячейки</p>
          <p className="text-2xl font-black mt-2 text-emerald-500 font-mono">
            {formatConverted(cellProfit)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Маржинальність осередку</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">ROI ячейки</p>
          <p className="text-2xl font-black mt-2 text-purple-400 font-mono">
            {cellRoi.toFixed(2)} %
          </p>
          <p className="text-[10px] text-white/30 mt-1">Окупність вкладень</p>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Producer Tiles (Cards) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-emerald-400" />
              Продюсери ячейки
            </h2>
            <span className="text-[10px] text-white/40 font-semibold">Натисніть для переходу</span>
          </div>

          <div className="space-y-4">
            {producersWithProjects.map((prod) => {
              const projCount = prod.projects.length;
              const efficiency = prod.planFulfillmentPct || 85; // Default/calculated efficiency %
              const initial = prod.name ? prod.name.charAt(0).toUpperCase() : "P";

              return (
                <div
                  key={prod.producerId || prod.email}
                  onClick={() => handleProducerClick(prod)}
                  className="bg-neutral-900 border border-white/10 hover:border-emerald-500/40 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:bg-white/[0.02] shadow-lg group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Producer Avatar / Placeholder */}
                    <div className="flex items-center gap-3 min-w-0">
                      {prod.photoUrl ? (
                        <img 
                          src={prod.photoUrl} 
                          alt={prod.name} 
                          className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center font-black text-white text-base shrink-0 group-hover:border-emerald-500/50 transition-colors">
                          {initial}
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                          {prod.name}
                        </h3>
                        <p className="text-[10px] text-white/30 truncate mt-0.5">{prod.email}</p>
                        <span className="inline-block text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded mt-1">
                          {projCount} {projCount === 1 ? "проект" : "проекти"}
                        </span>
                      </div>
                    </div>

                    {/* Efficiency % Badge */}
                    <div className="text-right shrink-0">
                      <div className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-xs">
                        {efficiency}% План
                      </div>
                      <p className="text-[9px] text-white/30 mt-1">Ефективність</p>
                    </div>
                  </div>

                  {/* Profit & Action Footer */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-white/40 block">Прибуток:</span>
                      <span className="font-black text-emerald-400">{formatConverted(prod.profitUah)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-white/60 group-hover:text-emerald-400 transition-colors">
                      {projCount === 1 ? "Перейти в проект" : "Огляд проектів"}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {producersWithProjects.length === 0 && (
              <p className="text-xs text-white/30 italic text-center py-8 bg-neutral-900 border border-dashed border-white/5 rounded-2xl">
                Продюсерів у цій ячейці поки не закріплено
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Projects List & Task Logs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Projects Table */}
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-base flex items-center gap-2 border-b border-white/5 pb-4 mb-4 text-white">
              <Layers className="w-5 h-5 text-emerald-400" />
              Проекти осередку
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cellProjects.map((proj: any) => (
                <div key={proj.project_id} className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] rounded-xl p-4 transition-all flex flex-col justify-between">
                  <div>
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
                        <span className="font-bold text-white font-mono">{formatConverted(proj.revenue_uah || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Витрати:</span>
                        <span className="font-bold text-red-400 font-mono">{formatConverted(proj.expenses_uah || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-1 mt-1 text-[11px]">
                        <span>Прибуток:</span>
                        <span className="font-black text-emerald-400 font-mono">{formatConverted(Number(proj.revenue_uah || 0) - Number(proj.expenses_uah || 0))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                    <Link
                      href={`/admin/project/${proj.project_id}`}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 group"
                    >
                      Відкрити проект
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

          {/* Audit Logs */}
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h2 className="font-bold text-base flex items-center gap-2 border-b border-white/5 pb-4 mb-4 text-white">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Журнал дедлайнів та саботажу осередку
            </h2>

            <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
              {cellTaskLogs.map((log: any) => (
                <div key={log.id} className="border-b border-white/5 pb-3 last:border-0 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
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

      </div>

    </div>
  );
}
