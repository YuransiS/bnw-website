"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Users,
  BarChart4,
  Activity,
  ClipboardCheck,
  KanbanSquare,
  Grid,
  Link as LinkIcon,
  AlertCircle,
  Briefcase,
  RefreshCw,
  XCircle,
  ChevronDown
} from "lucide-react";

import { useTheme } from "../ThemeProvider";
import { devLogger } from "@/utils/logger";
import DevLogConsole from "../DevLogConsole";
import PerformanceView from "../PerformanceView";

// Actions
import {
  updateUnifiedLeadStatusAction,
  createUnifiedLeadAction,
  updateOrderCurrencyAction
} from "../actions";

// Helpers & Utilities
import {
  fetchCRMLeads,
  formatLocaleNumber,
  formatDualCurrency,
  parseComments
} from "../utils";

// Tabs & Modals
import HubTab from "./tabs/HubTab";
import LeaderboardTab from "./tabs/LeaderboardTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import KanbanTab from "./tabs/KanbanTab";
import LeadsTab from "./tabs/LeadsTab";
import PaylinkTab from "./tabs/PaylinkTab";
import QuizzesTab from "./tabs/QuizzesTab";
import DiagnosticsTab from "./tabs/DiagnosticsTab";
import LeadJourneyModal from "./components/LeadJourneyModal";

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

  // Sync state when props change
  useEffect(() => {
    const currentSlug = initialData.activeSlug || "";
    const isProjectSwitched = currentSlug !== prevSlugRef.current;

    if (!isProjectSwitched) {
      // Current project had a mutation. Clear client cache.
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
      page: isKan ? 1 : isProjectSwitched ? 1 : currentPage,
      pageSize: isKan ? 500 : pageSize,
      searchQuery: isKan
        ? isProjectSwitched
          ? ""
          : debouncedKanbanSearchQuery
        : isProjectSwitched
        ? ""
        : debouncedSearchQuery,
      statusFilter: isKan ? "all" : isProjectSwitched ? "all" : statusFilter,
      touchCountFilter: isKan
        ? isProjectSwitched
          ? "all"
          : kanbanTouchFilter
        : isProjectSwitched
        ? "all"
        : touchCountFilter,
      sourceFilter: isKan
        ? isProjectSwitched
          ? "all"
          : kanbanSourceFilter
        : isProjectSwitched
        ? "all"
        : sourceFilter,
      unpaidIntentOnly: isKan ? false : isProjectSwitched ? false : unpaidIntentOnly,
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
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";
  const modalBgClass = "bg-crm-card border border-crm-border shadow-2xl text-crm-text";
  const inputClass =
    "bg-crm-input-bg border border-crm-border text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const selectClass =
    "bg-crm-input-bg border border-crm-border text-crm-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const optionClass = "bg-crm-card text-crm-text";

  // Reset page number on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    touchCountFilter,
    sourceFilter,
    unpaidIntentOnly,
    startDate,
    endDate,
    activeSlug,
    selectedLanding
  ]);

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
  const [clientRequestMs, setClientRequestMs] = useState<number | null>(null);

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
      setDashboardData(cachedData);
      setIsLoading(false);
    } else {
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

    fetchCRMLeads(activeSlug, paramsPayload)
      .then((res: any) => {
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
      })
      .catch((err: any) => {
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

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openLeadModal = (lead: any) => {
    setSelectedLeadHistory(lead.history || []);
    setSelectedLeadInfo(lead);
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
  const diagnosticsIssues = dashboardData.diagnosticsIssues || {
    nameless: [],
    unmatchedUrls: [],
    currencyErrors: []
  };
  const dataHealth = dashboardData.dataHealth || {
    leadsWithoutUuidCount: 0,
    ordersWithAmountAndClickStatusCount: 0,
    unparseableMetadataDatesCount: 0
  };
  const performanceInfo = dashboardData.performance;
  const totalCount = dashboardData.totalCount || 0;
  const uniqueSources = dashboardData.uniqueSources || [];

  // --- Kanban Column logic & state manipulation ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
        utm_source: newLeadUtmSource
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
      <div
        className={`${bgClass} min-h-screen transition-all font-sans w-full max-w-full pb-20 flex flex-col items-center justify-center text-center p-6 ${
          isLight ? "theme-light" : ""
        }`}
      >
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg ${
            hasError
              ? "bg-red-500/10 border border-red-500/20 text-red-500"
              : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
          }`}
        >
          {hasError ? <AlertCircle className="w-8 h-8 animate-pulse" /> : <Briefcase className="w-8 h-8 animate-pulse" />}
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-3">
          {hasError ? "Помилка завантаження" : "Немає доступних проектів"}
        </h1>
        <p className="text-white/50 text-sm max-w-md leading-relaxed mb-6">
          {hasError
            ? `Не вдалося завантажити дані аналитики: ${dashboardData.error}`
            : `Ваш профіль підтверджено з роллю ${
                role === "admin" || role === "superman"
                  ? "Супермен"
                  : role === "producer"
                  ? "Продюсер"
                  : role === "rop"
                  ? "Керівник ВП (РОП)"
                  : role === "sales"
                  ? "Відділ продажів"
                  : role
              }, але в системі немає активних проектів або вони не прив'язані до вашого акаунту. Будь ласка, зверніться до Супермена для налаштування доступів.`}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${bgClass} min-h-screen transition-all font-sans w-full max-w-full pb-20 ${
        isLight ? "theme-light" : ""
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />

      {/* Main Container Header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b pb-6 ${borderClass}`}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-black uppercase px-2.5 py-0.5 rounded tracking-widest ${
                role === "admin" || role === "superman"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : role === "producer"
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : role === "rop"
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}
            >
              {role === "admin" || role === "superman"
                ? "Супермен"
                : role === "producer"
                ? "Продюсер"
                : role === "rop"
                ? "Керівник ВП (РОП)"
                : "Відділ продажів"}
            </span>
            <div className={`flex items-center gap-1.5 text-xs ${textMutedClass}`}>
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>Платформа активна</span>
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">B&W Analytics CRM</h1>
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

          {/* Project Switcher Dropdown */}
          <div className="relative flex-grow md:flex-grow-0">
            <select
              value={activeSlug}
              onChange={handleScopeChange}
              className={`w-full md:w-64 appearance-none pl-4 pr-10 py-3 rounded-xl focus:outline-none text-xs font-black cursor-pointer ${selectClass}`}
            >
              {viewType === "all" && <option value="all">🌐 Весь холдинг (Зведений вид)</option>}
              {allowedProjects.map((p: any) => (
                <option key={p.slug} value={p.slug}>
                  📂 {p.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-crm-muted" />
          </div>

          {/* Developer Mode Toggle */}
          {(role === "admin" || role === "superman") && (
            <button
              onClick={toggleDevMode}
              className={`px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-black ${
                isDevMode ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-white/5 border-white/10 text-white/50"
              }`}
            >
              <span>🐞 Dev Mode</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-neutral-800"
                : "bg-white/5 hover:bg-white/10 border-white/10 text-white"
            }`}
            aria-label="Переключити тему"
          >
            {isLight ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      {/* Tabs navigation panel */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-white/5 custom-scrollbar">
        {/* Management Center (Supermen) */}
        {viewType === "all" && (
          <button
            onClick={() => setActiveTab("hub")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "hub"
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
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "leaderboard"
                ? isLight
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-black shadow-lg"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />🏆 Лідери ОП
          </button>
        )}

        {/* Project Analytics Tab - Superman & Producer */}
        {viewType === "single" && (role === "admin" || role === "superman" || role === "producer") && (
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "analytics"
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
            onClick={() => setActiveTab("traffic")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "traffic"
                ? isLight
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-black shadow-lg"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-450" />🚥 Трафік
          </button>
        )}

        {/* Quizzes Tab - All approved */}
        {viewType === "single" && (
          <button
            onClick={() => setActiveTab("quizzes")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "quizzes"
                ? isLight
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-black shadow-lg"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
            }`}
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-455" />📋 Анкети
          </button>
        )}

        {/* Kanban Tab - All approved */}
        {viewType === "single" && (
          <button
            onClick={() => setActiveTab("kanban")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "kanban"
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
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "leads"
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
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "paylink"
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
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 border border-red-500/20 bg-red-500/5 ${
              activeTab === "diagnostics"
                ? isLight
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-black shadow-lg"
                : "text-red-400 hover:text-red-300"
            }`}
          >
            <AlertCircle className="w-4 h-4 animate-pulse" />🐞 Діагностика
          </button>
        )}
      </div>

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

        {activeTab === "hub" && viewType === "all" && (
          <HubTab summaryData={summaryData} campaignsData={campaignsData} />
        )}

        {activeTab === "leaderboard" && viewType === "all" && (
          <LeaderboardTab producersLeaderboard={producersLeaderboard} />
        )}

        {activeTab === "traffic" && viewType === "single" && (
          <PerformanceView activeSlug={activeSlug} isLight={isLight} startDate={startDate} endDate={endDate} />
        )}

        {activeTab === "analytics" && viewType === "single" && (
          <AnalyticsTab
            singleProjectStats={singleProjectStats}
            splineTrendData={splineTrendData}
            utmAttributionTree={utmAttributionTree}
            dataHealth={dataHealth}
            performanceInfo={performanceInfo}
            clientRequestMs={clientRequestMs}
            role={role}
            isDevMode={isDevMode}
            activeSlug={activeSlug}
            activeProjectId={activeProject?.id}
            dateRangePreset={dateRangePreset}
            startDate={startDate}
            endDate={endDate}
            applyPreset={applyPreset}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            setDateRangePreset={setDateRangePreset}
          />
        )}

        {activeTab === "kanban" && viewType === "single" && (
          <KanbanTab
            kanbanProcessedLeads={kanbanProcessedLeads}
            uniqueSources={uniqueSources}
            updatingId={updatingId}
            kanbanSearchQuery={kanbanSearchQuery}
            setKanbanSearchQuery={setKanbanSearchQuery}
            kanbanTouchFilter={kanbanTouchFilter}
            setKanbanTouchFilter={setKanbanTouchFilter}
            kanbanSourceFilter={kanbanSourceFilter}
            setKanbanSourceFilter={setKanbanSourceFilter}
            activeKanbanCol={activeKanbanCol}
            setActiveKanbanCol={setActiveKanbanCol}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            openLeadModal={openLeadModal}
            setShowAddLead={setShowAddLead}
          />
        )}

        {activeTab === "leads" && viewType === "single" && (
          <LeadsTab
            processedLeads={processedLeads}
            paginatedLeads={paginatedLeads}
            uniqueSources={uniqueSources}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            touchCountFilter={touchCountFilter}
            setTouchCountFilter={setTouchCountFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            unpaidIntentOnly={unpaidIntentOnly}
            setUnpaidIntentOnly={setUnpaidIntentOnly}
            dateRangePreset={dateRangePreset}
            startDate={startDate}
            endDate={endDate}
            applyPreset={applyPreset}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            setDateRangePreset={setDateRangePreset}
            copiedId={copiedId}
            handleCopyPhone={handleCopyPhone}
            totalCount={totalCount}
            pageSize={pageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            openLeadModal={openLeadModal}
            setShowAddLead={setShowAddLead}
            isDevMode={isDevMode}
          />
        )}

        {activeTab === "paylink" && viewType === "single" && (
          <PaylinkTab activeProjectSlug={activeSlug} selectedLeadInfo={selectedLeadInfo} />
        )}

        {activeTab === "quizzes" && viewType === "single" && (
          <QuizzesTab
            processedLeads={processedLeads}
            activeQuizLeadId={activeQuizLeadId}
            setActiveQuizLeadId={setActiveQuizLeadId}
            dateRangePreset={dateRangePreset}
            startDate={startDate}
            endDate={endDate}
            applyPreset={applyPreset}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            setDateRangePreset={setDateRangePreset}
            openLeadModal={openLeadModal}
            activeSlug={activeSlug}
          />
        )}

        {activeTab === "diagnostics" && viewType === "single" && isDevMode && (
          <DiagnosticsTab
            diagnosticsIssues={diagnosticsIssues}
            totalCount={totalCount}
            isDevMode={isDevMode}
            openLeadModal={openLeadModal}
          />
        )}
      </div>

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
        <LeadJourneyModal
          lead={selectedLeadInfo}
          history={selectedLeadHistory}
          onClose={() => {
            setSelectedLeadHistory(null);
            setSelectedLeadInfo(null);
          }}
          role={role}
          salesManagers={salesManagers}
          isDevMode={isDevMode}
          onLeadUpdated={(updatedLead) => {
            setSelectedLeadInfo(updatedLead);
          }}
        />
      )}

      {/* Modal for Unresolved Orders */}
      {showUnresolvedModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div
            className={`relative w-full max-w-2xl max-h-[80vh] ${modalBgClass} rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-300`}
          >
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
                      <p className="text-xs font-bold text-crm-text">{order.customerName || "Невідомий клієнт"}</p>
                      <p className="text-[10px] text-crm-muted">
                        Проект: {order.projectName} | Дата: {new Date(order.created_at).toLocaleString("uk-UA")}
                      </p>
                      {order.customerPhone && <p className="text-[10px] text-crm-muted">Тел: {order.customerPhone}</p>}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                      <span className="text-sm font-black text-crm-text pr-2">{formatLocaleNumber(order.amount)}</span>
                      <div className="flex gap-1.5 shrink-0">
                        {[
                          { code: "uah", symbol: "₴ UAH" },
                          { code: "usd", symbol: "$ USD" },
                          { code: "eur", symbol: "€ EUR" }
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
                                    `Бажаєте встановити валюту ${
                                      curr.symbol
                                    } для всіх замовлень з лендингу "${order.landingName}" з ціною ${formatLocaleNumber(
                                      order.amount
                                    )}?`
                                  );
                                }
                                const bulkParam = updateAll
                                  ? { landingName: order.landingName, amount: order.amount }
                                  : undefined;
                                const res = await updateOrderCurrencyAction(order.id, curr.code as any, bulkParam);
                                if (res.error) throw new Error(res.error);

                                if (updateAll) {
                                  setUnresolvedOrders((prev) =>
                                    prev.filter((o) => !(o.landingName === order.landingName && o.amount === order.amount))
                                  );
                                } else {
                                  setUnresolvedOrders((prev) => prev.filter((o) => o.id !== order.id));
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
