"use client";

import React from "react";
import { Grid, Plus, Search, ChevronDown, Calendar, X, XCircle, Copy, Check, AlertCircle, Users, Globe, ExternalLink, Sparkles, Layers, Target, Clock } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { formatDualCurrency, formatLocaleNumber } from "@/app/admin/utils";
import { LeadItem } from "../types";
import { SkeletonPulse } from "@/components/ui/ParabolicProgressBar";
import CustomCalendarPicker from "@/components/ui/CustomCalendarPicker";

// Helper function to format lead date and time with exact and relative time
function formatLeadDateTime(dateStr?: string | null): { formatted: string; relative: string; dateOnly: string; timeOnly: string } {
  if (!dateStr) return { formatted: "—", relative: "", dateOnly: "—", timeOnly: "" };
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { formatted: "—", relative: "", dateOnly: "—", timeOnly: "" };
    
    // Formatting: DD.MM.YYYY HH:mm
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    
    const dateOnly = `${day}.${month}.${year}`;
    const timeOnly = `${hours}:${minutes}`;
    const formatted = `${dateOnly} ${timeOnly}`;
    
    // Relative time in Ukrainian
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    let relative = "";
    if (diffMins < 1) relative = "щойно";
    else if (diffMins < 60) relative = `${diffMins} хв тому`;
    else if (diffHours < 24) relative = `${diffHours} год тому`;
    else if (diffDays === 1) relative = "вчора";
    else if (diffDays < 7) relative = `${diffDays} дн. тому`;
    else relative = `${diffDays} дн. тому`;

    return { formatted, relative, dateOnly, timeOnly };
  } catch {
    return { formatted: "—", relative: "", dateOnly: "—", timeOnly: "" };
  }
}

// Sales pipeline columns mapping
const PIPELINE_COLUMNS = [
  { key: "Новий лід", label: "Новий лід", dotColor: "bg-blue-500" },
  { key: "Зацікавлений лід", label: "Зацікавлений лід", dotColor: "bg-purple-500" },
  { key: "Залишив заявку", label: "Залишив заявку", dotColor: "bg-teal-500" },
  { key: "Списались", label: "Списались", dotColor: "bg-yellow-500" },
  { key: "Купив(-ла) Трипвайер", label: "Купив(-ла) Трипвайер", dotColor: "bg-indigo-500" },
  { key: "Назначено Дзвінок", label: "Назначено Дзвінок", dotColor: "bg-orange-500" },
  { key: "Дзвінок проведено", label: "Дзвінок проведено", dotColor: "bg-cyan-500" },
  { key: "Вирішив подумати", label: "Вирішив подумати", dotColor: "bg-pink-500" },
  { key: "Купив курс", label: "Купив курс", dotColor: "bg-emerald-500 font-extrabold" },
  { key: "Відмова", label: "Відмова", dotColor: "bg-red-500" }
];

function formatLandingDisplay(url: string): string {
  if (!url) return "Головна (/)";
  try {
    let path = url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      path = parsed.pathname;
    } else {
      path = url.split("?")[0].split("#")[0];
    }
    path = path.trim().replace(/\/$/, "");
    if (!path || path === "/") return "Головна (/)";
    if (path.includes("5-likes")) return "5 Лайків (/intensive/5-likes)";
    if (path === "/anketa") return "Анкета (/anketa)";
    if (path.includes("free/ai") || path.includes("free-ai")) return "Безкоштовний AI (/mini-course/free/ai)";
    if (path.includes("mini-course/ai")) return "Міні-курс AI (/mini-course/ai)";
    if (path.includes("mini-course/figma")) return "Міні-курс Figma (/mini-course/figma)";
    if (path.includes("minicourse") || path.includes("mini-course")) return "Міні-курс";
    if (path.includes("rozbir") || path.includes("diagnostic")) return "Діагностика / Розбір";
    if (path.includes("price") || path.includes("tariffs")) return "Тарифи / Ціни";
    if (path.includes("system")) return "Система (/intensive/system)";
    return path;
  } catch {
    return url;
  }
}

interface LeadsTabProps {
  processedLeads: LeadItem[];
  paginatedLeads: LeadItem[];
  uniqueSources: string[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  touchCountFilter: string;
  setTouchCountFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  selectedLanding?: string;
  setSelectedLanding?: (val: string) => void;
  filtersSummary?: {
    totalLeads?: number;
    statusCounts?: Array<{ status: string; count: number }>;
    landingCounts?: Array<{ landing: string; count: number }>;
    multiLandingCount?: number;
    noLandingCount?: number;
  };
  unpaidIntentOnly: boolean;
  setUnpaidIntentOnly: (val: boolean) => void;
  dateRangePreset: string;
  startDate: string;
  endDate: string;
  applyPreset: (preset: "all" | "30d" | "7d" | "1d") => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setDateRangePreset: (val: any) => void;
  copiedId: string | null;
  handleCopyPhone: (phone: string, id: string) => void;
  totalCount: number;
  pageSize: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  openLeadModal: (lead: any) => void;
  setShowAddLead?: (val: boolean) => void;
  isDevMode?: boolean;
  funnels?: any[];
  isLoading?: boolean;
  trafficChannelFilter?: "all" | "target" | "organic";
  setTrafficChannelFilter?: (val: "all" | "target" | "organic") => void;
}

export const LeadsTab = React.memo(function LeadsTab({
  processedLeads,
  paginatedLeads,
  uniqueSources,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  touchCountFilter,
  setTouchCountFilter,
  sourceFilter,
  setSourceFilter,
  selectedLanding = "all",
  setSelectedLanding,
  trafficChannelFilter = "all",
  setTrafficChannelFilter,
  filtersSummary,
  unpaidIntentOnly,
  setUnpaidIntentOnly,
  dateRangePreset,
  startDate,
  endDate,
  applyPreset,
  setStartDate,
  setEndDate,
  setDateRangePreset,
  copiedId,
  handleCopyPhone,
  totalCount,
  pageSize,
  currentPage,
  setCurrentPage,
  openLeadModal,
  setShowAddLead,
  isDevMode = false,
  funnels,
  isLoading = false,
}: LeadsTabProps) {
  const [localSearch, setLocalSearch] = React.useState(searchQuery);

  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        setSearchQuery(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, setSearchQuery]);

  const landingOptions = React.useMemo(() => {
    const countsMap = new Map<string, number>();

    // 1. From filtersSummary if available
    if (filtersSummary?.landingCounts && filtersSummary.landingCounts.length > 0) {
      filtersSummary.landingCounts.forEach((item) => {
        if (item.landing) {
          countsMap.set(item.landing, item.count);
        }
      });
    }

    // 2. Also populate / merge from processedLeads / paginatedLeads
    (processedLeads || []).forEach((lead: any) => {
      const vLandings: string[] = (lead.visitedLandings || lead.visited_landings || []) as string[];
      if (vLandings.length > 0) {
        vLandings.forEach((land) => {
          if (land && !countsMap.has(land)) {
            countsMap.set(land, (countsMap.get(land) || 0) + 1);
          }
        });
      } else if (lead.page_path && lead.page_path !== "/" && !countsMap.has(lead.page_path)) {
        countsMap.set(lead.page_path, (countsMap.get(lead.page_path) || 0) + 1);
      } else if (lead.page_url && lead.page_url !== "" && !countsMap.has(lead.page_url)) {
        countsMap.set(lead.page_url, (countsMap.get(lead.page_url) || 0) + 1);
      }
    });

    return Array.from(countsMap.entries()).map(([landing, count]) => ({
      landing,
      count
    })).sort((a, b) => b.count - a.count);
  }, [filtersSummary?.landingCounts, processedLeads]);

  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";
  const inputClass =
    "bg-crm-input-bg border border-crm-border text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const selectClass =
    "bg-crm-input-bg border border-crm-border text-crm-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const optionClass = "bg-crm-card text-crm-text";

  const renderSocialsLink = (username: string, type: "tg" | "ig") => {
    if (!username) return null;
    const clean = username
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/t\.me\//, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
    if (!clean) return null;

    const href = type === "tg" ? `https://telegram.me/${clean}` : `https://instagram.com/${clean}`;

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 transition-all ${
          type === "tg"
            ? "bg-[#81D8D0]/10 border border-[#81D8D0]/20 text-[#81D8D0]"
            : "bg-pink-500/10 border border-pink-500/20 text-pink-400"
        }`}
      >
        {type === "tg" ? "tg" : "ig"}
      </a>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500" />
            База лідів проекту
          </h2>
          <p className="text-white/40 text-xs mt-1 font-semibold">
            Консолідована база клієнтів із автоматичним дедуплікуванням (DSU) та фільтрами за воронками
          </p>
        </div>
        {setShowAddLead && (
          <button
            onClick={() => setShowAddLead(true)}
            className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Додати ліда вручную
          </button>
        )}
      </div>

      {/* Dynamic Status Badges Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            statusFilter === "all"
              ? "bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/20"
              : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
          }`}
        >
          <span>🎯 Всі статуси</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            statusFilter === "all" ? "bg-black/20 text-black" : "bg-white/10 text-white"
          }`}>
            {totalCount}
          </span>
        </button>

        {PIPELINE_COLUMNS.map((col) => {
          const matchCount = (filtersSummary?.statusCounts || []).find((s) => s.status === col.key)?.count || 0;
          const isActive = statusFilter === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setStatusFilter(isActive ? "all" : col.key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "bg-white text-black font-black shadow-lg"
                  : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${col.dotColor.split(" ")[0]}`} />
              <span>{col.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isActive ? "bg-black/20 text-black" : "bg-white/10 text-white"
              }`}>
                {matchCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Traffic Channel Fast Segment Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider pr-1 flex items-center gap-1 shrink-0">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          Канал трафіку:
        </span>
        <button
          type="button"
          onClick={() => setTrafficChannelFilter?.("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            trafficChannelFilter === "all"
              ? "bg-white text-black font-black shadow-md"
              : "bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5"
          }`}
        >
          <span>🌐 Всі джерела</span>
        </button>
        <button
          type="button"
          onClick={() => setTrafficChannelFilter?.(trafficChannelFilter === "target" ? "all" : "target")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            trafficChannelFilter === "target"
              ? "bg-purple-500 text-white font-black shadow-md shadow-purple-500/20"
              : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span>🎯 Таргет / Реклама (Meta Ads / UTM)</span>
        </button>
        <button
          type="button"
          onClick={() => setTrafficChannelFilter?.(trafficChannelFilter === "organic" ? "all" : "organic")}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            trafficChannelFilter === "organic"
              ? "bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/20"
              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>🔗 По прямому посиланню (Органіка)</span>
        </button>
      </div>

      {/* Filtering control panel */}
      <div className="bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Live search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/30">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Пошук (ім'я, телефон, tg)..."
              className={`w-full pl-10 pr-4 py-3.5 rounded-xl focus:outline-none text-xs font-semibold ${inputClass}`}
            />
          </div>

          {/* Status pill select */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
            >
              <option value="all" className={optionClass}>
                🎯 Фільтр: Всі статуси ({totalCount})
              </option>
              {PIPELINE_COLUMNS.map((col) => {
                const count = (filtersSummary?.statusCounts || []).find((s) => s.status === col.key)?.count;
                return (
                  <option key={col.key} value={col.key} className={optionClass}>
                    {col.label} {count !== undefined ? `(${count})` : ""}
                  </option>
                );
              })}
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>

          {/* Touch Count select */}
          <div className="relative">
            <select
              value={touchCountFilter}
              onChange={(e) => setTouchCountFilter(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
            >
              <option value="all" className={optionClass}>
                🔥 Торкання: Всі
              </option>
              <option value="multi" className={optionClass}>
                ⚡ Повторні (2+ торкань)
              </option>
              <option value="single" className={optionClass}>
                👤 Первинні (1 торкання)
              </option>
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>

          {/* Source sheet select (Funnel filter) */}
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
            >
              <option value="all" className={optionClass}>
                📊 Фільтр: Всі воронки
              </option>
              <option value="unassigned" className={`${optionClass} text-yellow-500`}>
                ⚠️ Без воронки / Невідомо
              </option>
              {(funnels || []).map((f: any) => (
                <option key={f.id} value={f.id} className={optionClass}>
                  {f.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>

          {/* Landing Filter Select */}
          <div className="relative">
            <select
              value={selectedLanding || "all"}
              onChange={(e) => setSelectedLanding?.(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass} ${
                selectedLanding !== "all" ? "border-emerald-500 text-emerald-400 bg-emerald-500/10" : ""
              }`}
            >
              <option value="all" className={optionClass}>
                🌐 Лендинг: Всі ({totalCount})
              </option>
              {(filtersSummary?.multiLandingCount || 0) > 0 && (
                <option value="multi" className={`${optionClass} text-amber-400 font-bold`}>
                  ⚡ Мульти-лендинг (2+ лендинги) ({filtersSummary?.multiLandingCount})
                </option>
              )}
              {(filtersSummary?.noLandingCount || 0) > 0 && (
                <option value="unassigned" className={`${optionClass} text-neutral-400`}>
                  👤 Прямий / Без лендингу ({filtersSummary?.noLandingCount})
                </option>
              )}
              {landingOptions.map((l: any) => {
                const formattedName = formatLandingDisplay(l.landing);
                return (
                  <option key={l.landing} value={l.landing} className={optionClass}>
                    🎯 {formattedName} ({l.count})
                  </option>
                );
              })}
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>
        </div>

        {/* Quick summary stats strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-neutral-400">
            <span className="text-white">
              Показано: <strong className="text-emerald-400">{paginatedLeads.length}</strong> з <strong className="text-white">{totalCount}</strong> лідів
            </span>
            <span className="text-white/20">•</span>
            <span>
              🌐 З лендингів: <strong className="text-teal-400">{totalCount - (filtersSummary?.noLandingCount || 0)}</strong>
            </span>
            <span className="text-white/20">•</span>
            <span>
              ⚡ Мульти-лендинг (крос-трафік): <strong className="text-amber-400">{filtersSummary?.multiLandingCount || 0}</strong>
            </span>
            <span className="text-white/20">•</span>
            <span>
              👤 Прямі контакти: <strong className="text-neutral-300">{filtersSummary?.noLandingCount || 0}</strong>
            </span>
          </div>

          {selectedLanding !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedLanding?.("all")}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Скинути фільтр лендингу
            </button>
          )}
        </div>

        {/* Advanced Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3">
            {/* Unpaid Intent Checkbox */}
            <button
              type="button"
              onClick={() => setUnpaidIntentOnly(!unpaidIntentOnly)}
              className={`px-4 py-2.5 rounded-full border text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                unpaidIntentOnly
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-white/[0.02] text-white/50 border-white/10 hover:text-white"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Втрачена ініціатива (Unpaid Intent)
            </button>
          </div>

          {/* Date pickers */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-[10px] font-black uppercase ${isLight ? "text-neutral-500" : "text-white/30"}`}>
              Період:
            </span>
            <button
              type="button"
              onClick={() => {
                if (dateRangePreset === "1d") {
                  applyPreset("all");
                } else {
                  applyPreset("1d");
                }
              }}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                dateRangePreset === "1d"
                  ? isLight
                    ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                    : "bg-emerald-500 text-black shadow-lg hover:bg-emerald-400"
                  : isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                  : "bg-white/[0.02] hover:bg-white/5 text-white/60 hover:text-white border border-white/10"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              За останню добу
            </button>
            <div className="flex items-center gap-2">
              <CustomCalendarPicker
                startDate={startDate}
                endDate={endDate}
                onChange={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                  setDateRangePreset("custom");
                }}
                onApply={(s, e) => {
                  setStartDate(s);
                  setEndDate(e);
                  setDateRangePreset("custom");
                }}
                isLight={isLight}
                align="right"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    applyPreset("all");
                  }}
                  className={`p-2 transition-all rounded-lg cursor-pointer ${
                    isLight ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                  title="Очистити фільтр дат"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Funnels Tab Bar */}
      {funnels && funnels.length > 0 && (
        <div className={`flex flex-wrap gap-2 border-b ${isLight ? 'border-neutral-200' : 'border-white/5'} pb-3`}>
          <button
            onClick={() => setSourceFilter("all")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              sourceFilter === "all"
                ? isLight ? "bg-neutral-900 text-white" : "bg-white text-black"
                : isLight ? "text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300" : "text-white/40 hover:text-white bg-white/5 border border-white/5"
            }`}
          >
            Всі ліди
          </button>
          <button
            onClick={() => setSourceFilter("unassigned")}
            className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              sourceFilter === "unassigned"
                ? "bg-yellow-500 text-black"
                : isLight ? "text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200" : "text-yellow-500/70 hover:text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ⚠️ Без воронки
          </button>
          {funnels.map((funnel: any) => (
            <button
              key={funnel.id}
              onClick={() => setSourceFilter(funnel.id)}
              className={`px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                sourceFilter === funnel.id
                  ? isLight ? "bg-emerald-600 text-white" : "bg-emerald-500 text-black"
                  : isLight ? "text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300" : "text-white/40 hover:text-white bg-white/5 border border-white/5"
              }`}
            >
              {funnel.name}
            </button>
          ))}
        </div>
      )}

      {/* CRM Clustered grid table */}
      <div className={`${cardClass} rounded-2xl overflow-hidden shadow-xl`}>
        {/* Desktop Table View */}
        <div className={`hidden md:block overflow-x-auto border-b ${borderClass}`}>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                <th className="p-4">Клієнт</th>
                <th className="p-4">Час ліда</th>
                <th className="p-4">Контакти & Соцмережі</th>
                <th className="p-4">Джерело та UTM-мітки</th>
                <th className="p-4 text-center">Кількість торкань</th>
                <th className="p-4 text-center">Сума</th>
                <th className="p-4 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><SkeletonPulse className="h-5 w-36" /></td>
                    <td className="p-4"><SkeletonPulse className="h-4 w-28" /></td>
                    <td className="p-4"><SkeletonPulse className="h-4 w-28" /></td>
                    <td className="p-4"><SkeletonPulse className="h-4 w-24" /></td>
                    <td className="p-4 text-center"><SkeletonPulse className="h-4 w-12 mx-auto" /></td>
                    <td className="p-4 text-center"><SkeletonPulse className="h-4 w-16 mx-auto" /></td>
                    <td className="p-4 text-center"><SkeletonPulse className="h-6 w-24 mx-auto rounded-full" /></td>
                  </tr>
                ))
              ) : processedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-white/20 italic">
                    Заявки за заданими параметрами відсутні
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead: any) => {
                  const col = PIPELINE_COLUMNS.find((c) => c.key === lead.status) || PIPELINE_COLUMNS[0];
                  const isRealUnpaid = Boolean(
                    (lead.is_unpaid_intent || lead.isUnpaidIntent) &&
                    (Number(lead.usd_attempted || 0) > 0 || Number(lead.uah_attempted || 0) > 0 || lead.status === "Відмова" || (lead.tags && lead.tags.some((t: string) => t.includes("кошик"))))
                  );

                  return (
                    <tr
                      key={lead.id}
                      onClick={(e) => {
                        if (
                          (e.target as HTMLElement).closest("a") ||
                          (e.target as HTMLElement).closest("button")
                        ) {
                          return;
                        }
                        openLeadModal(lead);
                      }}
                      className={`${tableRowClass} cursor-pointer transition-all hover:bg-emerald-500/[0.02]`}
                    >
                      {/* Client name, ID and Tags */}
                      <td className="p-4">
                        <div className="font-extrabold text-sm flex flex-wrap items-center gap-1.5">
                          <span className={isLight ? "text-neutral-900" : "text-white"}>{lead.name}</span>
                          {(lead.tags || (lead as any).tags || []).slice(0, 3).map((tag: string) => {
                            if (tag.includes("Оплачено") || tag === "Клієнт") {
                              return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{tag}</span>;
                            }
                            if (tag.includes("кошик") || tag.includes("Покинутий")) {
                              return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">🛒 Покинутий кошик</span>;
                            }
                            if (tag.includes("Залишив заявку") || tag.includes("Анкета")) {
                              return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">{tag}</span>;
                            }
                            if (tag.includes("Зареєструвався") || tag.includes("Безкоштовна")) {
                              return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{tag}</span>;
                            }
                            if (tag.includes("Мульти-канал")) {
                              return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">{tag}</span>;
                            }
                            return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">{tag}</span>;
                          })}
                          {(!lead.tags || lead.tags.length === 0) && (
                            isRealUnpaid ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                🛒 Покинутий кошик
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Зареєструвався
                              </span>
                            )
                          )}
                          {isDevMode && (lead.name === "Невідомий" || !lead.name) && (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-550 border border-amber-500/20"
                              title="Ім'я контакту відсутнє в базі даних"
                            >
                              Без імені
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[150px] mt-0.5`}
                          title={lead.visitor_uuid}
                        >
                          Visitor ID: {lead.visitor_uuid}
                        </div>
                      </td>

                      {/* Lead Exact Timestamp Column */}
                      <td className="p-4 whitespace-nowrap">
                        {(() => {
                          const timeInfo = formatLeadDateTime(lead.createdAt || lead.created_at);
                          return (
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-xs">
                                <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className={isLight ? "text-neutral-800" : "text-white/90"}>{timeInfo.dateOnly}</span>
                                <span className="text-emerald-400 font-extrabold">{timeInfo.timeOnly}</span>
                              </div>
                              {timeInfo.relative && (
                                <span className={`text-[10px] font-semibold pl-5 ${isLight ? "text-neutral-500" : "text-white/40"}`}>
                                  {timeInfo.relative}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Contacts copy and Social handles */}
                      <td className="p-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>
                            {lead.phone || "Невідомий телефон"}
                          </span>
                          {lead.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPhone(lead.phone, lead.id);
                              }}
                              className={`p-1 rounded transition-all cursor-pointer ${
                                isLight
                                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                                  : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                              }`}
                            >
                              {copiedId === lead.id ? (
                                <Check className="w-3 h-3 text-emerald-450" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                          {lead.instagram && renderSocialsLink(lead.instagram, "ig")}
                          {lead.diagnosticsComment && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLeadModal(lead);
                              }}
                              className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 cursor-pointer flex items-center gap-0.5"
                              title="Переглянути відповіді на анкету"
                            >
                              📋 Анкета
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Attribution link source & campaign & creative */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1 max-w-[240px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(() => {
                              const rawSource = lead.utmSource || lead.utm_source || "";
                              const isTarget = Boolean(rawSource && rawSource !== "direct");
                              return (
                                <span
                                  className={`font-black uppercase text-[9px] tracking-wider px-1.5 py-0.5 rounded ${
                                    isTarget
                                      ? "bg-purple-500/15 text-purple-300 border border-purple-500/30 font-extrabold"
                                      : isLight
                                      ? "bg-neutral-100 text-neutral-700 border border-neutral-200"
                                      : "bg-white/5 text-white/60 border border-white/10"
                                  }`}
                                  title={`Джерело: ${isTarget ? "Таргет / Meta Ads" : "Пряме посилання / Органіка"}`}
                                >
                                  {isTarget ? `🎯 ${rawSource}` : "🔗 direct (посилання)"}
                                </span>
                              );
                            })()}
                            {(lead.utmMedium || lead.utm_medium) && (
                              <span
                                className="font-bold text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                title={`Канал (UTM Medium): ${lead.utmMedium || lead.utm_medium}`}
                              >
                                {lead.utmMedium || lead.utm_medium}
                              </span>
                            )}
                            {(lead.utmContent || lead.utm_content) && (
                              <span
                                className="font-mono text-[9px] px-1 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                title={`Креатив (UTM Content): ${lead.utmContent || lead.utm_content}`}
                              >
                                Кр #{lead.utmContent || lead.utm_content}
                              </span>
                            )}
                          </div>
                          {(lead.utmCampaign || lead.utm_campaign) && (
                            <span
                              className="text-[10px] font-semibold text-white/70 truncate block leading-tight hover:text-white"
                              title={`Кампанія (UTM Campaign): ${lead.utmCampaign || lead.utm_campaign}`}
                            >
                              📢 {lead.utmCampaign || lead.utm_campaign}
                            </span>
                          )}

                          {/* Visited Landings Tags */}
                          {((lead.visitedLandings && lead.visitedLandings.length > 0) || (lead.visited_landings && lead.visited_landings.length > 0)) && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {(() => {
                                const vLandings: string[] = (lead.visitedLandings || lead.visited_landings || []) as string[];
                                const primaryLanding = vLandings[0] || "";
                                const displayName = formatLandingDisplay(primaryLanding);
                                return (
                                  <>
                                    <span
                                      className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-teal-500/10 text-teal-300 border border-teal-500/20 truncate max-w-[150px]"
                                      title={`Лендинг: ${primaryLanding}`}
                                    >
                                      🎯 {displayName}
                                    </span>
                                    {vLandings.length > 1 && (
                                      <span
                                        className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                        title={`Всі відвідані лендинги:\n${vLandings.map(formatLandingDisplay).join('\n')}`}
                                      >
                                        ⚡ +{vLandings.length - 1}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Touch count tracking */}
                      <td className="p-4 text-center font-extrabold">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLeadModal(lead);
                          }}
                          className={`px-2 py-1 rounded border transition-all font-black text-[11px] cursor-pointer ${
                            isLight
                              ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-emerald-600"
                              : "bg-white/5 hover:bg-white/10 border-white/5 text-emerald-450"
                          }`}
                        >
                          {lead.touchCount} торкань
                        </button>
                      </td>

                      {/* Sum Amount */}
                      <td className="p-4 text-center font-black text-sm">
                        {lead.usdPaid > 0 || lead.uahPaid > 0 || lead.eurPaid > 0 ? (
                          <span className="text-emerald-450 font-black">
                            {formatDualCurrency(lead.usdPaid, lead.uahPaid, lead.eurPaid)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      {/* Pipeline status pill */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold ${
                            lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : lead.status === "Відмова"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : isLight
                              ? "bg-neutral-150 border-neutral-300 text-neutral-700"
                              : "bg-neutral-800 border-neutral-700 text-neutral-300"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className={`md:hidden divide-y ${isLight ? "divide-neutral-200" : "divide-white/5"}`}>
          {processedLeads.length === 0 ? (
            <div className="p-8 text-center text-white/20 italic">Заявки за заданими параметрами відсутні</div>
          ) : (
            paginatedLeads.map((lead: any) => {
              const col = PIPELINE_COLUMNS.find((c) => c.key === lead.status) || PIPELINE_COLUMNS[0];
              const isRealUnpaid = Boolean(
                (lead.is_unpaid_intent || lead.isUnpaidIntent) &&
                (Number(lead.usd_attempted || 0) > 0 || Number(lead.uah_attempted || 0) > 0 || lead.status === "Відмова" || (lead.tags && lead.tags.some((t: string) => t.includes("кошик"))))
              );

              return (
                <div
                  key={lead.id}
                  onClick={() => openLeadModal(lead)}
                  className="p-5 hover:bg-emerald-500/[0.02] active:bg-emerald-500/[0.04] transition-all cursor-pointer space-y-4"
                >
                  {/* Header: Name, Badges & Amount */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3
                        className={`font-extrabold text-sm flex flex-wrap items-center gap-1.5 ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}
                      >
                        {lead.name}
                        {(lead.tags || (lead as any).tags || []).slice(0, 3).map((tag: string) => {
                          if (tag.includes("Оплачено") || tag === "Клієнт") {
                            return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{tag}</span>;
                          }
                          if (tag.includes("кошик") || tag.includes("Покинутий")) {
                            return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">🛒 Покинутий кошик</span>;
                          }
                          if (tag.includes("Залишив заявку") || tag.includes("Анкета")) {
                            return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">{tag}</span>;
                          }
                          if (tag.includes("Зареєструвався") || tag.includes("Безкоштовна")) {
                            return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{tag}</span>;
                          }
                          return <span key={tag} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">{tag}</span>;
                        })}
                        {(!lead.tags || lead.tags.length === 0) && (
                          isRealUnpaid ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                              🛒 Покинутий кошик
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Зареєструвався
                            </span>
                          )
                        )}
                      </h3>
                      <div
                        className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[200px]`}
                        title={lead.visitor_uuid}
                      >
                        ID: {lead.visitor_uuid?.substring(0, 8)}...
                      </div>
                      {/* Mobile Timestamp Badge */}
                      {(() => {
                        const timeInfo = formatLeadDateTime(lead.createdAt || lead.created_at);
                        return (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 pt-0.5">
                            <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{timeInfo.formatted}</span>
                            {timeInfo.relative && (
                              <span className={`font-medium ${isLight ? "text-neutral-500" : "text-white/40"}`}>
                                ({timeInfo.relative})
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="text-right shrink-0">
                      {lead.usdPaid > 0 || lead.uahPaid > 0 || lead.eurPaid > 0 ? (
                        <span className="text-emerald-455 font-black text-xs block">
                          {formatDualCurrency(lead.usdPaid, lead.uahPaid, lead.eurPaid)}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs block">—</span>
                      )}
                    </div>
                  </div>

                  {/* Contacts Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>
                        {lead.phone || "Невідомий телефон"}
                      </span>
                      {lead.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(lead.phone, lead.id);
                          }}
                          className={`p-1.5 rounded transition-all cursor-pointer ${
                            isLight
                              ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                              : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                          }`}
                        >
                          {copiedId === lead.id ? (
                            <Check className="w-3 h-3 text-emerald-450" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                      {lead.instagram && renderSocialsLink(lead.instagram, "ig")}
                    </div>
                  </div>

                  {/* Source, Campaign & Touch Footer */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-white/5">
                    {(lead.utmMedium || lead.utm_medium || lead.utmCampaign || lead.utm_campaign) && (
                      <div className="text-[10px] font-bold text-white/90 truncate">
                        🎯 {lead.utmMedium || lead.utm_medium || lead.utmCampaign || lead.utm_campaign}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-semibold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded ${
                            isLight
                              ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                              : "bg-white/5 text-white/60 border border-white/5"
                          }`}
                        >
                          {lead.utmSource || lead.utm_source || "direct"}
                        </span>
                        {(lead.utmContent || lead.utm_content) && (
                          <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            Кр #{lead.utmContent || lead.utm_content}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLeadModal(lead);
                          }}
                          className={`px-2 py-0.5 rounded border transition-all font-black text-[9px] cursor-pointer ${
                            isLight
                              ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-emerald-600"
                              : "bg-white/5 hover:bg-white/10 border-white/5 text-emerald-450"
                          }`}
                        >
                          {lead.touchCount} торк.
                        </button>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold ${
                          lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер"
                            ? "bg-emerald-500/10 text-emerald-455 border-emerald-500/20"
                            : lead.status === "Відмова"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : isLight
                            ? "bg-neutral-150 border-neutral-300 text-neutral-700"
                            : "bg-neutral-800 border-neutral-700 text-neutral-300"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                        {lead.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination controls */}
        {totalCount > pageSize && (() => {
          const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
          const maxVisiblePages = 5;
          let startPage = Math.max(1, currentPage - 2);
          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
          if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
          }
          const pageNumbers = [];
          for (let p = startPage; p <= endPage; p++) {
            pageNumbers.push(p);
          }

          return (
            <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t ${borderClass}`}>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black uppercase ${textMutedClass}`}>
                  Показано {Math.min((currentPage - 1) * pageSize + 1, totalCount)}—{Math.min(currentPage * pageSize, totalCount)} із {totalCount} лідів
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Стор. {currentPage} з {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* First Page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className={`px-2 py-1 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${
                    isLight
                      ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent text-neutral-600"
                      : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent text-white/60"
                  }`}
                  title="Перша сторінка"
                >
                  ««
                </button>
                {/* Prev Page */}
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${
                    isLight
                      ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent text-neutral-800"
                      : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent text-white"
                  }`}
                >
                  Назад
                </button>

                {/* Numeric Page Buttons */}
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentPage(num)}
                    className={`min-w-[32px] h-7 px-2 rounded-lg text-xs font-black transition-all ${
                      num === currentPage
                        ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                        : isLight
                        ? "border border-neutral-200 hover:bg-neutral-100 text-neutral-700"
                        : "border border-white/10 hover:bg-white/5 text-white/70"
                    }`}
                  >
                    {num}
                  </button>
                ))}

                {/* Next Page */}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${
                    isLight
                      ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent text-neutral-800"
                      : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent text-white"
                  }`}
                >
                  Вперед
                </button>
                {/* Last Page */}
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-2 py-1 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${
                    isLight
                      ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent text-neutral-600"
                      : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent text-white/60"
                  }`}
                  title="Остання сторінка"
                >
                  »»
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
});

export default LeadsTab;
