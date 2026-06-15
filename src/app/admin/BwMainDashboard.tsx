"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  TrendingUp,
  Users,
  Briefcase,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MousePointerClick,
  Info,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  Bell,
  ExternalLink,
} from "lucide-react";
import { getDashboardData, updateLeadStatus } from "./actions";
import { useTheme } from "./ThemeProvider";
import { devLogger } from "@/utils/logger";
import DevLogConsole from "./DevLogConsole";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  telegram: string | null;
  instagram: string | null;
  button_id: string;
  visitor_id: string;
  status: "new" | "in_progress" | "completed" | "rejected";
}

interface PageView {
  visitor_id: string;
}

interface ButtonClick {
  button_id: string;
}

interface BwMainDashboardProps {
  initialLeads: Lead[];
  initialPageViews: PageView[];
  initialClicks: ButtonClick[];
}

// Technical button IDs to human-readable labels
const BUTTON_LABELS: Record<string, string> = {
  header_cta: "Кнопка в шапці (Header CTA)",
  hero_cta: "Перший екран (Hero CTA)",
  metrics_cta: "Блок метрик (Metrics CTA)",
  mid_banner_cta: "Середина лендингу (Banner CTA)",
  final_cta: "Фінальний екран (Final CTA)",
  cases_cta: "Розділ кейсів (Cases CTA)",
};

type PipelineStatus =
  | "new"
  | "in_progress"
  | "scheduled_call"
  | "call_conducted"
  | "offer_sent"
  | "offer_approved"
  | "presale"
  | "contract_signed"
  | "regular_customer";

interface PipelineStatusConfig {
  key: PipelineStatus;
  label: string;
  dbStatus: "new" | "in_progress" | "completed" | "rejected";
  colorClass: string;
  dotColor: string;
}

const PIPELINE_STATUSES: PipelineStatusConfig[] = [
  {
    key: "new",
    label: "Новий",
    dbStatus: "new",
    colorClass: "bg-neutral-800 border-neutral-700 text-neutral-300",
    dotColor: "bg-neutral-400",
  },
  {
    key: "in_progress",
    label: "В роботі",
    dbStatus: "in_progress",
    colorClass: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    dotColor: "bg-yellow-400",
  },
  {
    key: "scheduled_call",
    label: "Назначили звонок",
    dbStatus: "in_progress",
    colorClass: "bg-orange-500/10 border-orange-500/20 text-orange-400",
    dotColor: "bg-orange-400",
  },
  {
    key: "call_conducted",
    label: "Звонок проведён",
    dbStatus: "in_progress",
    colorClass: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
    dotColor: "bg-cyan-400",
  },
  {
    key: "offer_sent",
    label: "Отправили оффер",
    dbStatus: "in_progress",
    colorClass: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    dotColor: "bg-blue-400",
  },
  {
    key: "offer_approved",
    label: "Оффер одобрен",
    dbStatus: "in_progress",
    colorClass: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    dotColor: "bg-purple-400",
  },
  {
    key: "presale",
    label: "Присейл",
    dbStatus: "in_progress",
    colorClass: "bg-pink-500/10 border-pink-500/20 text-pink-400",
    dotColor: "bg-pink-400",
  },
  {
    key: "contract_signed",
    label: "Договор подписан",
    dbStatus: "completed",
    colorClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    dotColor: "bg-indigo-400",
  },
  {
    key: "regular_customer",
    label: "Постійний клієнт",
    dbStatus: "completed",
    colorClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    dotColor: "bg-emerald-400",
  },
];

function getBaseButtonId(buttonId: string): string {
  if (buttonId && buttonId.includes("::")) {
    return buttonId.split("::")[0];
  }
  return buttonId || "unknown";
}

function parsePipelineStatus(status: string, buttonId: string): PipelineStatus {
  if (buttonId && buttonId.includes("::")) {
    const parts = buttonId.split("::");
    const suffix = parts[parts.length - 1] as PipelineStatus;
    if (PIPELINE_STATUSES.some((s) => s.key === suffix)) {
      return suffix;
    }
  }

  // Fallbacks
  if (status === "new") return "new";
  if (status === "completed") return "contract_signed";
  if (status === "rejected") return "new";
  return "in_progress";
}

const getUkraineOffset = (year: number, month: number, day: number): string => {
  if (month > 2 && month < 9) return "+03:00";
  if (month < 2 || month > 9) return "+02:00";
  
  const lastSunday = (m: number) => {
    const d = new Date(year, m + 1, 0);
    const dayOfWeek = d.getDay();
    return d.getDate() - dayOfWeek;
  };
  
  if (month === 2) {
    return day >= lastSunday(2) ? "+03:00" : "+02:00";
  }
  if (month === 9) {
    return day < lastSunday(9) ? "+03:00" : "+02:00";
  }
  return "+02:00";
};

const getLeadDate = (lead: any): Date => {
  const rawDateStr = lead.created_at;
  if (rawDateStr) {
    const str = String(rawDateStr).trim();
    const dotParts = str.split(" ")[0].split(".");
    if (dotParts.length === 3) {
      const day = parseInt(dotParts[0], 10);
      const month = parseInt(dotParts[1], 10) - 1;
      const year = parseInt(dotParts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const timeStr = str.split(" ")[1];
        const hour = timeStr ? (parseInt(timeStr.split(":")[0], 10) || 0) : 12;
        const min = timeStr ? (parseInt(timeStr.split(":")[1], 10) || 0) : 0;
        const sec = timeStr ? (parseInt(timeStr.split(":")[2], 10) || 0) : 0;
        
        const offset = getUkraineOffset(year, month, day);
        const isoStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}${offset}`;
        return new Date(isoStr);
      }
    }
    
    let cleanStr = str;
    if (str.includes("(")) {
      cleanStr = str.split("(")[0].trim();
    }
    const parsed = Date.parse(cleanStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return new Date(lead.created_at);
};

export default function BwMainDashboard({
  initialLeads,
  initialPageViews,
  initialClicks,
}: BwMainDashboardProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const bgClass = isLight ? "bg-[#F8F9FC] text-neutral-900" : "bg-[#060608] text-white";
  const cardClass = isLight ? "bg-white border border-neutral-200/85 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";
  const tableHeaderClass = isLight ? "bg-neutral-100 text-neutral-500 border-neutral-200" : "bg-white/[0.02] text-white/40 border-white/5";
  const tableRowClass = isLight ? "hover:bg-neutral-50 border-neutral-200 text-neutral-800" : "hover:bg-white/[0.01] border-white/5 text-white/80";
  const inputClass = isLight ? "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs" : "bg-white/[0.03] border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500 text-xs";
  const dropdownClass = isLight ? "bg-white border border-neutral-200 shadow-2xl text-neutral-900" : "bg-[#0C0C0F]/95 border border-white/10 text-white shadow-2xl";

  const [hasMounted, setHasMounted] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  useEffect(() => {
    setHasMounted(true);
    devLogger.info("BwMainDashboard", "BwMainDashboard component mounted");
    const saved = localStorage.getItem("crm_dev_mode");
    if (saved === "true") {
      setIsDevMode(true);
    }
  }, []);

  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [pageViews, setPageViews] = useState<PageView[]>(initialPageViews);
  const [clicks, setClicks] = useState<ButtonClick[]>(initialClicks);

  const [activeTab, setActiveTab] = useState<"leads" | "regular_customers">("leads");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);

  // Track current leads length with ref to avoid interval reset
  const leadsLengthRef = useRef(leads.length);
  useEffect(() => {
    leadsLengthRef.current = leads.length;
  }, [leads]);

  // Floating notifications trigger helper
  const triggerNotification = (message: string) => {
    const id = Math.random().toString();
    setNotifications((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // 10s Polling Hook
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        devLogger.info("BwMainDashboard", "Polling latest main site dashboard data...");
        const freshData = await getDashboardData();
        
        devLogger.info("BwMainDashboard", "Polling success. Latest data fetched", {
          leadsCount: freshData.leads.length,
          pageViewsCount: freshData.pageViews.length,
          clicksCount: freshData.clicks.length
        });

        // Push notification if new leads detected
        if (freshData.leads.length > leadsLengthRef.current) {
          devLogger.info("BwMainDashboard", "New leads detected!", {
            prevCount: leadsLengthRef.current,
            newCount: freshData.leads.length
          });
          triggerNotification("Зареєстровано новий лід");
        }

        // In-place refresh
        setLeads(freshData.leads);
        setPageViews(freshData.pageViews);
        setClicks(freshData.clicks);
      } catch (err: any) {
        devLogger.error("BwMainDashboard", `Polling failed: ${err.message}`, { error: err });
        console.error("[Polling] Failed to fetch latest data:", err);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, []);

  // 1. Math / Calculations (re-runs when views/clicks states update)
  const metrics = useMemo(() => {
    const uniqueVisitors = new Set(pageViews.map((v) => v.visitor_id)).size;
    const totalLeads = leads.length;
    const conversionRate = uniqueVisitors > 0 ? (totalLeads / uniqueVisitors) * 100 : 0;

    return {
      uniqueVisitors,
      totalLeads,
      conversionRate,
    };
  }, [leads, pageViews]);

  // 2. Button Performance Calculations (strips suffix)
  const buttonPerformance = useMemo(() => {
    const data: Record<string, { clicks: number; leads: number; label: string }> = {};

    clicks.forEach((c) => {
      const baseBtnId = getBaseButtonId(c.button_id);
      if (!data[baseBtnId]) {
        data[baseBtnId] = {
          clicks: 0,
          leads: 0,
          label: BUTTON_LABELS[baseBtnId] || baseBtnId,
        };
      }
      data[baseBtnId].clicks += 1;
    });

    leads.forEach((l) => {
      const baseBtnId = getBaseButtonId(l.button_id);
      if (!data[baseBtnId]) {
        data[baseBtnId] = {
          clicks: 0,
          leads: 0,
          label: BUTTON_LABELS[baseBtnId] || baseBtnId,
        };
      }
      data[baseBtnId].leads += 1;
    });

    return Object.entries(data)
      .map(([buttonId, stats]) => {
        const cr = stats.clicks > 0 ? (stats.leads / stats.clicks) * 100 : 0;
        return {
          id: buttonId,
          ...stats,
          cr,
        };
      })
      .sort((a, b) => b.cr - a.cr);
  }, [leads, clicks]);

  // 3. Status change handler using the 9-stage sequence with compound suffix
  const handlePipelineStatusChange = async (
    leadId: string,
    newPipelineStatus: PipelineStatus,
    fullButtonId: string
  ) => {
    setUpdatingId(leadId);
    try {
      const baseButtonId = getBaseButtonId(fullButtonId);
      const newCompoundButtonId = `${baseButtonId}::${newPipelineStatus}`;
      const config = PIPELINE_STATUSES.find((s) => s.key === newPipelineStatus);
      if (!config) throw new Error("Invalid pipeline status");

      const res = await updateLeadStatus(leadId, config.dbStatus, newCompoundButtonId);
      if (!res.success) throw new Error("Update action returned failure");

      // Update state locally
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId
            ? { ...l, status: config.dbStatus, button_id: newCompoundButtonId }
            : l
        )
      );

      triggerNotification(`Статус ліда оновлено: ${config.label}`);
    } catch (err) {
      alert("Не вдалося оновити статус: " + (err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Filtering and Searching leads list
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const pipelineStatus = parsePipelineStatus(l.status, l.button_id);

      // Tab matching logic
      if (activeTab === "regular_customers") {
        if (pipelineStatus !== "regular_customer") return false;
      } else {
        // In basic list tab, allow filtering by CRM status pill
        const matchesPill =
          statusFilter === "all" ||
          (statusFilter === "new" && pipelineStatus === "new") ||
          (statusFilter === "in_progress" &&
            pipelineStatus !== "new" &&
            pipelineStatus !== "contract_signed" &&
            pipelineStatus !== "regular_customer") ||
          (statusFilter === "completed" &&
            (pipelineStatus === "contract_signed" || pipelineStatus === "regular_customer"));

        if (!matchesPill) return false;
      }

      // Search matching logic
      const matchesSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.telegram && l.telegram.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.instagram && l.instagram.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.button_id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [leads, activeTab, statusFilter, searchQuery]);

  // Fast clipboard copy phone number handler
  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clean Social Username Parsing helpers
  const renderTelegramLink = (username: string | null) => {
    if (!username) return null;
    const clean = username.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
    if (!clean) return null;

    return (
      <a
        href={`https://t.me/${clean}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-2 py-1 rounded transition-all cursor-pointer"
      >
        tg: {clean}
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </a>
    );
  };

  const renderInstagramLink = (username: string | null) => {
    if (!username) return null;
    const clean = username.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
    if (!clean) return null;

    return (
      <a
        href={`https://instagram.com/${clean}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2 py-1 rounded transition-all cursor-pointer"
      >
        ig: {clean}
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </a>
    );
  };

  if (!hasMounted) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className={`text-xs ${textMutedClass}`}>Завантаження панелі...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 font-sans">
      {/* Floating Push Notifications Container */}
      <div className="fixed top-6 right-6 z-[9999] space-y-3 pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto bg-[#0C0C0F]/95 border border-emerald-500/30 text-white px-5 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.2)] backdrop-blur-xl flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 w-80"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Оповіщення</p>
              <p className="text-xs font-bold text-white/90 mt-0.5">{n.message}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dashboard Top Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`text-3xl font-black uppercase tracking-tight flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
            Панель аналітики головного сайту
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </h1>
          <p className={`text-sm mt-1 ${textMutedClass}`}>
            Конверсії, CTA-кнопки та керування лідами в реальному часі (автооновлення кожні 10с)
          </p>
        </div>
      </div>

      {/* 1. Main Aggregate Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className={`${cardClass} p-6 rounded-2xl relative overflow-hidden shadow-2xl backdrop-blur-md`}>
          <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest ${textMutedClass}`}>
            Конверсія сайту (CR)
          </p>
          <p className={`text-3xl font-black mt-4 ${isLight ? "text-neutral-900" : "text-white"}`}>
            {metrics.conversionRate.toFixed(2)}%
          </p>
          <p className={`text-xs mt-2 font-medium ${isLight ? "text-neutral-450" : "text-white/30"}`}>
            Співвідношення унікальних лідів до відвідувачів
          </p>
        </div>

        {/* Metric 2 */}
        <div className={`${cardClass} p-6 rounded-2xl relative overflow-hidden shadow-2xl backdrop-blur-md`}>
          <div className="absolute top-4 right-4 text-emerald-400 bg-emerald-400/10 p-3 rounded-xl border border-emerald-400/20">
            <Users className="w-5 h-5" />
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest ${textMutedClass}`}>
            Унікальні візити
          </p>
          <p className={`text-3xl font-black mt-4 ${isLight ? "text-neutral-900" : "text-white"}`}>
            {metrics.uniqueVisitors}
          </p>
          <p className={`text-xs mt-2 font-medium ${isLight ? "text-neutral-450" : "text-white/30"}`}>
            Унікальні visitor_id зафіксовані системою
          </p>
        </div>

        {/* Metric 3 */}
        <div className={`${cardClass} p-6 rounded-2xl relative overflow-hidden shadow-2xl backdrop-blur-md`}>
          <div className="absolute top-4 right-4 text-white bg-white/5 p-3 rounded-xl border border-white/10">
            <Briefcase className="w-5 h-5" />
          </div>
          <p className={`text-xs font-bold uppercase tracking-widest ${textMutedClass}`}>
            Загальна кількість лідів
          </p>
          <p className={`text-3xl font-black mt-4 ${isLight ? "text-neutral-900" : "text-white"}`}>
            {metrics.totalLeads}
          </p>
          <p className={`text-xs mt-2 font-medium ${isLight ? "text-neutral-450" : "text-white/30"}`}>
            Всього відправлених заявок на діагностику
          </p>
        </div>
      </div>

      {/* 2. CTA Buttons Conversion breakdown */}
      <div className={`${cardClass} rounded-2xl p-6 shadow-2xl backdrop-blur-md`}>
        <h2 className={`text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2 ${isLight ? "text-neutral-900" : "text-white"}`}>
          <MousePointerClick className="w-5 h-5 text-emerald-500" />
          Ефективність CTA-кнопок
        </h2>

        {buttonPerformance.length === 0 ? (
          <div className={`text-center py-6 text-sm flex items-center justify-center gap-2 ${isLight ? "text-neutral-500" : "text-white/30"}`}>
            <Info className="w-4 h-4" /> Немає зафіксованих кліків по кнопках
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buttonPerformance.map((btn) => (
              <div
                key={btn.id}
                className={`p-5 rounded-xl border transition-all space-y-3 ${
                  isLight 
                    ? "bg-neutral-50/50 border-neutral-200/85 hover:border-emerald-500" 
                    : "bg-white/[0.01] border-white/5 hover:border-emerald-500/20"
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className={`text-sm font-bold truncate pr-2 ${isLight ? "text-neutral-800" : "text-white/90"}`} title={btn.label}>
                    {btn.label}
                  </p>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    CR: {btn.cr.toFixed(1)}%
                  </span>
                </div>

                <div className={`grid grid-cols-2 gap-2 text-xs ${textMutedClass}`}>
                  <div>Кліки: <span className={`font-bold ${isLight ? "text-neutral-950" : "text-white"}`}>{btn.clicks}</span></div>
                  <div>Ліди: <span className={`font-bold ${isLight ? "text-neutral-950" : "text-white"}`}>{btn.leads}</span></div>
                </div>

                {/* Micro progress bar */}
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? "bg-neutral-100" : "bg-white/5"}`}>
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(btn.cr, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Leads Base / Monitor Tabs */}
      <div className={`${cardClass} rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-md`}>
        {/* Navigation Tabs Selector */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b ${borderClass} pb-4`}>
          <div className="flex gap-6">
            <button
              onClick={() => {
                setActiveTab("leads");
                setStatusFilter("all");
              }}
              className={`text-sm font-black uppercase tracking-wider pb-2 border-b-2 transition-all cursor-pointer ${
                activeTab === "leads"
                  ? `border-emerald-500 ${isLight ? "text-neutral-900" : "text-white"}`
                  : `border-transparent ${textMutedClass} hover:text-emerald-500/70`
              }`}
            >
              База лідів
            </button>
            <button
              onClick={() => setActiveTab("regular_customers")}
              className={`text-sm font-black uppercase tracking-wider pb-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "regular_customers"
                  ? `border-emerald-500 ${isLight ? "text-neutral-900" : "text-white"}`
                  : `border-transparent ${textMutedClass} hover:text-emerald-500/70`
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              Постійні клієнти (Моніторинг)
            </button>
          </div>

          <h2 className={`text-sm font-bold uppercase tracking-tight ${textMutedClass}`}>
            {activeTab === "leads" ? "Активний перегляд & Управління" : "Режим только просмотра"}
          </h2>
        </div>

        {/* Controls: Search and Status Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <span className={`absolute inset-y-0 left-0 pl-3 flex items-center ${isLight ? "text-neutral-400" : "text-white/30"}`}>
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук клієнтів (ім'я, телефон, tg, ig)..."
              className={`w-full pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-emerald-500 text-xs ${inputClass}`}
            />
          </div>

          {/* CRM status pills - Hidden for Regular Customers tab */}
          {activeTab === "leads" && (
            <div className={`flex flex-wrap gap-1 p-1 rounded-xl ${isLight ? "bg-neutral-100 border border-neutral-200" : "bg-white/[0.02] border border-white/5"}`}>
              {[
                { id: "all", label: "Всі" },
                { id: "new", label: "Нові" },
                { id: "in_progress", label: "В роботі" },
                { id: "completed", label: "Завершені" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === btn.id
                      ? isLight
                        ? "bg-neutral-950 text-white font-extrabold shadow-lg"
                        : "bg-white text-black font-extrabold shadow-lg"
                      : isLight
                      ? "text-neutral-500 hover:text-neutral-900"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leads content based on Tab */}
        {activeTab === "regular_customers" ? (
          /* Independent Read-Only Monitor Layout for Regular Customers */
          <div className="space-y-4">
            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl text-white/30 text-sm">
                <Sparkles className="w-8 h-8 text-white/10 mx-auto mb-3" />
                Немає постійних клієнтів за заданими критеріями пошуку.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`relative p-6 rounded-2xl transition-all shadow-xl hover:shadow-emerald-500/[0.05] group ${
                      isLight 
                        ? "bg-white border border-emerald-500/30 hover:border-emerald-500" 
                        : "bg-[#0C0C0F]/80 border border-emerald-500/20 hover:border-emerald-500/40"
                    }`}
                  >
                    {/* Shiny Premium Orb Badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Постійний клієнт
                    </div>

                    <div className="space-y-4">
                      {/* Name and ID */}
                      <div>
                        <h3 className={`font-extrabold text-base tracking-tight group-hover:text-emerald-400 transition-colors ${isLight ? "text-neutral-900" : "text-white"}`}>
                          {lead.name}
                        </h3>
                        <p className={`text-[9px] mt-1 truncate ${isLight ? "text-neutral-400" : "text-white/30"}`} title={lead.visitor_id}>
                          id: {lead.visitor_id}
                        </p>
                      </div>

                      {/* Phone and Clipboard Copy */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${isLight ? "bg-neutral-50/50 border-neutral-200" : "bg-white/[0.02] border-white/5"}`}>
                        <div className={`text-xs font-semibold ${isLight ? "text-neutral-800" : "text-white/80"}`}>{lead.phone}</div>
                        <button
                          onClick={() => handleCopyPhone(lead.phone, lead.id)}
                          className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center ${isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-850" : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"}`}
                          title="Скопіювати номер телефону"
                        >
                          {copiedId === lead.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Social Nickname Links */}
                      <div className={`flex flex-wrap gap-2 pt-1 border-t ${borderClass}`}>
                        {lead.telegram ? (
                          renderTelegramLink(lead.telegram)
                        ) : (
                          <span className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? "text-neutral-300" : "text-white/20"}`}>tg: немає</span>
                        )}
                        {lead.instagram ? (
                          renderInstagramLink(lead.instagram)
                        ) : (
                          <span className={`text-[9px] uppercase tracking-wider font-bold ${isLight ? "text-neutral-300" : "text-white/20"}`}>ig: немає</span>
                        )}
                      </div>

                      {/* Footer Details */}
                      <div className={`flex justify-between items-center text-[10px] mt-2 font-medium ${textMutedClass}`}>
                        <span>Джерело: {BUTTON_LABELS[getBaseButtonId(lead.button_id)] || getBaseButtonId(lead.button_id)}</span>
                        <span>
                          {getLeadDate(lead).toLocaleDateString("uk-UA", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={`hidden md:block overflow-x-auto border rounded-xl ${borderClass}`}>
            {/* Click Outside overlay when dropdown is open */}
            {activeDropdownId && (
              <div
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setActiveDropdownId(null)}
              />
            )}

            <table className="w-full border-collapse text-left text-xs relative">
              <thead>
                <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                  <th className="p-4">Клієнт</th>
                  <th className="p-4">Контакти & Скорочення</th>
                  <th className="p-4">Джерело (CTA)</th>
                  <th className="p-4">Створено</th>
                  <th className="p-4 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={`p-8 text-center text-sm font-medium ${isLight ? "text-neutral-400" : "text-white/30"}`}>
                      Заявки не знайдені
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const currentPipelineStatus = parsePipelineStatus(lead.status, lead.button_id);
                    const currentConfig =
                      PIPELINE_STATUSES.find((s) => s.key === currentPipelineStatus) ||
                      PIPELINE_STATUSES[0];

                    return (
                      <tr key={lead.id} className={`${tableRowClass} transition-all group`}>
                        {/* Client Name & ID */}
                        <td className="p-4">
                          <div className={`font-extrabold text-sm group-hover:text-emerald-400 transition-colors ${isLight ? "text-neutral-900" : "text-white"}`}>
                            {lead.name}
                          </div>
                          <div
                            className={`text-[10px] truncate max-w-[120px] mt-1 ${isLight ? "text-neutral-400" : "text-white/30"}`}
                            title={lead.visitor_id}
                          >
                            id: {lead.visitor_id}
                          </div>
                        </td>

                        {/* Phones & Socials */}
                        <td className="p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isLight ? "text-neutral-800" : "text-white/90"}`}>{lead.phone}</span>
                            <button
                              onClick={() => handleCopyPhone(lead.phone, lead.id)}
                              className={`p-1 rounded transition-all cursor-pointer relative ${isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"}`}
                              title="Скопіювати номер"
                            >
                              {copiedId === lead.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            {lead.telegram && renderTelegramLink(lead.telegram)}
                            {lead.instagram && renderInstagramLink(lead.instagram)}
                          </div>
                        </td>

                        {/* CTA Button Source */}
                        <td className={`p-4 font-semibold ${isLight ? "text-neutral-600" : "text-white/60"}`}>
                          {BUTTON_LABELS[getBaseButtonId(lead.button_id)] || getBaseButtonId(lead.button_id)}
                        </td>

                        {/* Created Date */}
                        <td className={`p-4 ${isLight ? "text-neutral-500" : "text-white/50"}`}>
                          {getLeadDate(lead).toLocaleString("uk-UA", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        {/* Premium Capsule status Dropdown with color indicators */}
                        <td className="p-4 text-center">
                          <div className="inline-block relative">
                            <button
                              disabled={updatingId === lead.id}
                              onClick={() =>
                                setActiveDropdownId(
                                  activeDropdownId === lead.id ? null : lead.id
                                )
                              }
                              className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-extrabold transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer ${
                                currentConfig.colorClass
                              } disabled:opacity-50`}
                            >
                              <span className={`w-2 h-2 rounded-full ${currentConfig.dotColor} animate-pulse`} />
                              <span>{currentConfig.label}</span>
                              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                            </button>

                            {/* Dropdown Menu Container */}
                            {activeDropdownId === lead.id && (
                              <div className={`absolute right-0 mt-2 w-56 rounded-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ${dropdownClass}`}>
                                <div className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-b mb-1.5 ${isLight ? "text-neutral-400 border-neutral-100" : "text-white/30 border-white/5"}`}>
                                  Змінити статус
                                </div>
                                <div className="space-y-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                                  {PIPELINE_STATUSES.map((statusItem) => {
                                    const isSelected = currentPipelineStatus === statusItem.key;
                                    return (
                                      <button
                                        key={statusItem.key}
                                        onClick={async () => {
                                          setActiveDropdownId(null);
                                          await handlePipelineStatusChange(
                                            lead.id,
                                            statusItem.key,
                                            lead.button_id
                                          );
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-bold transition-all duration-150 cursor-pointer ${
                                          isSelected
                                            ? isLight ? "bg-neutral-100 text-neutral-900" : "bg-white/10 text-white"
                                            : isLight ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50" : "text-white/60 hover:text-white hover:bg-white/5"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`w-2 h-2 rounded-full ${statusItem.dotColor}`}
                                          />
                                          <span>{statusItem.label}</span>
                                        </div>
                                        {isSelected && (
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
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
            {filteredLeads.length === 0 ? (
              <div className={`p-8 text-center text-sm font-medium ${isLight ? "text-neutral-400" : "text-white/30"}`}>
                Заявки не знайдені
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const currentPipelineStatus = parsePipelineStatus(lead.status, lead.button_id);
                const currentConfig =
                  PIPELINE_STATUSES.find((s) => s.key === currentPipelineStatus) ||
                  PIPELINE_STATUSES[0];

                return (
                  <div
                    key={lead.id}
                    className="p-5 hover:bg-emerald-500/[0.02] active:bg-emerald-500/[0.04] transition-all space-y-4"
                  >
                    {/* Name and Created Date */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className={`font-extrabold text-sm ${isLight ? "text-neutral-900" : "text-white"}`}>
                          {lead.name}
                        </h3>
                        <div className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[200px] mt-0.5`} title={lead.visitor_id}>
                          ID: {lead.visitor_id?.substring(0, 8)}...
                        </div>
                      </div>
                      <span className={`text-[10px] ${textMutedClass} font-semibold shrink-0`}>
                        {getLeadDate(lead).toLocaleDateString("uk-UA")}
                      </span>
                    </div>

                    {/* Contacts & Socials Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>{lead.phone}</span>
                        <button
                          onClick={() => handleCopyPhone(lead.phone, lead.id)}
                          className={`p-1.5 rounded transition-all cursor-pointer relative ${isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-550 hover:text-neutral-900" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"}`}
                          title="Скопіювати номер"
                        >
                          {copiedId === lead.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-450" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        {lead.telegram && renderTelegramLink(lead.telegram)}
                        {lead.instagram && renderInstagramLink(lead.instagram)}
                      </div>
                    </div>

                    {/* Source & Status Selector Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                      <span className={`font-semibold text-[9px] tracking-wider uppercase px-2 py-0.5 rounded ${isLight ? "bg-neutral-100 text-neutral-600 border border-neutral-200" : "bg-white/5 text-white/60 border border-white/5"}`}>
                        {BUTTON_LABELS[getBaseButtonId(lead.button_id)] || getBaseButtonId(lead.button_id)}
                      </span>

                      <div className="inline-block relative">
                        <button
                          disabled={updatingId === lead.id}
                          onClick={() =>
                            setActiveDropdownId(
                              activeDropdownId === lead.id ? null : lead.id
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-extrabold transition-all cursor-pointer ${
                            currentConfig.colorClass
                          } disabled:opacity-50`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${currentConfig.dotColor} animate-pulse`} />
                          <span>{currentConfig.label}</span>
                          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                        </button>

                        {/* Dropdown Menu Container */}
                        {activeDropdownId === lead.id && (
                          <div className={`absolute right-0 mt-2 w-52 rounded-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50 ${dropdownClass}`}>
                            <div className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 border-b mb-1.5 ${isLight ? "text-neutral-400 border-neutral-100" : "text-white/30 border-white/5"}`}>
                              Змінити статус
                            </div>
                            <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
                              {PIPELINE_STATUSES.map((statusItem) => {
                                const isSelected = currentPipelineStatus === statusItem.key;
                                return (
                                  <button
                                    key={statusItem.key}
                                    onClick={async () => {
                                      setActiveDropdownId(null);
                                      await handlePipelineStatusChange(
                                        lead.id,
                                        statusItem.key,
                                        lead.button_id
                                      );
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                                      isSelected
                                        ? isLight ? "bg-neutral-100 text-neutral-900" : "bg-white/10 text-white"
                                        : isLight ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50" : "text-white/60 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${statusItem.dotColor}`}
                                      />
                                      <span>{statusItem.label}</span>
                                    </div>
                                    {isSelected && (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
      </div>
      {isDevMode && <DevLogConsole />}
    </div>
  );
}
