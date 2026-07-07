"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  MousePointerClick,
  Eye,
  UserCheck,
  CheckCircle,
  FileDown,
  LineChart,
  TableProperties,
  Percent,
  Coins,
  Search,
  DollarSign,
  HelpCircle,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { getTrafficAnalyticsData } from "./actions";

interface PerformanceViewProps {
  activeSlug: string;
  isLight: boolean;
  startDate: string;
  endDate: string;
}

export default function PerformanceView({
  activeSlug,
  isLight,
  startDate,
  endDate
}: PerformanceViewProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamic theme styling classes
  const textClass = isLight ? "text-neutral-900" : "text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const cardClass = isLight ? "bg-white border border-neutral-200 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";
  const thBgClass = isLight ? "bg-neutral-100 text-neutral-500 border-b border-neutral-200" : "bg-white/[0.02] text-white/45 border-b border-white/5";
  const rowHoverClass = isLight ? "hover:bg-neutral-50" : "hover:bg-white/[0.01]";
  
  const inputClass = isLight 
    ? "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
    : "bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500";
  
  const switcherContainerClass = isLight 
    ? "flex items-center gap-1 bg-neutral-100 border border-neutral-200 p-1 rounded-xl w-full sm:w-auto" 
    : "flex items-center gap-1 bg-[#050507] border border-white/5 p-1 rounded-xl w-full sm:w-auto";

  const exportBtnClass = isLight
    ? "flex items-center gap-2 px-4 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 hover:text-neutral-900 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all disabled:opacity-50"
    : "flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/80 hover:text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all disabled:opacity-50";

  // Views: simple vs advanced
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");
  // Groupings: campaign vs date
  const [groupBy, setGroupBy] = useState<"campaign" | "date">("campaign");
  // Search query for campaigns
  const [searchQuery, setSearchQuery] = useState("");
  // Filter for active vs inactive campaigns
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getTrafficAnalyticsData(startDate, endDate, activeSlug);
      if ("error" in res) {
        setError(res.error || "Невідома помилка завантаження даних");
      } else {
        setData(res);
      }
    } catch (err: any) {
      setError(err.message || "Помилка при запиті данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSlug, startDate, endDate]);

  const activeRows = useMemo(() => {
    if (!data) return [];
    let rawRows = groupBy === "campaign" ? data.campaigns : data.daily;

    // Apply status filter for campaigns
    if (groupBy === "campaign" && statusFilter !== "all") {
      rawRows = rawRows.filter((r: any) => 
        statusFilter === "active" ? r.is_active : !r.is_active
      );
    }

    if (!searchQuery) return rawRows;
    const q = searchQuery.toLowerCase();
    return rawRows.filter((r: any) => {
      const name = groupBy === "campaign" ? r.campaign_name : r.date;
      return name.toLowerCase().includes(q);
    });
  }, [data, groupBy, searchQuery, statusFilter]);

  const totals = data?.totals;

  // Helper to calculate Monday of the week for a given date
  const getMonday = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff)).toISOString().split("T")[0];
    } catch {
      return null;
    }
  };

  // Helper to calculate Sunday of the week
  const getSunday = (mondayStr: string | null) => {
    if (!mondayStr) return null;
    try {
      const mon = new Date(mondayStr);
      if (isNaN(mon.getTime())) return null;
      mon.setDate(mon.getDate() + 6);
      return mon.toISOString().split("T")[0];
    } catch {
      return null;
    }
  };

  // Monthly summary calculations
  const monthlySummary = useMemo(() => {
    if (!data?.daily) return [];
    const groups: Record<string, any> = {};
    data.daily.forEach((r: any) => {
      if (!r.date || r.date === "unknown") return;
      const m = r.date.substring(0, 7); // "YYYY-MM"
      if (!groups[m]) {
        groups[m] = { month: m, spend: 0, clicks: 0, leads_count: 0, sales: 0, usd_revenue: 0, impressions: 0, applications: 0, consultations: 0 };
      }
      groups[m].spend += Number(r.spend || 0);
      groups[m].clicks += Number(r.clicks || 0);
      groups[m].impressions += Number(r.impressions || 0);
      groups[m].leads_count += Number(r.leads_count || 0);
      groups[m].sales += Number(r.sales || 0);
      groups[m].usd_revenue += Number(r.usd_revenue || 0);
      groups[m].applications += Number(r.applications || 0);
      groups[m].consultations += Number(r.consultations || 0);
    });
    return Object.values(groups).map((m: any) => {
      const roas = m.spend > 0 ? m.usd_revenue / m.spend : 0;
      return { ...m, roas: Number(roas.toFixed(2)) };
    }).sort((a, b) => b.month.localeCompare(a.month));
  }, [data]);

  // Weekly summary calculations
  const weeklySummary = useMemo(() => {
    if (!data?.daily) return [];
    const groups: Record<string, any> = {};
    data.daily.forEach((r: any) => {
      if (!r.date || r.date === "unknown") return;
      const mon = getMonday(r.date);
      if (!mon) return;
      const sun = getSunday(mon);
      if (!sun) return;
      if (!groups[mon]) {
        groups[mon] = { weekStart: mon, weekEnd: sun, spend: 0, clicks: 0, leads_count: 0, sales: 0, usd_revenue: 0, impressions: 0, applications: 0, consultations: 0 };
      }
      groups[mon].spend += Number(r.spend || 0);
      groups[mon].clicks += Number(r.clicks || 0);
      groups[mon].impressions += Number(r.impressions || 0);
      groups[mon].leads_count += Number(r.leads_count || 0);
      groups[mon].sales += Number(r.sales || 0);
      groups[mon].usd_revenue += Number(r.usd_revenue || 0);
      groups[mon].applications += Number(r.applications || 0);
      groups[mon].consultations += Number(r.consultations || 0);
    });
    return Object.values(groups).map((w: any) => {
      const roas = w.spend > 0 ? w.usd_revenue / w.spend : 0;
      return { ...w, roas: Number(roas.toFixed(2)) };
    }).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }, [data]);

  // Format currency helpers
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const handleExportCSV = () => {
    if (!activeRows.length) return;
    
    let headers: string[] = [];
    let fields: string[] = [];

    if (viewMode === "simple") {
      headers = ["Назва/Дата", "Бюджет", "Ліди", "Ціна ліда", "Продажі", "Сума $", "ROAS"];
      fields = [
        groupBy === "campaign" ? "campaign_name" : "date",
        "spend", "leads_count", "cpl", "sales", "usd_revenue", "roas"
      ];
    } else {
      headers = [
        "Назва/Дата", "Бюджет", "Кліки", "Покази", "CTR %", "CPM", "CPC", 
        "Ліди", "CR сайту %", "Ціна ліда", "Заявки", "CR в заявку %", 
        "Ціна заявки", "Консультації", "Продажі", "Сума $", "Середній чек", "ROAS"
      ];
      fields = [
        groupBy === "campaign" ? "campaign_name" : "date",
        "spend", "clicks", "impressions", "ctr", "cpm", "cpc",
        "leads_count", "siteCr", "cpl", "applications", "appCr",
        "cpa", "consultations", "sales", "usd_revenue", "aov", "roas"
      ];
    }

    const csvContent = [
      headers.join(","),
      ...activeRows.map((row: any) => 
        fields.map(field => {
          let val = row[field];
          if (typeof val === "string") {
            // Escape commas
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? 0;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `traffic_report_${activeSlug}_${groupBy}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-450" />
        <p className={`text-xs font-semibold uppercase tracking-widest ${isLight ? "text-neutral-400" : "text-white/40"}`}>
          Завантаження аналітики трафіку...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-xl mx-auto my-10 text-center space-y-4">
        <p className="text-sm font-semibold text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-500/20 text-red-200 text-xs font-black uppercase tracking-wider rounded-xl hover:bg-red-500/30 transition-all cursor-pointer"
        >
          Спробувати знову
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Toolbar */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${cardClass} p-4 rounded-2xl`}>
        <div className="space-y-1">
          <h3 className={`text-sm font-black uppercase tracking-widest ${textClass}`}>Аналітика Трафіку та Витрат</h3>
          <p className={`text-[11px] ${textMutedClass} font-semibold`}>
            Детальні звіти по окупності реклами Meta Ads. Курс НБУ: <span className="text-emerald-450">{data?.usdRate || 41.0} ₴/$</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Simple / Advanced View Switcher */}
          <div className={switcherContainerClass}>
            <button
              onClick={() => setViewMode("simple")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "simple"
                  ? isLight ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/50" : "bg-white text-black shadow-lg"
                  : isLight ? "text-neutral-500 hover:text-neutral-900" : "text-white/40 hover:text-white"
              }`}
            >
              Простий
            </button>
            <button
              onClick={() => setViewMode("advanced")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "advanced"
                  ? isLight ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/50" : "bg-white text-black shadow-lg"
                  : isLight ? "text-neutral-500 hover:text-neutral-900" : "text-white/40 hover:text-white"
              }`}
            >
              Детальний
            </button>
          </div>

          {/* Grouping switcher */}
          <div className={switcherContainerClass}>
            <button
              onClick={() => setGroupBy("campaign")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                groupBy === "campaign"
                  ? isLight ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/50" : "bg-white text-black shadow-lg"
                  : isLight ? "text-neutral-500 hover:text-neutral-900" : "text-white/40 hover:text-white"
              }`}
            >
              Кампанії
            </button>
            <button
              onClick={() => setGroupBy("date")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                groupBy === "date"
                  ? isLight ? "bg-white text-neutral-900 shadow-sm border border-neutral-200/50" : "bg-white text-black shadow-lg"
                  : isLight ? "text-neutral-500 hover:text-neutral-900" : "text-white/40 hover:text-white"
              }`}
            >
              Дати
            </button>
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={!activeRows.length}
            className={exportBtnClass}
          >
            <FileDown className="w-4 h-4 text-emerald-450" />
            Экспорт
          </button>
        </div>
      </div>

      {/* 2. Top-level KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`${cardClass} p-4 rounded-2xl space-y-1`}>
            <div className="flex justify-between items-center text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Бюджет (Spend)</span>
              <Coins className="w-4 h-4 text-emerald-450" />
            </div>
            <p className={`text-lg font-black ${textClass}`}>{formatUSD(totals.spend)}</p>
          </div>

          <div className={`${cardClass} p-4 rounded-2xl space-y-1`}>
            <div className="flex justify-between items-center text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Кліки</span>
              <MousePointerClick className="w-4 h-4 text-sky-400" />
            </div>
            <p className={`text-lg font-black ${textClass}`}>{totals.clicks.toLocaleString()}</p>
          </div>

          <div className={`${cardClass} p-4 rounded-2xl space-y-1`}>
            <div className="flex justify-between items-center text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Реєстрації (Ліди)</span>
              <Eye className="w-4 h-4 text-violet-400" />
            </div>
            <p className={`text-lg font-black ${textClass}`}>{totals.leads_count.toLocaleString()}</p>
            <p className={`text-[9px] font-extrabold ${textMutedClass} uppercase`}>CPL: {formatUSD(totals.cpl)}</p>
          </div>

          <div className={`${cardClass} p-4 rounded-2xl space-y-1`}>
            <div className="flex justify-between items-center text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Продажі</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className={`text-lg font-black ${textClass}`}>{totals.sales.toLocaleString()}</p>
            <p className={`text-[9px] font-extrabold ${textMutedClass} uppercase`}>Конв: {totals.appCr}%</p>
          </div>

          <div className={`${cardClass} p-4 rounded-2xl col-span-2 lg:col-span-1 space-y-1`}>
            <div className="flex justify-between items-center text-neutral-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Выручка (ROAS)</span>
              <TrendingUp className="w-4 h-4 text-yellow-400" />
            </div>
            <p className={`text-lg font-black ${textClass}`}>{formatUSD(totals.usd_revenue)}</p>
            <p className="text-[9px] font-extrabold text-yellow-400/80 uppercase">ROAS: {totals.roas}x</p>
          </div>
        </div>
      )}

      {/* 3. Search and Filters panel */}
      {groupBy === "campaign" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-3">
            <Search className={`absolute left-4 top-3.5 w-4 h-4 ${isLight ? "text-neutral-450" : "text-white/20"}`} />
            <input
              type="text"
              placeholder="Шукати кампанію..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 ${inputClass} rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3 ${inputClass} rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500`}
            >
              <option value="all">🎯 Всі статуси</option>
              <option value="active">🟢 Активні</option>
              <option value="inactive">⚫ Завершені</option>
            </select>
          </div>
        </div>
      )}

      {/* 4. Table Grid / Dates Dashboard */}
      {groupBy === "campaign" ? (
        <div className={`${cardClass} rounded-2xl overflow-hidden`}>
          <div className="overflow-x-auto max-w-full">
            <table className={`w-full text-left border-collapse text-[11px] font-semibold ${isLight ? "text-neutral-700" : "text-white/70"}`}>
              <thead className={thBgClass}>
                {viewMode === "simple" ? (
                  <tr>
                    <th className="p-4">Кампанія</th>
                    <th className="p-4 text-right">Бюджет</th>
                    <th className="p-4 text-right">Ліди</th>
                    <th className="p-4 text-right">Ціна ліда</th>
                    <th className="p-4 text-right">Продажі</th>
                    <th className="p-4 text-right">Сума $</th>
                    <th className="p-4 text-right text-yellow-450">ROAS</th>
                  </tr>
                ) : (
                  <tr>
                    <th className={`p-3 sticky left-0 ${isLight ? "bg-neutral-100 text-neutral-500" : "bg-[#050507] text-white/50"}`}>Кампанія</th>
                    <th className="p-3 text-right">Бюджет</th>
                    <th className="p-3 text-right">Кліки</th>
                    <th className="p-3 text-right">Покази</th>
                    <th className="p-3 text-right">CTR %</th>
                    <th className="p-3 text-right">CPM</th>
                    <th className="p-3 text-right">CPC</th>
                    <th className="p-3 text-right text-violet-400">Ліди</th>
                    <th className="p-3 text-right">CR сайту %</th>
                    <th className="p-3 text-right">Ціна ліда</th>
                    <th className="p-3 text-right text-sky-400">Заявки</th>
                    <th className="p-3 text-right">CR в заявку %</th>
                    <th className="p-3 text-right">Ціна заявки</th>
                    <th className="p-3 text-right text-indigo-400">Консультації</th>
                    <th className="p-3 text-right text-emerald-400">Продажі</th>
                    <th className="p-3 text-right">Сума $</th>
                    <th className="p-3 text-right">Сер. Чек</th>
                    <th className="p-3 text-right text-yellow-450">ROAS</th>
                  </tr>
                )}
              </thead>
              <tbody className={`divide-y ${borderClass}`}>
                {/* Grand Totals Header Row */}
                {totals && (
                  <tr className={`${isLight ? "bg-neutral-100 text-neutral-900 border-b border-neutral-200" : "bg-white/5 text-white border-b border-white/10"} font-black text-[11px]`}>
                    <td className={`p-4 sticky left-0 ${isLight ? "bg-neutral-100" : "bg-[#121217]"}`}>ВСЬОГО (Разом)</td>
                    <td className="p-4 text-right text-emerald-450">{formatUSD(totals.spend)}</td>
                    {viewMode === "simple" ? (
                      <>
                        <td className="p-4 text-right">{totals.leads_count.toLocaleString()}</td>
                        <td className="p-4 text-right">{formatUSD(totals.cpl)}</td>
                        <td className="p-4 text-right text-emerald-400">{totals.sales.toLocaleString()}</td>
                        <td className="p-4 text-right font-black">{formatUSD(totals.usd_revenue)}</td>
                        <td className="p-4 text-right text-yellow-400">{totals.roas}x</td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 text-right">{totals.clicks.toLocaleString()}</td>
                        <td className="p-3 text-right">{totals.impressions.toLocaleString()}</td>
                        <td className="p-3 text-right">{totals.ctr}%</td>
                        <td className="p-3 text-right">{formatUSD(totals.cpm)}</td>
                        <td className="p-3 text-right">{formatUSD(totals.cpc)}</td>
                        <td className="p-3 text-right text-violet-400">{totals.leads_count.toLocaleString()}</td>
                        <td className="p-3 text-right">{totals.siteCr}%</td>
                        <td className="p-3 text-right">{formatUSD(totals.cpl)}</td>
                        <td className="p-3 text-right text-sky-400">{totals.applications.toLocaleString()}</td>
                        <td className="p-3 text-right">{totals.appCr}%</td>
                        <td className="p-3 text-right">{formatUSD(totals.cpa)}</td>
                        <td className="p-3 text-right text-indigo-400">{totals.consultations.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-400">{totals.sales.toLocaleString()}</td>
                        <td className="p-3 text-right">{formatUSD(totals.usd_revenue)}</td>
                        <td className="p-3 text-right">{formatUSD(totals.aov)}</td>
                        <td className="p-3 text-right text-yellow-400">{totals.roas}x</td>
                      </>
                    )}
                  </tr>
                )}

                {/* Data Rows */}
                {activeRows.length > 0 ? (
                  activeRows.map((row: any, idx: number) => (
                    <tr
                      key={row.campaign_id || idx}
                      className={`${rowHoverClass} transition-all ${isLight ? "text-neutral-800" : "text-white/80"}`}
                    >
                      {viewMode === "simple" ? (
                        <>
                          <td className={`p-4 font-semibold ${isLight ? "text-neutral-900" : "text-white/95"} max-w-[280px]`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${row.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-neutral-500"}`} title={row.is_active ? "Активна" : "Завершена"} />
                                <span className="truncate" title={row.campaign_name}>
                                  {row.campaign_name}
                                </span>
                              </div>
                              {row.min_date && (
                                <span className={`text-[9px] font-black ${isLight ? "text-neutral-450" : "text-white/30"} uppercase`}>
                                  📅 {row.min_date} — {row.max_date}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">{formatUSD(row.spend)}</td>
                          <td className="p-4 text-right">{row.leads_count.toLocaleString()}</td>
                          <td className={`p-4 text-right ${isLight ? "text-neutral-450" : "text-white/40"}`}>{formatUSD(row.cpl)}</td>
                          <td className="p-4 text-right text-emerald-400/90">{row.sales.toLocaleString()}</td>
                          <td className={`p-4 text-right font-bold ${isLight ? "text-neutral-900" : "text-white/90"}`}>{formatUSD(row.usd_revenue)}</td>
                          <td className={`p-4 text-right text-yellow-500 font-bold`}>{row.roas}x</td>
                        </>
                      ) : (
                        <>
                          <td className={`p-3 sticky left-0 font-bold max-w-[200px] border-r ${borderClass} ${isLight ? "bg-white text-neutral-900" : "bg-[#0C0C0F] text-white"}`}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${row.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-neutral-500"}`} title={row.is_active ? "Активна" : "Завершена"} />
                                <span className="truncate" title={row.campaign_name}>
                                  {row.campaign_name}
                                </span>
                              </div>
                              {row.min_date && (
                                <span className={`text-[9px] font-black ${isLight ? "text-neutral-450" : "text-white/30"} uppercase`}>
                                  📅 {row.min_date} — {row.max_date}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">{formatUSD(row.spend)}</td>
                          <td className="p-3 text-right">{row.clicks.toLocaleString()}</td>
                          <td className="p-3 text-right">{row.impressions.toLocaleString()}</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{row.ctr}%</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{formatUSD(row.cpm)}</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{formatUSD(row.cpc)}</td>
                          <td className={`p-3 text-right ${isLight ? "text-violet-600" : "text-violet-300"}`}>{row.leads_count.toLocaleString()}</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{row.siteCr}%</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-450" : "text-white/40"}`}>{formatUSD(row.cpl)}</td>
                          <td className={`p-3 text-right ${isLight ? "text-sky-600" : "text-sky-300"}`}>{row.applications.toLocaleString()}</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{row.appCr}%</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-450" : "text-white/40"}`}>{formatUSD(row.cpa)}</td>
                          <td className={`p-3 text-right ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>{row.consultations.toLocaleString()}</td>
                          <td className={`p-3 text-right ${isLight ? "text-emerald-600" : "text-emerald-450"}`}>{row.sales.toLocaleString()}</td>
                          <td className={`p-3 text-right font-bold ${isLight ? "text-neutral-900" : "text-white"}`}>{formatUSD(row.usd_revenue)}</td>
                          <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{formatUSD(row.aov)}</td>
                          <td className={`p-3 text-right font-bold ${isLight ? "text-yellow-600" : "text-yellow-400"}`}>{row.roas}x</td>
                        </>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={viewMode === "simple" ? 7 : 18}
                      className="p-8 text-center text-xs font-semibold text-white/20 uppercase tracking-widest"
                    >
                      Дані про витрати або трафік за цей період відсутні
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Daily Table (Left Column, xl:col-span-2) */}
          <div className={`xl:col-span-2 ${cardClass} rounded-2xl overflow-hidden flex flex-col`}>
            <div className={`p-4 border-b ${borderClass} ${isLight ? "bg-neutral-50" : "bg-[#050507]/40"} flex justify-between items-center`}>
              <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass}`}>Детальна статистика по днях</h4>
            </div>
            
            <div className="overflow-x-auto max-w-full">
              <table className={`w-full text-left border-collapse text-[11px] font-semibold ${isLight ? "text-neutral-700" : "text-white/70"}`}>
                <thead className={thBgClass}>
                  {viewMode === "simple" ? (
                    <tr>
                      <th className="p-4">Дата</th>
                      <th className="p-4 text-right">Бюджет</th>
                      <th className="p-4 text-right">Ліди</th>
                      <th className="p-4 text-right">Ціна ліда</th>
                      <th className="p-4 text-right">Продажі</th>
                      <th className="p-4 text-right">Сума $</th>
                      <th className="p-4 text-right text-yellow-450">ROAS</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className={`p-3 sticky left-0 ${isLight ? "bg-neutral-100 text-neutral-500" : "bg-[#050507] text-white/50"}`}>Дата</th>
                      <th className="p-3 text-right">Бюджет</th>
                      <th className="p-3 text-right">Кліки</th>
                      <th className="p-3 text-right">Покази</th>
                      <th className="p-3 text-right">CTR %</th>
                      <th className="p-3 text-right">CPM</th>
                      <th className="p-3 text-right">CPC</th>
                      <th className="p-3 text-right text-violet-400">Ліди</th>
                      <th className="p-3 text-right">CR сайту %</th>
                      <th className="p-3 text-right">Ціна ліда</th>
                      <th className="p-3 text-right text-sky-400">Заявки</th>
                      <th className="p-3 text-right">CR в заявку %</th>
                      <th className="p-3 text-right">Ціна заявки</th>
                      <th className="p-3 text-right text-indigo-400">Консультації</th>
                      <th className="p-3 text-right text-emerald-400">Продажі</th>
                      <th className="p-3 text-right">Сума $</th>
                      <th className="p-3 text-right">Сер. Чек</th>
                      <th className="p-3 text-right text-yellow-450">ROAS</th>
                    </tr>
                  )}
                </thead>
                <tbody className={`divide-y ${borderClass}`}>
                  {activeRows.length > 0 ? (
                    activeRows.map((row: any, idx: number) => (
                      <tr
                        key={row.date || idx}
                        className={`${rowHoverClass} transition-all ${isLight ? "text-neutral-800" : "text-white/80"}`}
                      >
                        {viewMode === "simple" ? (
                          <>
                            <td className={`p-4 font-bold ${isLight ? "text-neutral-900" : "text-white/95"}`}>{row.date}</td>
                            <td className="p-4 text-right">{formatUSD(row.spend)}</td>
                            <td className="p-4 text-right">{row.leads_count.toLocaleString()}</td>
                            <td className={`p-4 text-right ${isLight ? "text-neutral-450" : "text-white/40"}`}>{formatUSD(row.cpl)}</td>
                            <td className="p-4 text-right text-emerald-400/90">{row.sales.toLocaleString()}</td>
                            <td className={`p-4 text-right font-bold ${isLight ? "text-neutral-900" : "text-white/90"}`}>{formatUSD(row.usd_revenue)}</td>
                            <td className={`p-4 text-right text-yellow-500 font-bold`}>{row.roas}x</td>
                          </>
                        ) : (
                          <>
                            <td className={`p-3 sticky left-0 font-bold border-r ${borderClass} ${isLight ? "bg-white text-neutral-900" : "bg-[#0C0C0F] text-white"}`}>{row.date}</td>
                            <td className="p-3 text-right">{formatUSD(row.spend)}</td>
                            <td className="p-3 text-right">{row.clicks.toLocaleString()}</td>
                            <td className="p-3 text-right">{row.impressions.toLocaleString()}</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{row.ctr}%</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{formatUSD(row.cpm)}</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{formatUSD(row.cpc)}</td>
                            <td className={`p-3 text-right ${isLight ? "text-violet-600" : "text-violet-300"}`}>{row.leads_count.toLocaleString()}</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{row.siteCr}%</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-450" : "text-white/40"}`}>{formatUSD(row.cpl)}</td>
                            <td className={`p-3 text-right ${isLight ? "text-sky-600" : "text-sky-300"}`}>{row.applications.toLocaleString()}</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{row.appCr}%</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-450" : "text-white/40"}`}>{formatUSD(row.cpa)}</td>
                            <td className={`p-3 text-right ${isLight ? "text-indigo-600" : "text-indigo-300"}`}>{row.consultations.toLocaleString()}</td>
                            <td className={`p-3 text-right ${isLight ? "text-emerald-600" : "text-emerald-450"}`}>{row.sales.toLocaleString()}</td>
                            <td className={`p-3 text-right font-bold ${isLight ? "text-neutral-900" : "text-white"}`}>{formatUSD(row.usd_revenue)}</td>
                            <td className={`p-3 text-right ${isLight ? "text-neutral-500" : "text-white/60"}`}>{formatUSD(row.aov)}</td>
                            <td className={`p-3 text-right font-bold ${isLight ? "text-yellow-600" : "text-yellow-400"}`}>{row.roas}x</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={viewMode === "simple" ? 7 : 18}
                        className="p-8 text-center text-xs font-semibold text-white/20 uppercase tracking-widest"
                      >
                        Немає даних за обраний період
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Weekly & Monthly summaries */}
          <div className="space-y-6 flex flex-col">
            {/* Monthly Summary Table */}
            <div className={`${cardClass} rounded-2xl overflow-hidden flex flex-col`}>
              <div className={`p-4 border-b ${borderClass} ${isLight ? "bg-neutral-50" : "bg-[#050507]/40"}`}>
                <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass}`}>📅 Підсумок за місяцями</h4>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full text-left border-collapse text-[11px] font-semibold ${isLight ? "text-neutral-700" : "text-white/70"}`}>
                  <thead className={thBgClass}>
                    <tr>
                      <th className="p-3">Місяць</th>
                      <th className="p-3 text-right">Витрати</th>
                      <th className="p-3 text-right">Ліди</th>
                      <th className="p-3 text-right font-black">Выручка</th>
                      <th className="p-3 text-right text-yellow-450">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderClass}`}>
                    {monthlySummary.length > 0 ? (
                      monthlySummary.map((m: any) => (
                        <tr key={m.month} className={`${rowHoverClass} transition-all ${isLight ? "text-neutral-800" : "text-white/80"}`}>
                          <td className={`p-3 font-bold ${isLight ? "text-neutral-900" : "text-white"} capitalize`}>
                            {new Date(m.month + "-02").toLocaleString("uk-UA", { month: "long", year: "numeric" })}
                          </td>
                          <td className="p-3 text-right">{formatUSD(m.spend)}</td>
                          <td className="p-3 text-right">{m.leads_count.toLocaleString()}</td>
                          <td className="p-3 text-right text-emerald-400 font-bold">{formatUSD(m.usd_revenue)}</td>
                          <td className={`p-3 text-right font-bold ${m.roas >= 1 ? "text-yellow-500" : (isLight ? "text-neutral-450" : "text-white/40")}`}>{m.roas}x</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-[10px] text-white/30 uppercase">Немає місячних даних</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Weekly Summary Table */}
            <div className={`${cardClass} rounded-2xl overflow-hidden flex flex-col`}>
              <div className={`p-4 border-b ${borderClass} ${isLight ? "bg-neutral-50" : "bg-[#050507]/40"}`}>
                <h4 className={`text-[10px] font-black uppercase tracking-wider ${textClass}`}>📅 Підсумок за тижнями</h4>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className={`w-full text-left border-collapse text-[11px] font-semibold ${isLight ? "text-neutral-700" : "text-white/70"}`}>
                  <thead className={thBgClass}>
                    <tr>
                      <th className="p-3">Тиждень</th>
                      <th className="p-3 text-right">Витрати</th>
                      <th className="p-3 text-right">Ліди</th>
                      <th className="p-3 text-right font-black">Выручка</th>
                      <th className="p-3 text-right text-yellow-450">ROAS</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderClass}`}>
                    {weeklySummary.length > 0 ? (
                      weeklySummary.map((w: any) => {
                        // Format dates nicely, e.g. "22 Jun - 28 Jun"
                        const fStart = new Date(w.weekStart).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
                        const fEnd = new Date(w.weekEnd).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
                        return (
                          <tr key={w.weekStart} className={`${rowHoverClass} transition-all ${isLight ? "text-neutral-800" : "text-white/80"}`}>
                            <td className={`p-3 font-bold ${isLight ? "text-neutral-950" : "text-white"} text-[10px]`}>
                              {fStart} — {fEnd}
                            </td>
                            <td className="p-3 text-right">{formatUSD(w.spend)}</td>
                            <td className="p-3 text-right">{w.leads_count.toLocaleString()}</td>
                            <td className="p-3 text-right text-emerald-400 font-bold">{formatUSD(w.usd_revenue)}</td>
                            <td className={`p-3 text-right font-bold ${w.roas >= 1 ? "text-yellow-500" : (isLight ? "text-neutral-450" : "text-white/40")}`}>{w.roas}x</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-[10px] text-white/30 uppercase">Немає тижневих даних</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
