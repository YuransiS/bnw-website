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
  Activity
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
  applyPreset: (preset: "all" | "30d" | "7d" | "1d") => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setDateRangePreset: (val: any) => void;
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
  setDateRangePreset
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
            {formatDualCurrency(node.usd_revenue, node.uah_revenue)}
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
      {/* Detailed Analytics Premium Date Filter Preset Switcher */}
      <div
        className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 rounded-2xl shadow-xl backdrop-blur-md ${
          isLight ? "bg-white border border-neutral-200" : "bg-[#0C0C0F]/45 border border-white/5"
        }`}
      >
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Сквозна аналітика проекту</h3>
          <p className="text-[11px] text-white/30 font-semibold">
            Фільтрація та аналіз рекламного бюджету, конверсій та окупності
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Presets Segmented Selector */}
          <div className="flex items-center gap-1 bg-[#050507] border border-white/5 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: "all", label: "Все время" },
              { id: "30d", label: "30 днів" },
              { id: "7d", label: "7 днів" },
              { id: "1d", label: "1 день" }
            ].map((preset) => {
              const isActive = dateRangePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id as any)}
                  className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${
                    isActive ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Range Date Pickers */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRangePreset("custom");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-36 ${
                isLight ? "bg-neutral-100 border border-neutral-300 text-neutral-900" : "bg-[#050507] border border-white/5 text-white"
              }`}
              placeholder="Від"
            />
            <span className="text-white/20 text-xs font-bold">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRangePreset("custom");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-36 ${
                isLight ? "bg-neutral-100 border border-neutral-300 text-neutral-900" : "bg-[#050507] border border-white/5 text-white"
              }`}
              placeholder="До"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => applyPreset("all")}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isLight
                    ? "border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                    : "border-white/10 hover:bg-white/5 text-white/60 hover:text-white"
                }`}
                title="Скинути період"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Scoped Project KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Spend card */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Витрати на рекламу ($)</p>
          <p className="text-3xl font-black text-red-400 mt-4">${singleProjectStats?.totalSpend.toFixed(2)}</p>
          <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>Сумарний бюджет усього періоду</p>
        </div>

        {/* Course Revenue Card */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Виручка за курс</p>
          <div className="mt-4 space-y-1">
            {singleProjectStats && singleProjectStats.uahCourseRevenue > 0 && (
              <p className="text-2xl font-black text-emerald-450">
                {formatLocaleNumber(singleProjectStats.uahCourseRevenue)} ₴
              </p>
            )}
            {singleProjectStats && singleProjectStats.eurCourseRevenue > 0 && (
              <p className="text-2xl font-black text-emerald-455">
                {formatLocaleNumber(singleProjectStats.eurCourseRevenue)} €
              </p>
            )}
            {singleProjectStats && singleProjectStats.usdCourseRevenue > 0 && (
              <p className="text-2xl font-black text-emerald-455">
                ${formatLocaleNumber(singleProjectStats.usdCourseRevenue)}
              </p>
            )}
            {(!singleProjectStats ||
              (singleProjectStats.uahCourseRevenue === 0 &&
                singleProjectStats.usdCourseRevenue === 0 &&
                singleProjectStats.eurCourseRevenue === 0)) && (
              <p className={`text-2xl font-black ${textMutedLightClass}`}>0 ₴</p>
            )}
          </div>
          <p className={`text-[11px] ${textMutedClass} mt-2 font-semibold`}>Виручка тільки від продажу основного курсу</p>
        </div>

        {/* Tripwire Revenue Card */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Виручка за трипвайєри</p>
          <div className="mt-4 space-y-1">
            {singleProjectStats && singleProjectStats.uahTripwireRevenue > 0 && (
              <p className="text-2xl font-black text-indigo-400">
                {formatLocaleNumber(singleProjectStats.uahTripwireRevenue)} ₴
              </p>
            )}
            {singleProjectStats && singleProjectStats.eurTripwireRevenue > 0 && (
              <p className="text-2xl font-black text-indigo-400">
                {formatLocaleNumber(singleProjectStats.eurTripwireRevenue)} €
              </p>
            )}
            {singleProjectStats && singleProjectStats.usdTripwireRevenue > 0 && (
              <p className="text-2xl font-black text-indigo-400">
                ${formatLocaleNumber(singleProjectStats.usdTripwireRevenue)}
              </p>
            )}
            {(!singleProjectStats ||
              (singleProjectStats.uahTripwireRevenue === 0 &&
                singleProjectStats.usdTripwireRevenue === 0 &&
                singleProjectStats.eurTripwireRevenue === 0)) && (
              <p className={`text-2xl font-black ${textMutedLightClass}`}>0 ₴</p>
            )}
          </div>
          <p className={`text-[11px] ${textMutedClass} mt-2 font-semibold`}>Виручка від міні-продуктів та практикуму</p>
        </div>

        {/* Clean Profit & ROI Card */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>
            Чистий Прибуток (Маржа)
          </p>
          <div className="mt-4 space-y-1">
            {singleProjectStats && (
              <>
                {singleProjectStats.uahRevenue > 0 && (
                  <p className="text-xl font-black text-emerald-455">
                    {formatLocaleNumber(singleProjectStats.uahRevenue)} ₴
                  </p>
                )}
                {singleProjectStats.eurRevenue > 0 && (
                  <p className="text-xl font-black text-emerald-455">
                    {formatLocaleNumber(singleProjectStats.eurRevenue)} €
                  </p>
                )}
                {(singleProjectStats.usdRevenue > 0 || singleProjectStats.totalSpend > 0) && (
                  <p
                    className={`text-xl font-black ${
                      singleProjectStats.netProfitUsd >= 0 ? "text-emerald-455" : "text-red-400"
                    }`}
                  >
                    {singleProjectStats.netProfitUsd >= 0 ? "" : "-"}$
                    {formatLocaleNumber(Math.abs(singleProjectStats.netProfitUsd))}
                  </p>
                )}
                {singleProjectStats.uahRevenue === 0 &&
                  singleProjectStats.eurRevenue === 0 &&
                  singleProjectStats.usdRevenue === 0 &&
                  singleProjectStats.totalSpend === 0 && (
                    <p className="text-xl font-black text-emerald-455">0 ₴</p>
                  )}
              </>
            )}
            <span className="text-[10px] font-black uppercase text-yellow-400 block mt-2 tracking-wider">
              ROI за курс: {singleProjectStats?.roi.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Row 2 */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Трафік (Кліки)</p>
          <p className={`text-3xl font-black ${isLight ? "text-neutral-900" : "text-white"} mt-4`}>
            {singleProjectStats?.totalClicks}
          </p>
          <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>Загальна кількість переходів на сайт</p>
        </div>
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Реєстрації (Ліди)</p>
          <p className={`text-3xl font-black ${isLight ? "text-neutral-900" : "text-white"} mt-4`}>
            {singleProjectStats?.totalLeads}
          </p>
          <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>
            Конверсія клік-лід: {singleProjectStats?.conversionRate.toFixed(1)}%
          </p>
        </div>
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Успішні Оплати (Кількість)</p>
          <p className="text-3xl font-black text-emerald-400 mt-4">{singleProjectStats?.totalSales}</p>
          <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>Кількість зафіксованих продажів</p>
        </div>
        <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
          <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Конверсія & Середній Чек</p>
          <div className="mt-4 space-y-3">
            {singleProjectStats && (singleProjectStats.aovUah > 0 || singleProjectStats.leadToSaleConvUah > 0) && (
              <div
                className={`space-y-0.5 ${
                  singleProjectStats.aovUsd > 0 ||
                  singleProjectStats.leadToSaleConvUsd > 0 ||
                  singleProjectStats.aovEur > 0 ||
                  singleProjectStats.leadToSaleConvEur > 0
                    ? `border-b ${borderClass} pb-2`
                    : ""
                }`}
              >
                <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>
                  Гривневі замовлення (UAH)
                </span>
                <div className="flex justify-between items-baseline gap-2 mt-1">
                  <p className="text-lg font-black text-emerald-450">
                    {singleProjectStats.aovUah > 0 ? `${formatLocaleNumber(singleProjectStats.aovUah)} ₴` : "—"}
                  </p>
                  <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                    CR: {singleProjectStats.leadToSaleConvUah.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {singleProjectStats && (singleProjectStats.aovUsd > 0 || singleProjectStats.leadToSaleConvUsd > 0) && (
              <div
                className={`space-y-0.5 ${
                  singleProjectStats.aovEur > 0 || singleProjectStats.leadToSaleConvEur > 0
                    ? `border-b ${borderClass} pb-2`
                    : ""
                }`}
              >
                <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>
                  Доларові замовлення (USD)
                </span>
                <div className="flex justify-between items-baseline gap-2 mt-1">
                  <p className="text-lg font-black text-emerald-450">
                    {singleProjectStats.aovUsd > 0 ? `$${formatLocaleNumber(singleProjectStats.aovUsd)}` : "—"}
                  </p>
                  <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                    CR: {singleProjectStats.leadToSaleConvUsd.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {singleProjectStats && (singleProjectStats.aovEur > 0 || singleProjectStats.leadToSaleConvEur > 0) && (
              <div className="space-y-0.5">
                <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>
                  Єврові замовлення (EUR)
                </span>
                <div className="flex justify-between items-baseline gap-2 mt-1">
                  <p className="text-lg font-black text-emerald-450">
                    {singleProjectStats.aovEur > 0 ? `${formatLocaleNumber(singleProjectStats.aovEur)} €` : "—"}
                  </p>
                  <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                    CR: {singleProjectStats.leadToSaleConvEur.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {(!singleProjectStats ||
              (singleProjectStats.aovUah === 0 &&
                singleProjectStats.aovUsd === 0 &&
                singleProjectStats.aovEur === 0)) && (
              <div className="space-y-0.5">
                <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>
                  Гривневі замовлення (UAH)
                </span>
                <div className="flex justify-between items-baseline gap-2 mt-1">
                  <p className="text-lg font-black text-emerald-450">0 ₴</p>
                  <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">CR: 0.0%</span>
                </div>
              </div>
            )}
          </div>
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
