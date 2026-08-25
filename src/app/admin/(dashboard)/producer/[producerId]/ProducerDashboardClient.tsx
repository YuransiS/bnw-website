"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  ShieldAlert, 
  TrendingUp, 
  Percent, 
  Users, 
  Wallet, 
  ArrowRight, 
  RefreshCw, 
  Calendar,
  Check
} from "lucide-react";
import { getProducerPerformanceDataAction, ProducerDashboardData, ProducerProjectData } from "./producerActions";

interface ProducerDashboardClientProps {
  initialData: ProducerDashboardData;
}

const PERIOD_PRESETS = [
  { id: "all", label: "Весь час" },
  { id: "today", label: "Сьогодні" },
  { id: "7d", label: "7 днів" },
  { id: "30d", label: "30 днів" },
  { id: "this_month", label: "Цей місяць" },
  { id: "last_month", label: "Минулий місяць" },
  { id: "this_year", label: "2026 рік" },
  { id: "custom", label: "Кастомно" },
];

export default function ProducerDashboardClient({ initialData }: ProducerDashboardClientProps) {
  const [data, setData] = useState<ProducerDashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const [activePreset, setActivePreset] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"UAH" | "USD" | "EUR">("UAH");

  // NBU Conversion Rates: 1 USD = 41.50 UAH, 1 EUR = 44.80 UAH
  const convertAmount = (uahAmount: number) => {
    const val = Number(uahAmount || 0);
    if (selectedCurrency === "USD") {
      return { val: val / 41.50, symbol: "$" };
    }
    if (selectedCurrency === "EUR") {
      return { val: val / 44.80, symbol: "€" };
    }
    return { val: val, symbol: "₴" };
  };

  const formatConverted = (uahAmount: number) => {
    const { val, symbol } = convertAmount(uahAmount);
    const formatted = new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
    return symbol === "$" || symbol === "€" ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  };

  const formatCpl = (cplUah: number) => {
    const { val, symbol } = convertAmount(cplUah);
    const formatted = val.toFixed(2);
    return symbol === "$" || symbol === "€" ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  };

  const handleSelectPeriod = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId === "custom") {
      setShowCustomDates(true);
      return;
    }
    setShowCustomDates(false);

    startTransition(async () => {
      const res = await getProducerPerformanceDataAction(data.producerId, presetId);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleApplyCustomDates = () => {
    if (!customStart) return;
    startTransition(async () => {
      const res = await getProducerPerformanceDataAction(data.producerId, "custom", customStart, customEnd || customStart);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getProducerPerformanceDataAction(
        data.producerId,
        activePreset,
        customStart,
        customEnd
      );
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const { val: profitVal, symbol: profitSymbol } = convertAmount(data.totalProfitUah);
  const formattedProfit = new Intl.NumberFormat("uk-UA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(profitVal);
  const displayProfit = profitSymbol === "$" || profitSymbol === "€" ? `${profitSymbol}${formattedProfit}` : `${formattedProfit} ${profitSymbol}`;

  return (
    <div className="space-y-8 text-white w-full mx-auto font-sans">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-white/5 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xl">
            {data.name ? data.name.charAt(0).toUpperCase() : "P"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">{data.name}</h1>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Продюсер
              </span>
            </div>
            <p className="text-xs text-white/40 mt-0.5">{data.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {data.assignedCells.length > 0 ? (
            data.assignedCells.map((cellName, idx) => (
              <span key={idx} className="bg-white/5 border border-white/5 text-[10px] font-bold text-white/60 px-3 py-1.5 rounded-xl">
                📁 {cellName}
              </span>
            ))
          ) : (
            <span className="bg-white/5 border border-white/5 text-[10px] font-bold text-white/30 px-3 py-1.5 rounded-xl">
              Осередок не закріплено
            </span>
          )}

          {/* Currency Switcher */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1 shadow-inner">
            {(["UAH", "USD", "EUR"] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedCurrency === curr
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-black"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {curr === "UAH" ? "₴ UAH" : curr === "USD" ? "$ USD" : "€ EUR"}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-all disabled:opacity-50"
            title="Оновити дані"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin text-emerald-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-neutral-900/80 border border-white/5 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Період звітності:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPeriod(preset.id)}
              disabled={isPending}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                activePreset === preset.id
                  ? "bg-white text-black font-black shadow-md"
                  : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {showCustomDates && (
          <div className="w-full pt-3 border-t border-white/5 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Від:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">До:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleApplyCustomDates}
              disabled={isPending || !customStart}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              Застосувати
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Profit */}
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Загальний прибуток</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className={`text-2xl font-black ${data.totalProfitUah >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {displayProfit}
          </p>
          <p className="text-[10px] text-white/30">Чистий операційний баланс</p>
        </div>

        {/* Gross Revenue */}
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Валова виручка</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-white">
            {formatConverted(data.totalRevenueUah)}
          </p>
          <p className="text-[10px] text-white/30">Оборот усіх проектів продюсера</p>
        </div>

        {/* Efficiency (ROI) */}
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Ефективність (ROI)</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <p className={`text-2xl font-black ${data.globalRoi >= 0 ? "text-purple-400" : "text-red-400"}`}>
            {data.globalRoi}%
          </p>
          <p className="text-[10px] text-white/30">Прибутковість витрат на рекламу</p>
        </div>

        {/* Total Leads / CPL */}
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-white/40">
            <span className="text-xs font-bold uppercase tracking-wider">Об'єм лідів / CPL</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {data.totalLeads} <span className="text-xs text-white/40 font-semibold">/ {formatCpl(data.avgCplUah)}</span>
          </p>
          <p className="text-[10px] text-white/30">Кількість залучених контактів</p>
        </div>
      </div>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Managed Projects */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                Проекти під керівництвом продюсера ({data.producerProjects.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.producerProjects.length === 0 ? (
                <p className="col-span-2 p-6 text-center text-white/30 italic">
                  За продюсером немає закріплених проектів
                </p>
              ) : (
                data.producerProjects.map((proj: ProducerProjectData) => (
                  <Link
                    key={proj.project_id}
                    href={`/admin/project/${proj.project_id}`}
                    className="border border-white/10 hover:border-emerald-500/40 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors">
                          {proj.project_name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                          proj.roi >= 0
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          ROI: {proj.roi}%
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-xs text-white/60">
                        <div className="flex justify-between">
                          <span>Виручка:</span>
                          <span className="font-bold text-emerald-400">{formatConverted(proj.revenue_uah)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Витрати:</span>
                          <span className="font-bold text-rose-400">{formatConverted(proj.expenses_uah)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-white/5">
                          <span>Ліди (CPL):</span>
                          <span className="font-bold text-white/80">{proj.leads_count} ({formatCpl(proj.cpl_uah)})</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-white/50 group-hover:text-emerald-400 transition-colors">
                      <span>Відкрити проект</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))
              )}
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
              {data.producerTaskLogs.map((log: any) => (
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

              {data.producerTaskLogs.length === 0 && (
                <p className="text-xs text-white/30 italic py-6 text-center">Переносів дедлайнів по задачах не знайдено</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
