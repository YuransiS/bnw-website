"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Users,
  BarChart4,
  Activity,
  ClipboardCheck,
  Grid,
  AlertCircle,
  Briefcase,
  RefreshCw,
  XCircle,
  ChevronDown,
  Wallet,
  Plus
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
import LeadsTab from "./tabs/LeadsTab";
import QuizzesTab from "./tabs/QuizzesTab";
import DiagnosticsTab from "./tabs/DiagnosticsTab";
import FunnelsTab from "./tabs/FunnelsTab";
import FinanceDashboardTab from "./tabs/FinanceDashboardTab";
import CashflowFeed from "./components/CashflowFeed";
import AddTransactionModal from "./components/AddTransactionModal";
import { getFinanceSummaryAction } from "../(dashboard)/project/financeActions";
import { getFunnelsAction } from "../actions";
import LeadJourneyModal from "./components/LeadJourneyModal";
import AddLeadModal from "./components/AddLeadModal";
import UnresolvedOrdersModal from "./components/UnresolvedOrdersModal";

interface LeadsDashboardProps {
  initialData: any;
}

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

const DEFAULT_DIAGNOSTICS_ISSUES = {
  nameless: [],
  unmatchedUrls: [],
  currencyErrors: []
};

const DEFAULT_DATA_HEALTH = {
  leadsWithoutUuidCount: 0,
  ordersWithAmountAndClickStatusCount: 0,
  unparseableMetadataDatesCount: 0
};

export default function LeadsDashboard({ initialData }: LeadsDashboardProps) {
  const router = useRouter();

  // Local state to hold dashboard data (pre-calculated server side)
  const [dashboardData, setDashboardData] = useState(initialData);

  // Reference to track last fetched parameters to prevent duplicate/redundant client-side fetches
  const lastFetchedParamsRef = React.useRef<string>("");
  const clientCacheRef = React.useRef<Record<string, any>>({});
  const isResettingRef = React.useRef(false);

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
      isResettingRef.current = true;
      if (currentSlug === "all") {
        setActiveTab("hub");
      } else if (prevSlugRef.current === "all") {
        if (initialData.role === "expert") {
          setActiveTab("finance_expert");
        } else if (initialData.role === "sales") {
          setActiveTab("leads");
        } else {
          setActiveTab("analytics");
        }
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
      setDateRangePreset("all");
    }

    setDashboardData(initialData);

    // Sync the parameter reference with the new server-provided initialData
    lastFetchedParamsRef.current = JSON.stringify({
      activeSlug: currentSlug,
      page: isProjectSwitched ? 1 : currentPage,
      pageSize: pageSize,
      searchQuery: isProjectSwitched ? "" : debouncedSearchQuery,
      statusFilter: isProjectSwitched ? "all" : statusFilter,
      touchCountFilter: isProjectSwitched ? "all" : touchCountFilter,
      sourceFilter: isProjectSwitched ? "all" : sourceFilter,
      unpaidIntentOnly: isProjectSwitched ? false : unpaidIntentOnly,
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
    if (role === "expert") return "finance_expert";
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

  // Finance Subsystem States & Handlers
  const [financeData, setFinanceData] = useState<any>(null);
  const [financeLimit, setFinanceLimit] = useState(20);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [isFinanceLoading, setIsFinanceLoading] = useState(false);
  const [funnelsList, setFunnelsList] = useState<any[]>([]);

  const fetchFinanceData = useCallback(async () => {
    if (!activeProject || activeTab !== "finance") return;
    setIsFinanceLoading(true);
    try {
      const data = await getFinanceSummaryAction(activeProject.id, startDate, endDate, financeLimit);
      if (data && !("error" in data)) {
        setFinanceData(data);
      }
    } catch (e) {
      console.error("Failed to load finance data", e);
    } finally {
      setIsFinanceLoading(false);
    }
  }, [activeProject, activeTab, startDate, endDate, financeLimit]);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  useEffect(() => {
    if (activeProject && activeTab === "finance") {
      getFunnelsAction(activeProject.id).then((res) => {
        if (res && !("error" in res)) {
          setFunnelsList(res as any[]);
        }
      });
    }
  }, [activeProject, activeTab]);

  const applyPreset = useCallback((preset: "all" | "30d" | "7d" | "1d") => {
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
  }, []);
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

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch filtered and paginated CRM data from the server action when filters change
  const [clientRequestMs, setClientRequestMs] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (viewType !== "single" || !activeSlug) return;

    const skipTraffic = activeTab !== "analytics";
    const currentParamsKey = JSON.stringify({
      activeSlug,
      page: currentPage,
      pageSize,
      searchQuery: debouncedSearchQuery,
      statusFilter,
      touchCountFilter,
      sourceFilter,
      unpaidIntentOnly,
      startDate: startDate,
      endDate: endDate,
      selectedLanding: selectedLanding,
      skipTraffic
    });

    // Skip redundant fetching if parameters haven't changed or if we are resetting states due to a project switch
    if (isResettingRef.current) {
      isResettingRef.current = false;
      return;
    }

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
      page: currentPage,
      pageSize,
      searchQuery: debouncedSearchQuery,
      statusFilter,
      touchCountFilter,
      sourceFilter,
      unpaidIntentOnly,
      startDate: startDate,
      endDate: endDate,
      selectedLanding,
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
    viewType
  ]);

  // New lead creation states
  const [showAddLead, setShowAddLead] = useState(false);

  // Interaction feedback states
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLeadHistory, setSelectedLeadHistory] = useState<any[] | null>(null);
  const [selectedLeadInfo, setSelectedLeadInfo] = useState<any | null>(null);

  const handleCopyPhone = useCallback((phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const openLeadModal = useCallback((lead: any) => {
    setSelectedLeadHistory(lead.history || []);
    setSelectedLeadInfo(lead);
  }, []);

  // Sync active tab based on viewType & role
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

  // Server-side precalculated analytics & dashboard variables
  const processedLeads = dashboardData.leads || [];
  const paginatedLeads = processedLeads;
  const singleProjectStats = dashboardData.stats;
  const splineTrendData = dashboardData.splineTrendData || [];
  const utmAttributionTree = dashboardData.utmAttributionTree || [];
  const diagnosticsIssues = dashboardData.diagnosticsIssues || DEFAULT_DIAGNOSTICS_ISSUES;
  const dataHealth = dashboardData.dataHealth || DEFAULT_DATA_HEALTH;
  const performanceInfo = dashboardData.performance;
  const totalCount = dashboardData.totalCount || 0;
  const uniqueSources = dashboardData.uniqueSources || [];

  const handleCreateLead = useCallback(async (payload: any) => {
    if (!activeProject?.id) return { error: "No active project" };
    return createUnifiedLeadAction(activeProject.id, payload);
  }, [activeProject?.id]);

  const handleUpdateCurrency = useCallback(async (
    orderId: string,
    currency: "usd" | "uah" | "eur",
    bulkParam?: { landingName: string; amount: number }
  ) => {
    return updateOrderCurrencyAction(orderId, currency, bulkParam);
  }, []);

  const handleCloseAddLead = useCallback(() => setShowAddLead(false), []);
  const handleCloseUnresolvedModal = useCallback(() => setShowUnresolvedModal(false), []);
  const handleRefresh = useCallback(() => router.refresh(), [router]);

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

        {/* Project Traffic & Costs Tab - Superman, Admin, Founder, Developer & Producer */}
        {viewType === "single" && (role === "admin" || role === "superman" || role === "founder" || role === "developer" || role === "producer") && (
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

        {/* Project Funnels Tab - Superman, Admin, Founder, Cell Leader, Producer, Developer */}
        {viewType === "single" && ["admin", "superman", "founder", "cell_leader", "producer", "developer"].includes(role) && (
          <button
            onClick={() => setActiveTab("funnels")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "funnels"
                ? isLight
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-black shadow-lg"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            Воронки
          </button>
        )}

        {/* Project Finance Tab - Founder, Developer, Cell Leader & Producer */}
        {viewType === "single" && ["admin", "superman", "founder", "cell_leader", "producer", "developer"].includes(role) && (
          <button
            onClick={() => setActiveTab("finance")}
            className={`px-5 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "finance"
                ? isLight
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-black shadow-lg"
                : isLight
                ? "text-neutral-500 hover:text-neutral-900"
                : "text-white/40 hover:text-white"
            }`}
          >
            <Wallet className="w-4 h-4 text-emerald-400" />💳 Фінанси
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

        {activeTab === "funnels" && viewType === "single" && (
          <FunnelsTab
            projectId={activeProject?.id || ""}
            campaignsList={dashboardData.campaignsData || []}
            leadsList={processedLeads}
            isLight={isLight}
          />
        )}

        {activeTab === "finance" && viewType === "single" && activeProject && (
          <div className="space-y-6">
            {/* Quick Action Panel */}
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-sm font-bold text-neutral-200">Фінансовий облік проекту</h3>
                <p className="text-[10px] text-neutral-400 mt-0.5">Внесення витрат, доходів та аналіз P&L</p>
              </div>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Додати операцію
              </button>
            </div>

            {isFinanceLoading && !financeData ? (
              <div className="flex h-[200px] items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              </div>
            ) : (
              financeData && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-in fade-in duration-300">
                  {/* Left Column: Visual Dashboard / P&L Details */}
                  <div className="lg:col-span-2">
                    <FinanceDashboardTab
                      summary={financeData.summary}
                      accounts={financeData.accounts}
                      pnl={financeData.pnl}
                      isLight={isLight}
                    />
                  </div>

                  {/* Right Column: Recent Activity Feed */}
                  <div>
                    <CashflowFeed
                      projectId={activeProject.id}
                      transactions={financeData.transactions}
                      hasMore={financeData.hasMore}
                      onLoadMore={() => setFinanceLimit(prev => prev + 20)}
                      onDeleteSuccess={fetchFinanceData}
                      accounts={financeData.accounts}
                      isLight={isLight}
                      userRole={role}
                    />
                  </div>
                </div>
              )
            )}
          </div>
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
      <AddLeadModal
        isOpen={showAddLead}
        onClose={handleCloseAddLead}
        activeProject={activeProject}
        onCreateLead={handleCreateLead}
        pipelineColumns={PIPELINE_COLUMNS}
        inputClass={inputClass}
        selectClass={selectClass}
        optionClass={optionClass}
      />

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
      <UnresolvedOrdersModal
        isOpen={showUnresolvedModal}
        onClose={handleCloseUnresolvedModal}
        unresolvedOrders={unresolvedOrders}
        setUnresolvedOrders={setUnresolvedOrders}
        onUpdateCurrency={handleUpdateCurrency}
        modalBgClass={modalBgClass}
        formatLocaleNumber={formatLocaleNumber}
        onRefresh={handleRefresh}
      />
      {/* Wizard for transaction entry */}
      {showAddTransaction && activeProject && financeData && (
        <AddTransactionModal
          projectId={activeProject.id}
          funnels={funnelsList}
          accounts={financeData.accounts}
          customCategories={financeData.categories.custom}
          defaultCategories={financeData.categories.default}
          onClose={() => setShowAddTransaction(false)}
          onSuccess={fetchFinanceData}
          isLight={isLight}
        />
      )}

      {isDevMode && <DevLogConsole />}
    </div>
  );
}
