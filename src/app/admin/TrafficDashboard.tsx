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

interface TrafficDashboardProps {
  activeSlug: string;
  isLight: boolean;
  startDate: string;
  endDate: string;
}

export default function TrafficDashboard({
  activeSlug,
  isLight,
  startDate,
  endDate
}: TrafficDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Views: simple vs advanced
  const [viewMode, setViewMode] = useState<"simple" | "advanced">("simple");
  // Groupings: campaign vs date
  const [groupBy, setGroupBy] = useState<"campaign" | "date">("campaign");
  // Search query for campaigns
  const [searchQuery, setSearchQuery] = useState("");

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
      setError(err.message || "Помилка при запиті даних");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSlug, startDate, endDate]);

  const activeRows = useMemo(() => {
    if (!data) return [];
    const rawRows = groupBy === "campaign" ? data.campaigns : data.daily;
    if (!searchQuery) return rawRows;
    const q = searchQuery.toLowerCase();
    return rawRows.filter((r: any) => {
      const name = groupBy === "campaign" ? r.campaign_name : r.date;
      return name.toLowerCase().includes(q);
    });
  }, [data, groupBy, searchQuery]);

  const totals = data?.totals;

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
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Аналітика Трафіку та Витрат</h3>
          <p className="text-[11px] text-white/30 font-semibold">
            Детальні звіти по окупності реклами Meta Ads. Курс НБУ: <span className="text-emerald-450">{data?.usdRate || 41.0} ₴/$</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Simple / Advanced View Switcher */}
          <div className="flex items-center gap-1 bg-[#050507] border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("simple")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "simple"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Простий
            </button>
            <button
              onClick={() => setViewMode("advanced")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "advanced"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Детальний
            </button>
          </div>

          {/* Grouping switcher */}
          <div className="flex items-center gap-1 bg-[#050507] border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setGroupBy("campaign")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                groupBy === "campaign"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Кампанії
            </button>
            <button
              onClick={() => setGroupBy("date")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                groupBy === "date"
                  ? "bg-white text-black shadow-lg"
                  : "text-white/40 hover:text-white"
              }`}
            >
              Дати
            </button>
          </div>

          {/* CSV Export */}
          <button
            onClick={handleExportCSV}
            disabled={!activeRows.length}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
          >
            <FileDown className="w-4 h-4 text-emerald-450" />
            Экспорт
          </button>
        </div>
      </div>

      {/* 2. Top-level KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl backdrop-blur-md space-y-1">
            <div className="flex justify-between items-center text-white/40">
              <span className="text-[10px] font-black uppercase tracking-wider">Бюджет (Spend)</span>
              <Coins className="w-4 h-4 text-emerald-450" />
            </div>
            <p className="text-lg font-black text-white">{formatUSD(totals.spend)}</p>
          </div>

          <div className="bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl backdrop-blur-md space-y-1">
            <div className="flex justify-between items-center text-white/40">
              <span className="text-[10px] font-black uppercase tracking-wider">Кліки</span>
              <MousePointerClick className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-lg font-black text-white">{totals.clicks.toLocaleString()}</p>
          </div>

          <div className="bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl backdrop-blur-md space-y-1">
            <div className="flex justify-between items-center text-white/40">
              <span className="text-[10px] font-black uppercase tracking-wider">Реєстрації (Ліди)</span>
              <Eye className="w-4 h-4 text-violet-400" />
            </div>
            <p className="text-lg font-black text-white">{totals.leads_count.toLocaleString()}</p>
            <p className="text-[9px] font-extrabold text-white/30 uppercase">CPL: {formatUSD(totals.cpl)}</p>
          </div>

          <div className="bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl backdrop-blur-md space-y-1">
            <div className="flex justify-between items-center text-white/40">
              <span className="text-[10px] font-black uppercase tracking-wider">Продажі</span>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg font-black text-white">{totals.sales.toLocaleString()}</p>
            <p className="text-[9px] font-extrabold text-white/30 uppercase">Конв: {totals.appCr}%</p>
          </div>

          <div className="bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl backdrop-blur-md col-span-2 lg:col-span-1 space-y-1">
            <div className="flex justify-between items-center text-white/40">
              <span className="text-[10px] font-black uppercase tracking-wider">Выручка (ROAS)</span>
              <TrendingUp className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-lg font-black text-white">{formatUSD(totals.usd_revenue)}</p>
            <p className="text-[9px] font-extrabold text-yellow-400/80 uppercase">ROAS: {totals.roas}x</p>
          </div>
        </div>
      )}

      {/* 3. Search and Search Bar */}
      {groupBy === "campaign" && (
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-white/20" />
          <input
            type="text"
            placeholder="Шукати кампанію..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#050507] border border-white/5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-white placeholder:text-white/25"
          />
        </div>
      )}

      {/* 4. Table Grid */}
      <div className="bg-[#0C0C0F]/45 border border-white/5 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse text-[11px] font-semibold text-white/70">
            <thead className="bg-[#050507]/60 border-b border-white/5 text-[9px] font-black uppercase tracking-wider text-white/50">
              {viewMode === "simple" ? (
                <tr>
                  <th className="p-4">{groupBy === "campaign" ? "Кампанія" : "Дата"}</th>
                  <th className="p-4 text-right">Бюджет</th>
                  <th className="p-4 text-right">Ліди</th>
                  <th className="p-4 text-right">Ціна ліда</th>
                  <th className="p-4 text-right">Продажі</th>
                  <th className="p-4 text-right">Сума $</th>
                  <th className="p-4 text-right text-yellow-450">ROAS</th>
                </tr>
              ) : (
                <tr>
                  <th className="p-3 sticky left-0 bg-[#050507]">{groupBy === "campaign" ? "Кампанія" : "Дата"}</th>
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
            <tbody className="divide-y divide-white/5">
              
              {/* Grand Totals Header Row */}
              {totals && (
                <tr className="bg-white/5 font-black text-white text-[11px] border-b border-white/10">
                  <td className="p-4 sticky left-0 bg-[#121217]">ВСЬОГО (Разом)</td>
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
                    key={row.campaign_id || row.date || idx}
                    className="hover:bg-white/5 transition-all text-white/80"
                  >
                    {viewMode === "simple" ? (
                      <>
                        <td className="p-4 font-semibold text-white/95 max-w-[280px] truncate">
                          {groupBy === "campaign" ? row.campaign_name : row.date}
                        </td>
                        <td className="p-4 text-right">{formatUSD(row.spend)}</td>
                        <td className="p-4 text-right">{row.leads_count.toLocaleString()}</td>
                        <td className="p-4 text-right text-white/40">{formatUSD(row.cpl)}</td>
                        <td className="p-4 text-right text-emerald-400/90">{row.sales.toLocaleString()}</td>
                        <td className="p-4 text-right font-bold text-white/90">{formatUSD(row.usd_revenue)}</td>
                        <td className="p-4 text-right text-yellow-400/90 font-bold">{row.roas}x</td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 sticky left-0 bg-[#0C0C0F] font-bold text-white max-w-[200px] truncate border-r border-white/5">
                          {groupBy === "campaign" ? row.campaign_name : row.date}
                        </td>
                        <td className="p-3 text-right">{formatUSD(row.spend)}</td>
                        <td className="p-3 text-right">{row.clicks.toLocaleString()}</td>
                        <td className="p-3 text-right">{row.impressions.toLocaleString()}</td>
                        <td className="p-3 text-right text-white/60">{row.ctr}%</td>
                        <td className="p-3 text-right text-white/60">{formatUSD(row.cpm)}</td>
                        <td className="p-3 text-right text-white/60">{formatUSD(row.cpc)}</td>
                        <td className="p-3 text-right text-violet-300">{row.leads_count.toLocaleString()}</td>
                        <td className="p-3 text-right text-white/60">{row.siteCr}%</td>
                        <td className="p-3 text-right text-white/40">{formatUSD(row.cpl)}</td>
                        <td className="p-3 text-right text-sky-300">{row.applications.toLocaleString()}</td>
                        <td className="p-3 text-right text-white/60">{row.appCr}%</td>
                        <td className="p-3 text-right text-white/40">{formatUSD(row.cpa)}</td>
                        <td className="p-3 text-right text-indigo-300">{row.consultations.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-450">{row.sales.toLocaleString()}</td>
                        <td className="p-3 text-right text-white font-bold">{formatUSD(row.usd_revenue)}</td>
                        <td className="p-3 text-right text-white/60">{formatUSD(row.aov)}</td>
                        <td className="p-3 text-right text-yellow-400 font-bold">{row.roas}x</td>
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
      
    </div>
  );
}
