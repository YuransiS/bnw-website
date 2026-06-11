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
  updateOrderCurrencyAction
} from "./actions";
import { useTheme } from "./ThemeProvider";

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
        if (timeStr) {
          const timeParts = timeStr.split(":");
          const hour = parseInt(timeParts[0], 10) || 0;
          const min = parseInt(timeParts[1], 10) || 0;
          const sec = parseInt(timeParts[2], 10) || 0;
          return new Date(Date.UTC(year, month, day, hour, min, sec));
        }
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
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

const isLeadMatchingLanding = (lead: any, landingUrl: string) => {
  if (landingUrl === "all") return true;
  const targetNorm = normalizeUrlForMatching(landingUrl);
  const targetHasPath = targetNorm.includes("/");
  
  return lead.history?.some((touch: any) => {
    const touchUrl = normalizeUrlForMatching(
      touch.page_url || 
      touch.metadata?.page_url || 
      touch.metadata?.pageUrl || 
      touch.metadata?.full_url || 
      touch.metadata?.fullUrl || 
      ""
    );
    
    const originalSheet = (touch.metadata?.original_sheet || touch.metadata?.originalSheet || "").trim();
    const targetSheet = (touch.metadata?.target_sheet || touch.metadata?.targetSheet || "").trim();
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
    if (targetNorm.includes("/practicum")) {
      if (originalSheet === "Практикум" || originalSheet === "Practicum_Leads" || targetSheet === "Заявки на практикум") return true;
    }
    if (targetNorm.includes("/free-lection") && !targetNorm.includes("vsl-form")) {
      if (originalSheet === "VSL 1 етап" || originalSheet === "VSL Трафик" || originalSheet === "VLS Урок") return true;
    }
    if (targetNorm.includes("/free-lection/vsl-form")) {
      if (originalSheet === "VSL Форма") return true;
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

  // Unified data structures
  const viewType = initialData.viewType; // 'all' or 'single'
  const role = initialData.role;
  const allowedProjects = initialData.allowedProjects || [];
  const activeSlug = initialData.activeSlug || "";
  const activeProject = initialData.activeProject;

  // Scoped project data states
  const rawLeads = initialData.leads || [];
  const rawTraffic = initialData.traffic || [];
  const rawCosts = initialData.costs || [];
  const summaryData = initialData.summaryData || [];
  const campaignsData = initialData.campaignsData || [];
  const producersLeaderboard = initialData.producersLeaderboard || [];
  const salesManagers = initialData.salesManagers || [];
  const [unresolvedOrders, setUnresolvedOrders] = useState<any[]>([]);

  useEffect(() => {
    let list = initialData.unresolvedOrders || [];
    if (viewType === "single" && activeProject) {
      list = list.filter((o: any) => o.projectId === activeProject.id);
    }
    setUnresolvedOrders(list);
  }, [initialData.unresolvedOrders, viewType, activeProject]);

  // Local component states
  const [activeTab, setActiveTab] = useState<string>(
    viewType === "all" ? "hub" : "analytics"
  );
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnresolvedModal, setShowUnresolvedModal] = useState(false);
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
  const bgClass = isLight ? "bg-[#F8F9FC] text-neutral-900" : "bg-[#060608] text-white";
  const cardClass = isLight ? "bg-white border border-neutral-200/85 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const textTitleClass = isLight ? "text-neutral-900 font-extrabold" : "text-white font-extrabold";
  const inputClass = isLight ? "bg-white border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" : "bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const selectClass = isLight ? "bg-white border border-neutral-300 text-neutral-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" : "bg-white/[0.02] border border-white/10 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";
  const tableHeaderClass = isLight ? "bg-neutral-100 text-neutral-500 border-neutral-200" : "bg-white/[0.02] text-white/40 border-white/5";
  const tableRowClass = isLight ? "hover:bg-neutral-50 border-neutral-200 text-neutral-800" : "hover:bg-white/[0.01] border-white/5 text-white/80";
  const modalBgClass = isLight ? "bg-white border border-neutral-300 shadow-2xl text-neutral-900" : "bg-[#0C0C0F] border border-white/10 shadow-2xl text-white";
  const bgMutedClass = isLight ? "bg-neutral-50" : "bg-white/[0.02]";
  const bgHoverMutedClass = isLight ? "hover:bg-neutral-100" : "hover:bg-white/[0.05]";
  const textHeadingClass = isLight ? "text-neutral-900 font-black" : "text-white font-black";
  const textNormalClass = isLight ? "text-neutral-800" : "text-white/80";
  const textMutedLightClass = isLight ? "text-neutral-400" : "text-white/20";
  const optionClass = isLight ? "bg-white text-neutral-900" : "bg-[#0C0C0F] text-white";

  // Reset page number on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, touchCountFilter, sourceFilter, unpaidIntentOnly, startDate, endDate, activeSlug, selectedLanding]);

  // Reset selected quiz lead and landing filter when project or tab changes
  useEffect(() => {
    setActiveQuizLeadId(null);
    setSelectedLanding("all");
  }, [activeSlug, activeTab]);

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

  // Sync active tab based on viewType
  useEffect(() => {
    if (viewType === "all") {
      setActiveTab("hub");
    } else {
      setActiveTab("analytics");
    }
  }, [viewType]);

  const handleToggleTheme = toggleTheme;

  // Safe navigation scope switcher
  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    router.push(`/admin?slug=${value}`);
    router.refresh();
  };

  // --- DSU Clustering / Deduplication engine ---
  const clusteredLeads = useMemo(() => {
    if (viewType !== "single" || rawLeads.length === 0) return [];

    const size = rawLeads.length;
    const dsu = new DSU(size);

    const phoneMap = new Map<string, number>();
    const tgMap = new Map<string, number>();
    const emailMap = new Map<string, number>();
    const uuidMap = new Map<string, number>();

    const getDiagnosticsComment = (groupLeads: any[]): string => {
      const answers: string[] = [];
      groupLeads.forEach((lead) => {
        const meta = lead.metadata || {};
        const raw = meta.raw_row || {};
        
        const quizFields = [
          { key: "що турбує", label: "Що турбує" },
          { key: "Чи колола ботокс, або подібне", label: "Ботокс" },
          { key: "Тип старіння", label: "Тип старіння" },
          { key: "Рівень доходу", label: "Дохід" },
          { key: "Дохід", label: "Дохід" },
          { key: "Фінансова ціль", label: "Фінансова ціль" },
          { key: "Ціль", label: "Ціль" },
          { key: "Борги", label: "Борги" },
          { key: "Чи є борги зараз", label: "Борги" },
          { key: "За який термін вийти на 100 000$", label: "Термін 100k$" },
          { key: "Відповідь 1 (скільки витрачаєш на косметику в міс.)", label: "Витрати на косметику" },
          { key: "niche", label: "Ніша" },
          { key: "Коментар", label: "Коментар" }
        ];

        quizFields.forEach((f) => {
          const val = raw[f.key] || meta[f.key];
          if (val && String(val).trim()) {
            answers.push(`${f.label}: ${String(val).trim()}`);
          }
        });

        Object.keys(raw).forEach((k) => {
          if (k.toLowerCase().includes("питання") || k.toLowerCase().includes("відповідь")) {
            const val = raw[k];
            if (val && String(val).trim()) {
              answers.push(`${k}: ${String(val).trim()}`);
            }
          }
        });

        if (meta.quiz_result) {
          if (typeof meta.quiz_result === "object") {
            Object.entries(meta.quiz_result).forEach(([k, v]) => {
              if (v) answers.push(`${k}: ${v}`);
            });
          } else {
            answers.push(`Quiz: ${meta.quiz_result}`);
          }
        }
        if (meta.query) {
          if (typeof meta.query === "object") {
            Object.entries(meta.query).forEach(([k, v]) => {
              if (v) answers.push(`${k}: ${v}`);
            });
          } else {
            answers.push(`Запит: ${meta.query}`);
          }
        }
      });

      return Array.from(new Set(answers)).join(" | ");
    };

    // Step 1: Cluster leads using exact identifiers
    rawLeads.forEach((lead: any, i: number) => {
      const phone = lead.phone?.replace(/\D/g, "") || "";
      const tg = lead.telegram?.toLowerCase().replace("@", "").trim() || "";
      const email = lead.email?.toLowerCase().trim() || "";
      const uuid = lead.visitor_uuid || "";

      if (phone.length >= 7) {
        if (phoneMap.has(phone)) dsu.union(i, phoneMap.get(phone)!);
        else phoneMap.set(phone, i);
      }
      if (tg) {
        if (tgMap.has(tg)) dsu.union(i, tgMap.get(tg)!);
        else tgMap.set(tg, i);
      }
      if (email) {
        if (emailMap.has(email)) dsu.union(i, emailMap.get(email)!);
        else emailMap.set(email, i);
      }
      if (uuid) {
        if (uuidMap.has(uuid)) dsu.union(i, uuidMap.get(uuid)!);
        else uuidMap.set(uuid, i);
      }
    });

    // Step 2: Group records under their primary root index
    const groups = new Map<number, number[]>();
    for (let i = 0; i < size; i++) {
      const root = dsu.find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(i);
    }

    const normalizeStatus = (lead: any): string => {
      const s = lead.status;
      if (!s) return "Новий лід";
      const lower = s.toLowerCase().trim();
      const originalSheet = String(lead.metadata?.original_sheet || lead.metadata?.lead?.original_sheet || "").trim();
      const targetSheet = String(lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || "").trim();
      const courseName = String(lead.metadata?.leadData?.course || lead.metadata?.lead?.leadData?.course || "").trim();

      const leadProj = allowedProjects.find((p: any) => p.id === lead.project_id);
      const leadSlug = leadProj?.slug || "";

      const isTripwire = 
        ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(originalSheet) ||
        ["Практикум", "Practicum_Leads", "Заявки на практикум", "Miні-курс"].includes(targetSheet) ||
        courseName.includes("Mini-Course") || 
        courseName.includes("Practicum") || 
        courseName.includes("Практикум") ||
        courseName.includes("Міні-курс") ||
        leadSlug === "sofia" ||
        leadSlug === "valeria" ||
        leadSlug === "svitlana" ||
        activeProject?.slug === "sofia" ||
        activeProject?.slug === "valeria" ||
        activeProject?.slug === "svitlana";

      const isProjectAlwaysTripwire = 
        ["sofia", "valeria", "svitlana"].includes(leadSlug) || 
        ["sofia", "valeria", "svitlana"].includes(activeProject?.slug || "");

      if (lower === "closed_won" || lower === "approved" || lower === "aprooved" || lower === "оплачено") {
        return (isTripwire || isProjectAlwaysTripwire) ? "Купив(-ла) Трипвайер" : "Купив курс";
      }
      if (lower === "declined" || lower === "expired" || lower === "відмова") {
        return "Відмова";
      }
      if (
        lower === "new" ||
        lower === "pending" ||
        lower === "зареєстровано" ||
        lower.includes("очікується") ||
        lower === "новий лід" ||
        lower === "новий" ||
        lower === "передано у вп" ||
        lower === "очікує оплати"
      ) {
        return "Новий лід";
      }
      if (lower === "діагностика" || lower === "диагностика" || lower === "заявка") {
        return "Залишив заявку";
      }
      if (lower === "в роботі" || lower === "списались") {
        return "Списались";
      }
      if (lower === "зустріч призначена" || lower === "назначено дзвінок" || lower === "діагн. запланована") {
        return "Назначено Дзвінок";
      }
      if (lower === "зустріч проведена" || lower === "дзвінок проведено" || lower === "діагн. проведена") {
        return "Дзвінок проведено";
      }
      if (lower === "вирішив подумати" || lower.includes("подумати")) {
        return "Вирішив подумати";
      }
      if (lower === "купив трипвайєр" || lower === "купив трипвайер" || lower === "купив(-ла) трипвайер") {
        return "Купив(-ла) Трипвайер";
      }
      if (lower === "купив курс" || lower === "купив_курс") {
        return isProjectAlwaysTripwire ? "Купив(-ла) Трипвайер" : "Купив курс";
      }
      if (lower === "зацікавлений лід" || lower === "зацікавлений") {
        return "Зацікавлений лід";
      }
      return "Новий лід";
    };

    // Step 3: Collapse and merge groups
    const allClustered = Array.from(groups.values()).map((indices) => {
      const groupLeads = indices.map((idx) => rawLeads[idx]);

      // Normalize statuses of individual touchpoints in history
      const normalizedGroupLeads = groupLeads.map((item) => {
        return {
          ...item,
          status: normalizeStatus(item)
        };
      });

      // Resolve primary profile details (longest name, valid contacts)
      const primaryLead = normalizedGroupLeads.reduce((best, curr) => {
        const bestScore = (best.name?.length || 0) + (best.phone ? 5 : 0) + (best.telegram ? 5 : 0);
        const currScore = (curr.name?.length || 0) + (curr.phone ? 5 : 0) + (curr.telegram ? 5 : 0);
        return currScore > bestScore ? curr : best;
      }, normalizedGroupLeads[0]);

      // Sum split payments by currency for paid and attempted states
      let usdCoursePaid = 0;
      let uahCoursePaid = 0;
      let eurCoursePaid = 0;
      let usdTripwirePaid = 0;
      let uahTripwirePaid = 0;
      let eurTripwirePaid = 0;
      let usdAttempted = 0;
      let uahAttempted = 0;
      let eurAttempted = 0;

      normalizedGroupLeads.forEach((item) => {
        const amt = Number(item.amount || 0);
        if (amt === 0) return;

        const metaCurrency = String(
          item.metadata?.currency || 
          item.metadata?.lead?.currency || 
          item.metadata?.raw_row?.currency ||
          item.metadata?.raw_row?.raw_payload?.currency ||
          ""
        ).trim().toLowerCase();
        const orderProj = allowedProjects.find((p: any) => p.id === item.project_id);
        const orderSlug = orderProj?.slug || "";
        
        const isEur = ["eur", "€"].includes(metaCurrency);
        const isUsd = !isEur && (["usd", "$"].includes(metaCurrency) || 
                      orderSlug === "sofia" || 
                      orderSlug === "valeria" || 
                      orderSlug === "svitlana" ||
                      activeProject?.slug === "sofia" || 
                      activeProject?.slug === "valeria" ||
                      activeProject?.slug === "svitlana");

        const isProjectAlwaysTripwire = 
          ["sofia", "valeria", "svitlana"].includes(orderSlug) || 
          ["sofia", "valeria", "svitlana"].includes(activeProject?.slug || "");

        if (item.status === "Купив курс" && !isProjectAlwaysTripwire) {
          if (isUsd) usdCoursePaid += amt;
          else if (isEur) eurCoursePaid += amt;
          else uahCoursePaid += amt;
        } else if (item.status === "Купив(-ла) Трипвайер" || (item.status === "Купив курс" && isProjectAlwaysTripwire)) {
          if (isUsd) usdTripwirePaid += amt;
          else if (isEur) eurTripwirePaid += amt;
          else uahTripwirePaid += amt;
        } else {
          if (isUsd) usdAttempted += amt;
          else if (isEur) eurAttempted += amt;
          else uahAttempted += amt;
        }
      });

      const primaryStatus = normalizedGroupLeads.reduce((best, curr) => {
        return statusPriority(curr.status) > statusPriority(best) ? curr.status : best;
      }, "Новий лід");

      // Auto-promote to "Зацікавлений лід" if they filled the form at least 2 times (i.e. length of history >= 2)
      // and their status is currently low (Новий лід)
      let finalStatus = primaryStatus;
      if (normalizedGroupLeads.length >= 2 && statusPriority(finalStatus) <= statusPriority("Зацікавлений лід")) {
        finalStatus = "Зацікавлений лід";
      }

      // Extract unique tags and source indicators
      const isMultiSource = new Set(normalizedGroupLeads.map((l) => l.utm_source).filter(Boolean)).size > 1;

      // Extract the first non-empty UTM parameters from the group history to prevent loss during DSU mapping
      const utm_source = normalizedGroupLeads.find((l) => l.utm_source)?.utm_source || "";
      const utm_medium = normalizedGroupLeads.find((l) => l.utm_medium)?.utm_medium || "";
      const utm_campaign = normalizedGroupLeads.find((l) => l.utm_campaign)?.utm_campaign || "";
      const utm_content = normalizedGroupLeads.find((l) => l.utm_content)?.utm_content || "";
      const utm_term = normalizedGroupLeads.find((l) => l.utm_term)?.utm_term || "";

      return {
        ...primaryLead,
        name: primaryLead.name || "Невідомий",
        phone: primaryLead.phone || "",
        telegram: primaryLead.telegram || "",
        email: primaryLead.email || "",
        status: finalStatus,
        usdPaid: usdCoursePaid,
        uahPaid: uahCoursePaid,
        eurPaid: eurCoursePaid,
        usdTripwirePaid,
        uahTripwirePaid,
        eurTripwirePaid,
        usdAttempted,
        uahAttempted,
        eurAttempted,
        amount: usdCoursePaid,
        uahAmount: uahCoursePaid,
        eurAmount: eurCoursePaid,
        attemptedAmount: usdAttempted,
        uahAttemptedAmount: uahAttempted,
        eurAttemptedAmount: eurAttempted,
        utm_source: utm_source || primaryLead.utm_source || "",
        utm_medium: utm_medium || primaryLead.utm_medium || "",
        utm_campaign: utm_campaign || primaryLead.utm_campaign || "",
        utm_content: utm_content || primaryLead.utm_content || "",
        utm_term: utm_term || primaryLead.utm_term || "",
        history: [...normalizedGroupLeads].sort((a, b) => getLeadDate(a).getTime() - getLeadDate(b).getTime()), // Attach full multi-touch history logs sorted chronologically
        isMultiSource,
        touchCount: normalizedGroupLeads.length,
        diagnosticsComment: getDiagnosticsComment(normalizedGroupLeads),
        managerComment: primaryLead.managerComment || "",
      };
    });

    // Filter out raw empty click sessions (no name/phone/tg/email AND not Paid)
    return allClustered.filter((lead: any) => {
      const nameVal = lead.name?.trim();
      const hasRealName = nameVal && nameVal !== "" && nameVal !== "Невідомий";
      const hasPhone = !!lead.phone?.trim();
      const hasTelegram = !!lead.telegram?.trim();
      const hasEmail = !!lead.email?.trim();
      const hasContacts = hasRealName || hasPhone || hasTelegram || hasEmail;
      const isPaid = lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер";
      return hasContacts || isPaid;
    });
  }, [rawLeads, viewType, allowedProjects]);

  // --- Filtering and Query calculations ---
  const processedLeads = useMemo(() => {
    return clusteredLeads.filter((lead: any) => {
      // 1. Live Search matching
      const matchSearch =
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.telegram?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // 2. Status matching
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;

      // 3. Touch Count Filter
      if (touchCountFilter !== "all") {
        if (touchCountFilter === "multi") {
          if (lead.touchCount < 2) return false;
        } else if (touchCountFilter === "single") {
          if (lead.touchCount !== 1) return false;
        }
      }

      // 4. Source Sheet matching
      if (sourceFilter !== "all") {
        const source = lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || lead.utm_source || "";
        if (source.toLowerCase() !== sourceFilter.toLowerCase()) return false;
      }

      // 5. Unpaid Intent Filter (Checkout attempt with no payment success in cluster)
      if (unpaidIntentOnly) {
        const hasPayment = lead.history.some((o: any) => o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер" || o.amount > 0);
        const hasCheckout = lead.history.some(
          (o: any) => o.status === "⏳ Очікується оплата" || (o.order_id && !o.order_id.startsWith("ELT_ORD_")) || o.metadata?.payment_intent
        );
        if (hasPayment || !hasCheckout) return false;
      }

      // 6. Date Range filter
      if (startDate) {
        const leadDate = getLeadDate(lead);
        if (leadDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const leadDate = getLeadDate(lead);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (leadDate > end) return false;
      }

      // 7. Landing filter matching
      if (!isLeadMatchingLanding(lead, selectedLanding)) return false;

      return true;
    });
  }, [clusteredLeads, searchQuery, statusFilter, touchCountFilter, sourceFilter, unpaidIntentOnly, startDate, endDate, selectedLanding]);

  // Memorized filtered leads strictly isolated for Kanban view to prevent bleeding
  const kanbanProcessedLeads = useMemo(() => {
    return clusteredLeads.filter((lead: any) => {
      // 1. Live Search matching
      const matchSearch =
        lead.name?.toLowerCase().includes(kanbanSearchQuery.toLowerCase()) ||
        lead.phone?.toLowerCase().includes(kanbanSearchQuery.toLowerCase()) ||
        lead.telegram?.toLowerCase().includes(kanbanSearchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(kanbanSearchQuery.toLowerCase());

      if (!matchSearch) return false;

      // 2. Touch Count Filter
      if (kanbanTouchFilter !== "all") {
        if (kanbanTouchFilter === "multi") {
          if (lead.touchCount < 2) return false;
        } else if (kanbanTouchFilter === "single") {
          if (lead.touchCount !== 1) return false;
        }
      }

      // 3. Source Filter
      if (kanbanSourceFilter !== "all") {
        const source = lead.metadata?.target_sheet || lead.metadata?.lead?.target_sheet || lead.utm_source || "";
        if (source.toLowerCase() !== kanbanSourceFilter.toLowerCase()) return false;
      }

      // 4. Landing filter matching
      if (!isLeadMatchingLanding(lead, selectedLanding)) return false;

      return true;
    });
  }, [clusteredLeads, kanbanSearchQuery, kanbanTouchFilter, kanbanSourceFilter, selectedLanding]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedLeads.slice(startIndex, startIndex + pageSize);
  }, [processedLeads, currentPage]);

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    clusteredLeads.forEach((l: any) => {
      const source = l.metadata?.target_sheet || l.metadata?.lead?.target_sheet || l.utm_source || "";
      if (source) sources.add(source);
    });
    return Array.from(sources);
  }, [clusteredLeads]);

  // Real-time Traffic and Costs date range filtering
  const filteredTraffic = useMemo(() => {
    return rawTraffic.filter((t: any) => {
      if (startDate) {
        const tDate = new Date(t.created_at);
        if (tDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const tDate = new Date(t.created_at);
        const end = new Date(endDate);
        if (tDate > end) return false;
      }
      return true;
    });
  }, [rawTraffic, startDate, endDate]);

  const filteredCosts = useMemo(() => {
    return rawCosts.filter((c: any) => {
      if (startDate) {
        const cDate = new Date(c.date);
        if (cDate < new Date(startDate)) return false;
      }
      if (endDate) {
        const cDate = new Date(c.date);
        const end = new Date(endDate);
        if (cDate > end) return false;
      }
      return true;
    });
  }, [rawCosts, startDate, endDate]);

  // --- Financial Scope Calculations ---
  const singleProjectStats = useMemo(() => {
    if (viewType !== "single") return null;

    const totalLeads = processedLeads.length;
    const totalClicks = filteredTraffic.length;
    const totalSpend = filteredCosts.reduce((sum: number, c: any) => sum + Number(c.spend || 0), 0);
    const totalApplications = processedLeads.filter((l: any) => 
      statusPriority(l.status) >= 3 || 
      l.history.some((h: any) => statusPriority(h.status) >= 3)
    ).length;

    const conversionRate = totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0;
    const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

    const usdCourseRevenue = processedLeads.reduce((sum, l) => sum + Number(l.usdPaid || 0), 0);
    const uahCourseRevenue = processedLeads.reduce((sum, l) => sum + Number(l.uahPaid || 0), 0);
    const eurCourseRevenue = processedLeads.reduce((sum, l) => sum + Number(l.eurPaid || 0), 0);
    const usdTripwireRevenue = processedLeads.reduce((sum, l) => sum + Number(l.usdTripwirePaid || 0), 0);
    const uahTripwireRevenue = processedLeads.reduce((sum, l) => sum + Number(l.uahTripwirePaid || 0), 0);
    const eurTripwireRevenue = processedLeads.reduce((sum, l) => sum + Number(l.eurTripwirePaid || 0), 0);

    const totalUsdRevenue = usdCourseRevenue + usdTripwireRevenue;
    const totalUahRevenue = uahCourseRevenue + uahTripwireRevenue;
    const totalEurRevenue = eurCourseRevenue + eurTripwireRevenue;

    const netProfitUsd = totalUsdRevenue - totalSpend;

    // Blended ROI using rate 41.0 and 1.08 exchange rate for EUR to USD
    const blendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);
    const roi = totalSpend > 0 ? (blendedRevenue / totalSpend) * 100 : 0;

    const paidLeads = processedLeads.filter((l) => l.status === "Купив курс");
    const paidTripwires = processedLeads.filter((l) => l.status === "Купив(-ла) Трипвайер");
    const totalSales = paidLeads.length + paidTripwires.length;

    // Split Course & Tripwire sales by currency
    const usdSales = processedLeads.filter(
      (l) => (l.status === "Купив курс" || l.status === "Купив(-ла) Трипвайер") && (Number(l.usdPaid || 0) + Number(l.usdTripwirePaid || 0) > 0)
    );
    const uahSales = processedLeads.filter(
      (l) => (l.status === "Купив курс" || l.status === "Купив(-ла) Трипвайер") && (Number(l.uahPaid || 0) + Number(l.uahTripwirePaid || 0) > 0)
    );
    const eurSales = processedLeads.filter(
      (l) => (l.status === "Купив курс" || l.status === "Купив(-ла) Трипвайер") && (Number(l.eurPaid || 0) + Number(l.eurTripwirePaid || 0) > 0)
    );

    const usdSalesCount = usdSales.length;
    const uahSalesCount = uahSales.length;
    const eurSalesCount = eurSales.length;

    const leadToSaleConv = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0;
    const leadToSaleConvUsd = totalLeads > 0 ? (usdSalesCount / totalLeads) * 100 : 0;
    const leadToSaleConvUah = totalLeads > 0 ? (uahSalesCount / totalLeads) * 100 : 0;
    const leadToSaleConvEur = totalLeads > 0 ? (eurSalesCount / totalLeads) * 100 : 0;

    // Average Order Value (AOV) strictly divided by currency-specific sales count
    // and counting both course + tripwire revenue for that currency
    const aovUsd = usdSalesCount > 0 ? (usdCourseRevenue + usdTripwireRevenue) / usdSalesCount : 0;
    const aovUah = uahSalesCount > 0 ? (uahCourseRevenue + uahTripwireRevenue) / uahSalesCount : 0;
    const aovEur = eurSalesCount > 0 ? (eurCourseRevenue + eurTripwireRevenue) / eurSalesCount : 0;

    return {
      totalLeads,
      totalClicks,
      totalSpend,
      totalApplications,
      conversionRate,
      cpl,
      usdRevenue: totalUsdRevenue,
      uahRevenue: totalUahRevenue,
      eurRevenue: totalEurRevenue,
      usdCourseRevenue,
      uahCourseRevenue,
      eurCourseRevenue,
      usdTripwireRevenue,
      uahTripwireRevenue,
      eurTripwireRevenue,
      netProfitUsd,
      roi,
      totalSales,
      leadToSaleConv,
      leadToSaleConvUsd,
      leadToSaleConvUah,
      leadToSaleConvEur,
      aovUsd,
      aovUah,
      aovEur
    };
  }, [processedLeads, filteredTraffic, filteredCosts, viewType]);

  // Daily registration and traffic click trends mapping for Double Area Chart
  const splineTrendData = useMemo(() => {
    if (viewType !== "single" || (processedLeads.length === 0 && filteredTraffic.length === 0)) return [];

    let start = startDate ? new Date(startDate) : null;
    let end = endDate ? new Date(endDate) : new Date();

    if (!start) {
      const leadDates = processedLeads.map((l: any) => getLeadDate(l).getTime());
      const trafficDates = filteredTraffic.map((t: any) => new Date(t.created_at).getTime());
      const allDates = [...leadDates, ...trafficDates];
      const minTime = allDates.length > 0 ? Math.min(...allDates) : Date.now();
      start = new Date(minTime);
      if (dateRangePreset !== "all") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (start < thirtyDaysAgo) {
          start = thirtyDaysAgo;
        }
      }
    }

    const dayLeads: Record<string, number> = {};
    const dayClicks: Record<string, number> = {};
    const curr = new Date(start);

    while (curr <= end) {
      const str = curr.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
      dayLeads[str] = 0;
      dayClicks[str] = 0;
      curr.setDate(curr.getDate() + 1);
    }

    processedLeads.forEach((l) => {
      const str = getLeadDate(l).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
      if (dayLeads[str] !== undefined) {
        dayLeads[str] += 1;
      }
    });

    filteredTraffic.forEach((t: any) => {
      const str = new Date(t.created_at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
      if (dayClicks[str] !== undefined) {
        dayClicks[str] += 1;
      }
    });

    return Object.keys(dayLeads).map((name) => ({
      name,
      leads: dayLeads[name],
      clicks: dayClicks[name],
    }));
  }, [processedLeads, filteredTraffic, startDate, endDate, viewType]);

  // Collapsible Hierarchical UTM Attribution Tree performance breakdown
  const utmAttributionTree = useMemo(() => {
    if (viewType !== "single" || processedLeads.length === 0) return [];

    const root: Record<string, any> = {};

    // Helper to get or create node
    const getOrCreateNode = (parent: any, name: string) => {
      if (!parent[name]) {
        parent[name] = {
          name,
          clicks: 0,
          leads: 0,
          usd_revenue: 0,
          uah_revenue: 0,
          revenue: 0,
          children: {}
        };
      }
      return parent[name];
    };

    // Aggregate Leads
    processedLeads.forEach((lead) => {
      const source = lead.utm_source || "direct";
      const medium = lead.utm_medium || "";
      const campaign = lead.utm_campaign || "";
      const content = lead.utm_content || "";

      // Path of levels: filter out empty names
      const path = [source, medium, campaign, content].filter(Boolean);
      
      let curr = root;
      path.forEach((part) => {
        const node = getOrCreateNode(curr, part);
        node.leads += 1;
        const usdPaid = Number(lead.usdPaid || 0);
        const uahPaid = Number(lead.uahPaid || 0);
        node.usd_revenue += usdPaid;
        node.uah_revenue += uahPaid;
        node.revenue += usdPaid + (uahPaid / 41.0);
        curr = node.children;
      });
    });

    // Aggregate Clicks/Traffic
    filteredTraffic.forEach((t: any) => {
      const source = t.utm_source || "direct";
      const medium = t.utm_medium || "";
      const campaign = t.utm_campaign || "";
      const content = t.utm_content || "";

      const path = [source, medium, campaign, content].filter(Boolean);
      
      let curr = root;
      let possible = true;
      path.forEach((part) => {
        if (!possible) return;
        if (curr[part]) {
          curr[part].clicks += 1;
          curr = curr[part].children;
        } else {
          possible = false;
        }
      });
    });

    // Helper to convert Record to Sorted Array recursively
    const finalizeNodes = (nodesRecord: Record<string, any>): any[] => {
      return Object.values(nodesRecord)
        .map((node: any) => {
          const cr = node.clicks > 0 ? (node.leads / node.clicks) * 100 : 0;
          return {
            ...node,
            cr,
            children: finalizeNodes(node.children)
          };
        })
        .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
    };

    return finalizeNodes(root);
  }, [processedLeads, filteredTraffic, viewType]);

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
  const [isLoading, setIsLoading] = useState(false);

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
          className={`transition-all border-b border-white/5 cursor-pointer ${
            depth === 0 ? "bg-white/[0.01] hover:bg-white/[0.03]" : "hover:bg-white/[0.02]"
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
            <span className={`truncate text-xs ${
              depth === 0 
                ? "font-extrabold text-white uppercase tracking-wider" 
                : depth === 1
                ? "font-bold text-indigo-400"
                : depth === 2
                ? "font-medium text-amber-400/90"
                : "font-normal text-white/60"
            }`}>
              {node.name}
            </span>
          </td>
          <td className="p-4 text-center font-bold text-neutral-400">{node.clicks}</td>
          <td className="p-4 text-center font-extrabold text-white">{node.leads}</td>
          <td className="p-4 text-center font-bold text-blue-400">{node.cr.toFixed(1)}%</td>
          <td className="p-4 text-center font-black text-emerald-400">
            {formatDualCurrency(node.usd_revenue, node.uah_revenue)}
          </td>
        </tr>

        {hasChildren && isExpanded && node.children.map((child: any) => 
          renderUtmNodeRow(child, depth + 1, currentPath)
        )}
      </React.Fragment>
    );
  };

  if (viewType === "none" || (allowedProjects.length === 0 && role !== "admin" && role !== "superman")) {
    return (
      <div className={`${bgClass} min-h-screen transition-all font-sans w-full max-w-full pb-20 flex flex-col items-center justify-center text-center p-6 ${isLight ? "theme-light" : ""}`}>
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(234,179,8,0.1)]">
          <Briefcase className="w-8 h-8 animate-pulse" />
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
          Немає доступних проектів
        </h1>
        <p className="text-white/50 text-sm max-w-md leading-relaxed mb-6">
          Ваш профіль підтверджено з роллю <span className="text-emerald-400 font-extrabold uppercase">{role === "admin" || role === "superman" ? "Супермен" : role === "producer" ? "Продюсер" : role === "rop" ? "Керівник ВП (РОП)" : role === "sales" ? "Відділ продажів" : role}</span>, але адміністратор ще не прив'язав жодного проекту до вашого акаунту. Будь ласка, зверніться до Супермена для налаштування доступів.
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
      </div>

      {/* Landing Selectors Filter Row */}
      {viewType === "single" && PROJECT_LANDINGS[activeSlug] && PROJECT_LANDINGS[activeSlug].length > 0 && (
        <div className={`${cardClass} p-5 rounded-2xl mb-8 flex flex-col gap-4 animate-in fade-in duration-300`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? "text-neutral-500" : "text-white/40"} mr-2`}>
                Фільтр за лендінгом:
              </span>
              <button
                onClick={() => setSelectedLanding("all")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedLanding === "all"
                    ? isLight
                      ? "bg-neutral-900 text-white shadow-sm"
                      : "bg-white text-black shadow-lg"
                    : isLight
                      ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                Усі сторінки
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
                {selectedLanding === "all" ? "Активні всі воронки" : "Показ статистики за обраним сайтом"}
              </span>
            </div>
          </div>

          {/* Paid products row */}
          {PROJECT_LANDINGS[activeSlug].some(l => l.type === "paid") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg mr-2`}>
                Платні продукти:
              </span>
              {PROJECT_LANDINGS[activeSlug].filter(l => l.type === "paid").map((land, idx) => {
                const isSelected = selectedLanding === land.url;
                return (
                  <div key={idx} className="flex items-center gap-0.5">
                    <button
                      onClick={() => setSelectedLanding(land.url)}
                      className={`px-4 py-2 rounded-l-xl text-xs font-black transition-all cursor-pointer ${
                        isSelected
                          ? isLight
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-500 text-black shadow-lg"
                          : isLight
                            ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {land.label}
                    </button>
                    <a
                      href={land.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-2.5 py-2.5 rounded-r-xl border-l transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? isLight
                            ? "bg-emerald-600 border-emerald-700/30 text-white/80 hover:text-white"
                            : "bg-emerald-500 border-emerald-600/30 text-black/80 hover:text-black"
                          : isLight
                            ? "bg-neutral-100 border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
                      }`}
                      title={`Відкрити посилання: ${land.url}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}

          {/* Free funnels/webinars row */}
          {PROJECT_LANDINGS[activeSlug].some(l => l.type === "free") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1.5 rounded-lg mr-2`}>
                Безкоштовні / Воронки:
              </span>
              {PROJECT_LANDINGS[activeSlug].filter(l => l.type === "free").map((land, idx) => {
                const isSelected = selectedLanding === land.url;
                return (
                  <div key={idx} className="flex items-center gap-0.5">
                    <button
                      onClick={() => setSelectedLanding(land.url)}
                      className={`px-4 py-2 rounded-l-xl text-xs font-black transition-all cursor-pointer ${
                        isSelected
                          ? isLight
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-500 text-black shadow-lg"
                          : isLight
                            ? "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                            : "bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {land.label}
                    </button>
                    <a
                      href={land.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-2.5 py-2.5 rounded-r-xl border-l transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? isLight
                            ? "bg-emerald-600 border-emerald-700/30 text-white/80 hover:text-white"
                            : "bg-emerald-500 border-emerald-600/30 text-black/80 hover:text-black"
                          : isLight
                            ? "bg-neutral-100 border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200"
                            : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10"
                      }`}
                      title={`Відкрити посилання: ${land.url}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- TAB VIEWPORTS --- */}
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
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                      <th className="p-4">Проект</th>
                      <th className="p-4">Кампанія</th>
                      <th className="p-4 text-center">Витрати</th>
                      <th className="p-4 text-center">Кліки</th>
                      <th className="p-4 text-center">Продажі</th>
                      <th className="p-4 text-center">Виручка</th>
                      <th className="p-4 text-center">Прибуток</th>
                      <th className="p-4 text-center">ROI</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
                    {campaignsData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-white/30 italic">Відсутні дані про рекламні кампанії</td>
                      </tr>
                    ) : (
                      campaignsData.map((c: any, idx: number) => (
                        <tr key={idx} className={`${tableRowClass} transition-all`}>
                          <td className="p-4 font-bold">{c.project_name}</td>
                          <td className="p-4">
                            <div className="font-extrabold max-w-xs truncate">{c.campaign_name}</div>
                            <div className={`text-[9px] ${textMutedClass} font-semibold`}>{c.campaign_id}</div>
                          </td>
                          <td className="p-4 text-center font-semibold text-red-400">${Number(c.spend).toFixed(2)}</td>
                          <td className="p-4 text-center">{c.clicks}</td>
                          <td className="p-4 text-center font-extrabold">{c.sales}</td>
                          <td className="p-4 text-center font-bold text-emerald-400">${Number(c.revenue).toFixed(2)}</td>
                          <td className={`p-4 text-center font-bold ${c.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${Number(c.profit).toFixed(2)}
                          </td>
                          <td className="p-4 text-center font-black">
                            <span className={`px-2 py-0.5 rounded text-[9px] ${c.roi >= 120 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              }`}>
                              {Number(c.roi).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))
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

      {/* 2. PROJECT DETAILED ANALYTICS TAB */}
      {activeTab === "analytics" && viewType === "single" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Detailed Analytics Premium Date Filter Preset Switcher */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#0C0C0F]/45 border border-white/5 p-4 rounded-2xl shadow-xl backdrop-blur-md">
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
                      const allCounts = splineTrendData.flatMap((d) => [d.leads, d.clicks]);
                      const max = Math.max(...allCounts, 4);
                      const stepX = 700 / (splineTrendData.length - 1 || 1);

                      // Map points to SVG coordinates
                      const leadPoints = splineTrendData.map((d, i) => {
                        const x = i * stepX;
                        const y = 180 - (d.leads / max) * 140; // scale between 40-180
                        return { x, y, label: d.leads };
                      });

                      const clickPoints = splineTrendData.map((d, i) => {
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
                          {clickPoints.map((p, idx) => (
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
                          {leadPoints.map((p, idx) => (
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
                    {splineTrendData.map((d, i) => {
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
                      val: processedLeads.filter((l) => l.status === "Купив курс").length,
                      pct: singleProjectStats.totalLeads > 0 ? (processedLeads.filter((l) => l.status === "Купив курс").length / singleProjectStats.totalLeads) * 100 : 0,
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
                {uniqueSources.map((source) => (
                  <option key={source} value={source} className={optionClass}>{source}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isLight ? "text-neutral-500" : "text-white/40"}`} />
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-10 min-h-[500px] custom-scrollbar">
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
                  {uniqueSources.map((source) => (
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white/30 font-black uppercase">Період:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-[10px] text-white font-extrabold focus:outline-none"
                />
                <span className="text-white/20">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-[10px] text-white font-extrabold focus:outline-none"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="p-2 text-white/40 hover:text-white transition-all rounded-lg hover:bg-white/5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CRM Clustered grid table */}
          <div className={`${cardClass} rounded-2xl overflow-hidden shadow-xl`}>
            <div className={`overflow-x-auto border-b ${borderClass}`}>
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

            {/* Pagination controls */}
            {processedLeads.length > pageSize && (
              <div className={`flex justify-between items-center p-4 border-t ${borderClass}`}>
                <span className={`text-[11px] font-black uppercase ${textMutedClass}`}>
                  Показано {Math.min((currentPage - 1) * pageSize + 1, processedLeads.length)}—{Math.min(currentPage * pageSize, processedLeads.length)} із {processedLeads.length} лідів
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
                    disabled={currentPage * pageSize >= processedLeads.length}
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
                    return (
                      <div
                        key={lead.id}
                        onClick={() => setActiveQuizLeadId(lead.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? isLight
                              ? "bg-emerald-50 border-emerald-500 shadow-md"
                              : "bg-emerald-950/20 border-emerald-500/20 shadow-lg"
                            : isLight
                              ? "bg-white border-neutral-200 hover:border-neutral-300"
                              : "bg-[#0C0C0F] border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-extrabold text-sm truncate max-w-[150px]">{lead.name}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            lead.status === "Купив курс"
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
                            onClick={() => setSelectedLeadHistory(selectedLead.history)}
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
                              {selectedLead.page_path || selectedLead.metadata?.page_path || "/"}
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

            {/* Redesigned Roadmap Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
              {/* Left Column: Timeline list */}
              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-0 pr-2 pt-2 h-full">
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
                                    Імпорт: {origSheet || "Sheet"} {rowIdx ? `(Рядок ${rowIdx})` : ""}
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
              <div className="overflow-y-auto custom-scrollbar pl-2 space-y-6 h-full border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
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
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal for Unresolved Orders */}
      {showUnresolvedModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-2xl max-h-[80vh] bg-[#0C0C0F] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setShowUnresolvedModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
                Транзакції без вказаної валюти
              </h3>
              <p className="text-white/40 text-xs mt-1">
                Будь ласка, оберіть валюту для кожної транзакції, щоб вони правильно відображалися в аналітиці.
              </p>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
              {unresolvedOrders.length === 0 ? (
                <p className="text-center text-xs text-white/30 py-8 italic">Усі транзакції мають вказану валюту!</p>
              ) : (
                unresolvedOrders.map((order: any) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white/90">
                        {order.customerName || "Невідомий клієнт"}
                      </p>
                      <p className="text-[10px] text-white/40">
                        Проект: {order.projectName} | Дата: {new Date(order.created_at).toLocaleString("uk-UA")}
                      </p>
                      {order.customerPhone && (
                        <p className="text-[10px] text-white/40">
                          Тел: {order.customerPhone}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                      <span className="text-sm font-black text-white pr-2">
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
                            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-500 hover:text-black disabled:opacity-40 text-[10px] font-extrabold text-white/80 border border-white/10 hover:border-emerald-550 transition-all cursor-pointer"
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
    </div>
  );
}
