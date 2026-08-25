"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { Layers, Users, BarChart4, ClipboardCheck, ArrowRight, ShieldAlert, Award, Calendar, Eye, EyeOff, Globe, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { getFounderDashboardDataAction } from "../../actions";
import { ParabolicProgressBar } from "@/components/ui/ParabolicProgressBar";
import CustomCalendarPicker, { CustomDateRangeInputs } from "@/components/ui/CustomCalendarPicker";

interface FounderDashboardClientProps {
  cellsWithProjects: any[];
  unassignedProjects: any[];
  leaderboard: any[];
  taskLogs: any[];
  totalRevenueUah: number;
  totalSpendUah: number;
  totalProfitUah: number;
  globalRoi: number;
  initialStartDate?: string;
  initialEndDate?: string;
  isDevOrAdmin?: boolean;
}

export default function FounderDashboardClient({
  cellsWithProjects: initialCells,
  unassignedProjects: initialUnassigned,
  leaderboard: initialLeaderboard,
  taskLogs,
  totalRevenueUah: initialRevenue,
  totalSpendUah: initialSpend,
  totalProfitUah: initialProfit,
  globalRoi: initialRoi,
  initialStartDate = "",
  initialEndDate = "",
  isDevOrAdmin = false
}: FounderDashboardClientProps) {
  // Client States
  const [currency, setCurrency] = useState<"UAH" | "USD">("UAH");
  const [demoMode, setDemoMode] = useState(false);
  const [expandedCard, setExpandedCard] = useState<"revenue" | "opex" | "profit" | "roi" | null>(null);
  const [opSortBy, setOpSortBy] = useState<"revenue" | "roi">("revenue");

  // Dynamic Date Filter States
  const [activePreset, setActivePreset] = useState<"today" | "month" | "30d" | "all" | "custom">("month");
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [customStart, setCustomStart] = useState(initialStartDate);
  const [customEnd, setCustomEnd] = useState(initialEndDate);
  const [isPending, startTransition] = useTransition();

  // Dynamic Dashboard Data States
  const [cells, setCells] = useState(initialCells);
  const [unassigned, setUnassigned] = useState(initialUnassigned);
  const [leaders, setLeaders] = useState(initialLeaderboard);
  const [revenueUah, setRevenueUah] = useState(initialRevenue);
  const [spendUah, setSpendUah] = useState(initialSpend);
  const [profitUah, setProfitUah] = useState(initialProfit);
  const [roiVal, setRoiVal] = useState(initialRoi);

  // Helper converter
  const formatVal = (uahVal: number, isUAH: boolean = true) => {
    if (demoMode) return "•••";
    const safeVal = Number(uahVal) || 0;
    
    // If currency state is USD, convert from UAH (conversion rate ~41.5)
    if (currency === "USD") {
      const usdVal = Math.round(safeVal / 41.5);
      return "$" + (usdVal || 0).toLocaleString("uk-UA");
    }
    
    return (safeVal || 0).toLocaleString("uk-UA") + " ₴";
  };

  const loadData = (s: string, e: string) => {
    startTransition(async () => {
      const res = await getFounderDashboardDataAction(s, e);
      if (res.success) {
        setCells(res.cellsWithProjects || []);
        setUnassigned(res.unassignedProjects || []);
        setLeaders(res.leaderboard || []);
        setRevenueUah(res.totalRevenueUah || 0);
        setSpendUah(res.totalSpendUah || 0);
        setProfitUah(res.totalProfitUah || 0);
        setRoiVal(res.globalRoi || 0);
      }
    });
  };

  const handlePresetChange = (preset: "today" | "month" | "30d" | "all" | "custom") => {
    setActivePreset(preset);
    let s = "";
    let e = "";
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "today") {
      s = formatDate(today);
      e = formatDate(today);
    } else if (preset === "month") {
      const year = today.getFullYear();
      const month = today.getMonth();
      s = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      e = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else if (preset === "30d") {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      s = formatDate(start);
      e = formatDate(today);
    } else if (preset === "all") {
      s = "";
      e = "";
    }

    if (preset !== "custom") {
      setStartDate(s);
      setEndDate(e);
      loadData(s, e);
    }
  };

  const handleCustomApply = () => {
    setStartDate(customStart);
    setEndDate(customEnd);
    loadData(customStart, customEnd);
  };

  // Sort Leaderboard
  const sortedLeaderboard = [...leaders].sort((a, b) => {
    if (opSortBy === "roi") {
      return (b.roi || 0) - (a.roi || 0);
    }
    const aRev = Number(a.uah_revenue || (a.blended_revenue ? a.blended_revenue * 41.5 : 0) || 0);
    const bRev = Number(b.uah_revenue || (b.blended_revenue ? b.blended_revenue * 41.5 : 0) || 0);
    return bRev - aRev;
  });

  return (
    <div className="space-y-8 text-white w-full mx-auto font-sans">
      
      {/* Sticky Global Filter Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md border border-white/5 p-4 rounded-2xl bg-[#0c0c0f]/80 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-emerald-300 p-0.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="w-full h-full bg-[#0C0C0F] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              Консолідований Звіт
              {isPending && <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
            </h1>
            <p className="text-[10px] text-white/40">
              Період: <span className="text-emerald-400 font-bold">{startDate ? `${startDate} — ${endDate}` : "Весь час"}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Presets Selector */}
          <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5 overflow-x-auto text-[10px] font-black">
            <button
              onClick={() => handlePresetChange("today")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreset === "today" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              Сьогодні
            </button>
            <button
              onClick={() => handlePresetChange("month")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreset === "month" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              Поточний місяць
            </button>
            <button
              onClick={() => handlePresetChange("30d")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreset === "30d" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              30 днів
            </button>
            <button
              onClick={() => handlePresetChange("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreset === "all" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              Весь час
            </button>
            <button
              onClick={() => handlePresetChange("custom")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activePreset === "custom" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              Кастомно
            </button>
          </div>

          {activePreset === "custom" && (
            <div className="bg-white/5 p-1 rounded-xl border border-white/5">
              <CustomDateRangeInputs
                startDate={customStart}
                endDate={customEnd}
                onChange={(s, e) => {
                  setCustomStart(s);
                  setCustomEnd(e);
                }}
                onApply={handleCustomApply}
              />
            </div>
          )}

          {/* Currency Toggle */}
          <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5 shrink-0 text-[10px] font-black">
            <button
              onClick={() => setCurrency("UAH")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "UAH" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              ₴ UAH
            </button>
            <button
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currency === "USD" ? "bg-emerald-500 text-black shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              $ USD
            </button>
          </div>
        </div>
      </div>

      <ParabolicProgressBar isLoading={isPending} className="rounded-full" />

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
            {formatVal(revenueUah)}
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
            {formatVal(spendUah)}
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
            {formatVal(profitUah)}
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
            {roiVal.toFixed(2)} %
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
                {cells.map((c) => (
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
                {cells.map((c) => (
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
                {cells.map((c) => (
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
                {cells.map((c) => {
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
                {cells.length} Ячейок
              </span>
            </div>

            <div className="space-y-6">
              {cells.map((cell) => (
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

              {unassigned.length > 0 && (
                <div className="border border-white/5 rounded-xl p-4 bg-white/[0.01]">
                  <p className="font-bold text-xs uppercase tracking-wider text-white/40 mb-3 pl-1">
                    Інші проекти (Без ячейки)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {unassigned.map((proj: any) => (
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
                        {formatVal(op.uah_revenue || (op.blended_revenue ? op.blended_revenue * 41.5 : 0) || 0)}
                      </p>
                      <p className="text-[10px] text-white/30 font-semibold">
                        ROI: <span className="text-emerald-400">{Math.round(op.roi || 0)}%</span>
                      </p>
                    </div>
                  </div>
                );
              })}

              {sortedLeaderboard.length === 0 && (
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
                <span className="text-[9px] bg-neutral-500/10 text-neutral-400 px-2 py-0.5 rounded font-bold">Неактивно</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                <span>Фінансові звіти (тижневі)</span>
                <span className="text-[9px] bg-neutral-500/10 text-neutral-400 px-2 py-0.5 rounded font-bold">Неактивно</span>
              </div>
            </div>

            <button
              onClick={() => alert("Помилка: Telegram-інтеграція для автоматичних звітів фаундерів не налаштована. Будь ласка, вкажіть відповідні токени в налаштуваннях.")}
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
                  Змінено: {log.profiles?.email || "Невідомий користувач"} • {log.created_at ? new Date(log.created_at).toLocaleString("uk-UA") : "Невідомо"}
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
