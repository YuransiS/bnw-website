"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Layers, Users, BarChart4, ClipboardCheck, ArrowRight, ShieldAlert, Award, Calendar, Eye, EyeOff, Globe, Sparkles, AlertCircle } from "lucide-react";

interface FounderDashboardClientProps {
  cellsWithProjects: any[];
  unassignedProjects: any[];
  leaderboard: any[];
  taskLogs: any[];
  totalRevenueUah: number;
  totalSpendUah: number;
  totalProfitUah: number;
  globalRoi: number;
}

export default function FounderDashboardClient({
  cellsWithProjects,
  unassignedProjects,
  leaderboard,
  taskLogs,
  totalRevenueUah,
  totalSpendUah,
  totalProfitUah,
  globalRoi
}: FounderDashboardClientProps) {
  // Client States
  const [currency, setCurrency] = useState<"UAH" | "USD">("UAH");
  const [demoMode, setDemoMode] = useState(false);
  const [expandedCard, setExpandedCard] = useState<"revenue" | "opex" | "profit" | "roi" | null>(null);
  const [opSortBy, setOpSortBy] = useState<"revenue" | "roi">("revenue");

  // Helper converter
  const formatVal = (uahVal: number, isUAH: boolean = true) => {
    if (demoMode) return "•••";
    
    // If currency state is USD, convert from UAH (conversion rate ~44)
    if (currency === "USD") {
      const usdVal = Math.round(uahVal / 44);
      return "$" + usdVal.toLocaleString("uk-UA");
    }
    
    return uahVal.toLocaleString("uk-UA") + " ₴";
  };

  // Sort Leaderboard
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (opSortBy === "roi") {
      return (b.roi || 0) - (a.roi || 0);
    }
    return (b.uah_revenue || 0) - (a.uah_revenue || 0);
  });

  return (
    <div className="space-y-8 text-white max-w-7xl mx-auto font-sans">
      
      {/* Sticky Global Filter Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md border border-white/5 p-4 rounded-2xl bg-[#0c0c0f]/80 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Консолідований Звіт
          </h1>
          <p className="text-[10px] text-white/30">Верхньорівнева звітність холдингу B&W</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Demo Mode Toggle */}
          <button
            onClick={() => setDemoMode(!demoMode)}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              demoMode ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-white/5 border-white/10 text-white/50 hover:text-white"
            }`}
            title="Приховати цифри для показу екрану"
          >
            {demoMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            Демо-режим
          </button>

          {/* Currency Toggle */}
          <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5 shrink-0">
            <button
              onClick={() => setCurrency("UAH")}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                currency === "UAH" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              ₴ UAH
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                currency === "USD" ? "bg-white text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Global Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Gross Revenue Card */}
        <div
          onClick={() => setExpandedCard(expandedCard === "revenue" ? null : "revenue")}
          className={`bg-neutral-900 border p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:border-emerald-500/30 ${
            expandedCard === "revenue" ? "border-emerald-500/50 bg-emerald-500/[0.02]" : "border-white/5"
          }`}
        >
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Валова виручка</p>
          <p className="text-2xl font-black mt-2 text-emerald-400">
            {formatVal(totalRevenueUah)}
          </p>
          <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1">
            Клік для розгортання деталей
          </p>
        </div>

        {/* Expenses Card */}
        <div
          onClick={() => setExpandedCard(expandedCard === "opex" ? null : "opex")}
          className={`bg-neutral-900 border p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:border-rose-500/30 ${
            expandedCard === "opex" ? "border-rose-500/50 bg-rose-500/[0.02]" : "border-white/5"
          }`}
        >
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Загальні витрати</p>
          <p className="text-2xl font-black mt-2 text-rose-400">
            {formatVal(totalSpendUah)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Трафік та опекс</p>
        </div>

        {/* Profit Card */}
        <div
          onClick={() => setExpandedCard(expandedCard === "profit" ? null : "profit")}
          className={`bg-neutral-900 border p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:border-amber-500/30 ${
            expandedCard === "profit" ? "border-amber-500/50 bg-amber-500/[0.02]" : "border-white/5"
          }`}
        >
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Чистий прибуток</p>
          <p className="text-2xl font-black mt-2 text-emerald-500">
            {formatVal(totalProfitUah)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Маржинальний баланс</p>
        </div>

        {/* ROI Card */}
        <div
          onClick={() => setExpandedCard(expandedCard === "roi" ? null : "roi")}
          className={`bg-neutral-900 border p-6 rounded-2xl cursor-pointer transition-all hover:scale-[1.01] hover:border-purple-500/30 ${
            expandedCard === "roi" ? "border-purple-500/50 bg-purple-500/[0.02]" : "border-white/5"
          }`}
        >
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Совокупний ROI</p>
          <p className="text-2xl font-black mt-2 text-purple-400">
            {globalRoi.toFixed(2)} %
          </p>
          <p className="text-[10px] text-white/30 mt-1">Ефективність вкладень</p>
        </div>
      </div>

      {/* Metric details drawer */}
      {expandedCard && (
        <div className="p-6 rounded-2xl border border-white/5 bg-neutral-900 shadow-2xl animate-in slide-in-from-top-3 duration-250 space-y-4">
          {expandedCard === "revenue" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Виручка за осередками</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {cellsWithProjects.map((c) => (
                  <div key={c.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
                    <span>{c.name}</span>
                    <span className="font-extrabold text-white">{formatVal(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedCard === "opex" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">Витрати за осередками</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {cellsWithProjects.map((c) => (
                  <div key={c.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
                    <span>{c.name}</span>
                    <span className="font-extrabold text-red-400">-{formatVal(c.spend)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedCard === "profit" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500">Прибутковість проектів</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {cellsWithProjects.map((c) => (
                  <div key={c.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
                    <span>{c.name}</span>
                    <span className={`font-extrabold ${c.profit >= 0 ? "text-emerald-450" : "text-rose-400"}`}>
                      {formatVal(c.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expandedCard === "roi" && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">ROI за осередками</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {cellsWithProjects.map((c) => {
                  const cellRoi = c.spend > 0 ? (c.profit / c.spend) * 100 : 0;
                  return (
                    <div key={c.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center">
                      <span>{c.name}</span>
                      <span className="font-extrabold text-purple-400">{cellRoi.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Cell-Producers Tree */}
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
                      <p className="text-sm font-black text-emerald-400">+{formatVal(cell.revenue)}</p>
                      <p className="text-[10px] text-white/30">Прибуток: {formatVal(cell.profit)}</p>
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
                          <span>Виручка: <b className="text-white">{formatVal(proj.revenue_uah)}</b></span>
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
                          <span>Виручка: <b className="text-white">{formatVal(proj.revenue_uah)}</b></span>
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

        {/* Right Column: OP Leaders Matrix & Telegram Settings */}
        <div className="space-y-6">
          
          {/* OP Leaderboard with sorting controls */}
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                🏆 Лідери ОП
              </h2>
              <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5 text-[9px] font-bold">
                <button
                  onClick={() => setOpSortBy("revenue")}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    opSortBy === "revenue" ? "bg-emerald-500 text-black" : "text-white/50"
                  }`}
                >
                  Виручка
                </button>
                <button
                  onClick={() => setOpSortBy("roi")}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    opSortBy === "roi" ? "bg-emerald-500 text-black" : "text-white/50"
                  }`}
                >
                  ROI
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedLeaderboard.map((op: any, index: number) => {
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
                        {formatVal(op.uah_revenue || 0)}
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

          {/* Telegram Reports Configuration Card */}
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2 border-b border-white/5 pb-4 mb-2">
              <Globe className="w-5 h-5 text-indigo-400 animate-pulse" />
              🔔 Telegram Звіти
            </h2>
            <p className="text-[10px] text-white/40">Налаштування автоматичних сповіщень для фаундерів.</p>
            
            <div className="space-y-2 text-xs bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-center">
                <span>Сповіщення про дедлайни</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Активно</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                <span>Фінансові звіти (тижневі)</span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Активно</span>
              </div>
            </div>

            <button
              onClick={() => alert("Тестове сповіщення надіслано в Telegram-чат фаундерів!")}
              className="w-full py-2 bg-white hover:bg-neutral-100 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-lg active:scale-98"
            >
              Надіслати тест в TG
            </button>
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
            <div key={log.id} className="border-b border-white/5 pb-3 last:border-0 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
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
