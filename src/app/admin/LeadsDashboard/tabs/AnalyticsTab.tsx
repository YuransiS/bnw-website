"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Search,
  AlertCircle,
  Clock,
  X,
  Globe,
  ExternalLink,
  Briefcase,
  Sparkles,
  FileSpreadsheet,
  MousePointerClick,
  ChevronDown,
  ChevronRight,
  Shield,
  Activity,
  Plus,
  Target,
  Layers
} from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { formatLocaleNumber, formatDualCurrency, formatDualProfit } from "@/app/admin/utils";
import { traceVisitorUuidAction } from "../../actions";

interface AnalyticsTabProps {
  singleProjectStats: any;
  splineTrendData: any[];
  utmAttributionTree: any[];
  dataHealth: any;
  performanceInfo: any;
  clientRequestMs: number | null;
  role: string;
  isDevMode: boolean;
  activeSlug: string;
  activeProjectId: string;
  dateRangePreset: string;
  startDate: string;
  endDate: string;
  applyPreset: (preset: "all" | "30d" | "7d" | "1d" | "month") => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setDateRangePreset: (val: any) => void;
  funnels: any[];
  funnelTransactions: any[];
  campaignsList: any[];
  leadsList: any[];
  setActiveTab: (val: string) => void;
  globalCurrency?: "USD" | "UAH";
}

export const AnalyticsTab = React.memo(function AnalyticsTab({
  singleProjectStats,
  splineTrendData,
  utmAttributionTree,
  dataHealth,
  performanceInfo,
  clientRequestMs,
  role,
  isDevMode,
  activeSlug,
  activeProjectId,
  dateRangePreset,
  startDate,
  endDate,
  applyPreset,
  setStartDate,
  setEndDate,
  setDateRangePreset,
  funnels,
  funnelTransactions,
  campaignsList,
  leadsList,
  setActiveTab,
  globalCurrency = "UAH"
}: AnalyticsTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";
  const textMutedLightClass = "text-crm-muted/50";
  const inputClass = "bg-crm-input-bg border border-crm-border text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

  // Isolated states for UTM tree collapse
  const [expandedUtmNodes, setExpandedUtmNodes] = useState<Record<string, boolean>>({});

  const toggleUtmNode = (path: string) => {
    setExpandedUtmNodes((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Funnel Analytics Calculator
  const getFunnelStats = (funnel: any) => {
    const startDateTime = new Date(funnel.start_date).getTime();
    
    // Filter leads created after start date, and matching campaign or landing slugs
    const matchedLeads = leadsList.filter((lead: any) => {
      const leadTime = new Date(lead.created_at).getTime();
      if (leadTime < startDateTime) return false;

      const leadCampaign = String(lead.utm_campaign || "").trim().toLowerCase();
      const leadLanding = String(lead.landing || lead.metadata?.target_sheet || "").trim().toLowerCase();

      const campaignMatch = funnel.campaign_ids.some((id: string) => leadCampaign.includes(id.toLowerCase()));
      const landingMatch = funnel.landing_slugs.some((slug: string) => leadLanding.includes(slug.toLowerCase()));

      return campaignMatch || landingMatch;
    });

    // Sum revenue from these leads (orders)
    let revenue = 0;
    let salesCount = 0;
    matchedLeads.forEach((lead: any) => {
      if (lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер") {
        revenue += Number(lead.amount || 0);
        salesCount++;
      }
    });

    // Sum Ad Spends from matched campaigns after funnel start date
    let spend = 0;
    campaignsList.forEach((c: any) => {
      const isMatched = funnel.campaign_ids.some((id: string) => String(c.campaign_name || "").toLowerCase().includes(id.toLowerCase()));
      if (isMatched) {
        spend += Number(c.spend || 0);
      }
    });

    // Sum manual transactions bound to this funnel
    let manualSpendUAH = 0;
    let manualIncomeUAH = 0;

    funnelTransactions.forEach((tx: any) => {
      if (tx.funnel_id === funnel.id) {
        const amt = Number(tx.amount || 0);
        const isUAH = tx.currency === "UAH";
        const amtUAH = isUAH ? amt : amt * 44; // Conversion rate to UAH
        if (tx.type === "expense") {
          manualSpendUAH += amtUAH;
        } else {
          manualIncomeUAH += amtUAH;
        }
      }
    });

    revenue += manualIncomeUAH;
    spend += manualSpendUAH;

    const leadsCount = matchedLeads.length;
    const profit = revenue - spend;
    const roi = spend > 0 ? (profit / spend) * 100 : 0;
    const cr = leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0;

    return {
      leadsCount,
      salesCount,
      revenue,
      spend,
      profit,
      roi,
      cr,
      manualSpend: manualSpendUAH,
      manualIncome: manualIncomeUAH
    };
  };

  // Isolated states for QA Diagnostics panel
  const [isQaPanelExpanded, setIsQaPanelExpanded] = useState(false);
  const [traceQuery, setTraceQuery] = useState("");
  const [traceResults, setTraceResults] = useState<any[] | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceError, setTraceError] = useState("");

  const handleTraceVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceQuery.trim()) return;
    setIsTracing(true);
    setTraceError("");
    setTraceResults(null);
    try {
      const res = await traceVisitorUuidAction(traceQuery, activeProjectId);
      if (res.error) {
        setTraceError(res.error);
      } else {
        setTraceResults(res.chain || []);
      }
    } catch (err: any) {
      setTraceError(err.message || "Помилка при трасуванні користувача");
    } finally {
      setIsTracing(false);
    }
  };

  // Recursive UTM row renderer
  const renderUtmNodeRow = (node: any, depth = 0, parentPath = "") => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isExpanded = !!expandedUtmNodes[currentPath];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <React.Fragment key={currentPath}>
        <tr
          onClick={() => hasChildren && toggleUtmNode(currentPath)}
          className={`transition-all border-b border-white/5 cursor-pointer ${
            depth === 0 ? "bg-white/[0.01] hover:bg-white/[0.03]" : "hover:bg-white/[0.02]"
          }`}
        >
          <td className="p-4 flex items-center gap-2" style={{ paddingLeft: `${16 + depth * 24}px` }}>
            {hasChildren ? (
              <span className="text-white/40 shrink-0">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </span>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}
            <span
              className={`truncate text-xs ${
                depth === 0
                  ? "font-extrabold text-white uppercase tracking-wider"
                  : depth === 1
                  ? `font-bold ${isLight ? "text-indigo-600" : "text-indigo-400"}`
                  : depth === 2
                  ? `font-medium ${isLight ? "text-amber-600" : "text-amber-400/90"}`
                  : "font-normal text-white/60"
              }`}
            >
              {node.name}
            </span>
          </td>
          <td className={`p-4 text-center font-bold ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>
            {node.clicks}
          </td>
          <td className="p-4 text-center font-extrabold text-white">{node.leads}</td>
          <td className={`p-4 text-center font-bold ${isLight ? "text-blue-600" : "text-blue-400"}`}>
            {node.cr.toFixed(1)}%
          </td>
          <td className={`p-4 text-center font-black ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>
            {formatDualCurrency(node.usd_revenue, node.uah_revenue, 0, globalCurrency)}
          </td>
        </tr>

        {hasChildren &&
          isExpanded &&
          node.children.map((child: any) => renderUtmNodeRow(child, depth + 1, currentPath))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 2-Column Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        
        {/* Left Side: Summary KPI Metrics (col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">Сводні показники проекту</h3>
            <span className="text-[10px] text-white/30 font-mono">Оновлено</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Spend card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>Витрати на рекламу ($)</p>
              <p className="text-2xl font-black text-red-400 mt-2">${singleProjectStats?.totalSpend?.toFixed(2) || "0.00"}</p>
              <p className={`text-[10px] ${textMutedClass} mt-0.5 font-semibold`}>Сумарний бюджет усього періоду</p>
            </div>

            {/* Course Revenue Card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>Виручка за курс</p>
              <div className="mt-2 space-y-0.5">
                {globalCurrency === "UAH" ? (
                  <p className="text-xl font-black text-emerald-455">
                    {formatLocaleNumber(singleProjectStats?.uahCourseRevenue || 0)} ₴
                  </p>
                ) : (
                  <p className="text-xl font-black text-emerald-455">
                    ${formatLocaleNumber(singleProjectStats?.usdCourseRevenue || 0)}
                  </p>
                )}
              </div>
              <p className={`text-[10px] ${textMutedClass} mt-1 font-semibold`}>Виручка тільки від продажу основного курсу</p>
            </div>

            {/* Tripwire Revenue Card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>Виручка за трипвайєри</p>
              <div className="mt-2 space-y-0.5">
                {globalCurrency === "UAH" ? (
                  <p className="text-xl font-black text-indigo-400">
                    {formatLocaleNumber(singleProjectStats?.uahTripwireRevenue || 0)} ₴
                  </p>
                ) : (
                  <p className="text-xl font-black text-indigo-400">
                    ${formatLocaleNumber(singleProjectStats?.usdTripwireRevenue || 0)}
                  </p>
                )}
              </div>
              <p className={`text-[10px] ${textMutedClass} mt-1 font-semibold`}>Виручка від міні-продуктів та практикуму</p>
            </div>

            {/* Clean Profit & ROI Card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>
                Чистий Прибуток (Маржа)
              </p>
              <div className="mt-2 space-y-0.5">
                {globalCurrency === "UAH" ? (
                  <p
                    className={`text-lg font-black ${
                      (singleProjectStats?.uahRevenue || 0) - ((singleProjectStats?.totalSpend || 0) * (singleProjectStats?.uahRevenue / (singleProjectStats?.usdRevenue || 1))) >= 0 ? "text-emerald-455" : "text-red-400"
                    }`}
                  >
                    {((singleProjectStats?.uahRevenue || 0) - ((singleProjectStats?.totalSpend || 0) * (singleProjectStats?.uahRevenue / (singleProjectStats?.usdRevenue || 1)))) >= 0 ? "" : "-"}
                    {formatLocaleNumber(
                      Math.abs(
                        (singleProjectStats?.uahRevenue || 0) - 
                        ((singleProjectStats?.totalSpend || 0) * (singleProjectStats?.uahRevenue / (singleProjectStats?.usdRevenue || 1)))
                      )
                    )} ₴
                  </p>
                ) : (
                  <p
                    className={`text-lg font-black ${
                      (singleProjectStats?.netProfitUsd || 0) >= 0 ? "text-emerald-455" : "text-red-400"
                    }`}
                  >
                    {(singleProjectStats?.netProfitUsd || 0) >= 0 ? "" : "-"}$
                    {formatLocaleNumber(Math.abs(singleProjectStats?.netProfitUsd || 0))}
                  </p>
                )}
                <span className="text-[9px] font-black uppercase text-yellow-400 block mt-1 tracking-wider">
                  ROI за курс: {singleProjectStats?.roi?.toFixed(1) || "0.0"}%
                </span>
              </div>
            </div>

            {/* Clicks card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>Трафік (Кліки)</p>
              <p className={`text-2xl font-black ${isLight ? "text-neutral-900" : "text-white"} mt-2`}>
                {singleProjectStats?.totalClicks || 0}
              </p>
              <p className={`text-[10px] ${textMutedClass} mt-0.5 font-semibold`}>Загальна кількість переходів на сайт</p>
            </div>

            {/* Leads Card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>Реєстрації (Ліди)</p>
              <p className={`text-2xl font-black ${isLight ? "text-neutral-900" : "text-white"} mt-2`}>
                {singleProjectStats?.totalLeads || 0}
              </p>
              <p className={`text-[10px] ${textMutedClass} mt-0.5 font-semibold`}>
                Конверсія клік-лід: {singleProjectStats?.conversionRate?.toFixed(1) || "0.0"}%
              </p>
            </div>

            {/* Sales Card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>Успішні Оплати</p>
              <p className="text-2xl font-black text-emerald-400 mt-2">{singleProjectStats?.totalSales || 0}</p>
              <p className={`text-[10px] ${textMutedClass} mt-0.5 font-semibold`}>Кількість зафіксованих продажів</p>
            </div>

            {/* Conversion & AOV Card */}
            <div className={`${cardClass} p-4 rounded-xl shadow-md backdrop-blur-md`}>
              <p className={`text-[9px] ${textMutedClass} font-black uppercase tracking-widest`}>CR & Середній Чек</p>
              <div className="mt-2 space-y-1.5">
                {globalCurrency === "UAH" ? (
                  singleProjectStats && (singleProjectStats.aovUah > 0 || singleProjectStats.leadToSaleConvUah > 0) ? (
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/50">UAH:</span>
                      <span className="font-bold text-emerald-455">
                        {formatLocaleNumber(singleProjectStats.aovUah)} ₴ (CR: {singleProjectStats.leadToSaleConvUah.toFixed(1)}%)
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/30 italic">Немає оплат за період</p>
                  )
                ) : (
                  singleProjectStats && (singleProjectStats.aovUsd > 0 || singleProjectStats.leadToSaleConvUsd > 0) ? (
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-white/50">USD:</span>
                      <span className="font-bold text-emerald-455">
                        ${formatLocaleNumber(singleProjectStats.aovUsd)} (CR: {singleProjectStats.leadToSaleConvUsd.toFixed(1)}%)
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-white/30 italic">Немає оплат за період</p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Funnel events configuration & overview (col-span-3) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Інтелектуальні події</h3>
            <button
              onClick={() => setActiveTab("funnels")}
              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black rounded-lg cursor-pointer flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3" /> Створити воронку
            </button>
          </div>

          <div className={`${cardClass} p-4 rounded-xl flex flex-col justify-between min-h-[300px] h-[340px]`}>
            <div className="space-y-3 flex-1 flex flex-col">
              <span className="text-[10px] text-white/40 block font-semibold leading-normal">
                Перелік налаштованих маркетингових воронок для відстеження конверсії окупності в реальному часі.
              </span>
              
              <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
                {funnels.map((funnel) => {
                  const parsedType = funnel.description?.startsWith("[Type:")
                    ? funnel.description.split("]")[0].replace("[Type: ", "")
                    : "Інше";
                  return (
                    <div
                      key={funnel.id}
                      className="flex justify-between items-center p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-all text-[11px] cursor-pointer"
                      onClick={() => setActiveTab("funnels")}
                    >
                      <div>
                        <span className="font-extrabold text-white block truncate max-w-[150px]">{funnel.name}</span>
                        <span className="text-[9px] text-white/30 block mt-0.5">{parsedType} • {new Date(funnel.start_date).toLocaleDateString("uk-UA")}</span>
                      </div>
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold shrink-0">
                        {parsedType}
                      </span>
                    </div>
                  );
                })}
                {funnels.length === 0 && (
                  <div className="text-center py-16 text-white/20 italic">
                    Воронки для цього проекту ще не створені. Натисніть "+ Створити воронку".
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Large Funnels Summary Tiles (Плитки подій воронок) */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Аналіз окупності активних воронок</h3>
          <span className="text-[10px] text-white/30">Сводні показники конверсії</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {funnels.map((funnel) => {
            const stats = getFunnelStats(funnel);
            const parsedType = funnel.description?.startsWith("[Type:")
              ? funnel.description.split("]")[0].replace("[Type: ", "")
              : "Інше";
            const cleanDescription = funnel.description?.includes("]")
              ? funnel.description.substring(funnel.description.indexOf("]") + 1).trim()
              : funnel.description;

            return (
              <div
                key={funnel.id}
                className={`${cardClass} p-5 rounded-2xl space-y-4 text-xs text-white hover:border-emerald-500/20 transition-all cursor-pointer`}
                onClick={() => setActiveTab("funnels")}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-sm text-white">{funnel.name}</h4>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      Тип: {parsedType} • Старт: {new Date(funnel.start_date).toLocaleDateString("uk-UA")}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded border font-bold ${
                    stats.roi >= 100
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    ROI: {Math.round(stats.roi)}%
                  </span>
                </div>

                {cleanDescription && (
                  <p className="text-[11px] text-white/60 bg-white/[0.01] p-2 rounded border border-white/5 italic">
                    {cleanDescription}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 bg-[#050507]/40 p-3 rounded-xl border border-white/5 text-center leading-normal">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Бюджет</span>
                    <span className="text-xs font-black text-white">{stats.spend.toLocaleString("uk-UA")} ₴</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Ліди</span>
                    <span className="text-xs font-black text-emerald-450 block">{stats.leadsCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Продажі</span>
                    <span className="text-xs font-black text-amber-400 block">{stats.salesCount}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] border-t border-white/5 pt-2 text-white/50">
                  <span>Конверсія CR: <b>{stats.cr.toFixed(1)}%</b></span>
                  <span>Виручка: <b className="text-emerald-455">{stats.revenue.toLocaleString("uk-UA")} ₴</b></span>
                </div>
              </div>
            );
          })}
          {funnels.length === 0 && (
            <div className={`col-span-2 ${cardClass} p-8 text-center text-white/30 italic rounded-2xl`}>
              Не знайдено воронок для відображення детальної аналітики. Створіть нову воронку за допомогою кнопки вище.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Smooth SVG Spline Area Chart */}
        <div className={`${cardClass} rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Тренд реєстрацій заявок</h3>
              <p className="text-xs text-white/30 mt-1 font-semibold">Статистика за вибраний період</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] block" />
                <span className="text-white/40">Кліки (Трафік)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] block" />
                <span className="text-white/40">Заявки (Ліди)</span>
              </div>
            </div>
          </div>

          {splineTrendData.length === 0 ? (
            <div className="text-center py-20 text-white/20 italic">Немає зафіксованих даних</div>
          ) : (
            <div className="relative h-64 w-full pt-4">
              <svg className="w-full h-48 overflow-visible" viewBox="0 0 700 200">
                <defs>
                  <linearGradient id="splineGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="clickGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                <line x1="0" y1="160" x2="700" y2="160" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

                {(() => {
                  const allCounts = splineTrendData.flatMap((d: any) => [d.leads, d.clicks]);
                  const max = Math.max(...allCounts, 4);
                  const stepX = 700 / (splineTrendData.length - 1 || 1);

                  const leadPoints = splineTrendData.map((d: any, i: number) => {
                    const x = i * stepX;
                    const y = 180 - (d.leads / max) * 140;
                    return { x, y, label: d.leads };
                  });

                  const clickPoints = splineTrendData.map((d: any, i: number) => {
                    const x = i * stepX;
                    const y = 180 - (d.clicks / max) * 140;
                    return { x, y, label: d.clicks };
                  });

                  const buildBezierPath = (pts: typeof leadPoints) => {
                    let p = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i = 0; i < pts.length - 1; i++) {
                      const p0 = pts[i];
                      const p1 = pts[i + 1];
                      const cpX1 = p0.x + stepX / 2;
                      const cpY1 = p0.y;
                      const cpX2 = p1.x - stepX / 2;
                      const cpY2 = p1.y;
                      p += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                    }
                    return p;
                  };

                  const leadPath = buildBezierPath(leadPoints);
                  const clickPath = buildBezierPath(clickPoints);

                  const leadFillPath = `${leadPath} L ${leadPoints[leadPoints.length - 1].x} 180 L 0 180 Z`;
                  const clickFillPath = `${clickPath} L ${clickPoints[clickPoints.length - 1].x} 180 L 0 180 Z`;

                  return (
                    <>
                      <path d={clickFillPath} fill="url(#clickGlow)" />
                      <path d={leadFillPath} fill="url(#splineGlow)" />

                      <path d={clickPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
                      <path d={leadPath} fill="none" stroke="#10B981" strokeWidth="2.5" />

                      {clickPoints.map((p: any, idx: number) => (
                        <g key={`c-${idx}`}>
                          <circle cx={p.x} cy={p.y} r="3.5" fill="#0C0C0F" stroke="#3B82F6" strokeWidth="2" />
                          {(splineTrendData.length <= 10 ||
                            idx % Math.max(1, Math.floor(splineTrendData.length / 5)) === 0 ||
                            idx === splineTrendData.length - 1) && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              fill="#3B82F6"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {p.label}
                            </text>
                          )}
                        </g>
                      ))}

                      {leadPoints.map((p: any, idx: number) => (
                        <g key={`l-${idx}`}>
                          <circle cx={p.x} cy={p.y} r="3.5" fill="#0C0C0F" stroke="#10B981" strokeWidth="2" />
                          {(splineTrendData.length <= 10 ||
                            idx % Math.max(1, Math.floor(splineTrendData.length / 5)) === 0 ||
                            idx === splineTrendData.length - 1) && (
                            <text
                              x={p.x}
                              y={p.y - 10}
                              fill="#10B981"
                              fontSize="9"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {p.label}
                            </text>
                          )}
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[10px] text-white/30 font-black uppercase mt-4">
                {splineTrendData.map((d: any, i: number) => {
                  const total = splineTrendData.length;
                  let labelText = d.name;
                  if (total > 7) {
                    const interval = Math.max(2, Math.floor(total / 5));
                    if (i !== 0 && i !== total - 1 && i % interval !== 0) {
                      labelText = "";
                    }
                  }
                  return (
                    <span key={d.name} className="w-12 text-center first:text-left last:text-right truncate">
                      {labelText}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className={`${cardClass} rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6`}>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Воронка конверсії</h3>
            <p className="text-xs text-white/30 mt-1 font-semibold">Співвідношення кроків реєстрації до кліків</p>
          </div>

          {singleProjectStats ? (
            <div className="space-y-6 pt-4">
              {[
                {
                  label: "1. Кліки (Трафік)",
                  val: singleProjectStats.totalClicks,
                  pct: 100,
                  color: "bg-neutral-600"
                },
                {
                  label: "2. Унікальні Ліди (Заявки)",
                  val: singleProjectStats.totalLeads,
                  pct:
                    singleProjectStats.totalClicks > 0
                      ? (singleProjectStats.totalLeads / singleProjectStats.totalClicks) * 100
                      : 0,
                  color: "bg-blue-500"
                },
                {
                  label: "3. Залишили заявку",
                  val: singleProjectStats.totalApplications,
                  pct:
                    singleProjectStats.totalLeads > 0
                      ? (singleProjectStats.totalApplications / singleProjectStats.totalLeads) * 100
                      : 0,
                  color: "bg-amber-500"
                },
                {
                  label: "4. Продажі (Курс)",
                  val: singleProjectStats.paidLeadsCount || 0,
                  pct:
                    singleProjectStats.totalLeads > 0
                      ? ((singleProjectStats.paidLeadsCount || 0) / singleProjectStats.totalLeads) * 100
                      : 0,
                  color: "bg-emerald-500"
                }
              ].map((step) => (
                <div key={step.label} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span className="text-white/60">{step.label}</span>
                    <span className="text-white">
                      {step.val} <span className="text-white/30 font-medium">({step.pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${step.color}`}
                      style={{ width: `${Math.min(step.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-white/20 italic">Немає аналітичних даних</div>
          )}
        </div>
      </div>

      {/* UTM Source Efficiency */}
      <div className={`${cardClass} rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6`}>
        <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
          <MousePointerClick className="w-5 h-5 text-emerald-500" />
          Ефективність UTM Джерел
        </h2>

        <div className="overflow-x-auto border border-white/5 rounded-xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                <th className="p-4">Дерево UTM Параметрів (Джерело → Канал → Кампанія → Вміст)</th>
                <th className="p-4 text-center">Зафіксовано кліків</th>
                <th className="p-4 text-center">Кількість заявок</th>
                <th className="p-4 text-center">Конверсія клік-ліди</th>
                <th className="p-4 text-center">Сгенеровано оплати ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {utmAttributionTree.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-white/30 italic">
                    Кампанії не визначені
                  </td>
                </tr>
              ) : (
                utmAttributionTree.map((node: any) => renderUtmNodeRow(node))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QA Debug Panel (Superman / Admin / isDevMode) */}
      {(role === "admin" || role === "superman" || isDevMode) && (
        <div className={`${cardClass} rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6 border border-red-500/20`}>
          <div
            className="flex justify-between items-center cursor-pointer select-none"
            onClick={() => setIsQaPanelExpanded(!isQaPanelExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-red-400">
                  Панель верификации данных (QA Debug Mode)
                </h3>
                <p className="text-[11px] text-white/45 font-semibold mt-0.5">
                  Полуавтоматический модуль диагностики сквозной аналитики и производительности
                </p>
              </div>
            </div>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isQaPanelExpanded ? "bg-white/10 text-white" : "bg-red-500/10 text-red-405 hover:bg-red-500/25"
              }`}
            >
              {isQaPanelExpanded ? "Свернуть" : "Развернуть"}
            </button>
          </div>

          {isQaPanelExpanded && (
            <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in duration-300">
              {/* 1. Tracing visitor_uuid */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-red-500" />
                  1. Трассировка visitor_uuid (Проверка сквозной аналитики)
                </h4>

                <form onSubmit={handleTraceVisitor} className="flex gap-2 max-w-lg">
                  <input
                    type="text"
                    value={traceQuery}
                    onChange={(e) => setTraceQuery(e.target.value)}
                    placeholder="Введите телефон или visitor_uuid..."
                    className={`flex-grow px-4 py-3 rounded-xl focus:outline-none text-xs font-semibold ${inputClass}`}
                  />
                  <button
                    type="submit"
                    disabled={isTracing}
                    className="px-5 py-3 rounded-xl bg-red-500 hover:bg-red-450 text-black font-black text-xs transition-all disabled:opacity-50"
                  >
                    {isTracing ? "Проверка..." : "Проверить"}
                  </button>
                </form>

                {traceError && (
                  <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {traceError}
                  </p>
                )}

                {traceResults && (
                  <div className="overflow-x-auto border border-white/5 rounded-xl">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                          <th className="p-3">Тип</th>
                          <th className="p-3">Время создания</th>
                          <th className="p-3">Статус / Событие</th>
                          <th className="p-3">UTM Метки</th>
                          <th className="p-3">visitor_uuid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80">
                        {traceResults.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-white/20 italic">
                              Пользователь не найден или цепочка пуста
                            </td>
                          </tr>
                        ) : (
                          traceResults.map((item: any, idx: number) => {
                            const isClick = item.type === "click";
                            return (
                              <tr
                                key={idx}
                                className={`hover:bg-white/[0.01] transition-all ${
                                  item.is_broken ? "bg-red-500/10 hover:bg-red-500/20" : ""
                                }`}
                              >
                                <td className="p-3 font-bold uppercase tracking-wider text-[10px]">
                                  <span
                                    className={`px-2 py-0.5 rounded ${
                                      isClick ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-455"
                                    }`}
                                  >
                                    {isClick ? "Клик" : "Заказ"}
                                  </span>
                                </td>
                                <td className="p-3 font-semibold text-neutral-400">
                                  {new Date(item.created_at).toLocaleString("uk-UA")}
                                </td>
                                <td className="p-3 font-extrabold">
                                  <div className="flex items-center gap-2">
                                    <span>{item.status}</span>
                                    {item.amount > 0 && <span className="text-emerald-400">({item.amount} ₴)</span>}
                                    {item.is_broken && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded animate-pulse">
                                        <AlertCircle className="w-3 h-3" />
                                        {item.error_message}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="font-mono text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/60">
                                    src: {item.utm_source || "—"} | med: {item.utm_medium || "—"} | camp:{" "}
                                    {item.utm_campaign || "—"}
                                  </span>
                                </td>
                                <td className="p-3 font-mono text-[10px] text-white/60">
                                  {item.visitor_uuid || (
                                    <span className="text-red-400 font-bold">ОТСУТСТВУЕТ (Потерян)</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 2. Database Integrity Validator */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                  2. Валидатор целостности базы данных (Data Health Check)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className={`p-4 rounded-xl border ${
                      dataHealth.leadsWithoutUuidCount > 0 ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.01] border-white/5"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
                      Лиды без visitor_uuid
                    </span>
                    <p
                      className={`text-2xl font-black mt-2 ${
                        dataHealth.leadsWithoutUuidCount > 0 ? "text-red-400" : "text-emerald-450"
                      }`}
                    >
                      {dataHealth.leadsWithoutUuidCount}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1 font-medium">
                      Количество реальных лидов с потерянным трекером
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      dataHealth.ordersWithAmountAndClickStatusCount > 0
                        ? "bg-red-500/5 border-red-500/20"
                        : "bg-white/[0.01] border-white/5"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
                      Клики с суммами &gt; 0
                    </span>
                    <p
                      className={`text-2xl font-black mt-2 ${
                        dataHealth.ordersWithAmountAndClickStatusCount > 0 ? "text-red-400" : "text-emerald-455"
                      }`}
                    >
                      {dataHealth.ordersWithAmountAndClickStatusCount}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1 font-medium">
                      Проверка на некорректно классифицированные транзакции
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${
                      dataHealth.unparseableMetadataDatesCount > 0
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-white/[0.01] border-white/5"
                    }`}
                  >
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
                      Битые даты в метаданных
                    </span>
                    <p
                      className={`text-2xl font-black mt-2 ${
                        dataHealth.unparseableMetadataDatesCount > 0 ? "text-amber-500" : "text-emerald-450"
                      }`}
                    >
                      {dataHealth.unparseableMetadataDatesCount}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1 font-medium">
                      Лиды с нечитаемыми датами из архивных импортов
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Server-Side Performance Profiler */}
              {performanceInfo && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-500" />
                    3. Логгер производительности API (Server-Side Performance Profiler)
                  </h4>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-white/70 space-y-2 max-w-2xl">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/45">Время запроса клиента (круг/сеть):</span>
                      <span className="text-emerald-400 font-extrabold">
                        {clientRequestMs ? `${clientRequestMs} ms` : "—"}
                      </span>
                    </div>
                    {performanceInfo.cacheRebuildMs > 0 && (
                      <div className="flex justify-between border-b border-white/5 pb-2">
                        <span className="text-white/45">Генерация кэша CRM (синхронно):</span>
                        <span className="text-amber-400 font-extrabold">{performanceInfo.cacheRebuildMs} ms</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/45">БД время (RPC / Выборка):</span>
                      <span className="text-emerald-400 font-extrabold">
                        {performanceInfo.dbRpcMs} ms / {performanceInfo.dbFetchMs} ms
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-2">
                      <span className="text-white/45">JS-кластеризация на сервере (DSU):</span>
                      <span className="text-emerald-400 font-extrabold">{performanceInfo.jsClusteringMs} ms</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-white/45">Сетевой вес пакета:</span>
                      <span className="text-emerald-400 font-extrabold">{performanceInfo.payloadSizeKb} КБ</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AnalyticsTab;
