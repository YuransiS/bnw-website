"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Users,
  Briefcase,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  X,
  MousePointerClick,
  Info,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Globe,
  DollarSign,
  Plus,
  Filter,
  RefreshCw,
  FolderOpen,
  Calendar,
  Grid,
  KanbanSquare,
  BarChart4,
  Link as LinkIcon,
  Sun,
  Moon,
  ChevronRight,
  Shield,
  HelpCircle,
  Layers,
  Activity,
  FileSpreadsheet,
  ClipboardCheck
} from "lucide-react";
import {
  updateUnifiedLeadStatusAction,
  createUnifiedLeadAction,
  updateCustomerCommentAction,
  assignLeadToManagerAction,
  updateOrderCurrencyAction,
  getUnifiedCRMData,
  traceVisitorUuidAction
} from "./actions";
import { useTheme } from "./ThemeProvider";
import { statusMapper } from "@/lib/statusMapper";
import { devLogger } from "@/utils/logger";
import DevLogConsole from "./DevLogConsole";
import PerformanceView from "./PerformanceView";

// Safe locale number formatting to avoid server/client hydration mismatch
const formatLocaleNumber = (num: number) => {
  const val = Number(num);
  if (isNaN(val)) return "0";

  const str = val.toFixed(2);
  const parts = str.split(".");
  let integerPart = parts[0];
  let decimalPart = parts[1];

  // Use non-breaking space \u00A0 as thousands separator
  integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");

  if (decimalPart === "00") {
    return integerPart;
  } else if (decimalPart.endsWith("0")) {
    return `${integerPart},${decimalPart.charAt(0)}`;
  } else {
    return `${integerPart},${decimalPart}`;
  }
};

// Currency formatting helper functions
const formatDualCurrency = (usd: number, uah: number, eur: number = 0) => {
  const parts = [];
  if (usd > 0) {
    parts.push(`$${formatLocaleNumber(usd)}`);
  }
  if (uah > 0) {
    parts.push(`${formatLocaleNumber(uah)} ₴`);
  }
  if (eur > 0) {
    parts.push(`${formatLocaleNumber(eur)} €`);
  }
  if (parts.length === 0) {
    return "0 ₴";
  }
  return parts.join(" + ");
};

const formatDualProfit = (usdRevenue: number, spend: number, uahRevenue: number, eurRevenue: number = 0) => {
  const usdProfit = usdRevenue - spend;
  const parts = [];
  if (usdRevenue > 0 || spend > 0) {
    parts.push(`${usdProfit >= 0 ? "" : "-"}$${formatLocaleNumber(Math.abs(usdProfit))}`);
  }
  if (uahRevenue > 0) {
    parts.push(`${formatLocaleNumber(uahRevenue)} ₴`);
  }
  if (eurRevenue > 0) {
    parts.push(`${formatLocaleNumber(eurRevenue)} €`);
  }
  if (parts.length === 0) {
    return "0 ₴";
  }
  return parts.join(" + ");
};

interface CommentItem {
  id: string;
  text: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
}

const parseComments = (rawComment: string | null): CommentItem[] => {
  if (!rawComment) return [];
  try {
    const parsed = JSON.parse(rawComment);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Treat as single legacy comment
  }
  return [{
    id: "legacy",
    text: rawComment,
    authorEmail: "system",
    authorName: "Попередній коментар",
    createdAt: new Date().toISOString()
  }];
};

const fetchCRMLeads = async (slug: string, params: any) => {
  try {
    const res = await fetch("/api/crm/leads", {
      method: "QUERY",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ slug, filters: params })
    });
    
    if (res.ok) {
      return await res.json();
    }
    
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      console.warn("QUERY method rejected by server, retrying with POST tunnel override...");
      return await fetchWithPostTunnel(slug, params);
    }
    
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
  } catch (err: any) {
    console.warn("QUERY request failed (network/browser boundary), retrying with POST tunnel override:", err);
    return await fetchWithPostTunnel(slug, params);
  }
};

const fetchWithPostTunnel = async (slug: string, params: any) => {
  const res = await fetch("/api/crm/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-HTTP-Method-Override": "QUERY"
    },
    body: JSON.stringify({ slug, filters: params })
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! Status: ${res.status}`);
  }
  
  return await res.json();
};

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
  const rawDateStr =
    lead.metadata?.raw_row?.Дата ||
    lead.metadata?.raw_row?.дата ||
    lead.metadata?.raw_row?.Date ||
    lead.metadata?.raw_row?.date ||
    lead.metadata?.created_at ||
    lead.metadata?.lead?.created_at;

  if (rawDateStr) {
    const str = String(rawDateStr).trim();

    // Check dd.mm.yyyy format
    const dotParts = str.split(" ")[0].split(".");
    if (dotParts.length === 3) {
      const day = parseInt(dotParts[0], 10);
      const month = parseInt(dotParts[1], 10) - 1; // 0-indexed month
      const year = parseInt(dotParts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        // Try parsing time if present
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

const statusPriority = (s: string): number => {
  if (s === "Купив курс") return 10;
  if (s === "Вирішив подумати") return 8;
  if (s === "Дзвінок проведено") return 7;
  if (s === "Назначено Дзвінок") return 6;
  if (s === "Купив(-ла) Трипвайер") return 5;
  if (s === "Списались") return 4;
  if (s === "Залишив заявку") return 3;
  if (s === "Зацікавлений лід") return 2;
  if (s === "Новий лід") return 1;
  if (s === "Відмова") return -1;
  return 0;
};

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

// Project landing links registry
const PROJECT_LANDINGS: Record<string, Array<{ label: string; url: string; badgeColor: string; type: "paid" | "free" }>> = {
  bw_main: [
    { label: "Основний", url: "https://bnw-prod.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" }
  ],
  victoria: [
    { label: "Майстер-клас", url: "https://victoria-mc.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "VSL", url: "https://victoria-mc.vercel.app/free-lection/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "rozbir", url: "https://victoria-mc.vercel.app/rozbir", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid" },
    { label: "Броні", url: "https://victoria-mc.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "Практикум", url: "https://victoria-mc.vercel.app/practicum", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  sofia: [
    { label: "Основний", url: "https://sofifinsight.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Інтенсив", url: "https://sofifinsight.vercel.app/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" },
    { label: "Вебінар", url: "https://sofifinsight.vercel.app/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "Броні", url: "https://sofifinsight.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "VSL", url: "https://sofifinsight.vercel.app/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://sofifinsight.vercel.app/sofia-invest/lesson", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "Міні-курс", url: "https://sofifinsight.vercel.app/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  valeria: [
    { label: "Основний", url: "https://pix-ai-ua.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free" },
    { label: "Офіс", url: "https://pix-ai-ua.vercel.app/office", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "paid" },
    { label: "Мами", url: "https://pix-ai-ua.vercel.app/moms", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Б'юті", url: "https://pix-ai-ua.vercel.app/beauty", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "paid" },
    { label: "Для тінейджерів", url: "https://pix-ai-ua.vercel.app/teen", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Для батьків", url: "https://pix-ai-ua.vercel.app/parents", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ],
  clean_klinom: [
    { label: "Основний", url: "https://clean-klinom.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free" },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid" },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" }
  ],
  vova_win: [
    { label: "Марафон", url: "https://vova-win.club/marathon", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ]
};

// Disjoint Set Union helper for transitive clustering
class DSU {
  parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }
  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) {
      root = this.parent[root];
    }
    let curr = i;
    while (curr !== root) {
      const nxt = this.parent[curr];
      this.parent[curr] = root;
      curr = nxt;
    }
    return root;
  }
  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) {
      this.parent[rootI] = rootJ;
    }
  }
}

const normalizeUrlForMatching = (url: string) => {
  if (!url) return "";
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .trim()
    .toLowerCase();
};

const getTouchPageUrl = (l: any) => {
  if (!l) return "";
  return (
    l.metadata?.page_url ||
    l.metadata?.pageUrl ||
    l.metadata?.full_url ||
    l.metadata?.fullUrl ||
    l.metadata?.raw_row?.page_url ||
    l.metadata?.raw_row?.pageUrl ||
    l.page_url ||
    ""
  );
};

const getTouchUtm = (l: any, key: 'source' | 'medium' | 'campaign' | 'content' | 'term'): string => {
  if (!l) return "";

  // Try column first
  const colVal = l[`utm_${key}`];
  if (colVal && colVal.trim()) return colVal.trim();

  // Try metadata -> raw_row -> raw_payload -> utms -> key
  const utms =
    l.metadata?.raw_row?.raw_payload?.utms ||
    l.metadata?.raw_payload?.utms ||
    l.metadata?.utms ||
    null;

  if (utms) {
    const val = utms[key] || utms[key === 'campaign' ? 'utm_campaign' : key === 'source' ? 'utm_source' : key === 'medium' ? 'utm_medium' : key === 'content' ? 'utm_content' : key === 'term' ? 'utm_term' : ''];
    if (val && String(val).trim()) return String(val).trim();
  }

  // Try direct metadata values
  const metaVal = l.metadata?.[`utm_${key}`] || l.metadata?.[`utm${key.charAt(0).toUpperCase() + key.slice(1)}`] || l.metadata?.raw_row?.[`utm_${key}`];
  if (metaVal && String(metaVal).trim()) return String(metaVal).trim();

  return "";
};

const isLeadMatchingLanding = (lead: any, landingUrl: string) => {
  if (landingUrl === "all") return true;
  const targetNorm = normalizeUrlForMatching(landingUrl);
  const targetHasPath = targetNorm.includes("/");

  return lead.history?.some((touch: any) => {
    const touchUrl = normalizeUrlForMatching(getTouchPageUrl(touch));

    const originalSheet = (
      touch.metadata?.original_sheet ||
      touch.metadata?.originalSheet ||
      touch.metadata?.raw_row?.original_sheet ||
      touch.metadata?.raw_row?.originalSheet ||
      ""
    ).trim();

    const targetSheet = (
      touch.metadata?.target_sheet ||
      touch.metadata?.targetSheet ||
      touch.metadata?.raw_row?.target_sheet ||
      touch.metadata?.raw_row?.targetSheet ||
      touch.metadata?.raw_row?.raw_payload?.sheet_name ||
      ""
    ).trim();
    const tariff = (touch.metadata?.tariff || touch.metadata?.raw_row?.tariff || "").trim();

    // 1. URL match
    if (touchUrl) {
      let urlMatch = false;
      if (targetHasPath) {
        urlMatch = touchUrl.includes(targetNorm);

        // Alias matching for Svitlana body-taping
        if (!urlMatch && targetNorm.includes("body-taping")) {
          urlMatch = touchUrl.includes("/body-taping");
        }
      } else {
        const firstSlashIdx = touchUrl.indexOf("/");
        if (firstSlashIdx === -1) {
          urlMatch = touchUrl === targetNorm;
        } else {
          const domainPart = touchUrl.substring(0, firstSlashIdx);
          const pathPart = touchUrl.substring(firstSlashIdx + 1).trim();
          urlMatch = domainPart === targetNorm && pathPart === "";
        }
      }
      if (urlMatch) return true;
    }

    // 2. Sheet semantic matching fallback
    if (targetNorm.includes("svitlana3web.vercel.app")) {
      if (originalSheet === "ВЕБ (бот)" || originalSheet === "Заявки ленд Веб" || originalSheet === "новый веб") return true;
    }
    if (targetNorm.includes("facedetox.vercel.app")) {
      if (originalSheet === "новый веб") return true;
    }
    if (targetNorm.includes("tipstarinnyaa.vercel.app")) {
      if (originalSheet === "Квіз") return true;
    }
    if (targetNorm.includes("antibotox.vercel.app")) {
      if (originalSheet === "Заявки ленд веб") return true;
    }
    if (targetNorm.includes("zalomu-sny.vercel.app")) {
      if (originalSheet === "Заломи") return true;
    }
    if (targetNorm.includes("body-taping")) {
      if (originalSheet === "Тейпування тіла" || tariff === "body_taping") return true;
    }

    if (targetNorm.includes("/practicum")) {
      if (originalSheet === "Практикум" || originalSheet === "Practicum_Leads" || targetSheet === "Заявки на практикум") return true;
    }
    if (targetNorm.includes("/free-lection") && !targetNorm.includes("vsl-form")) {
      if (originalSheet === "VSL 1 етап" || originalSheet === "VSL Трафик" || originalSheet === "VLS Урок") return true;
    }
    if (targetNorm.includes("/free-lection/vsl-form")) {
      if (originalSheet === "VSL Форма") return true;
    }
    if (targetNorm.includes("/rozbir")) {
      const touchPath = (touch.page_path || touch.metadata?.page_path || touch.metadata?.raw_row?.page_path || "").trim().toLowerCase();
      if (originalSheet === "Ленд 3" || targetSheet === "Ленд 3" || touchPath.includes("rozbir") || touchUrl.includes("/rozbir")) return true;
    }
    if (targetNorm.includes("/price")) {
      if (originalSheet === "Бронювання" || originalSheet === "Заявки на практикум" || targetSheet === "Заявки на практикум") return true;
    }
    if (targetNorm.includes("/intensive")) {
      if (targetSheet === "Заявки на інтенсив") return true;
    }
    if (targetNorm.includes("/web")) {
      if (originalSheet === "Лиды Вебинар" || originalSheet === "Webinars" || originalSheet === "Заявки ленд Веб" || originalSheet === "ВЕБ (бот)" || originalSheet === "новый веб") return true;
    }
    if (targetNorm.includes("/sofia-invest/lesson")) {
      if (originalSheet === "Заявки на урок" || originalSheet === "Анкети після уроку") return true;
    }
    if (targetNorm.includes("/sofia-invest") && !targetNorm.includes("/lesson")) {
      if (originalSheet === "VSL Трафик" || originalSheet === "VLS Урок") return true;
    }
    if (targetNorm.includes("/office")) {
      if (originalSheet === "Practicum_Leads") return true;
    }

    // 3. Fallback to main page if sheet matches default and target is main page (no path)
    if (!targetHasPath) {
      // For Victoria
      if (targetNorm.includes("victoria-mc.vercel.app")) {
        if (["Ленд 1", "Ленд 2", "Ленд 3", "МК 2.0", "Автовеб", "Webinars", "Ліди МК"].includes(originalSheet)) return true;
      }
      // For Svitlana
      if (targetNorm.includes("svitlanatape.vercel.app") || targetNorm.includes("svetlanatape.vercel.app")) {
        if (["Діагностики", "Квіз", "Відповіді бот (19.05)"].includes(originalSheet)) return true;
      }
      // For Sofia
      if (targetNorm.includes("sofifinsight.vercel.app")) {
        if (!originalSheet && !targetSheet) return true; // default
      }
    }

    return false;
  }) || false;
};

interface LeadsDashboardProps {
  initialData: any;
}

export default function LeadsDashboard({ initialData }: LeadsDashboardProps) {
  const router = useRouter();

  // Local state to hold dashboard data (pre-calculated server side)
  const [dashboardData, setDashboardData] = useState(initialData);

  // Reference to track last fetched parameters to prevent duplicate/redundant client-side fetches
  const lastFetchedParamsRef = React.useRef<string>("");
  const clientCacheRef = React.useRef<Record<string, any>>({});

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
    devLogger.info("CRM Client", "LeadsDashboard component mounted");
  }, []);

  // Track previous project slug to detect project switching
  const prevSlugRef = React.useRef(initialData.activeSlug || "");

  // Sync state when props change (like when switching projects and router.refresh() runs)
  useEffect(() => {
    const currentSlug = initialData.activeSlug || "";
    const isProjectSwitched = currentSlug !== prevSlugRef.current;

    if (!isProjectSwitched) {
      // Current project had a mutation (e.g. status shift, comment add). Clear client cache so we don't display stale data.
      clientCacheRef.current = {};
    }

    // Reset all filter states to default values if project is switched
    if (isProjectSwitched) {
      if (currentSlug === "all") {
        setActiveTab("hub");
      } else if (prevSlugRef.current === "all") {
        setActiveTab(initialData.role === "sales" ? "leads" : "analytics");
      }

      prevSlugRef.current = currentSlug;
      setStartDate("");
      setEndDate("");
      setStatusFilter("all");
      setTouchCountFilter("all");
      setSourceFilter("all");
      setUnpaidIntentOnly(false);
      setCurrentPage(1);
      setSelectedLanding("all");
      setSearchQuery("");
      setKanbanSearchQuery("");
      setKanbanTouchFilter("all");
      setKanbanSourceFilter("all");
      setDateRangePreset("all");
    }

    setDashboardData(initialData);

    // Sync the parameter reference with the new server-provided initialData
    const isKan = activeTab === "kanban";
    lastFetchedParamsRef.current = JSON.stringify({
      activeSlug: currentSlug,
      page: isKan ? 1 : (isProjectSwitched ? 1 : currentPage),
      pageSize: isKan ? 500 : pageSize,
      searchQuery: isKan ? (isProjectSwitched ? "" : debouncedKanbanSearchQuery) : (isProjectSwitched ? "" : debouncedSearchQuery),
      statusFilter: isKan ? "all" : (isProjectSwitched ? "all" : statusFilter),
      touchCountFilter: isKan ? (isProjectSwitched ? "all" : kanbanTouchFilter) : (isProjectSwitched ? "all" : touchCountFilter),
      sourceFilter: isKan ? (isProjectSwitched ? "all" : kanbanSourceFilter) : (isProjectSwitched ? "all" : sourceFilter),
      unpaidIntentOnly: isKan ? false : (isProjectSwitched ? false : unpaidIntentOnly),
      startDate: isProjectSwitched ? "" : startDate,
      endDate: isProjectSwitched ? "" : endDate,
      selectedLanding: isProjectSwitched ? "all" : selectedLanding,
      skipTraffic: activeTab !== "analytics"
    });
  }, [initialData]);

  // Unified data structures
  const viewType = dashboardData.viewType; // 'all' or 'single'
  const role = dashboardData.role;
  const allowedProjects = dashboardData.allowedProjects || [];
  const activeSlug = dashboardData.activeSlug || "";
  const activeProject = dashboardData.activeProject;

  // Scoped project data states
  const summaryData = dashboardData.summaryData || [];
  const campaignsData = dashboardData.campaignsData || [];
  const producersLeaderboard = dashboardData.producersLeaderboard || [];
  const salesManagers = dashboardData.salesManagers || [];
  const [unresolvedOrders, setUnresolvedOrders] = useState<any[]>([]);

  useEffect(() => {
    let list = dashboardData.unresolvedOrders || [];
    if (viewType === "single" && activeProject) {
      list = list.filter((o: any) => o.projectId === activeProject.id);
    }
    setUnresolvedOrders(list);
  }, [dashboardData.unresolvedOrders, viewType, activeProject]);

  // Local component states
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (viewType === "all") return "hub";
    if (role === "sales") return "leads";
    return "analytics";
  });
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDevMode, setIsDevMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("crm_dev_mode");
    if (saved === "true" && (role === "admin" || role === "superman")) {
      setIsDevMode(true);
    } else {
      setIsDevMode(false);
    }
  }, [role]);

  const toggleDevMode = () => {
    if (role !== "admin" && role !== "superman") return;
    const newVal = !isDevMode;
    setIsDevMode(newVal);
    localStorage.setItem("crm_dev_mode", String(newVal));
  };

  useEffect(() => {
    if (hasMounted) {
      devLogger.info("CRM Navigation", `Active tab switched to: ${activeTab}`);
    }
  }, [activeTab, hasMounted]);

  useEffect(() => {
    if (hasMounted) {
      devLogger.info("CRM Project Switch", `Active project switched to: ${activeSlug}`);
    }
  }, [activeSlug, hasMounted]);

  const [showUnresolvedModal, setShowUnresolvedModal] = useState(false);
  const [traceQuery, setTraceQuery] = useState("");
  const [traceResults, setTraceResults] = useState<any[] | null>(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceError, setTraceError] = useState("");
  const [isQaPanelExpanded, setIsQaPanelExpanded] = useState(false);
  const [clientRequestMs, setClientRequestMs] = useState<number | null>(null);

  const handleTraceVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!traceQuery.trim()) return;
    setIsTracing(true);
    setTraceError("");
    setTraceResults(null);
    try {
      const res = await traceVisitorUuidAction(traceQuery, activeProject.id);
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

  const [updatingCurrencyId, setUpdatingCurrencyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [touchCountFilter, setTouchCountFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [unpaidIntentOnly, setUnpaidIntentOnly] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateRangePreset, setDateRangePreset] = useState<"all" | "30d" | "7d" | "1d" | "custom">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLanding, setSelectedLanding] = useState<string>("all");
  const [activeQuizLeadId, setActiveQuizLeadId] = useState<string | null>(null);

  // Kanban separate isolated filter states to prevent bleeding
  const [kanbanSearchQuery, setKanbanSearchQuery] = useState("");
  const [kanbanTouchFilter, setKanbanTouchFilter] = useState("all");
  const [kanbanSourceFilter, setKanbanSourceFilter] = useState("all");
  const [activeKanbanCol, setActiveKanbanCol] = useState("Новий лід");
  const [activeModalTab, setActiveModalTab] = useState("journey");

  const applyPreset = (preset: "all" | "30d" | "7d" | "1d") => {
    setDateRangePreset(preset);
    if (preset === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const end = formatDate(today);

    const start = new Date();
    if (preset === "30d") {
      start.setDate(today.getDate() - 30);
    } else if (preset === "7d") {
      start.setDate(today.getDate() - 7);
    } else if (preset === "1d") {
      start.setDate(today.getDate() - 1);
    }
    setStartDate(formatDate(start));
    setEndDate(end);
  };
  const pageSize = 100;

  // Dynamic theme support definitions
  const isLight = theme === "light";
  const bgClass = "bg-crm-bg text-crm-text";
  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const textTitleClass = "text-crm-text font-extrabold";
  const inputClass = "bg-crm-input-bg border border-crm-border text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const selectClass = "bg-crm-input-bg border border-crm-border text-crm-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";
  const modalBgClass = "bg-crm-card border border-crm-border shadow-2xl text-crm-text";
  const bgMutedClass = "bg-white/[0.02]";
  const bgHoverMutedClass = "hover:bg-white/[0.05]";
  const textHeadingClass = "text-crm-text font-black";
  const textNormalClass = "text-crm-text/80";
  const textMutedLightClass = "text-crm-muted/50";
  const optionClass = "bg-crm-card text-crm-text";

  // Reset page number on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, touchCountFilter, sourceFilter, unpaidIntentOnly, startDate, endDate, activeSlug, selectedLanding]);

  // Reset selected quiz lead and landing filter when project or tab changes
  useEffect(() => {
    setActiveQuizLeadId(null);
    setSelectedLanding("all");
  }, [activeSlug, activeTab]);

  // Debounce search query to prevent excessive server requests
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [debouncedKanbanSearchQuery, setDebouncedKanbanSearchQuery] = useState(kanbanSearchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedKanbanSearchQuery(kanbanSearchQuery);
    }, 400);
    return () => {
      clearTimeout(handler);
    };
  }, [kanbanSearchQuery]);

  // Fetch filtered and paginated CRM data from the server action when filters change
  useEffect(() => {
    let isMounted = true;
    if (viewType !== "single" || !activeSlug) return;

    const isKanban = activeTab === "kanban";
    const skipTraffic = activeTab !== "analytics";
    const currentParamsKey = JSON.stringify({
      activeSlug,
      page: isKanban ? 1 : currentPage,
      pageSize: isKanban ? 500 : pageSize,
      searchQuery: isKanban ? debouncedKanbanSearchQuery : debouncedSearchQuery,
      statusFilter: isKanban ? "all" : statusFilter,
      touchCountFilter: isKanban ? kanbanTouchFilter : touchCountFilter,
      sourceFilter: isKanban ? kanbanSourceFilter : sourceFilter,
      unpaidIntentOnly: isKanban ? false : unpaidIntentOnly,
      startDate: startDate,
      endDate: endDate,
      selectedLanding: selectedLanding,
      skipTraffic
    });

    // Skip redundant fetching if parameters haven't changed
    if (currentParamsKey === lastFetchedParamsRef.current) {
      return;
    }

    lastFetchedParamsRef.current = currentParamsKey;
    
    // Check if we have cached data for these parameters
    const cachedData = clientCacheRef.current[currentParamsKey];
    if (cachedData) {
      // Serve cached data instantly (no full-screen blocker)
      setDashboardData(cachedData);
      setIsLoading(false);
    } else {
      // First load: show blocking loader
      setIsLoading(true);
    }

    const paramsPayload = {
      page: isKanban ? 1 : currentPage,
      pageSize: isKanban ? 500 : pageSize,
      searchQuery: isKanban ? debouncedKanbanSearchQuery : debouncedSearchQuery,
      statusFilter: isKanban ? "all" : statusFilter,
      touchCountFilter: isKanban ? kanbanTouchFilter : touchCountFilter,
      sourceFilter: isKanban ? kanbanSourceFilter : sourceFilter,
      unpaidIntentOnly: isKanban ? false : unpaidIntentOnly,
      startDate: startDate,
      endDate: endDate,
      selectedLanding: selectedLanding,
      skipTraffic
    };

    devLogger.info("CRM Client", `Requesting getUnifiedCRMData for project: ${activeSlug}`, paramsPayload);
    const requestStart = performance.now();

    fetchCRMLeads(activeSlug, paramsPayload).then((res: any) => {
      const requestDuration = performance.now() - requestStart;
      if (isMounted) {
        devLogger.info("CRM Client", "Successfully received CRM data", {
          performance: res.performance,
          leadsCount: res.leads?.length || 0,
          unresolvedCount: res.unresolvedOrders?.length || 0
        });
        setClientRequestMs(Math.round(requestDuration));
        
        // Cache the result in client-side memory
        clientCacheRef.current[currentParamsKey] = res;
        
        setDashboardData(res);
        setIsLoading(false);
      }
    }).catch((err: any) => {
      devLogger.error("CRM Client", `Failed to retrieve CRM data: ${err.message}`, { error: err });
      console.error("Failed to fetch dashboard data:", err);
      if (isMounted) {
        setDashboardData((prev: any) => ({ ...prev, error: err.message || "Невідома помилка" }));
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    activeSlug,
    activeTab,
    currentPage,
    statusFilter,
    touchCountFilter,
    sourceFilter,
    unpaidIntentOnly,
    startDate,
    endDate,
    selectedLanding,
    debouncedSearchQuery,
    debouncedKanbanSearchQuery,
    kanbanTouchFilter,
    kanbanSourceFilter,
    viewType
  ]);

  // Payment Link builder states
  const [payCustName, setPayCustName] = useState("");
  const [payCustPhone, setPayCustPhone] = useState("");
  const [payAmount, setPayAmount] = useState("1000");
  const [payCurrency, setPayCurrency] = useState("UAH");
  const [payProduct, setPayProduct] = useState("Бронювання курсу");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // New lead creation states
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadTelegram, setNewLeadTelegram] = useState("");
  const [newLeadAmount, setNewLeadAmount] = useState("0");
  const [newLeadStatus, setNewLeadStatus] = useState("Новий лід");
  const [newLeadUtmSource, setNewLeadUtmSource] = useState("crm");

  // Interaction feedback states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<any[] | null>(null);
  const [selectedLeadInfo, setSelectedLeadInfo] = useState<any | null>(null);

  // Auto pre-fill client name and phone when selectedLeadInfo changes
  useEffect(() => {
    if (selectedLeadInfo) {
      setPayCustName(selectedLeadInfo.name || "");
      setPayCustPhone(selectedLeadInfo.phone || "");
    }
  }, [selectedLeadInfo]);

  // Comments and manager assignments states
  const [tempManagerComment, setTempManagerComment] = useState("");
  const [tempAssignedManagerId, setTempAssignedManagerId] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  useEffect(() => {
    if (selectedLeadInfo) {
      setTempManagerComment("");
      setTempAssignedManagerId(selectedLeadInfo.assigned_manager_id || "");
    } else {
      setTempManagerComment("");
      setTempAssignedManagerId("");
    }
  }, [selectedLeadInfo]);

  const commentsList = useMemo(() => {
    return parseComments(selectedLeadInfo?.managerComment);
  }, [selectedLeadInfo?.managerComment]);

  // Collapsible UTM Tree States & handlers
  const [expandedUtmNodes, setExpandedUtmNodes] = useState<Record<string, boolean>>({});

  const toggleUtmNode = (path: string) => {
    setExpandedUtmNodes(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Sync active tab based on viewType & role
  useEffect(() => {
    if (viewType === "all") {
      setActiveTab("hub");
    } else {
      if (role === "sales") {
        setActiveTab("leads");
      } else {
        setActiveTab("analytics");
      }
    }
  }, [viewType, role]);

  const handleToggleTheme = toggleTheme;

  // Safe navigation scope switcher
  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    router.push(`/admin?slug=${value}`);
    router.refresh();
  };

  // Server-side precalculated analytics & dashboard variables
  const processedLeads = dashboardData.leads || [];
  const paginatedLeads = processedLeads;
  const kanbanProcessedLeads = dashboardData.leads || [];
  const singleProjectStats = dashboardData.stats;
  const splineTrendData = dashboardData.splineTrendData || [];
  const utmAttributionTree = dashboardData.utmAttributionTree || [];
  const diagnosticsIssues = dashboardData.diagnosticsIssues || { nameless: [], unmatchedUrls: [], currencyErrors: [] };
  const dataHealth = dashboardData.dataHealth || { leadsWithoutUuidCount: 0, ordersWithAmountAndClickStatusCount: 0, unparseableMetadataDatesCount: 0 };
  const performanceInfo = dashboardData.performance;
  const totalCount = dashboardData.totalCount || 0;
  const uniqueSources = dashboardData.uniqueSources || [];
  const rawDisplayedLandings = PROJECT_LANDINGS[activeSlug] || [];
  const displayedLandings = activeTab === "quizzes" && activeSlug === "victoria"
    ? rawDisplayedLandings.filter((l) => l.label === "rozbir" || l.label === "VSL-форма")
    : rawDisplayedLandings;

  // --- Kanban Column logic & state manipulation ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to trigger onDrop
  };

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("text/plain", orderId);
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("text/plain");
    if (!orderId) return;

    // Fast-optimistic status switch in local UI state
    setUpdatingId(orderId);

    try {
      const res = await updateUnifiedLeadStatusAction(orderId, targetColumn);
      if (res.error) throw new Error(res.error);

      // Force trigger state reload on success
      router.refresh();
    } catch (err: any) {
      alert("Помилка переміщення ліда: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Form link creator builder click triggers
  const handleBuildPaymentButton = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingLink(true);
    try {
      const slug = activeProject?.slug || "bnw_main";
      const res = await fetch("/api/admin/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: slug,
          amount: Number(payAmount),
          currency: payCurrency,
          tariffName: payProduct,
          customerName: payCustName,
          customerPhone: payCustPhone,
          uuid: selectedLeadInfo?.visitor_uuid || selectedLeadInfo?.customerId || "",
        }),
      });
      const data = await res.json();
      if (data.url) {
        setGeneratedLink(data.url);
      } else {
        alert("Помилка генерації: " + (data.error || "Невідома помилка"));
      }
    } catch (err) {
      alert("Помилка генерації посилання");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  // Add a new lead server event submit hook
  const handleCreateLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadPhone) {
      alert("Будь ласка, заповніть ім'я та телефон");
      return;
    }

    setIsLoading(true);
    try {
      const res = await createUnifiedLeadAction(activeProject.id, {
        name: newLeadName,
        phone: newLeadPhone,
        email: newLeadEmail || undefined,
        telegram: newLeadTelegram || undefined,
        amount: Number(newLeadAmount) || 0.0,
        status: newLeadStatus,
        utm_source: newLeadUtmSource,
      });

      if (res.error) throw new Error(res.error);

      // Reset Form fields
      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadEmail("");
      setNewLeadTelegram("");
      setNewLeadAmount("0");
      setNewLeadStatus("Новий лід");
      setNewLeadUtmSource("crm");
      setShowAddLead(false);

      router.refresh();
    } catch (err: any) {
      alert("Помилка створення ліда: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // State loading spinner trackers

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveComment = async () => {
    if (!selectedLeadInfo?.customerId) return;
    if (!tempManagerComment.trim()) return;
    setIsSavingComment(true);
    try {
      const res = await updateCustomerCommentAction(selectedLeadInfo.customerId, tempManagerComment);
      if (res.error) throw new Error(res.error);

      setSelectedLeadInfo((prev: any) => prev ? { ...prev, managerComment: res.managerComment } : null);
      setTempManagerComment("");
      router.refresh();
    } catch (err: any) {
      alert("Помилка збереження коментаря: " + err.message);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleAssignManager = async (managerId: string) => {
    if (!selectedLeadInfo?.customerId) return;
    setIsAssigningManager(true);
    const val = managerId === "" ? null : managerId;
    try {
      const res = await assignLeadToManagerAction(selectedLeadInfo.customerId, val);
      if (res.error) throw new Error(res.error);

      const matchedManager = salesManagers.find((m: any) => m.id === val);
      const matchedName = matchedManager ? (matchedManager.full_name || matchedManager.email) : "";

      setSelectedLeadInfo((prev: any) => prev ? {
        ...prev,
        assigned_manager_id: val,
        assigned_manager_name: matchedName
      } : null);

      setTempAssignedManagerId(managerId);
      router.refresh();
    } catch (err: any) {
      alert("Помилка призначення менеджера: " + err.message);
    } finally {
      setIsAssigningManager(false);
    }
  };

  const renderSocialsLink = (username: string, type: "tg" | "ig") => {
    if (!username) return null;
    const clean = username.trim().replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
    if (!clean) return null;

    const href = type === "tg" ? `https://t.me/${clean}` : `https://instagram.com/${clean}`;
    const text = type === "tg" ? `tg: ${clean}` : `ig: ${clean}`;
    const color = type === "tg" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-purple-400 bg-purple-500/10 border-purple-500/20";

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-[9px] font-black uppercase border px-2 py-0.5 rounded transition-all cursor-pointer hover:bg-white/5 shrink-0 ${color}`}
      >
        {text}
        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
      </a>
    );
  };

  // Collapsible UTM Tree Row recursive renderer
  const renderUtmNodeRow = (node: any, depth = 0, parentPath = "") => {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    const isExpanded = !!expandedUtmNodes[currentPath];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <React.Fragment key={currentPath}>
        <tr
          onClick={() => hasChildren && toggleUtmNode(currentPath)}
          className={`transition-all border-b border-white/5 cursor-pointer ${depth === 0 ? "bg-white/[0.01] hover:bg-white/[0.03]" : "hover:bg-white/[0.02]"
            }`}
        >
          <td className="p-4 flex items-center gap-2" style={{ paddingLeft: `${16 + depth * 24}px` }}>
            {hasChildren ? (
              <span className="text-white/40 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            ) : (
              <span className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className={`truncate text-xs ${depth === 0
                ? "font-extrabold text-white uppercase tracking-wider"
                : depth === 1
                  ? `font-bold ${isLight ? "text-indigo-600" : "text-indigo-400"}`
                  : depth === 2
                    ? `font-medium ${isLight ? "text-amber-600" : "text-amber-400/90"}`
                    : "font-normal text-white/60"
              }`}>
              {node.name}
            </span>
          </td>
          <td className={`p-4 text-center font-bold ${isLight ? "text-neutral-600" : "text-neutral-400"}`}>{node.clicks}</td>
          <td className="p-4 text-center font-extrabold text-white">{node.leads}</td>
          <td className={`p-4 text-center font-bold ${isLight ? "text-blue-600" : "text-blue-400"}`}>{node.cr.toFixed(1)}%</td>
          <td className={`p-4 text-center font-black ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>
            {formatDualCurrency(node.usd_revenue, node.uah_revenue)}
          </td>
        </tr>

        {hasChildren && isExpanded && node.children.map((child: any) =>
          renderUtmNodeRow(child, depth + 1, currentPath)
        )}
      </React.Fragment>
    );
  };

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-crm-bg text-crm-text flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <span className="text-xs text-crm-text/50">Завантаження CRM...</span>
        </div>
      </div>
    );
  }

  if (viewType === "none" || allowedProjects.length === 0 || dashboardData?.error) {
    const hasError = !!dashboardData?.error;
    return (
      <div className={`${bgClass} min-h-screen transition-all font-sans w-full max-w-full pb-20 flex flex-col items-center justify-center text-center p-6 ${isLight ? "theme-light" : ""}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg ${hasError
            ? "bg-red-500/10 border border-red-500/20 text-red-500"
            : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
          }`}>
          {hasError ? <AlertCircle className="w-8 h-8 animate-pulse" /> : <Briefcase className="w-8 h-8 animate-pulse" />}
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
          {hasError ? "Помилка завантаження" : "Немає доступних проектів"}
        </h1>
        <p className="text-white/50 text-sm max-w-md leading-relaxed mb-6">
          {hasError
            ? `Не вдалося завантажити дані аналитики: ${dashboardData.error}`
            : `Ваш профіль підтверджено з роллю ${role === "admin" || role === "superman" ? "Супермен" : role === "producer" ? "Продюсер" : role === "rop" ? "Керівник ВП (РОП)" : role === "sales" ? "Відділ продажів" : role}, але в системі немає активних проектів або вони не прив'язані до вашого акаунту. Будь ласка, зверніться до Супермена для налаштування доступів.`}
        </p>
      </div>
    );
  }

  return (
    <div className={`${bgClass} min-h-screen transition-all font-sans w-full max-w-full pb-20 ${isLight ? "theme-light" : ""}`}>
      {/* Visual background style sheet inject */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(120, 120, 120, 0.2);
          border-radius: 9px;
        }
        
        /* Light Theme Overrides */
        .theme-light .bg-\\[\\#0C0C0F\\] {
          background-color: #ffffff !important;
          color: #171717 !important;
        }
        .theme-light .border-white\\/5 {
          border-color: #e5e5e5 !important;
        }
        .theme-light .border-white\\/10 {
          border-color: #d4d4d4 !important;
        }
        .theme-light .text-white {
          color: #171717 !important;
        }
        .theme-light .text-white\\/80 {
          color: #262626 !important;
        }
        .theme-light .text-white\\/70 {
          color: #404040 !important;
        }
        .theme-light .text-white\\/60 {
          color: #525252 !important;
        }
        .theme-light .text-white\\/50 {
          color: #737373 !important;
        }
        .theme-light .text-white\\/45 {
          color: #737373 !important;
        }
        .theme-light .text-white\\/40 {
          color: #737373 !important;
        }
        .theme-light .text-white\\/30 {
          color: #a3a3a3 !important;
        }
        .theme-light .text-white\\/20 {
          color: #e5e5e5 !important;
        }
        .theme-light .bg-white\\/5 {
          background-color: #f5f5f6 !important;
          border-color: #e5e5e5 !important;
        }
        .theme-light .bg-white\\/\\[0\\.02\\] {
          background-color: #f9fafb !important;
        }
        .theme-light .bg-white\\/\\[0\\.01\\] {
          background-color: #f9fafb !important;
        }
        .theme-light .bg-\\[\\#050507\\] {
          background-color: #f3f4f6 !important;
        }
        .theme-light select option {
          background-color: #ffffff !important;
          color: #171717 !important;
        }

        /* Preserve white text on dark/colored elements in light theme */
        .theme-light .bg-neutral-900.text-white,
        .theme-light .bg-neutral-900 .text-white,
        .theme-light .bg-black.text-white,
        .theme-light .bg-black .text-white,
        .theme-light .bg-emerald-500.text-white,
        .theme-light .bg-emerald-500 .text-white,
        .theme-light .bg-emerald-600.text-white,
        .theme-light .bg-emerald-600 .text-white,
        .theme-light .bg-red-500.text-white,
        .theme-light .bg-red-500 .text-white,
        .theme-light .bg-blue-500.text-white,
        .theme-light .bg-blue-500 .text-white,
        .theme-light .bg-purple-500.text-white,
        .theme-light .bg-purple-500 .text-white,
        .theme-light .bg-teal-500.text-white,
        .theme-light .bg-teal-500 .text-white,
        .theme-light .bg-indigo-500.text-white,
        .theme-light .bg-indigo-500 .text-white,
        .theme-light .bg-orange-500.text-white,
        .theme-light .bg-orange-500 .text-white,
        .theme-light .bg-pink-500.text-white,
        .theme-light .bg-pink-500 .text-white,
        .theme-light .bg-sky-500.text-white,
        .theme-light .bg-sky-500 .text-white,
        .theme-light .bg-neutral-800.text-white,
        .theme-light .bg-neutral-800 .text-white,
        .theme-light .bg-emerald-950\\/20 .text-white,
        .theme-light .bg-emerald-950\\/20 .text-white\\/80 {
          color: #ffffff !important;
        }

        .theme-light .bg-neutral-900.text-white\\/90,
        .theme-light .bg-neutral-900 .text-white\\/90,
        .theme-light .bg-black.text-white\\/90,
        .theme-light .bg-black .text-white\\/90,
        .theme-light .bg-emerald-500.text-white\\/90,
        .theme-light .bg-emerald-500 .text-white\\/90,
        .theme-light .bg-emerald-600.text-white\\/90,
        .theme-light .bg-emerald-600 .text-white\\/90 {
          color: rgba(255, 255, 255, 0.9) !important;
        }

        .theme-light .bg-neutral-900.text-white\\/80,
        .theme-light .bg-neutral-900 .text-white\\/80,
        .theme-light .bg-black.text-white\\/80,
        .theme-light .bg-black .text-white\\/80,
        .theme-light .bg-emerald-500.text-white\\/80,
        .theme-light .bg-emerald-500 .text-white\\/80,
        .theme-light .bg-emerald-600.text-white\\/80,
        .theme-light .bg-emerald-600 .text-white\\/80 {
          color: rgba(255, 255, 255, 0.8) !important;
        }
      `}</style>

      {/* Main Container Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b pb-6 ${borderClass}`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded tracking-widest ${role === "admin" || role === "superman"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : role === "producer"
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                : role === "rop"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}>
              {role === "admin" || role === "superman" ? "Супермен" : role === "producer" ? "Продюсер" : role === "rop" ? "Керівник ВП (РОП)" : "Відділ продажів"}
            </span>
            <div className={`flex items-center gap-1.5 text-xs ${textMutedClass}`}>
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Платформа активна</span>
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">
            B&W Analytics CRM
          </h1>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {unresolvedOrders.length > 0 && (
            <button
              onClick={() => setShowUnresolvedModal(true)}
              className="px-4 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-black transition-all hover:bg-red-500/20 cursor-pointer flex items-center gap-2 animate-pulse"
              title="Є транзакції без валюти"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Помилка: {unresolvedOrders.length}</span>
            </button>
          )}

          {/* Developer Mode Toggle */}
          {(role === "admin" || role === "superman") && (
            <button
              onClick={toggleDevMode}
              className={`px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-black ${isDevMode
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : isLight
                    ? "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/50"
                }`}
              title="Перемкнути режим розробника"
            >
              <AlertCircle className="w-4 h-4 animate-pulse" />
              <span>{isDevMode ? "Dev Active" : "Dev Mode"}</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${isLight ? "border-neutral-200 bg-white hover:bg-neutral-50" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
              }`}
            title="Змінити тему оформлення"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>

      {/* --- SECTION TABS ROW --- */}
      <div className={`flex gap-2 p-1.5 rounded-2xl bg-white/[0.01] border ${borderClass} mb-8 overflow-x-auto custom-scrollbar`}>
        {/* Hub Tab - only Superman */}
        {viewType === "all" && (
          <button
            onClick={() => setActiveTab("hub")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "hub"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <Layers className="w-4 h-4" />
            Центр управління
          </button>
        )}

        {/* OP Leaderboard Tab - only Superman */}
        {viewType === "all" && (role === "admin" || role === "superman") && (
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "leaderboard"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <Users className="w-4 h-4" />
            🏆 Лідери ОП
          </button>
        )}

        {/* Project Analytics Tab - Superman & Producer */}
        {viewType === "single" && (role === "admin" || role === "superman" || role === "producer") && (
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "analytics"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <BarChart4 className="w-4 h-4" />
            Сквозна аналітика
          </button>
        )}

        {/* Project Traffic & Costs Tab - Superman, Admin & Producer */}
        {viewType === "single" && (role === "admin" || role === "superman" || role === "producer") && (
          <button
            disabled
            className="px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 opacity-40 cursor-not-allowed text-white/30 border border-white/5 bg-white/[0.01]"
            title="Тимчасово у розробці (ключі оновлюються)"
          >
            <Activity className="w-4 h-4 text-emerald-450/40" />
            🚥 Трафік
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-black tracking-wider uppercase ml-1 animate-pulse">у розробці</span>
          </button>
        )}

        {/* Quizzes Tab - All approved */}
        {viewType === "single" && (
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "quizzes"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-450" />
            📋 Анкети
          </button>
        )}

        {/* Kanban Tab - All approved */}
        {viewType === "single" && (
          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "kanban"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <KanbanSquare className="w-4 h-4" />
            Канбан дошка
          </button>
        )}

        {/* Leads Tab - All approved */}
        {viewType === "single" && (
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "leads"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <Grid className="w-4 h-4" />
            База лідів
          </button>
        )}

        {/* Payment link generator Tab - All approved */}
        {viewType === "single" && (
          <button
            onClick={() => setActiveTab("paylink")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${activeTab === "paylink"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
              }`}
          >
            <LinkIcon className="w-4 h-4" />
            Платіжні кнопки
          </button>
        )}

        {/* Diagnostics Hub Tab - Only if Dev Mode is enabled */}
        {viewType === "single" && isDevMode && (
          <button
            onClick={() => setActiveTab("diagnostics")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 border border-red-500/20 bg-red-500/5 ${activeTab === "diagnostics"
              ? isLight
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-black shadow-lg"
              : "text-red-400 hover:text-red-300"
              }`}
          >
            <AlertCircle className="w-4 h-4 animate-pulse" />
            🐞 Діагностика
          </button>
        )}
      </div>

      {/* Landing Selectors Filter Row Removed */}

      {/* --- TAB VIEWPORTS --- */}
      <div className="relative min-h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 flex items-center justify-center rounded-2xl transition-all animate-in fade-in duration-200">
            <div className={`flex flex-col items-center gap-3 p-6 rounded-2xl shadow-2xl border ${cardClass} ${borderClass}`}>
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-xs text-crm-text/60 font-bold uppercase tracking-widest">Оновлення даних...</span>
            </div>
          </div>
        )}
        {(() => {
        if (activeTab !== "hub" || viewType !== "all") return null;
        const totalSpend = summaryData.reduce((sum: number, p: any) => sum + Number(p.spend || 0), 0);
        const totalUsdRevenue = summaryData.reduce((sum: number, p: any) => sum + Number(p.usd_revenue || 0), 0);
        const totalUahRevenue = summaryData.reduce((sum: number, p: any) => sum + Number(p.uah_revenue || 0), 0);
        const totalEurRevenue = summaryData.reduce((sum: number, p: any) => sum + Number(p.eur_revenue || 0), 0);

        const totalBlendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);
        const blendedProfit = totalBlendedRevenue - totalSpend;
        const blendedRoi = totalSpend > 0 ? (totalBlendedRevenue / totalSpend) * 100 : 0;

        return (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Global quick stats cards */}
              {[
                {
                  title: "Сумарні Витрати ($)",
                  val: `$${totalSpend.toFixed(2)}`,
                  desc: "Всього інвестовано в рекламу",
                  color: "text-red-400"
                },
                {
                  title: "Сумарна Виручка",
                  val: formatDualCurrency(totalUsdRevenue, totalUahRevenue, totalEurRevenue),
                  desc: "Всього отримано оплат",
                  color: "text-emerald-400 font-extrabold"
                },
                {
                  title: "Чистий Прибуток",
                  val: formatDualProfit(totalUsdRevenue, totalSpend, totalUahRevenue, totalEurRevenue),
                  desc: "Маржинальність після реклами",
                  color: "text-purple-400 font-extrabold"
                },
                {
                  title: "Сумарний ROI (%)",
                  val: `${blendedRoi.toFixed(1)}%`,
                  desc: "Змішаний ROI холдингу",
                  color: "text-yellow-400"
                }
              ].map((card) => (
                <div
                  key={card.title}
                  className={`p-6 rounded-2xl relative overflow-hidden shadow-xl ${cardClass}`}
                >
                  <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>{card.title}</p>
                  <p className={`text-2xl font-black mt-3 ${card.color}`}>{card.val}</p>
                  <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>{card.desc}</p>
                </div>
              ))}
            </div>

            {/* Cross-Project consolidated grid */}
            <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
              <div className="flex justify-between items-center">
                <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
                  <FolderOpen className="w-5 h-5 text-emerald-500" />
                  Порівняльна таблиця експертів
                </h2>
              </div>

              <div className={`overflow-x-auto border ${borderClass} rounded-xl`}>
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                      <th className="p-4">Назва Проекту</th>
                      <th className="p-4 text-center">Витрати ($)</th>
                      <th className="p-4 text-center">Кількість Заявок</th>
                      <th className="p-4 text-center">Вартість ліда (CPL)</th>
                      <th className="p-4 text-center">Виручка</th>
                      <th className="p-4 text-center">Прибуток</th>
                      <th className="p-4 text-center">Окупність (ROI)</th>
                      <th className="p-4">Поточні лендінги</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
                    {summaryData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-white/30 italic">Проекти не зареєстровані в CRM</td>
                      </tr>
                    ) : (
                      summaryData.map((proj: any) => {
                        const usdRev = Number(proj.usd_revenue || 0);
                        const uahRev = Number(proj.uah_revenue || 0);
                        const eurRev = Number(proj.eur_revenue || 0);
                        const blendedRev = usdRev + (uahRev / 41.0) + (eurRev * 1.08);
                        const spend = Number(proj.spend || 0);
                        const projRoi = spend > 0 ? (blendedRev / spend) * 100 : 0;

                        return (
                          <tr key={proj.project_id} className={`${tableRowClass} transition-all`}>
                            <td className="p-4 font-black text-sm">
                              {proj.project_name}
                              <span className={`block text-[10px] ${textMutedClass} font-semibold uppercase`}>{proj.project_slug}</span>
                            </td>
                            <td className="p-4 text-center font-bold text-red-400">${spend.toFixed(2)}</td>
                            <td className="p-4 text-center font-extrabold">{proj.leads_count}</td>
                            <td className="p-4 text-center font-bold text-neutral-400">${Number(proj.cpl).toFixed(2)}</td>
                            <td className="p-4 text-center font-bold text-emerald-400">{formatDualCurrency(usdRev, uahRev, eurRev)}</td>
                            <td className="p-4 text-center font-black">
                              {formatDualProfit(usdRev, spend, uahRev, eurRev)}
                            </td>
                            <td className="p-4 text-center font-black">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] ${projRoi >= 150
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : projRoi >= 100
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}>
                                {projRoi.toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                                {PROJECT_LANDINGS[proj.project_slug] ? (
                                  PROJECT_LANDINGS[proj.project_slug].map((land) => (
                                    <a
                                      key={land.url}
                                      href={land.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase border px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 duration-150 cursor-pointer ${land.badgeColor}`}
                                    >
                                      {land.label}
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-white/20 italic">Не вказано</span>
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
            </div>

            {/* Campaign ROI Attribution summary */}
            <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
              <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Маркетинговий аналіз рекламних кампаній холдингу
              </h2>

              <div className={`overflow-x-auto border ${borderClass} rounded-xl`}>
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className={`${tableHeaderClass} uppercase tracking-wider font-black border-b`}>
                      <th className="p-4">Кампанія</th>
                      <th className="p-4 text-center">Покази / Кліки / CTR</th>
                      <th className="p-4 text-center">Витрати / CPM / CPC</th>
                      <th className="p-4 text-center">Заявки / CR / CPL</th>
                      <th className="p-4 text-center">Продажі / CR / Середній чек</th>
                      <th className="p-4 text-center">Виручка / Прибуток</th>
                      <th className="p-4 text-center">ROAS / ROI</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
                    {campaignsData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-white/30 italic">Відсутні дані про рекламні кампанії</td>
                      </tr>
                    ) : (
                      campaignsData.map((c: any, idx: number) => {
                        const usdRev = Number(c.usd_revenue || 0);
                        const uahRev = Number(c.uah_revenue || 0);
                        const eurRev = Number(c.eur_revenue || 0);
                        const revenue = usdRev + (uahRev / 41.0) + (eurRev * 1.08);
                        const spend = Number(c.spend || 0);
                        const clicks = Number(c.clicks || 0);
                        const impressions = Number(c.impressions || 0);
                        const leads = Number(c.leads_count || 0);
                        const sales = Number(c.sales || 0);

                        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                        const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                        const cpc = clicks > 0 ? spend / clicks : 0;
                        const crWebsite = clicks > 0 ? (leads / clicks) * 100 : 0;
                        const cpl = leads > 0 ? spend / leads : 0;
                        const crSale = leads > 0 ? (sales / leads) * 100 : 0;
                        const aov = sales > 0 ? revenue / sales : 0;
                        const roas = spend > 0 ? revenue / spend : 0;
                        const roi = spend > 0 ? (revenue / spend) * 100 : 0;
                        const profit = revenue - spend;

                        return (
                          <tr key={idx} className={`${tableRowClass} transition-all`}>
                            <td className="p-4">
                              <div className="font-extrabold max-w-xs truncate text-xs">{c.campaign_name}</div>
                              <div className="text-[10px] text-crm-muted font-semibold mt-0.5">{c.project_name} | {c.campaign_id}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="font-bold">{impressions.toLocaleString()}</div>
                              <div className="text-[10px] text-crm-muted mt-0.5">{clicks.toLocaleString()} кліків</div>
                              <div className="text-[10px] text-blue-500 font-bold mt-0.5">CTR: {ctr.toFixed(2)}%</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="font-bold text-red-400">${spend.toFixed(2)}</div>
                              <div className="text-[10px] text-crm-muted mt-0.5">CPM: ${cpm.toFixed(2)}</div>
                              <div className="text-[10px] text-crm-muted mt-0.5">CPC: ${cpc.toFixed(2)}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="font-bold">{leads.toLocaleString()}</div>
                              <div className="text-[10px] text-blue-500 font-bold mt-0.5">CR: {crWebsite.toFixed(1)}%</div>
                              <div className="text-[10px] text-crm-muted mt-0.5">CPL: ${cpl.toFixed(2)}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="font-bold">{sales.toLocaleString()}</div>
                              <div className="text-[10px] text-emerald-500 font-bold mt-0.5">CR: {crSale.toFixed(1)}%</div>
                              <div className="text-[10px] text-crm-muted mt-0.5">AOV: ${aov.toFixed(1)}</div>
                            </td>
                            <td className="p-4 text-center font-bold">
                              <div className="text-emerald-500">${revenue.toFixed(2)}</div>
                              <div className={`text-[10px] mt-0.5 ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                {profit >= 0 ? "+" : "-"}${Math.abs(profit).toFixed(2)}
                              </div>
                            </td>
                            <td className="p-4 text-center font-black">
                              <div className="text-indigo-400">ROAS: {roas.toFixed(2)}</div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] mt-1 ${
                                roi >= 150 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                roi >= 100 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                                "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {roi.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 1b. OP LEADERBOARD TAB VIEW */}
      {activeTab === "leaderboard" && viewType === "all" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
            <div>
              <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
                🏆 Таблиця лідерів операційних продюсерів
              </h2>
            </div>

            <div className={`overflow-x-auto border ${borderClass} rounded-xl`}>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                    <th className="p-4">Продюсер</th>
                    <th className="p-4">Закріплені проекти</th>
                    <th className="p-4 text-center">Витрати ($)</th>
                    <th className="p-4 text-center">Кількість лідів</th>
                    <th className="p-4 text-center">CPL ($)</th>
                    <th className="p-4 text-center">Виручка ($)</th>
                    <th className="p-4 text-center">Прибуток ($)</th>
                    <th className="p-4 text-center">ROI (%)</th>
                    <th className="p-4 text-right">Нагорода</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
                  {producersLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-white/30 italic">Продюсери не знайдені в системі</td>
                    </tr>
                  ) : (
                    producersLeaderboard.map((prod: any) => (
                      <tr key={prod.producerId} className={`${tableRowClass} transition-all`}>
                        <td className="p-4 font-black text-sm">
                          {prod.name || prod.email}
                        </td>
                        <td className="p-4 font-semibold">
                          {prod.projectNames}
                        </td>
                        <td className="p-4 text-center font-bold text-red-400">
                          ${Number(prod.spend).toFixed(2)}
                        </td>
                        <td className="p-4 text-center font-extrabold">
                          {prod.leadsCount}
                        </td>
                        <td className="p-4 text-center font-bold text-neutral-400">
                          ${Number(prod.cpl).toFixed(2)}
                        </td>
                        <td className="p-4 text-center font-bold text-emerald-400">
                          {formatDualCurrency(prod.usd_revenue, prod.uah_revenue, prod.eur_revenue)}
                        </td>
                        <td className="p-4 text-center font-black">
                          {formatDualProfit(prod.usd_revenue, prod.spend, prod.uah_revenue, prod.eur_revenue)}
                        </td>
                        <td className="p-4 text-center font-black">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] ${prod.roi >= 150
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : prod.roi >= 100
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                            {Number(prod.roi).toFixed(0)}%
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {prod.isLeaderOfMonth ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-bounce">
                              🏆 ОП Місяця
                            </span>
                          ) : (
                            <span className={`${textMutedClass}`}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT TRAFFIC TAB */}
      {activeTab === "traffic" && viewType === "single" && (
        <div className={`p-8 text-center rounded-2xl border ${cardClass} ${borderClass} animate-in fade-in duration-300`}>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base font-black uppercase text-white tracking-wide mb-2">🚥 Трафік тимчасово недоступний</h3>
          <p className="text-xs text-crm-muted max-w-sm mx-auto leading-relaxed">Розділ знаходиться у розробці (оновлення ключів доступу API). Скоро все запрацює!</p>
        </div>
      )}

      {/* 2. PROJECT DETAILED ANALYTICS TAB */}
      {activeTab === "analytics" && viewType === "single" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Detailed Analytics Premium Date Filter Preset Switcher */}
          <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 rounded-2xl shadow-xl backdrop-blur-md ${isLight ? "bg-white border border-neutral-200" : "bg-[#0C0C0F]/45 border border-white/5"}`}>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Сквозна аналітика проекту</h3>
              <p className="text-[11px] text-white/30 font-semibold">Фільтрація та аналіз рекламного бюджету, конверсій та окупності</p>
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
                      className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${isActive
                        ? "bg-white text-black shadow-lg"
                        : "text-white/40 hover:text-white hover:bg-white/5"
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
                  className={`px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-36 ${isLight
                    ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                    : "bg-[#050507] border border-white/5 text-white"
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
                  className={`px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-36 ${isLight
                    ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                    : "bg-[#050507] border border-white/5 text-white"
                    }`}
                  placeholder="До"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => applyPreset("all")}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${isLight
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
                {(!singleProjectStats || (singleProjectStats.uahCourseRevenue === 0 && singleProjectStats.usdCourseRevenue === 0 && singleProjectStats.eurCourseRevenue === 0)) && (
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
                {(!singleProjectStats || (singleProjectStats.uahTripwireRevenue === 0 && singleProjectStats.usdTripwireRevenue === 0 && singleProjectStats.eurTripwireRevenue === 0)) && (
                  <p className={`text-2xl font-black ${textMutedLightClass}`}>0 ₴</p>
                )}
              </div>
              <p className={`text-[11px] ${textMutedClass} mt-2 font-semibold`}>Виручка від міні-продуктів та практикуму</p>
            </div>

            {/* Clean Profit & ROI Card */}
            <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
              <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Чистий Прибуток (Маржа)</p>
              <div className="mt-4 space-y-1">
                {singleProjectStats && (
                  <>
                    {/* Net profit in UAH */}
                    {singleProjectStats.uahRevenue > 0 && (
                      <p className="text-xl font-black text-emerald-455">
                        {formatLocaleNumber(singleProjectStats.uahRevenue)} ₴
                      </p>
                    )}
                    {/* Net profit in EUR */}
                    {singleProjectStats.eurRevenue > 0 && (
                      <p className="text-xl font-black text-emerald-455">
                        {formatLocaleNumber(singleProjectStats.eurRevenue)} €
                      </p>
                    )}
                    {/* Net profit in USD (Revenue USD - Spend) */}
                    {(singleProjectStats.usdRevenue > 0 || singleProjectStats.totalSpend > 0) && (
                      <p className={`text-xl font-black ${singleProjectStats.netProfitUsd >= 0 ? "text-emerald-455" : "text-red-400"}`}>
                        {singleProjectStats.netProfitUsd >= 0 ? "" : "-"}${formatLocaleNumber(Math.abs(singleProjectStats.netProfitUsd))}
                      </p>
                    )}
                    {/* Fallback if everything is 0 */}
                    {singleProjectStats.uahRevenue === 0 && singleProjectStats.eurRevenue === 0 && singleProjectStats.usdRevenue === 0 && singleProjectStats.totalSpend === 0 && (
                      <p className="text-xl font-black text-emerald-455">
                        0 ₴
                      </p>
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
              <p className={`text-3xl font-black ${isLight ? "text-neutral-900" : "text-white"} mt-4`}>{singleProjectStats?.totalClicks}</p>
              <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>Загальна кількість переходів на сайт</p>
            </div>
            <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
              <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Реєстрації (Ліди)</p>
              <p className={`text-3xl font-black ${isLight ? "text-neutral-900" : "text-white"} mt-4`}>{singleProjectStats?.totalLeads}</p>
              <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>Конверсія клік-лід: {singleProjectStats?.conversionRate.toFixed(1)}%</p>
            </div>
            <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
              <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Успішні Оплати (Кількість)</p>
              <p className="text-3xl font-black text-emerald-400 mt-4">{singleProjectStats?.totalSales}</p>
              <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>Кількість зафіксованих продажів</p>
            </div>
            <div className={`${cardClass} p-6 rounded-2xl shadow-2xl backdrop-blur-md`}>
              <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>Конверсія & Середній Чек</p>
              <div className="mt-4 space-y-3">
                {/* UAH Row */}
                {singleProjectStats && (singleProjectStats.aovUah > 0 || singleProjectStats.leadToSaleConvUah > 0) && (
                  <div className={`space-y-0.5 ${(singleProjectStats.aovUsd > 0 || singleProjectStats.leadToSaleConvUsd > 0 || singleProjectStats.aovEur > 0 || singleProjectStats.leadToSaleConvEur > 0) ? `border-b ${borderClass} pb-2` : ""}`}>
                    <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>Гривневі замовлення (UAH)</span>
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

                {/* USD Row */}
                {singleProjectStats && (singleProjectStats.aovUsd > 0 || singleProjectStats.leadToSaleConvUsd > 0) && (
                  <div className={`space-y-0.5 ${(singleProjectStats.aovEur > 0 || singleProjectStats.leadToSaleConvEur > 0) ? `border-b ${borderClass} pb-2` : ""}`}>
                    <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>Доларові замовлення (USD)</span>
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

                {/* EUR Row */}
                {singleProjectStats && (singleProjectStats.aovEur > 0 || singleProjectStats.leadToSaleConvEur > 0) && (
                  <div className="space-y-0.5">
                    <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>Єврові замовлення (EUR)</span>
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

                {/* Fallback when all are 0 */}
                {(!singleProjectStats || (singleProjectStats.aovUah === 0 && singleProjectStats.aovUsd === 0 && singleProjectStats.aovEur === 0)) && (
                  <div className="space-y-0.5">
                    <span className={`text-[9px] ${textMutedClass} font-black uppercase tracking-wider block`}>Гривневі замовлення (UAH)</span>
                    <div className="flex justify-between items-baseline gap-2 mt-1">
                      <p className="text-lg font-black text-emerald-450">0 ₴</p>
                      <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">
                        CR: 0.0%
                      </span>
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
                {/* Chart Legend */}
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
                  {/* SVG Spline drawing */}
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

                    {/* Grids */}
                    <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />
                    <line x1="0" y1="160" x2="700" y2="160" stroke="rgba(255,255,255,0.03)" strokeDasharray="3 3" />

                    {/* Math Points */}
                    {(() => {
                      const allCounts = splineTrendData.flatMap((d: any) => [d.leads, d.clicks]);
                      const max = Math.max(...allCounts, 4);
                      const stepX = 700 / (splineTrendData.length - 1 || 1);

                      // Map points to SVG coordinates
                      const leadPoints = splineTrendData.map((d: any, i: number) => {
                        const x = i * stepX;
                        const y = 180 - (d.leads / max) * 140; // scale between 40-180
                        return { x, y, label: d.leads };
                      });

                      const clickPoints = splineTrendData.map((d: any, i: number) => {
                        const x = i * stepX;
                        const y = 180 - (d.clicks / max) * 140; // scale between 40-180
                        return { x, y, label: d.clicks };
                      });

                      // Formulate smooth cubic bezier line path
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
                          {/* Glow Fills */}
                          <path d={clickFillPath} fill="url(#clickGlow)" />
                          <path d={leadFillPath} fill="url(#splineGlow)" />

                          {/* Spline Lines */}
                          <path d={clickPath} fill="none" stroke="#3B82F6" strokeWidth="2.5" />
                          <path d={leadPath} fill="none" stroke="#10B981" strokeWidth="2.5" />

                          {/* Data points for Clicks */}
                          {clickPoints.map((p: any, idx: number) => (
                            <g key={`c-${idx}`}>
                              <circle cx={p.x} cy={p.y} r="3.5" fill="#0C0C0F" stroke="#3B82F6" strokeWidth="2" />
                              {(splineTrendData.length <= 10 || idx % Math.max(1, Math.floor(splineTrendData.length / 5)) === 0 || idx === splineTrendData.length - 1) && (
                                <text x={p.x} y={p.y - 10} fill="#3B82F6" fontSize="9" fontWeight="bold" textAnchor="middle">
                                  {p.label}
                                </text>
                              )}
                            </g>
                          ))}

                          {/* Data points for Leads */}
                          {leadPoints.map((p: any, idx: number) => (
                            <g key={`l-${idx}`}>
                              <circle cx={p.x} cy={p.y} r="3.5" fill="#0C0C0F" stroke="#10B981" strokeWidth="2" />
                              {(splineTrendData.length <= 10 || idx % Math.max(1, Math.floor(splineTrendData.length / 5)) === 0 || idx === splineTrendData.length - 1) && (
                                <text x={p.x} y={p.y - 10} fill="#10B981" fontSize="9" fontWeight="bold" textAnchor="middle">
                                  {p.label}
                                </text>
                              )}
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>

                  {/* Horizontal Labels */}
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

            {/* Conversion Funnel visual stacked bars */}
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
                      pct: singleProjectStats.totalClicks > 0 ? (singleProjectStats.totalLeads / singleProjectStats.totalClicks) * 100 : 0,
                      color: "bg-blue-500"
                    },
                    {
                      label: "3. Залишили заявку",
                      val: singleProjectStats.totalApplications,
                      pct: singleProjectStats.totalLeads > 0 ? (singleProjectStats.totalApplications / singleProjectStats.totalLeads) * 100 : 0,
                      color: "bg-amber-500"
                    },
                    {
                      label: "4. Продажі (Курс)",
                      val: singleProjectStats.paidLeadsCount || 0,
                      pct: singleProjectStats.totalLeads > 0 ? ((singleProjectStats.paidLeadsCount || 0) / singleProjectStats.totalLeads) * 100 : 0,
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

          {/* Scoped UTM Attribution analysis */}
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
                      <td colSpan={5} className="p-6 text-center text-white/30 italic">Кампанії не визначені</td>
                    </tr>
                  ) : (
                    utmAttributionTree.map((node: any) =>
                      renderUtmNodeRow(node)
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* QA Debug Mode / Superman Data Verification Panel */}
          {(role === "admin" || role === "superman" || isDevMode) && (
            <div className={`${cardClass} rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6 border border-red-500/20`}>
              <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setIsQaPanelExpanded(!isQaPanelExpanded)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 animate-pulse">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-400">Панель верификации данных (QA Debug Mode)</h3>
                    <p className="text-[11px] text-white/45 font-semibold mt-0.5">Полуавтоматический модуль диагностики сквозной аналитики и производительности</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isQaPanelExpanded
                      ? "bg-white/10 text-white"
                      : "bg-red-500/10 text-red-405 hover:bg-red-500/25"
                    }`}
                >
                  {isQaPanelExpanded ? "Свернуть" : "Развернуть"}
                </button>
              </div>

              {isQaPanelExpanded && (
                <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in duration-300">

                  {/* 1. Tracing visitor_uuid (User Verification) */}
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
                                <td colSpan={5} className="p-6 text-center text-white/20 italic">Пользователь не найден или цепочка пуста</td>
                              </tr>
                            ) : (
                              traceResults.map((item: any, idx: number) => {
                                const isClick = item.type === "click";
                                return (
                                  <tr
                                    key={idx}
                                    className={`hover:bg-white/[0.01] transition-all ${item.is_broken ? "bg-red-500/10 hover:bg-red-500/20" : ""
                                      }`}
                                  >
                                    <td className="p-3 font-bold uppercase tracking-wider text-[10px]">
                                      <span className={`px-2 py-0.5 rounded ${isClick
                                          ? "bg-blue-500/10 text-blue-400"
                                          : "bg-emerald-500/10 text-emerald-450"
                                        }`}>
                                        {isClick ? "Клик" : "Заказ"}
                                      </span>
                                    </td>
                                    <td className="p-3 font-semibold text-neutral-400">
                                      {new Date(item.created_at).toLocaleString("uk-UA")}
                                    </td>
                                    <td className="p-3 font-extrabold">
                                      <div className="flex items-center gap-2">
                                        <span>{item.status}</span>
                                        {item.amount > 0 && (
                                          <span className="text-emerald-400">({item.amount} ₴)</span>
                                        )}
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
                                        src: {item.utm_source || "—"} | med: {item.utm_medium || "—"} | camp: {item.utm_campaign || "—"}
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

                  {/* 2. Database Integrity Validator (Data Health Check) */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-500 animate-pulse" />
                      2. Валидатор целостности базы данных (Data Health Check)
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className={`p-4 rounded-xl border ${dataHealth.leadsWithoutUuidCount > 0
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-white/[0.01] border-white/5"
                        }`}>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Лиды без visitor_uuid</span>
                        <p className={`text-2xl font-black mt-2 ${dataHealth.leadsWithoutUuidCount > 0 ? "text-red-400" : "text-emerald-450"}`}>
                          {dataHealth.leadsWithoutUuidCount}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1 font-medium">Количество реальных лидов с потерянным трекером</p>
                      </div>

                      <div className={`p-4 rounded-xl border ${dataHealth.ordersWithAmountAndClickStatusCount > 0
                          ? "bg-red-500/5 border-red-500/20"
                          : "bg-white/[0.01] border-white/5"
                        }`}>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Клики с суммами &gt; 0</span>
                        <p className={`text-2xl font-black mt-2 ${dataHealth.ordersWithAmountAndClickStatusCount > 0 ? "text-red-400" : "text-emerald-450"}`}>
                          {dataHealth.ordersWithAmountAndClickStatusCount}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1 font-medium">Проверка на некорректно классифицированные транзакции</p>
                      </div>

                      <div className={`p-4 rounded-xl border ${dataHealth.unparseableMetadataDatesCount > 0
                          ? "bg-amber-500/5 border-amber-500/20"
                          : "bg-white/[0.01] border-white/5"
                        }`}>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Битые даты в метаданных</span>
                        <p className={`text-2xl font-black mt-2 ${dataHealth.unparseableMetadataDatesCount > 0 ? "text-amber-500" : "text-emerald-450"}`}>
                          {dataHealth.unparseableMetadataDatesCount}
                        </p>
                        <p className="text-[10px] text-white/30 mt-1 font-medium">Лиды с нечитаемыми датами из архивных импортов</p>
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
                          <span className="text-emerald-400 font-extrabold">{clientRequestMs ? `${clientRequestMs} ms` : "—"}</span>
                        </div>
                        {performanceInfo.cacheRebuildMs > 0 && (
                          <div className="flex justify-between border-b border-white/5 pb-2">
                            <span className="text-white/45">Генерация кэша CRM (синхронно):</span>
                            <span className="text-amber-400 font-extrabold">{performanceInfo.cacheRebuildMs} ms</span>
                          </div>
                        )}
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-white/45">БД время (RPC / Выборка):</span>
                          <span className="text-emerald-400 font-extrabold">{performanceInfo.dbRpcMs} ms / {performanceInfo.dbFetchMs} ms</span>
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
      )}

      {/* 3. INTERACTIVE KANBAN BOARD TAB */}
      {activeTab === "kanban" && viewType === "single" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <KanbanSquare className="w-5 h-5 text-emerald-500" />
                Управління статусами клієнтів (Канбан)
              </h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Перетягуйте картки лідів для автоматичного оновлення ихнього етапу в базі</p>
            </div>
            <button
              onClick={() => setShowAddLead(true)}
              className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Додати ліда вручную
            </button>
          </div>

          {/* Kanban local isolated filtering controls */}
          <div className={`${cardClass} p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-4 items-center animate-in fade-in duration-300`}>
            {/* Search */}
            <div className="relative flex-grow w-full sm:w-auto">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/30">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={kanbanSearchQuery}
                onChange={(e) => setKanbanSearchQuery(e.target.value)}
                placeholder="Швидкий пошук на дошці..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#050507] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white"
              />
            </div>

            {/* Touch count select */}
            <div className="relative w-full sm:w-48 shrink-0">
              <select
                value={kanbanTouchFilter}
                onChange={(e) => setKanbanTouchFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
              >
                <option value="all" className={optionClass}>🎯 Торкання: Всі</option>
                <option value="multi" className={optionClass}>⚡ Мульти (2+)</option>
                <option value="single" className={optionClass}>👤 Одиночні (1)</option>
              </select>
              <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? "text-neutral-500" : "text-white/40"}`} />
            </div>

            {/* Source sheet select */}
            <div className="relative w-full sm:w-48 shrink-0">
              <select
                value={kanbanSourceFilter}
                onChange={(e) => setKanbanSourceFilter(e.target.value)}
                className={`w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
              >
                <option value="all" className={optionClass}>📊 Воронка: Всі</option>
                {uniqueSources.map((source: string) => (
                  <option key={source} value={source} className={optionClass}>{source}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? "text-neutral-500" : "text-white/40"}`} />
            </div>
          </div>

          {/* Desktop Kanban Board View */}
          <div className="hidden md:flex gap-4 overflow-x-auto pb-10 min-h-[500px] custom-scrollbar">

            {PIPELINE_COLUMNS.map((col) => {
              // Filter leads that are in this column state
              const colLeads = kanbanProcessedLeads.filter((l: any) => l.status === col.key);

              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`w-72 shrink-0 ${cardClass} rounded-2xl p-4 flex flex-col space-y-4 hover:border-white/10 transition-all`}
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                      <h3 className="text-xs font-black uppercase text-white">{col.label}</h3>
                    </div>
                    <span className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Cards Area */}
                  <div className="flex-grow space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar p-0.5">
                    {colLeads.length === 0 ? (
                      <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[10px] text-white/20 uppercase font-black">
                        Перетягніть сюди
                      </div>
                    ) : (
                      colLeads.map((lead: any) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => {
                            setSelectedLeadHistory(lead.history);
                            setSelectedLeadInfo(lead);
                          }}
                          className={`p-4 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group ${updatingId === lead.id
                            ? "opacity-50 pointer-events-none scale-95 border-emerald-500/50"
                            : lead.usdPaid > 0 || lead.uahPaid > 0
                              ? "border-emerald-500/15"
                              : "border-white/5"
                            }`}
                        >
                          {(lead.usdPaid > 0 || lead.uahPaid > 0) && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500/10 border-l border-b border-emerald-500/20 text-[9px] font-black text-emerald-400">
                              Оплачено
                            </div>
                          )}

                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold text-white truncate group-hover:text-emerald-400 transition-all pr-12">
                              {lead.name}
                            </h4>
                            <p className="text-[10px] text-white/40">{lead.phone}</p>

                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                              {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/40 border border-white/5 shrink-0">
                                {lead.utm_source || "direct"}
                              </span>
                              {lead.assigned_manager_name && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20" title={`Менеджер: ${lead.assigned_manager_name}`}>
                                  👤 {lead.assigned_manager_name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                                </span>
                              )}
                            </div>

                            {(lead.diagnosticsComment || lead.managerComment) && (
                              <div className="mt-2 text-[10px] space-y-1 bg-white/[0.02] border border-white/5 p-2 rounded-lg text-white/60">
                                {lead.diagnosticsComment && (
                                  <div className="truncate" title={lead.diagnosticsComment}>
                                    <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">Запит:</span>
                                    {lead.diagnosticsComment}
                                  </div>
                                )}
                                {lead.managerComment && (
                                  <div className="truncate" title={lead.managerComment}>
                                    <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">Ком:</span>
                                    {lead.managerComment}
                                  </div>
                                )}
                              </div>
                            )}

                            {lead.usdPaid > 0 || lead.uahPaid > 0 ? (
                              <p className="text-xs font-black text-emerald-400 mt-1">{formatDualCurrency(lead.usdPaid, lead.uahPaid)}</p>
                            ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 ? (
                              <p className="text-xs font-bold text-amber-500/80 mt-1 flex items-center gap-1" title="Спроба оплати (Unpaid Intent)">
                                ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

          </div>

          {/* Mobile Kanban Column Switcher */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-3 pt-1 mb-4 custom-scrollbar">
            {PIPELINE_COLUMNS.map((col) => {
              const colLeadsCount = kanbanProcessedLeads.filter((l: any) => l.status === col.key).length;
              const isActive = activeKanbanCol === col.key;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => setActiveKanbanCol(col.key)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border flex items-center gap-2 cursor-pointer ${isActive
                      ? isLight
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                        : "bg-white text-black border-white shadow-lg"
                      : isLight
                        ? "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-900"
                        : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                    }`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span>{col.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${isActive
                      ? isLight ? "bg-black/10 text-black/60" : "bg-black/10 text-black/60"
                      : "bg-white/5 text-white/30"
                    }`}>
                    {colLeadsCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mobile Kanban Cards Column View */}
          <div className="md:hidden">
            {(() => {
              const activeCol = PIPELINE_COLUMNS.find((c) => c.key === activeKanbanCol) || PIPELINE_COLUMNS[0];
              const colLeads = kanbanProcessedLeads.filter((l: any) => l.status === activeCol.key);
              return (
                <div className={`${cardClass} rounded-2xl p-4 flex flex-col space-y-4`}>
                  {/* Column Header */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${activeCol.dotColor}`} />
                      <h3 className="text-xs font-black uppercase text-white">{activeCol.label}</h3>
                    </div>
                    <span className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Cards Area */}
                  <div className="space-y-3">
                    {colLeads.length === 0 ? (
                      <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[10px] text-white/20 uppercase font-black">
                        Колонка порожня
                      </div>
                    ) : (
                      colLeads.map((lead: any) => (
                        <div
                          key={lead.id}
                          onClick={() => {
                            setSelectedLeadHistory(lead.history);
                            setSelectedLeadInfo(lead);
                          }}
                          className={`p-4 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer relative overflow-hidden group ${lead.usdPaid > 0 || lead.uahPaid > 0
                              ? "border-emerald-500/15"
                              : "border-white/5"
                            }`}
                        >
                          {(lead.usdPaid > 0 || lead.uahPaid > 0) && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500/10 border-l border-b border-emerald-500/20 text-[9px] font-black text-emerald-400">
                              Оплачено
                            </div>
                          )}

                          <div className="space-y-2">
                            <h4 className="text-xs font-extrabold text-white group-hover:text-emerald-400 transition-all pr-12">
                              {lead.name}
                            </h4>
                            <p className="text-[10px] text-white/40">{lead.phone}</p>

                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                              {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/40 border border-white/5 shrink-0">
                                {lead.utm_source || "direct"}
                              </span>
                              {lead.assigned_manager_name && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20" title={`Менеджер: ${lead.assigned_manager_name}`}>
                                  👤 {lead.assigned_manager_name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                                </span>
                              )}
                            </div>

                            {(lead.diagnosticsComment || lead.managerComment) && (
                              <div className="mt-2 text-[10px] space-y-1 bg-white/[0.02] border border-white/5 p-2 rounded-lg text-white/60">
                                {lead.diagnosticsComment && (
                                  <div className="truncate" title={lead.diagnosticsComment}>
                                    <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">Запит:</span>
                                    {lead.diagnosticsComment}
                                  </div>
                                )}
                                {lead.managerComment && (
                                  <div className="truncate" title={lead.managerComment}>
                                    <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">Ком:</span>
                                    {lead.managerComment}
                                  </div>
                                )}
                              </div>
                            )}

                            {lead.usdPaid > 0 || lead.uahPaid > 0 ? (
                              <p className="text-xs font-black text-emerald-450 mt-1">{formatDualCurrency(lead.usdPaid, lead.uahPaid)}</p>
                            ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 ? (
                              <p className="text-xs font-bold text-amber-500/80 mt-1 flex items-center gap-1" title="Спроба оплати (Unpaid Intent)">
                                ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. LEADS GRID DATABASE TAB */}
      {activeTab === "leads" && viewType === "single" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-emerald-500" />
                База даних лідів холдингу
              </h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Повний список клієнтів із автоматичним дедуплікуванням (DSU)</p>
            </div>
            <button
              onClick={() => setShowAddLead(true)}
              className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Додати ліда вручную
            </button>
          </div>

          {/* Filtering control panel */}
          <div className="bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Live search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/30">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <option value="all" className={optionClass}>🎯 Фільтр: Всі статуси</option>
                  {PIPELINE_COLUMNS.map((col) => (
                    <option key={col.key} value={col.key} className={optionClass}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? "text-neutral-500" : "text-white/40"}`} />
              </div>

              {/* Touch Count select */}
              <div className="relative">
                <select
                  value={touchCountFilter}
                  onChange={(e) => setTouchCountFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
                >
                  <option value="all" className={optionClass}>🔥 Фільтр: Всі торкання</option>
                  <option value="multi" className={optionClass}>⚡ Мульти-торкання (2+)</option>
                  <option value="single" className={optionClass}>👤 Одиночні ліди (1)</option>
                </select>
                <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? "text-neutral-500" : "text-white/40"}`} />
              </div>

              {/* Source sheet select */}
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
                >
                  <option value="all" className={optionClass}>📊 Фільтр: Всі воронки</option>
                  {uniqueSources.map((source: string) => (
                    <option key={source} value={source} className={optionClass}>{source}</option>
                  ))}
                </select>
                <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? "text-neutral-500" : "text-white/40"}`} />
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
              <div className="flex items-center gap-3">
                {/* Unpaid Intent Checkbox */}
                <button
                  type="button"
                  onClick={() => setUnpaidIntentOnly(!unpaidIntentOnly)}
                  className={`px-4 py-2.5 rounded-full border text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${unpaidIntentOnly
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
                <span className={`text-[10px] font-black uppercase ${isLight ? "text-neutral-500" : "text-white/30"}`}>Період:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (dateRangePreset === "1d") {
                      applyPreset("all");
                    } else {
                      applyPreset("1d");
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${dateRangePreset === "1d"
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
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRangePreset("custom");
                    }}
                    className={`px-3 py-2 rounded-lg text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isLight
                        ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                        : "bg-white/[0.02] border border-white/10 text-white"
                      }`}
                  />
                  <span className={isLight ? "text-neutral-300" : "text-white/20"}>—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRangePreset("custom");
                    }}
                    className={`px-3 py-2 rounded-lg text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isLight
                        ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                        : "bg-white/[0.02] border border-white/10 text-white"
                      }`}
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        applyPreset("all");
                      }}
                      className={`p-2 transition-all rounded-lg ${isLight ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CRM Clustered grid table */}
          <div className={`${cardClass} rounded-2xl overflow-hidden shadow-xl`}>
            {/* Desktop Table View */}
            <div className={`hidden md:block overflow-x-auto border-b ${borderClass}`}>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                    <th className="p-4">Клієнт</th>
                    <th className="p-4">Контакти & Соцмережі</th>
                    <th className="p-4">Кампанія (Source)</th>
                    <th className="p-4 text-center">Торкання (Touch)</th>
                    <th className="p-4 text-center">Сума</th>
                    <th className="p-4 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
                  {processedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/20 italic">Заявки за заданими параметрами відсутні</td>
                    </tr>
                  ) : (
                    paginatedLeads.map((lead: any) => {
                      const col = PIPELINE_COLUMNS.find((c) => c.key === lead.status) || PIPELINE_COLUMNS[0];
                      const isUnpaidIntent = lead.history.some((o: any) => o.status === "⏳ Очікується оплата" || (o.order_id && !o.order_id.startsWith("ELT_ORD_"))) &&
                        !lead.history.some((o: any) => o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер" || o.amount > 0);

                      return (
                        <tr
                          key={lead.id}
                          onClick={(e) => {
                            // Prevent modal opening when clicking action items/buttons inside the row
                            if ((e.target as HTMLElement).closest('a') || (e.target as HTMLElement).closest('button')) {
                              return;
                            }
                            setSelectedLeadHistory(lead.history);
                            setSelectedLeadInfo(lead);
                          }}
                          className={`${tableRowClass} cursor-pointer transition-all hover:bg-emerald-500/[0.02]`}
                        >
                          {/* Client name and ID */}
                          <td className="p-4">
                            <div className="font-extrabold text-sm flex items-center gap-1.5">
                              <span className={isLight ? "text-neutral-900" : "text-white"}>{lead.name}</span>
                              {lead.isMultiSource && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                  Мульти-канал
                                </span>
                              )}
                              {isUnpaidIntent && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                  Кинув кошик
                                </span>
                              )}
                              {isDevMode && (lead.name === "Невідомий" || !lead.name) && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-550 border border-amber-500/20" title="Ім'я контакту відсутнє в базі даних">
                                  Без імені
                                </span>
                              )}
                            </div>
                            <div className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[150px] mt-0.5`} title={lead.visitor_uuid}>
                              Visitor ID: {lead.visitor_uuid}
                            </div>
                          </td>

                          {/* Contacts copy and Social handles */}
                          <td className="p-4 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>{lead.phone || "Невідомий телефон"}</span>
                              {lead.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPhone(lead.phone, lead.id);
                                  }}
                                  className={`p-1 rounded transition-all cursor-pointer ${isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                                    }`}
                                >
                                  {copiedId === lead.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                              {lead.instagram && renderSocialsLink(lead.instagram, "ig")}
                            </div>
                          </td>

                          {/* Attribution link source */}
                          <td className="p-4">
                            <span className={`font-semibold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded ${isLight ? "bg-neutral-100 text-neutral-600 border border-neutral-200" : "bg-white/5 text-white/60 border border-white/5"
                              }`}>
                              {lead.utm_source || "direct"}
                            </span>
                          </td>

                          {/* Touch count tracking */}
                          <td className="p-4 text-center font-extrabold">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLeadHistory(lead.history);
                                setSelectedLeadInfo(lead);
                              }}
                              className={`px-2 py-1 rounded border transition-all font-black text-[11px] cursor-pointer ${isLight ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-emerald-600" : "bg-white/5 hover:bg-white/10 border-white/5 text-emerald-400"
                                }`}
                            >
                              {lead.touchCount} торкань
                            </button>
                          </td>

                          {/* Sum Amount */}
                          <td className="p-4 text-center font-black text-sm">
                            {lead.usdPaid > 0 || lead.uahPaid > 0 || lead.eurPaid > 0 ? (
                              <span className="text-emerald-400 font-black">
                                {formatDualCurrency(lead.usdPaid, lead.uahPaid, lead.eurPaid)}
                              </span>
                            ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 || lead.eurAttempted > 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-500/80 text-[11px] font-extrabold" title="Спроба оплати (Unpaid Intent)">
                                ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted, lead.eurAttempted)}
                              </span>
                            ) : (
                              <span className="text-white/20">—</span>
                            )}
                          </td>

                          {/* Pipeline status pill */}
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold ${lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : lead.status === "Відмова"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : isLight
                                  ? "bg-neutral-150 border-neutral-300 text-neutral-700"
                                  : "bg-neutral-800 border-neutral-700 text-neutral-300"
                              }`}>
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
                  const isUnpaidIntent = lead.history.some((o: any) => o.status === "⏳ Очікується оплата" || (o.order_id && !o.order_id.startsWith("ELT_ORD_"))) &&
                    !lead.history.some((o: any) => o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер" || o.amount > 0);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        setSelectedLeadHistory(lead.history);
                        setSelectedLeadInfo(lead);
                      }}
                      className="p-5 hover:bg-emerald-500/[0.02] active:bg-emerald-500/[0.04] transition-all cursor-pointer space-y-4"
                    >
                      {/* Header: Name, Badges & Amount */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h3 className={`font-extrabold text-sm flex flex-wrap items-center gap-1.5 ${isLight ? "text-neutral-900" : "text-white"}`}>
                            {lead.name}
                            {lead.isMultiSource && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                Мульти-канал
                              </span>
                            )}
                            {isUnpaidIntent && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                                Кинув кошик
                              </span>
                            )}
                          </h3>
                          <div className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[200px]`} title={lead.visitor_uuid}>
                            ID: {lead.visitor_uuid?.substring(0, 8)}...
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {lead.usdPaid > 0 || lead.uahPaid > 0 || lead.eurPaid > 0 ? (
                            <span className="text-emerald-450 font-black text-xs block">
                              {formatDualCurrency(lead.usdPaid, lead.uahPaid, lead.eurPaid)}
                            </span>
                          ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 || lead.eurAttempted > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-500/80 text-[10px] font-extrabold" title="Спроба оплати (Unpaid Intent)">
                              ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted, lead.eurAttempted)}
                            </span>
                          ) : (
                            <span className="text-white/20 text-xs block">—</span>
                          )}
                        </div>
                      </div>

                      {/* Contacts Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>{lead.phone || "Невідомий телефон"}</span>
                          {lead.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPhone(lead.phone, lead.id);
                              }}
                              className={`p-1.5 rounded transition-all cursor-pointer ${isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900" : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"}`}
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

                      {/* Source, Touch & Status Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded ${isLight ? "bg-neutral-100 text-neutral-600 border border-neutral-200" : "bg-white/5 text-white/60 border border-white/5"}`}>
                            {lead.utm_source || "direct"}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadHistory(lead.history);
                              setSelectedLeadInfo(lead);
                            }}
                            className={`px-2 py-0.5 rounded border transition-all font-black text-[9px] cursor-pointer ${isLight ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-emerald-600" : "bg-white/5 hover:bg-white/10 border-white/5 text-emerald-450"}`}
                          >
                            {lead.touchCount} торк.
                          </button>
                        </div>

                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold ${lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер"
                          ? "bg-emerald-500/10 text-emerald-455 border-emerald-500/20"
                          : lead.status === "Відмова"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : isLight
                              ? "bg-neutral-150 border-neutral-300 text-neutral-700"
                              : "bg-neutral-800 border-neutral-700 text-neutral-300"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                          {lead.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination controls */}
            {totalCount > pageSize && (
              <div className={`flex justify-between items-center p-4 border-t ${borderClass}`}>
                <span className={`text-[11px] font-black uppercase ${textMutedClass}`}>
                  Показано {Math.min((currentPage - 1) * pageSize + 1, totalCount)}—{Math.min(currentPage * pageSize, totalCount)} із {totalCount} лідів
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${isLight
                      ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent"
                      : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent"
                      }`}
                  >
                    Назад
                  </button>
                  <button
                    disabled={currentPage * pageSize >= totalCount}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${isLight
                      ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent"
                      : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent"
                      }`}
                  >
                    Вперед
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. PAYMENT BUTTON LINK BUILDER */}
      {activeTab === "paylink" && viewType === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          <div className="lg:col-span-1 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-emerald-500" />
                Генератор платежів (WayForPay)
              </h2>
              <p className="text-white/40 text-xs mt-1 font-semibold">Швидке створення унікальних кнопок та лінків оплати для клієнтів</p>
            </div>

            <form onSubmit={handleBuildPaymentButton} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Ім'я клієнта
                </label>
                <input
                  type="text"
                  value={payCustName}
                  onChange={(e) => setPayCustName(e.target.value)}
                  placeholder="Іван Гончар"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Телефон клієнта
                </label>
                <input
                  type="text"
                  value={payCustPhone}
                  onChange={(e) => setPayCustPhone(e.target.value)}
                  placeholder="+380991234567"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Сума оплати
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="1000"
                    className={`flex-grow px-4 py-3 rounded-xl focus:outline-none text-xs font-extrabold ${inputClass}`}
                    required
                  />
                  <select
                    value={payCurrency}
                    onChange={(e) => setPayCurrency(e.target.value)}
                    className={`px-3 rounded-xl text-xs font-black focus:outline-none ${selectClass}`}
                  >
                    <option value="UAH" className={optionClass}>₴ UAH</option>
                    <option value="USD" className={optionClass}>$ USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Назва послуги / Продукту
                </label>
                <input
                  type="text"
                  value={payProduct}
                  onChange={(e) => setPayProduct(e.target.value)}
                  placeholder="Бронювання консультації"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isGeneratingLink}
                className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all cursor-pointer shadow-lg hover:scale-[1.01] active:scale-95 duration-200 mt-2 text-xs disabled:opacity-55"
              >
                {isGeneratingLink ? "Генерація..." : "Згенерувати посилання"}
              </button>
            </form>
          </div>

          {/* Payment link preview section */}
          <div className="lg:col-span-2 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col justify-center items-center text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/[0.01] rounded-full blur-3xl pointer-events-none" />

            {generatedLink ? (
              <div className="w-full max-w-md space-y-6">
                <div className="p-8 rounded-3xl border border-emerald-500/20 bg-white/[0.01] relative space-y-4">
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                    <CheckCircle className="w-3 h-3" /> Лінк готовий
                  </div>

                  <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Стиль Pay-Button (WayForPay)</p>

                  <div className="py-4 border-t border-b border-white/5 space-y-2">
                    <p className="text-2xl font-black text-white">{payProduct}</p>
                    <p className="text-3xl font-black text-emerald-400">
                      {payAmount} {payCurrency === "UAH" ? "₴" : "$"}
                    </p>
                  </div>

                  {/* Mock pay button */}
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-full bg-[#FCB316] hover:bg-[#ffbe33] text-black font-black transition-all shadow-[0_0_20px_rgba(252,179,22,0.15)] flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    Оплатити через WayForPay
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>

                {/* Plain text link Copy box */}
                <div className="flex gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left items-center">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="flex-grow bg-transparent border-none text-[11px] text-white/60 focus:outline-none select-all truncate font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      alert("Посилання скопійовано!");
                    }}
                    className="p-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/15 hover:border-emerald-500/30 text-emerald-400 cursor-pointer shrink-0 transition-all"
                    title="Скопіювати посилання"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-16">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mx-auto">
                  <LinkIcon className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-black uppercase text-white tracking-widest">Посилання не створено</h3>
                <p className="text-xs text-white/30 max-w-sm">Заповніть форму ліворуч, щоб згенерувати посилання на оплату (WayForPay) для вашого клієнта.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. QUIZZES TABS VIEWPORT */}
      {activeTab === "quizzes" && viewType === "single" && (() => {
        // Filter processed leads that have non-empty quiz answers (diagnosticsComment)
        const leadsWithQuizzes = processedLeads.filter((l: any) => l.diagnosticsComment && l.diagnosticsComment.trim().length > 0);
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
                <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                Заповнені анкети та опитування
              </h2>
              <p className={`${textMutedClass} text-xs mt-1 font-semibold`}>
                Список усіх користувачів, які заповнили анкети чи форми реєстрації на сайтах проекту.
              </p>
            </div>

            {/* Quizzes Date Filter Panel */}
            <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-2xl"} flex flex-wrap items-center justify-between gap-4`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-[10px] font-black uppercase ${isLight ? "text-neutral-500" : "text-white/30"}`}>Фільтр за періодом:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (dateRangePreset === "1d") {
                      applyPreset("all");
                    } else {
                      applyPreset("1d");
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${dateRangePreset === "1d"
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
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDateRangePreset("custom");
                    }}
                    className={`px-3 py-2 rounded-lg text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isLight
                        ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                        : "bg-white/[0.02] border border-white/10 text-white"
                      }`}
                  />
                  <span className={isLight ? "text-neutral-300" : "text-white/20"}>—</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDateRangePreset("custom");
                    }}
                    className={`px-3 py-2 rounded-lg text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isLight
                        ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                        : "bg-white/[0.02] border border-white/10 text-white"
                      }`}
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        applyPreset("all");
                      }}
                      className={`p-2 transition-all rounded-lg ${isLight ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {leadsWithQuizzes.length === 0 ? (
              <div className={`${cardClass} py-16 text-center text-white/20 italic rounded-2xl shadow-xl`}>
                Для цього проекту ще не знайдено жодної заповненої анкети
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Left side: List of leads */}
                <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {leadsWithQuizzes.map((lead: any) => {
                    const isSelected = activeQuizLeadId === lead.id;
                    const dateStr = getLeadDate(lead).toLocaleDateString("uk-UA");
                    
                    const landingLabel = (() => {
                      const landings = PROJECT_LANDINGS[activeSlug] || [];
                      for (const land of landings) {
                        if (isLeadMatchingLanding(lead, land.url)) {
                          return land.label;
                        }
                      }
                      return null;
                    })();

                    return (
                      <div
                        key={lead.id}
                        onClick={() => setActiveQuizLeadId(lead.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${isSelected
                            ? isLight
                              ? "bg-emerald-50 border-emerald-500 shadow-md"
                              : "bg-emerald-950/20 border-emerald-500/20 shadow-lg"
                            : isLight
                              ? "bg-white border-neutral-200 hover:border-neutral-300"
                              : "bg-[#0C0C0F] border-white/5 hover:border-white/10"
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col min-w-0">
                            <h4 className="font-extrabold text-sm truncate max-w-[150px]">{lead.name}</h4>
                            {landingLabel && (
                              <span className="text-[9px] font-black uppercase text-left text-blue-450 mt-0.5">
                                {landingLabel}
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${lead.status === "Купив курс"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-white/5 text-white/40"
                            }`}>
                            {lead.status}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] text-white/50">
                          {lead.telegram && <p>TG: <span className="text-[#81D8D0]">@{lead.telegram}</span></p>}
                          {lead.phone && <p>Тел: {lead.phone}</p>}
                          <p className="text-[10px] text-white/30 text-right mt-1">{dateStr}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right side: Detailed Answers Panel */}
                <div className="lg:col-span-2">
                  {(() => {
                    const selectedLead = leadsWithQuizzes.find((l: any) => l.id === activeQuizLeadId) || leadsWithQuizzes[0];
                    if (!selectedLead) return null;

                    // Parse diagnostics comments into separate Q&A lines
                    const qaLines = selectedLead.diagnosticsComment
                      .split("\n")
                      .map((line: string) => {
                        const parts = line.split(":");
                        const label = parts[0]?.trim() || "";
                        const value = parts.slice(1).join(":")?.trim() || "";
                        return { label, value };
                      })
                      .filter((x: any) => x.label && x.value);

                    return (
                      <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
                        <div className="flex justify-between items-start border-b border-white/5 pb-4">
                          <div>
                            <h3 className="text-md font-black uppercase tracking-tight text-white">{selectedLead.name}</h3>
                            <div className="flex flex-wrap gap-2.5 mt-2 text-xs text-white/60">
                              {selectedLead.phone && <span>📞 {selectedLead.phone}</span>}
                              {selectedLead.telegram && <span className="text-[#81D8D0]">💬 @{selectedLead.telegram}</span>}
                              {selectedLead.email && <span>📧 {selectedLead.email}</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedLeadInfo(selectedLead);
                              setSelectedLeadHistory(selectedLead.history);
                            }}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black rounded-xl transition-all cursor-pointer"
                          >
                            Історія ліда
                          </button>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            Відповіді на запитання анкети:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {qaLines.map((qa: any, idx: number) => (
                              <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                                  {qa.label}
                                </span>
                                <p className="text-xs font-semibold text-white/90 leading-relaxed">
                                  {qa.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Attribution context */}
                        <div className="border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-white/40">
                          <div>
                            <span className="block font-bold uppercase text-[9px] text-white/20">Сторінка реєстрації</span>
                            <span className="text-white/80 font-bold truncate block mt-1">
                              {(() => {
                                const path = selectedLead.page_path || selectedLead.metadata?.page_path || "/";
                                if (path === "/rozbir") return "rozbir";
                                return path;
                              })()}
                            </span>
                          </div>
                          <div>
                            <span className="block font-bold uppercase text-[9px] text-white/20">Джерело трафіку</span>
                            <span className="text-white/80 font-bold block mt-1">
                              {selectedLead.utm_source || "direct"}
                            </span>
                          </div>
                          <div>
                            <span className="block font-bold uppercase text-[9px] text-white/20">Кампанія</span>
                            <span className="text-white/80 font-bold block mt-1 truncate">
                              {selectedLead.utm_campaign || "-"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 7. DEVELOPER DIAGNOSTICS HUB TAB */}
      {activeTab === "diagnostics" && viewType === "single" && isDevMode && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-red-500/[0.02] border border-red-500/10 p-5 rounded-2xl shadow-xl backdrop-blur-md">
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 animate-pulse" />
                🐞 Панель інженерної діагностики
              </h3>
              <p className="text-[11px] text-white/45 font-semibold">
                Автоматичний аналіз розбіжностей у бд, незареєстрованих лендінгів та аномальних UTM-метрик
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/50">
                Загалом лідів у кластері: {totalCount}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`${cardClass} p-5 rounded-2xl relative overflow-hidden shadow-xl border-amber-500/10`}>
              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Контакти без імені</p>
              <p className="text-2xl font-black mt-3 text-amber-500">{diagnosticsIssues.nameless.length}</p>
              <p className="text-[11px] text-white/30 mt-1 font-semibold">Мають телефон/telegram, але ім'я пусте</p>
            </div>
            <div className={`${cardClass} p-5 rounded-2xl relative overflow-hidden shadow-xl border-red-500/10`}>
              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Невідомі URL лендінгів</p>
              <p className="text-2xl font-black mt-3 text-red-400">{diagnosticsIssues.unmatchedUrls.length}</p>
              <p className="text-[11px] text-white/30 mt-1 font-semibold">Немає відповідного URL в PROJECT_LANDINGS</p>
            </div>
            <div className={`${cardClass} p-5 rounded-2xl relative overflow-hidden shadow-xl border-purple-500/10`}>
              <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Аномалії валют</p>
              <p className="text-2xl font-black mt-3 text-purple-400">{diagnosticsIssues.currencyErrors.length}</p>
              <p className="text-[11px] text-white/30 mt-1 font-semibold">Транзакції з незареєстрованою валютою</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Unmatched URLs Panel */}
            <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6 border-red-500/10`}>
              <h3 className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Некартовані URL-шляхи & Лендінги
              </h3>
              <p className="text-xs text-white/40 font-medium">
                Ці URL були зафіксовані в сесіях користувачів, але відсутні в масиві `PROJECT_LANDINGS` для поточного проекту. Додайте їх у код `PROJECT_LANDINGS`, щоб увімкнути точне відображення конверсій.
              </p>

              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                      <th className="p-3">Шлях / URL</th>
                      <th className="p-3 text-center">Переходів</th>
                      <th className="p-3">Джерело / Sheet</th>
                      <th className="p-3">Приклад ліда</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {diagnosticsIssues.unmatchedUrls.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-white/20 italic">Усі URL успішно картовані!</td>
                      </tr>
                    ) : (
                      diagnosticsIssues.unmatchedUrls.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="p-3 font-mono text-[11px] text-white select-all max-w-xs truncate" title={item.rawUrl}>
                            {item.rawUrl}
                          </td>
                          <td className="p-3 text-center font-extrabold text-red-400">{item.count}</td>
                          <td className="p-3 font-semibold text-neutral-400">{item.originalSheet}</td>
                          <td className="p-3 text-white/60 font-medium">{item.sampleLead}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Nameless Leads Panel */}
            <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6 border-amber-500/10`}>
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Контакти з невідомим ім'ям
              </h3>
              <p className="text-xs text-white/40 font-medium">
                Ці ліди залишили свої контактні дані, але їхні імена в базі пусті або записані як "Невідомий". Ви можете використати їхній телефон чи Telegram для пошуку.
              </p>

              <div className="overflow-x-auto border border-white/5 rounded-xl max-h-[350px] custom-scrollbar">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                      <th className="p-3">Телефон</th>
                      <th className="p-3">Telegram</th>
                      <th className="p-3">Email</th>
                      <th className="p-3 text-center">Дія</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-white/80">
                    {diagnosticsIssues.nameless.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-white/20 italic">Контактів без імені не знайдено</td>
                      </tr>
                    ) : (
                      diagnosticsIssues.nameless.map((lead: any) => (
                        <tr key={lead.id} className="hover:bg-white/[0.01]">
                          <td className="p-3 font-bold text-white">{lead.phone || "—"}</td>
                          <td className="p-3 text-[#81D8D0] font-bold">
                            {lead.telegram ? `@${lead.telegram}` : "—"}
                          </td>
                          <td className="p-3 text-neutral-400">{lead.email || "—"}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedLeadHistory(lead.history);
                                setSelectedLeadInfo(lead);
                              }}
                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] cursor-pointer"
                            >
                              Докладно
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* --- FLOATING FLOATING FLOATING FLOATING FLOATING FLOATING FLOATING FLOATING --- */}

      {/* Manual lead insertion modal overlay */}
      {showAddLead && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-[#0C0C0F] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setShowAddLead(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                Додати нову картку ліда
              </h3>
              <p className="text-white/40 text-xs mt-1">Створення картки клієнта вручну для проекту: {activeProject?.name}</p>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  ПІБ Клієнта *
                </label>
                <input
                  type="text"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  placeholder="Олексій Коваленко"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  Телефон *
                </label>
                <input
                  type="text"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                  placeholder="+380951234567"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Telegram (@username)
                  </label>
                  <input
                    type="text"
                    value={newLeadTelegram}
                    onChange={(e) => setNewLeadTelegram(e.target.value)}
                    placeholder="@olexiy"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    placeholder="olexiy@gmail.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Сума оплат
                  </label>
                  <input
                    type="number"
                    value={newLeadAmount}
                    onChange={(e) => setNewLeadAmount(e.target.value)}
                    placeholder="0"
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none text-xs font-semibold ${inputClass}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Початковий статус
                  </label>
                  <select
                    value={newLeadStatus}
                    onChange={(e) => setNewLeadStatus(e.target.value)}
                    className={`w-full pl-3 pr-8 py-3.5 rounded-xl focus:outline-none text-xs font-bold ${selectClass}`}
                  >
                    {PIPELINE_COLUMNS.map((col) => (
                      <option key={col.key} value={col.key} className={optionClass}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all hover:scale-[1.01] active:scale-95 duration-200 mt-4 text-xs disabled:opacity-50"
              >
                {isLoading ? "Збереження..." : "Додати ліда до бази"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Lead journey timeline modal overlay */}
      {selectedLeadHistory && selectedLeadInfo && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl h-[90vh] bg-[#0C0C0F] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => {
                setSelectedLeadHistory(null);
                setSelectedLeadInfo(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="border-b border-white/5 pb-4">
              <span className="inline-block px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
                Карточка Клієнта (DSU)
              </span>
              <h3 className="text-xl font-black uppercase text-white mt-2">{selectedLeadInfo.name}</h3>
              <p className="text-white/45 text-[10px] font-bold uppercase mt-1 tracking-wider">
                Телефон: {selectedLeadInfo.phone || "—"} | Telegram: {selectedLeadInfo.telegram || "—"}
              </p>
            </div>

            {/* Mobile modal sub-tabs header */}
            <div className="md:hidden flex border-b border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setActiveModalTab("journey")}
                className={`flex-1 pb-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeModalTab === "journey"
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-white/45"
                  }`}
              >
                Шлях клієнта
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("details")}
                className={`flex-1 pb-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeModalTab === "details"
                    ? "border-emerald-500 text-white"
                    : "border-transparent text-white/45"
                  }`}
              >
                Дані & Коментарі
              </button>
            </div>

            {/* Redesigned Roadmap Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
              {/* Left Column: Timeline list */}
              <div className={`overflow-y-auto custom-scrollbar space-y-0 pr-2 pt-2 h-full ${activeModalTab === "journey" ? "flex flex-col flex-grow" : "hidden md:flex md:flex-col"}`}>
                <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-3">Хронологія шляху клієнта</h4>
                {selectedLeadHistory.map((touch: any, idx: number) => {
                  const isPaidCourse = touch.status === "Купив курс";
                  const isTripwire = touch.status === "Купив(-ла) Трипвайер";
                  const isCall = touch.status === "Назначено Дзвінок" || touch.status === "Дзвінок проведено";
                  const isThink = touch.status === "Вирішив подумати";
                  const isDecline = touch.status === "Відмова";

                  // Resolve timeline design tokens
                  let ringColor = "border-white/10 text-white/50 bg-white/5";
                  let glowColor = "bg-white/20";
                  let touchIcon = <Globe className="w-3.5 h-3.5" />;

                  if (isPaidCourse) {
                    ringColor = "border-emerald-500/30 text-emerald-450 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse";
                    glowColor = "bg-emerald-500";
                    touchIcon = <DollarSign className="w-3.5 h-3.5" />;
                  } else if (isTripwire) {
                    ringColor = "border-indigo-500/30 text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]";
                    glowColor = "bg-indigo-500";
                    touchIcon = <Sparkles className="w-3.5 h-3.5" />;
                  } else if (isCall) {
                    ringColor = "border-orange-500/30 text-orange-400 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.05)]";
                    glowColor = "bg-orange-550";
                    touchIcon = <Calendar className="w-3.5 h-3.5" />;
                  } else if (isThink) {
                    ringColor = "border-pink-500/30 text-pink-400 bg-pink-550/10";
                    glowColor = "bg-pink-500";
                    touchIcon = <HelpCircle className="w-3.5 h-3.5" />;
                  } else if (isDecline) {
                    ringColor = "border-red-500/30 text-red-400 bg-red-550/10";
                    glowColor = "bg-red-550";
                    touchIcon = <X className="w-3.5 h-3.5" />;
                  }

                  return (
                    <div key={touch.id} className="relative pl-12 pb-8 last:pb-2 group">
                      {/* Visual connecting line */}
                      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-white/10 to-transparent group-last:hidden" />

                      {/* Glorious glowing node */}
                      <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 z-10 ${ringColor}`}>
                        {touchIcon}
                        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0C0C0F] ${glowColor}`} />
                      </div>

                      {/* Milestone card content */}
                      <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3.5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Крок #{idx + 1}</span>
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${isPaidCourse
                              ? "bg-emerald-500/10 text-emerald-455 border-emerald-500/20"
                              : isTripwire
                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                : "bg-white/5 text-white/50 border-white/5"
                              }`}>
                              {touch.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/30 font-bold">
                            {getLeadDate(touch).toLocaleString("uk-UA")}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[11px] border-t border-white/5 pt-3">
                          <div>
                            <span className="text-white/30 font-bold uppercase text-[9px] block">Джерело</span>
                            <span className="text-white font-extrabold uppercase tracking-wide bg-white/5 px-2.5 py-0.5 rounded mt-1.5 inline-block">
                              {touch.utm_source || "direct"}
                            </span>
                          </div>
                          {touch.amount > 0 && (
                            <div>
                              <span className="text-white/30 font-bold uppercase text-[9px] block">Сума</span>
                              <span className="text-emerald-455 font-black text-sm block mt-1">
                                {(() => {
                                  const amt = Number(touch.amount || 0);
                                  const metaCurrency = String(
                                    touch.metadata?.currency ||
                                    touch.metadata?.lead?.currency ||
                                    touch.metadata?.raw_row?.currency ||
                                    touch.metadata?.raw_row?.raw_payload?.currency ||
                                    ""
                                  ).trim().toLowerCase();
                                  const isExplicitEur = ["EUR", "eur", "€", "Eur", "EUR"].includes(String(metaCurrency).trim());
                                  if (isExplicitEur) return `${formatLocaleNumber(amt)} €`;
                                  const isExplicitUah = ["UAH", "uah", "грн", "грн.", "Uah"].includes(String(metaCurrency).trim());
                                  const isExplicitUsd = ["USD", "usd", "Usd", "$"].includes(String(metaCurrency).trim());
                                  const isUah = isExplicitUah || (!isExplicitUsd && !isExplicitEur && amt >= 500);
                                  return isUah ? `${formatLocaleNumber(amt)} ₴` : `$${formatLocaleNumber(amt)}`;
                                })()}
                              </span>
                            </div>
                          )}
                        </div>

                        {(() => {
                          if (!touch.metadata || Object.keys(touch.metadata).length === 0) return null;
                          const meta = touch.metadata;

                          const fullUrl = meta.full_url || meta.fullUrl || meta.page_url || "";
                          const pathVal = meta.path || meta.page_path || "";
                          const targetSheet = meta.target_sheet || meta.targetSheet || "";
                          const tariff = meta.tariffName || meta.tariff_name || meta.tariff || "";
                          const isElt = meta.elt_import === true || meta.elt_import === "true";
                          const origSheet = meta.original_sheet || "";
                          const rowIdx = meta.row || "";

                          const displayUrl = fullUrl ? fullUrl.replace(/^https?:\/\//, "") : "";

                          const shownKeys = new Set([
                            "full_url", "fullUrl", "page_url", "path", "page_path", "target_sheet",
                            "targetSheet", "tariffName", "tariff_name", "tariff", "elt_import",
                            "original_sheet", "row", "device_info", "user_agent", "visitor_id", "visitorId",
                            "visitor_uuid", "phone", "email", "telegram", "name", "customerName", "customerPhone",
                            "customerEmail", "social", "amount", "currency", "failUrl", "successUrl", "utms"
                          ]);

                          const remainingEntries = Object.entries(meta).filter(([k]) => !shownKeys.has(k));

                          return (
                            <div className="space-y-2.5 border-t border-white/5 pt-3">
                              <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">Шлях клієнта & Торкання</span>

                              <div className="flex flex-wrap gap-2">
                                {fullUrl && (
                                  <a
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-[10px] font-extrabold text-blue-450 flex items-center gap-1.5 transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Globe className="w-3 h-3 shrink-0 text-blue-400" />
                                    <span className="truncate max-w-[200px]" title={fullUrl}>
                                      {pathVal ? `Сторінка: ${pathVal}` : displayUrl}
                                    </span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-65 shrink-0" />
                                  </a>
                                )}

                                {!fullUrl && pathVal && (
                                  <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-extrabold text-blue-450 flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 shrink-0 text-blue-400" />
                                    Шлях: {pathVal}
                                  </span>
                                )}

                                {targetSheet && (
                                  <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-extrabold text-purple-400 flex items-center gap-1.5">
                                    <Briefcase className="w-3 h-3 shrink-0" />
                                    Форма: {targetSheet}
                                  </span>
                                )}

                                {tariff && (
                                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-extrabold text-amber-450 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 shrink-0 text-amber-450" />
                                    Тариф: {tariff}
                                  </span>
                                )}

                                {isElt && (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold text-emerald-400 flex items-center gap-1.5" title="Імпортовано з таблиць Google за допомогою ELT">
                                    <FileSpreadsheet className="w-3 h-3 shrink-0" />
                                    {(() => {
                                      const sheetLower = String(origSheet).toLowerCase().trim();
                                      if (sheetLower === "веб (бот)") return "3 Webinars (legacy)";
                                      if (sheetLower === "новый веб") return "Face Detox (legacy)";
                                      if (sheetLower === "діагностики") return "Diagnostics (legacy)";
                                      if (sheetLower === "квіз") return "Quiz (legacy)";
                                      if (sheetLower === "відповіді бот (19.05)") return "Bot Answers (legacy)";
                                      if (sheetLower === "заявки ленд веб" || sheetLower === "заявки ленд веб") return "Antibotox (legacy)";
                                      if (sheetLower === "vsl сайт" || sheetLower === "vsl сайт трафік") return "VSL site (legacy)";
                                      return `Імпорт: ${origSheet || "Sheet"}${rowIdx ? ` (Рядок ${rowIdx})` : ""}`;
                                    })()}
                                  </span>
                                )}
                              </div>

                              {remainingEntries.length > 0 && (
                                <div className="bg-[#08080A] rounded-xl border border-white/5 p-3.5 text-[10px] space-y-1.5 mt-2">
                                  <span className="text-[8px] font-black uppercase text-white/20 tracking-wider block mb-1">Додаткові параметри:</span>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white/50">
                                    {remainingEntries.map(([k, v]) => (
                                      <div key={k} className="flex justify-between items-center bg-white/[0.01] border border-white/5 px-2.5 py-1.5 rounded-lg">
                                        <span className="font-semibold text-white/30 truncate pr-2 uppercase text-[9px]">{k.replace(/_/g, ' ')}</span>
                                        <span className="font-mono font-bold text-white/80 truncate max-w-[150px]" title={String(v)}>
                                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Lead info, Questionnaire, comments editor & manager assignments */}
              <div className={`overflow-y-auto custom-scrollbar pl-2 space-y-6 h-full border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 ${activeModalTab === "details" ? "block" : "hidden md:block"}`}>
                {/* Core parameters */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Основні параметри</span>
                  <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-white/30 uppercase text-[9px] font-bold block">Email</span>
                      <span className="text-white font-extrabold truncate block">{selectedLeadInfo.email || "—"}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-white/30 uppercase text-[9px] font-bold block">Джерело (UTM Source)</span>
                      <span className="text-white font-extrabold block">{selectedLeadInfo.utm_source || "direct"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 uppercase text-[9px] font-bold block">Канал (UTM Medium)</span>
                      <span className="text-white font-extrabold block">{selectedLeadInfo.utm_medium || "—"}</span>
                    </div>
                    <div>
                      <span className="text-white/30 uppercase text-[9px] font-bold block">Кампанія (UTM Campaign)</span>
                      <span className="text-white font-extrabold block">{selectedLeadInfo.utm_campaign || "—"}</span>
                    </div>
                    {selectedLeadInfo.utm_content && (
                      <div className="col-span-2">
                        <span className="text-white/30 uppercase text-[9px] font-bold block">Вміст (UTM Content)</span>
                        <span className="text-white font-extrabold block">{selectedLeadInfo.utm_content}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Aggregated Questionnaire */}
                {selectedLeadInfo.diagnosticsComment && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Заповнена анкета / Запит</span>
                    <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 text-xs text-white/80 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-medium">
                      {selectedLeadInfo.diagnosticsComment}
                    </div>
                  </div>
                )}

                {/* Comments History (Chat-like feed) */}
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                    Історія коментарів ({commentsList.length})
                  </span>

                  {commentsList.length === 0 ? (
                    <p className="text-xs text-white/30 italic py-1">Коментарів ще немає</p>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {commentsList.map((c: CommentItem) => {
                        const formattedDate = new Date(c.createdAt).toLocaleString("uk-UA", {
                          day: "numeric",
                          month: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        });
                        return (
                          <div key={c.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-emerald-450">
                              <span className="truncate max-w-[150px]">
                                {c.authorName || "Менеджер"}
                              </span>
                              <span className="text-white/30 shrink-0">
                                {formattedDate}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/85 leading-relaxed break-words whitespace-pre-wrap font-medium">
                              {c.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New Comment */}
                  <div className="space-y-2 pt-3 border-t border-white/5">
                    <textarea
                      value={tempManagerComment}
                      onChange={(e) => setTempManagerComment(e.target.value)}
                      placeholder="Введіть новий коментар..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white placeholder:text-white/20 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveComment}
                        disabled={isSavingComment || !tempManagerComment.trim()}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 text-black disabled:text-white/45 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isSavingComment ? "Надсилання..." : "Надіслати"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manager assignment selector */}
                {["admin", "superman", "producer", "rop"].includes(role) && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">Призначити менеджера з продажів</span>
                    <div className="relative">
                      <select
                        value={tempAssignedManagerId || ""}
                        onChange={(e) => handleAssignManager(e.target.value)}
                        disabled={isAssigningManager}
                        className="w-full appearance-none pl-3.5 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white cursor-pointer"
                      >
                        <option value="" className="bg-[#0C0C0F] text-white/40">Не призначено</option>
                        {salesManagers.map((mgr: any) => (
                          <option key={mgr.id} value={mgr.id} className="bg-[#0C0C0F] text-white">
                            {mgr.full_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/40" />
                    </div>
                    {isAssigningManager && (
                      <p className="text-[10px] text-emerald-455 animate-pulse font-semibold">Оновлення відповідального...</p>
                    )}
                  </div>
                )}

                {/* 🐞 Developer Diagnostics Collapsible Section (Only if isDevMode) */}
                {isDevMode && (
                  <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-2xl space-y-3 mt-4">
                    <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                      🐞 Developer Diagnostics
                    </h4>
                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="text-white/30 uppercase text-[9px] font-bold block">Customer UUID</span>
                        <span className="font-mono text-white/80 select-all">{selectedLeadInfo.visitor_uuid || "—"}</span>
                      </div>
                      <div>
                        <span className="text-white/30 uppercase text-[9px] font-bold block">Customer ID (Primary Key)</span>
                        <span className="font-mono text-white/80 select-all">{selectedLeadInfo.customerId || "—"}</span>
                      </div>
                      <div>
                        <span className="text-white/30 uppercase text-[9px] font-bold block">DSU History Size</span>
                        <span className="text-white/80 font-bold">{selectedLeadInfo.history?.length || 0} items</span>
                      </div>
                      <div>
                        <span className="text-white/30 uppercase text-[9px] font-bold block">Stitching Criteria Logs</span>
                        <span className="text-white/80 font-medium">
                          {selectedLeadInfo.phone ? `Matched by Phone: ${selectedLeadInfo.phone}. ` : ""}
                          {selectedLeadInfo.telegram ? `Matched by Telegram: ${selectedLeadInfo.telegram}. ` : ""}
                          {selectedLeadInfo.email ? `Matched by Email: ${selectedLeadInfo.email}. ` : ""}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <span className="text-white/30 uppercase text-[9px] font-bold block mb-1">Raw JSON Payload</span>
                        <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-[10px] text-emerald-400 font-mono max-h-48 custom-scrollbar">
                          {JSON.stringify({
                            id: selectedLeadInfo.id,
                            name: selectedLeadInfo.name,
                            phone: selectedLeadInfo.phone,
                            telegram: selectedLeadInfo.telegram,
                            email: selectedLeadInfo.email,
                            status: selectedLeadInfo.status,
                            utm_source: selectedLeadInfo.utm_source,
                            utm_medium: selectedLeadInfo.utm_medium,
                            utm_campaign: selectedLeadInfo.utm_campaign,
                            metadata: selectedLeadInfo.metadata,
                            history: selectedLeadInfo.history
                          }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Unresolved Orders */}
      {showUnresolvedModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`relative w-full max-w-2xl max-h-[80vh] ${modalBgClass} rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-300`}>
            <button
              onClick={() => setShowUnresolvedModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-crm-muted hover:text-crm-text hover:bg-crm-card/50 cursor-pointer transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-crm-text flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
                Транзакції без вказаної валюти
              </h3>
              <p className="text-crm-muted text-xs mt-1">
                Будь ласка, оберіть валюту для кожної транзакції, щоб вони правильно відображалися в аналітиці.
              </p>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {unresolvedOrders.length === 0 ? (
                <p className="text-center text-xs text-crm-muted/60 py-8 italic">Усі транзакції мають вказану валюту!</p>
              ) : (
                unresolvedOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-crm-border bg-white/[0.01] hover:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-crm-text">
                        {order.customerName || "Невідомий клієнт"}
                      </p>
                      <p className="text-[10px] text-crm-muted">
                        Проект: {order.projectName} | Дата: {new Date(order.created_at).toLocaleString("uk-UA")}
                      </p>
                      {order.customerPhone && (
                        <p className="text-[10px] text-crm-muted">
                          Тел: {order.customerPhone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                      <span className="text-sm font-black text-crm-text pr-2">
                        {formatLocaleNumber(order.amount)}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        {[
                          { code: "uah", symbol: "₴ UAH" },
                          { code: "usd", symbol: "$ USD" },
                          { code: "eur", symbol: "€ EUR" },
                        ].map((curr) => (
                          <button
                            key={curr.code}
                            disabled={updatingCurrencyId === order.id}
                            onClick={async () => {
                              setUpdatingCurrencyId(order.id);
                              try {
                                let updateAll = false;
                                if (order.landingName) {
                                  updateAll = window.confirm(
                                    `Бажаєте встановити валюту ${curr.symbol} для всіх замовлень з лендингу "${order.landingName}" з ціною ${formatLocaleNumber(order.amount)}?`
                                  );
                                }
                                const bulkParam = updateAll ? { landingName: order.landingName, amount: order.amount } : undefined;
                                const res = await updateOrderCurrencyAction(order.id, curr.code as any, bulkParam);
                                if (res.error) throw new Error(res.error);

                                if (updateAll) {
                                  setUnresolvedOrders(prev => prev.filter(o => !(o.landingName === order.landingName && o.amount === order.amount)));
                                } else {
                                  setUnresolvedOrders(prev => prev.filter(o => o.id !== order.id));
                                }
                                router.refresh();
                              } catch (err: any) {
                                alert("Помилка оновлення валюти: " + err.message);
                              } finally {
                                setUpdatingCurrencyId(null);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-crm-input-bg hover:bg-emerald-500 hover:text-black disabled:opacity-40 text-[10px] font-extrabold text-crm-text border border-crm-border hover:border-emerald-550 transition-all cursor-pointer"
                          >
                            {curr.symbol}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {isDevMode && <DevLogConsole />}
    </div>
  );
}
