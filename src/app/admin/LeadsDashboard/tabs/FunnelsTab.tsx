"use client";

import React, { useState, useEffect } from "react";
import {
  getFunnelsAction,
  createFunnelAction,
  updateFunnelAction,
  deleteFunnelAction,
  getDiscoveredPagesAction,
  syncProjectPagesAction,
  getProjectCampaignsForFunnelAction
} from "../../actions";
import {
  createTransactionAction,
  deleteTransactionAction
} from "../../(dashboard)/project/financeActions";
import {
  Plus, Target, Calendar, Link as LinkIcon, RefreshCw, BarChart2, Layers, AlertCircle,
  Search, Sparkles, ArrowLeft, Edit3, Trash2, CheckCircle, TrendingUp, DollarSign,
  ChevronRight, Eye, Award, X, Settings, Megaphone
} from "lucide-react";
import ProjectSettingsModal from "../components/ProjectSettingsModal";
import { isPaidStatus } from "@/lib/statusMapper";

interface FunnelsTabProps {
  projectId: string;
  activeProject?: any;
  userRole?: string;
  campaignsList: any[]; // Existing UTM campaigns
  leadsList: any[];     // Existing leads
  costsList?: any[];    // Raw daily cost records
  isLight: boolean;
  accounts: { id: string; name: string; currency: string }[];
  customCategories: { name: string; type: string }[];
  defaultCategories: { income: string[]; expense: string[] };
  onFinanceRefresh?: () => void;
  globalCurrency?: string;
}

interface Funnel {
  id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  campaign_ids: string[];
  landing_slugs: string[];
  description: string;
  planned_revenue?: number;
  planned_spend?: number;
  stages?: any[] | string[] | null;
  created_at: string;
  stats?: any;
}

const ALL_COMMON_STAGES = [
  "Трафік Meta / Ads",
  "Лендінг реєстрації",
  "Чат-бот Telegram (видача матеріалів)",
  "Прогрів та лідмагніт",
  "Участь в ефірах / вебінарі",
  "Виконання домашніх завдань",
  "Заповнення анкети діагностики",
  "Кваліфікація ліда відділом продажів",
  "Дзвінок / Стратегічна сесія",
  "Купівля трипваєра",
  "Продаж основного курсу",
  "Оплата замовлення",
  "Онбординг студента"
];

const FUNNEL_TYPES = [
  {
    id: "Інтенсив",
    label: "Інтенсив",
    defaultStages: [
      "Трафік Meta / Ads",
      "Лендінг реєстрації",
      "Чат-бот Telegram",
      "Участь в інтенсиві (День 1-3)",
      "Анкета / Офер",
      "Оплата (Заявка)",
      "Онбординг студента"
    ]
  },
  {
    id: "Вебінар",
    label: "Вебінар",
    defaultStages: [
      "Трафік Meta / Ads",
      "Лендінг реєстрації",
      "Чат-бот нагадування",
      "Перегляд вебінару",
      "Анкета діагностики",
      "Дзвінок відділу продажів",
      "Оплата замовлення"
    ]
  },
  {
    id: "Автовеб",
    label: "Автовеб",
    defaultStages: [
      "Трафік Meta / Ads",
      "Лендінг реєстрації",
      "Підписка в бот",
      "Перегляд ефіру",
      "Додивився до оффера",
      "Анкета діагностики",
      "Оплата (Заявка)"
    ]
  },
  {
    id: "VSL",
    label: "VSL + Трипваєр",
    defaultStages: [
      "Трафік Meta / Ads",
      "Перехід на VSL",
      "Купівля трипваєра",
      "Анкета діагностики",
      "Кваліфікація ліда",
      "Дзвінок / Сесія",
      "Оплата основного курсу"
    ]
  },
  {
    id: "Діагностика",
    label: "Діагностика",
    defaultStages: [
      "Трафік / Лідмагніт",
      "Заявка на діагностику",
      "Кваліфікація ліда",
      "Проведення розбору",
      "Виставлення рахунку",
      "Оплата"
    ]
  },
  {
    id: "Марафон",
    label: "Марафон",
    defaultStages: [
      "Трафік та промо",
      "Підписка на марафон",
      "Участь та домашні завдання",
      "Фінальний вебінар",
      "Оплата основного продукту"
    ]
  },
  {
    id: "Трипваєр",
    label: "Трипваєр",
    defaultStages: [
      "Трафік на сайт",
      "Купівля трипваєра",
      "Допродаж основного курсу",
      "Оплата основного продукту"
    ]
  }
];

export default function FunnelsTab({
  projectId,
  activeProject,
  userRole = "producer",
  campaignsList,
  leadsList,
  costsList = [],
  isLight,
  accounts,
  customCategories,
  defaultCategories,
  onFinanceRefresh,
  globalCurrency = "UAH"
}: FunnelsTabProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelTransactions, setFunnelTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected funnel details view state
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);

  // Meta Settings Modal state
  const [showMetaModal, setShowMetaModal] = useState(false);

  // Discovered Pages & Multiselect State
  const [discoveredPages, setDiscoveredPages] = useState<any[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchPageQuery, setSearchPageQuery] = useState("");
  const [manualPageInput, setManualPageInput] = useState("");

  // Campaigns Multiselect State
  const [discoveredCampaigns, setDiscoveredCampaigns] = useState<any[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [searchCampaignQuery, setSearchCampaignQuery] = useState("");
  const [manualCampaignInput, setManualCampaignInput] = useState("");

  const effectiveCampaignsList = React.useMemo(() => {
    const map = new Map<string, any>();
    (discoveredCampaigns || []).forEach((c: any) => {
      const name = String(c.campaign_name || '').trim();
      if (name) map.set(name, c);
    });
    (campaignsList || []).forEach((c: any) => {
      const name = String(c.campaign_name || '').trim();
      if (name && !map.has(name)) map.set(name, c);
    });
    return Array.from(map.values());
  }, [discoveredCampaigns, campaignsList]);
  
  // Creation/Editing Form State
  const [showForm, setShowForm] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [funnelType, setFunnelType] = useState("Інтенсив");
  
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plannedRevenue, setPlannedRevenue] = useState<string>("0");
  const [plannedSpend, setPlannedSpend] = useState<string>("0");
  const [description, setDescription] = useState("");
  
  // Custom Customer Journey Stages
  const [stages, setStages] = useState<string[]>([
    "Реєстрація на інтенсив",
    "Участь в інтенсиві (День 1-3)",
    "Домашні завдання",
    "Анкета / Офер",
    "Оплата (Заявка)"
  ]);
  const [newStageName, setNewStageName] = useState("");

  // Manual transaction form inside details
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = useState("");
  const [txAccountId, setTxAccountId] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAddingTx, setIsAddingTx] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get active list of categories for manual transaction
  const categoriesList = txType === "income" 
    ? [...defaultCategories.income, ...customCategories.filter(c => c.type === "income").map(c => c.name)]
    : [...defaultCategories.expense, ...customCategories.filter(c => c.type === "expense").map(c => c.name)];

  // Load Funnels, Pages and Campaigns
  const loadFunnels = async (keepSelectionId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [funnelRes, _syncRes, campRes] = await Promise.all([
        getFunnelsAction(projectId),
        syncProjectPagesAction(projectId).catch((err) => {
          console.warn("Domain pages sync failed, falling back to local DB:", err);
          return { error: err.message };
        }),
        getProjectCampaignsForFunnelAction(projectId).catch((err) => {
          console.warn("Project campaigns fetch failed:", err);
          return { campaigns: [] };
        })
      ]);

      if (funnelRes && "error" in funnelRes) {
        setError(funnelRes.error as string);
      } else {
        const data = funnelRes as { funnels: Funnel[]; transactions: any[] };
        setFunnels(data.funnels || []);
        setFunnelTransactions(data.transactions || []);
        
        // Refresh selected funnel details if open
        if (keepSelectionId) {
          const updated = (data.funnels || []).find(f => f.id === keepSelectionId);
          if (updated) setSelectedFunnel(updated);
        } else if (selectedFunnel) {
          const updated = (data.funnels || []).find(f => f.id === selectedFunnel.id);
          if (updated) setSelectedFunnel(updated);
        }
      }

      if (campRes && "campaigns" in campRes) {
        setDiscoveredCampaigns(campRes.campaigns || []);
      }

      const pagesRes = await getDiscoveredPagesAction(projectId);
      if (pagesRes && !("error" in pagesRes)) {
        setDiscoveredPages(pagesRes.pages || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load funnels");
    } finally {
      setLoading(false);
    }
  };

  const [isSyncingPages, setIsSyncingPages] = useState(false);
  const handleSyncPages = async () => {
    setIsSyncingPages(true);
    try {
      await syncProjectPagesAction(projectId);
      const pagesRes = await getDiscoveredPagesAction(projectId);
      if (pagesRes && !("error" in pagesRes)) {
        setDiscoveredPages(pagesRes.pages || []);
      }
    } catch (err) {
      console.error("Error syncing project pages:", err);
    } finally {
      setIsSyncingPages(false);
    }
  };

  useEffect(() => {
    loadFunnels();
  }, [projectId]);

  // Sync transaction default account
  useEffect(() => {
    if (accounts.length > 0 && !txAccountId) {
      setTxAccountId(accounts[0].id);
    }
  }, [accounts, txAccountId]);

  // Change Funnel Type with smart default stages
  const handleSelectFunnelType = (typeId: string) => {
    setFunnelType(typeId);
    const found = FUNNEL_TYPES.find(t => t.id === typeId);
    if (found && (!editingFunnel || stages.length === 0)) {
      setStages(found.defaultStages);
    }
  };

  // Open Form for Creation
  const handleOpenCreate = () => {
    setEditingFunnel(null);
    setName("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setPlannedRevenue("0");
    setPlannedSpend("0");
    setFunnelType("Інтенсив");
    setStages([
      "Реєстрація на інтенсив",
      "Участь в інтенсиві (День 1-3)",
      "Домашні завдання",
      "Анкета / Офер",
      "Оплата (Заявка)"
    ]);
    setSelectedPages([]);
    setManualPageInput("");
    setSelectedCampaigns([]);
    setDescription("");
    setWizardStep(1);
    setShowForm(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (funnel: Funnel) => {
    setEditingFunnel(funnel);
    setName(funnel.name);
    setStartDate(funnel.start_date);
    setEndDate(funnel.end_date || "");
    setPlannedRevenue(String(funnel.planned_revenue || 0));
    setPlannedSpend(String(funnel.planned_spend || 0));
    
    // Parse metadata for type
    const parsedType = funnel.description?.startsWith("[Type:")
      ? funnel.description.split("]")[0].replace("[Type: ", "")
      : "Інтенсив";
    setFunnelType(parsedType);

    // Clean description
    const cleanDescription = funnel.description?.includes("]")
      ? funnel.description.substring(funnel.description.indexOf("]") + 1).trim()
      : funnel.description;
    setDescription(cleanDescription || "");

    // Load stages
    let parsedStages: string[] = [];
    if (Array.isArray(funnel.stages)) {
      parsedStages = funnel.stages as string[];
    } else {
      // Fallback: parse from description [Stages: ...]
      const metaStages = funnel.description?.match(/\[Stages:\s*([^\]]+)\]/);
      if (metaStages && metaStages[1]) {
        parsedStages = metaStages[1].split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    const defaultStages = FUNNEL_TYPES.find(t => t.id === parsedType)?.defaultStages || [
      "Реєстрація на інтенсив",
      "Участь в інтенсиві (День 1-3)",
      "Домашні завдання",
      "Анкета / Офер",
      "Оплата (Заявка)"
    ];
    setStages(parsedStages.length > 0 ? parsedStages : defaultStages);

    setSelectedPages(funnel.landing_slugs || []);
    setManualPageInput("");
    setSelectedCampaigns(funnel.campaign_ids || []);
    
    setWizardStep(1);
    setShowForm(true);
  };

  // Add custom stage inside wizard
  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    if (stages.includes(newStageName.trim())) {
      alert("Такий етап вже існує!");
      return;
    }
    setStages([...stages, newStageName.trim()]);
    setNewStageName("");
  };

  // Remove stage in wizard
  const handleRemoveStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index));
  };

  // Handle Funnel Submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) {
      alert("Будь ласка, вкажіть назву та дату старту");
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignIds = Array.from(new Set(selectedCampaigns));
      
      const manualSlugs = manualPageInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const landingSlugs = Array.from(new Set([...selectedPages, ...manualSlugs]));

      // Keep type and stages prefixed in description for backwards compatibility
      const metaString = `[Type: ${funnelType}][Stages: ${stages.join(",")}]`;
      const finalDesc = `${metaString} ${description.trim()}`.trim();

      const plannedRevNum = Number(plannedRevenue) || 0;
      const plannedSpendNum = Number(plannedSpend) || 0;
      const finalEndDate = endDate || null;

      let res;
      if (editingFunnel) {
        res = await updateFunnelAction(projectId, editingFunnel.id, {
          name,
          startDate,
          endDate: finalEndDate,
          campaignIds,
          landingSlugs,
          description: finalDesc,
          plannedRevenue: plannedRevNum,
          plannedSpend: plannedSpendNum,
          stages: stages
        });
      } else {
        res = await createFunnelAction(
          projectId, name, startDate, campaignIds, landingSlugs, finalDesc,
          finalEndDate, plannedRevNum, plannedSpendNum, stages
        );
      }

      if (res.error) {
        alert("Помилка збереження воронки: " + res.error);
      } else {
        setShowForm(false);
        setEditingFunnel(null);
        loadFunnels(editingFunnel?.id || res.funnel?.id);
      }
    } catch (err: any) {
      alert("Невідома помилка: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "finish" | "reopen" | "delete";
    funnel: Funnel | null;
    isLoading?: boolean;
    error?: string | null;
  }>({
    isOpen: false,
    type: "finish",
    funnel: null,
    isLoading: false,
    error: null
  });

  // Open finish confirmation
  const handleFinishFunnel = (funnel: Funnel) => {
    setConfirmModal({
      isOpen: true,
      type: "finish",
      funnel,
      isLoading: false,
      error: null
    });
  };

  // Open reopen confirmation
  const handleReopenFunnel = (funnel: Funnel) => {
    setConfirmModal({
      isOpen: true,
      type: "reopen",
      funnel,
      isLoading: false,
      error: null
    });
  };

  // Open delete confirmation
  const handleDeleteFunnel = (funnel: Funnel) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      funnel,
      isLoading: false,
      error: null
    });
  };

  // Execute confirmed action
  const handleExecuteConfirmedAction = async () => {
    const { type, funnel } = confirmModal;
    if (!funnel) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (type === "finish") {
        const today = new Date().toISOString().split("T")[0];
        let parsedStages: string[] = [];
        if (Array.isArray(funnel.stages)) {
          parsedStages = funnel.stages as string[];
        } else {
          const metaStages = funnel.description?.match(/\[Stages:\s*([^\]]+)\]/);
          if (metaStages && metaStages[1]) {
            parsedStages = metaStages[1].split(",").map(s => s.trim());
          }
        }

        const res = await updateFunnelAction(projectId, funnel.id, {
          name: funnel.name,
          startDate: funnel.start_date,
          endDate: today,
          campaignIds: funnel.campaign_ids || [],
          landingSlugs: funnel.landing_slugs || [],
          description: funnel.description || "",
          plannedRevenue: funnel.planned_revenue || 0,
          plannedSpend: funnel.planned_spend || 0,
          stages: parsedStages
        });

        if (res.error) {
          setConfirmModal(prev => ({ ...prev, isLoading: false, error: res.error }));
          return;
        }

        // Close modal and refresh immediately
        setConfirmModal({ isOpen: false, type: "finish", funnel: null });
        await loadFunnels(funnel.id);
      } else if (type === "reopen") {
        let parsedStages: string[] = [];
        if (Array.isArray(funnel.stages)) {
          parsedStages = funnel.stages as string[];
        } else {
          const metaStages = funnel.description?.match(/\[Stages:\s*([^\]]+)\]/);
          if (metaStages && metaStages[1]) {
            parsedStages = metaStages[1].split(",").map(s => s.trim());
          }
        }

        const res = await updateFunnelAction(projectId, funnel.id, {
          name: funnel.name,
          startDate: funnel.start_date,
          endDate: null,
          campaignIds: funnel.campaign_ids || [],
          landingSlugs: funnel.landing_slugs || [],
          description: funnel.description || "",
          plannedRevenue: funnel.planned_revenue || 0,
          plannedSpend: funnel.planned_spend || 0,
          stages: parsedStages
        });

        if (res.error) {
          setConfirmModal(prev => ({ ...prev, isLoading: false, error: res.error }));
          return;
        }

        setConfirmModal({ isOpen: false, type: "reopen", funnel: null });
        await loadFunnels(funnel.id);
      } else if (type === "delete") {
        const res = await deleteFunnelAction(projectId, funnel.id);
        if (res.error) {
          setConfirmModal(prev => ({ ...prev, isLoading: false, error: res.error }));
          return;
        }

        setConfirmModal({ isOpen: false, type: "delete", funnel: null });
        setSelectedFunnel(null);
        await loadFunnels();
      }
    } catch (err: any) {
      setConfirmModal(prev => ({ ...prev, isLoading: false, error: err.message || "Помилка дії" }));
    }
  };

  // Add Inline manual transaction to funnel
  const handleAddInlineTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFunnel) return;
    if (!txAmount || isNaN(Number(txAmount)) || Number(txAmount) <= 0) {
      alert("Вкажіть коректну суму");
      return;
    }
    if (!txCategory) {
      alert("Оберіть категорію");
      return;
    }

    setIsAddingTx(true);
    try {
      const acc = accounts.find(a => a.id === txAccountId);
      const currency = acc ? acc.currency : "UAH";
      const exchangeRate = currency === "UAH" ? 0.0227 : 1.0;

      const res = await createTransactionAction({
        projectId,
        funnelId: selectedFunnel.id,
        date: txDate,
        type: txType,
        category: txCategory,
        description: txDesc.trim() || `Транзакція для воронки: ${selectedFunnel.name}`,
        accountId: txAccountId,
        currency,
        amount: Number(txAmount),
        exchangeRate
      });

      if (res.error) {
        alert("Помилка додавання операції: " + res.error);
      } else {
        setTxAmount("");
        setTxDesc("");
        loadFunnels(selectedFunnel.id);
        if (onFinanceRefresh) onFinanceRefresh();
      }
    } catch (err: any) {
      alert("Невідома помилка: " + err.message);
    } finally {
      setIsAddingTx(false);
    }
  };

  // Delete Transaction tied to funnel
  const handleDeleteInlineTransaction = async (txId: string) => {
    if (!confirm("Видалити цю транзакцію?")) return;
    try {
      const res = await deleteTransactionAction(projectId, txId);
      if (res.error) {
        alert("Помилка видалення транзакції: " + res.error);
      } else {
        loadFunnels(selectedFunnel?.id);
        if (onFinanceRefresh) onFinanceRefresh();
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  // Funnel Analytics Calculator
  const getFunnelStats = (funnel: Funnel) => {
    const parseSafeTs = (dStr: string | null | undefined, isEnd = false): number | null => {
      if (!dStr) return null;
      const clean = String(dStr).trim();
      if (clean.includes(".")) {
        const parts = clean.split(".");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0).getTime();
          }
        }
      }
      if (clean.includes("-")) {
        const parts = clean.split("-");
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0).getTime();
          }
        }
      }
      const d = new Date(clean);
      return isNaN(d.getTime()) ? null : d.getTime();
    };

    const isUSD = globalCurrency === "USD";

    // 1. If server precomputed stats exist on the funnel, use them directly for 100% precision
    if (funnel.stats) {
      const s = funnel.stats;
      const rev = isUSD ? Number(s.revenueUSD || (s.revenue ? s.revenue / 41.5 : 0) || 0) : Number(s.revenue || 0);
      const spd = isUSD ? Number(s.spendUSD || (s.spend ? s.spend / 41.5 : 0) || 0) : Number(s.spend || 0);
      const prf = rev - spd;
      const r = spd > 0 ? (prf / spd) * 100 : 0;
      const lCount = Number(s.leadsCount || 0);
      const sCount = Number(s.salesCount || 0);
      const convRate = lCount > 0 ? (sCount / lCount) * 100 : 0;

      return {
        leadsCount: lCount,
        salesCount: sCount,
        quizzesCount: Number(s.quizzesCount || 0),
        totalClicks: Number(s.totalClicks || 0),
        impressions: Number(s.impressions || 0),
        revenue: rev,
        spend: spd,
        profit: prf,
        roi: r,
        cr: convRate,
        cplUSD: Number(s.cplUSD || 0),
        cpaUSD: Number(s.cpaUSD || 0),
        manualSpend: Number(s.manualSpend || 0),
        manualIncome: Number(s.manualIncome || 0)
      };
    }

    const startDateTime = parseSafeTs(funnel.start_date, false);
    const endDateTime = parseSafeTs(funnel.end_date, true);
    
    // Filter leads created in the active range, matching campaign, medium, source or landing slugs
    const matchedLeads = leadsList.filter((lead: any) => {
      const leadTime = new Date(lead.created_at || lead.createdAt).getTime();
      if (startDateTime && leadTime < startDateTime) return false;
      if (endDateTime && leadTime > endDateTime) return false;

      const leadCampaign = String(lead.utm_campaign || lead.utmCampaign || "").trim().toLowerCase();
      const leadMedium = String(lead.utm_medium || lead.utmMedium || "").trim().toLowerCase();
      const leadSource = String(lead.utm_source || lead.utmSource || "").trim().toLowerCase();
      const leadCampaignId = String(lead.campaign_id || lead.campaignId || lead.metadata?.campaign_id || "").trim().toLowerCase();
      const leadLanding = String(lead.landing || lead.page_path || lead.page_url || lead.target_sheet || lead.targetSheet || lead.metadata?.target_sheet || "").trim().toLowerCase();
      const visitedLandings = (lead.visited_landings || lead.visitedLandings || []).map((l: string) => String(l).toLowerCase());

      const hasCampaigns = Array.isArray(funnel.campaign_ids) && funnel.campaign_ids.length > 0;
      const hasLandings = Array.isArray(funnel.landing_slugs) && funnel.landing_slugs.length > 0;

      const campaignMatch = hasCampaigns && funnel.campaign_ids.some((id) => {
        if (!id) return false;
        const cid = id.toLowerCase().trim();
        return (
          leadCampaign.includes(cid) || cid.includes(leadCampaign) ||
          leadMedium.includes(cid) || cid.includes(leadMedium) ||
          leadSource.includes(cid) || cid.includes(leadSource) ||
          leadCampaignId === cid || cid.includes(leadCampaignId)
        );
      });

      const landingMatch = hasLandings && funnel.landing_slugs.some((slug) => {
        if (!slug) return false;
        const s = slug.toLowerCase().trim();
        return leadLanding.includes(s) || visitedLandings.some((vl: string) => vl.includes(s));
      });

      if (!hasCampaigns && !hasLandings) {
        return true;
      }

      return Boolean(campaignMatch || landingMatch);
    });

    // Sum revenue from these leads
    let revenueUAH = 0;
    let revenueUSD = 0;
    let salesCount = 0;
    matchedLeads.forEach((lead: any) => {
      const isPaid = isPaidStatus(lead.status) || (Number(lead.uahPaid || lead.uah_paid || 0) > 0) || (Number(lead.usdPaid || lead.usd_paid || 0) > 0);
      const uah = Number(lead.uahPaid || lead.uah_paid || lead.uahTripwirePaid || lead.uah_tripwire_paid || 0);
      const usd = Number(lead.usdPaid || lead.usd_paid || lead.usdTripwirePaid || lead.usd_tripwire_paid || 0);
      const rawAmt = Number(lead.amount || 0);

      if (isPaid || uah > 0 || usd > 0 || rawAmt > 0) {
        salesCount++;
        if (uah > 0 || usd > 0) {
          revenueUAH += uah + (usd * 41.5);
          revenueUSD += (uah / 41.5) + usd;
        } else if (rawAmt > 0) {
          revenueUAH += rawAmt;
          revenueUSD += rawAmt / 41.5;
        }
      }
    });

    // Calculate surveys/quizzes count
    const quizzesCount = matchedLeads.filter(
      (l: any) => (l.diagnosticsComment && l.diagnosticsComment.trim().length > 0) || (l.diagnostics_comment && l.diagnostics_comment.trim().length > 0)
    ).length;

    // Sum Ad Spends from daily traffic costs in the active range
    let spendUSD = 0;
    let spendUAH = 0;
    costsList.forEach((c: any) => {
      const hasCampaigns = Array.isArray(funnel.campaign_ids) && funnel.campaign_ids.length > 0;
      const isMatched = hasCampaigns
        ? funnel.campaign_ids.some((id) => {
            const cid = id.toLowerCase().trim();
            const cName = String(c.campaign_name || "").toLowerCase();
            const cId = String(c.campaign_id || "").toLowerCase();
            return cName.includes(cid) || cid.includes(cName) || cId === cid || cid.includes(cId);
          })
        : true;
      if (!isMatched) return;
      
      const costDate = parseSafeTs(c.date, false);
      if (costDate) {
        if (startDateTime && costDate < startDateTime) return;
        if (endDateTime && costDate > endDateTime) return;
      }
      
      const sUsd = Number(c.spend_usd || c.spend || 0);
      spendUSD += sUsd;
      spendUAH += sUsd * 41.5;
    });

    // Sum manual transactions bound to this funnel
    let manualSpendUAH = 0;
    let manualIncomeUAH = 0;

    funnelTransactions.forEach((tx: any) => {
      if (tx.funnel_id === funnel.id) {
        const amt = Number(tx.amount || 0);
        const isUAH = tx.currency === "UAH";
        const amtUAH = isUAH ? amt : amt * 41.5;
        const amtUSD = isUAH ? amt / 41.5 : amt;
        if (tx.type === "expense") {
          spendUAH += amtUAH;
          spendUSD += amtUSD;
          manualSpendUAH += amtUAH;
        } else {
          revenueUAH += amtUAH;
          revenueUSD += amtUSD;
          manualIncomeUAH += amtUAH;
        }
      }
    });

    const leadsCount = matchedLeads.length;
    const finalRev = isUSD ? revenueUSD : revenueUAH;
    const finalSpd = isUSD ? spendUSD : spendUAH;
    const profit = finalRev - finalSpd;
    const roi = finalSpd > 0 ? (profit / finalSpd) * 100 : 0;
    const cr = leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0;

    // Click sum from campaigns
    let totalClicks = 0;
    campaignsList.forEach((c: any) => {
      const hasCampaigns = Array.isArray(funnel.campaign_ids) && funnel.campaign_ids.length > 0;
      const isMatched = hasCampaigns
        ? funnel.campaign_ids.some((id) => {
            const cid = id.toLowerCase().trim();
            const cName = String(c.campaign_name || "").toLowerCase();
            const cId = String(c.campaign_id || "").toLowerCase();
            return cName.includes(cid) || cid.includes(cName) || cId === cid || cid.includes(cId);
          })
        : true;
      if (isMatched) {
        totalClicks += Number(c.clicks || 0);
      }
    });

    // Offer / Landing variant breakdown
    const variantMap: Record<string, {
      key: string;
      name: string;
      leadsCount: number;
      salesCount: number;
      revenue: number;
      percentage: number;
      cr: number;
    }> = {};

    matchedLeads.forEach((lead: any) => {
      const pageUrl = String(lead.page_url || lead.pageUrl || lead.metadata?.page_url || lead.metadata?.raw_row?.page_url || "").trim();
      const pagePath = String(lead.page_path || lead.pagePath || lead.metadata?.page_path || lead.metadata?.raw_row?.page_path || "").trim();
      const sourceFlag = String(lead.source_flag || lead.metadata?.source_flag || lead.metadata?.raw_row?.source_flag || lead.metadata?.raw_row?.raw_payload?.source_flag || "").trim();
      const utmCampaign = String(lead.utm_campaign || lead.utmCampaign || lead.metadata?.utm_campaign || lead.metadata?.raw_row?.utm_campaign || "").trim();

      let variantKey = "default";
      let variantName = pagePath && pagePath !== "/" ? pagePath : "Головна сторінка";

      const oMatch = pageUrl.match(/[?&]o=([a-zA-Z0-9_-]+)/i);
      const vMatch = pageUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/i);

      if (oMatch && oMatch[1]) {
        variantKey = `o_${oMatch[1]}`;
        variantName = `Оффер ${oMatch[1]} (?o=${oMatch[1]})`;
      } else if (vMatch && vMatch[1]) {
        variantKey = `v_${vMatch[1]}`;
        variantName = `Варіант ${vMatch[1]} (?v=${vMatch[1]})`;
      } else if (sourceFlag && /Offer\s*(\d+)/i.test(sourceFlag)) {
        const num = sourceFlag.match(/Offer\s*(\d+)/i)?.[1] || "1";
        variantKey = `o_${num}`;
        variantName = `Оффер ${num} (${sourceFlag})`;
      } else if (utmCampaign && /OFFER\s*(\d+)/i.test(utmCampaign)) {
        const num = utmCampaign.match(/OFFER\s*(\d+)/i)?.[1] || "1";
        variantKey = `o_${num}`;
        variantName = `Оффер ${num} (Camp: OFFER${num})`;
      } else if (sourceFlag) {
        variantKey = sourceFlag;
        variantName = sourceFlag;
      } else if (pagePath && pagePath !== "/") {
        variantKey = pagePath;
        variantName = pagePath;
      }

      if (!variantMap[variantKey]) {
        variantMap[variantKey] = {
          key: variantKey,
          name: variantName,
          leadsCount: 0,
          salesCount: 0,
          revenue: 0,
          percentage: 0,
          cr: 0
        };
      }

      variantMap[variantKey].leadsCount++;

      const isPaid = isPaidStatus(lead.status) || (Number(lead.uahPaid || lead.uah_paid || 0) > 0) || (Number(lead.usdPaid || lead.usd_paid || 0) > 0);
      const uah = Number(lead.uahPaid || lead.uah_paid || lead.uahTripwirePaid || lead.uah_tripwire_paid || 0);
      const usd = Number(lead.usdPaid || lead.usd_paid || lead.usdTripwirePaid || lead.usd_tripwire_paid || 0);
      const rawAmt = Number(lead.amount || 0);

      if (isPaid || uah > 0 || usd > 0 || rawAmt > 0) {
        variantMap[variantKey].salesCount++;
        if (uah > 0 || usd > 0) {
          variantMap[variantKey].revenue += isUSD ? ((uah / 41.5) + usd) : (uah + (usd * 41.5));
        } else if (rawAmt > 0) {
          variantMap[variantKey].revenue += isUSD ? (rawAmt / 41.5) : rawAmt;
        }
      }
    });

    const offerVariants = Object.values(variantMap)
      .map(v => ({
        ...v,
        percentage: leadsCount > 0 ? (v.leadsCount / leadsCount) * 100 : 0,
        cr: v.leadsCount > 0 ? (v.salesCount / v.leadsCount) * 100 : 0
      }))
      .sort((a, b) => b.leadsCount - a.leadsCount);

    return {
      leadsCount,
      salesCount,
      quizzesCount,
      totalClicks,
      revenue: finalRev,
      spend: finalSpd,
      profit,
      roi,
      cr,
      manualSpend: manualSpendUAH,
      manualIncome: manualIncomeUAH,
      offerVariants
    };
  };

  // Determine funnel active state
  // Determine funnel active state (if end_date is today or in past, it is completed)
  const isFunnelActive = (funnel: Funnel) => {
    if (!funnel.end_date) return true;
    const today = new Date().toISOString().split("T")[0];
    return funnel.end_date > today;
  };

  return (
    <div className="space-y-6">
      {/* ERROR DISPLAY */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CONFIRMATION ACTION MODAL */}
      {confirmModal.isOpen && confirmModal.funnel && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0C0C0F] border border-white/10 p-6 rounded-3xl space-y-5 w-full max-w-md text-white shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                  confirmModal.type === "finish" 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : confirmModal.type === "reopen"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}>
                  {confirmModal.type === "finish" ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : confirmModal.type === "reopen" ? (
                    <RefreshCw className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    {confirmModal.type === "finish" && "Завершити кампанію"}
                    {confirmModal.type === "reopen" && "Відновити воронку"}
                    {confirmModal.type === "delete" && "Видалити воронку"}
                  </h3>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {confirmModal.funnel.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, type: "finish", funnel: null })}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/70 leading-relaxed">
              {confirmModal.type === "finish" && (
                <>Зафіксувати дату завершення кампанії сьогоднішнім днем ({new Date().toLocaleDateString("uk-UA")})? Воронка перейде у статус <b>Завершена</b>.</>
              )}
              {confirmModal.type === "reopen" && (
                <>Відновити активність кампанії (зняти кінцеву дату)? Воронка знову стане <b>Активною</b> для обліку нових лідів.</>
              )}
              {confirmModal.type === "delete" && (
                <>Ви впевнені, що бажаєте назавжди видалити цю воронку? Усі прив'язані транзакції буде відкріплено.</>
              )}
            </p>

            {confirmModal.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                {confirmModal.error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                disabled={confirmModal.isLoading}
                onClick={() => setConfirmModal({ isOpen: false, type: "finish", funnel: null })}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold cursor-pointer transition-all"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={confirmModal.isLoading}
                onClick={handleExecuteConfirmedAction}
                className={`px-5 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-1.5 ${
                  confirmModal.type === "finish"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20"
                    : confirmModal.type === "reopen"
                    ? "bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                }`}
              >
                {confirmModal.isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Обробка...
                  </>
                ) : (
                  <>
                    {confirmModal.type === "finish" && "Так, завершити"}
                    {confirmModal.type === "reopen" && "Так, відновити"}
                    {confirmModal.type === "delete" && "Так, видалити"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: CREATION / EDITING WIZARD MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <form
            onSubmit={handleSubmit}
            className="bg-neutral-900 border border-white/10 p-6 rounded-3xl space-y-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar text-xs text-white shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">
                {editingFunnel ? "Редагування" : "Створення"} воронки (Крок {wizardStep} з 5)
              </h3>
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditingFunnel(null); }}
                className="p-1 text-white/40 hover:text-white cursor-pointer rounded-lg hover:bg-white/5 transition-all"
              >
                Скасувати
              </button>
            </div>

            {/* STEP 1: Назва, тип та нотатки */}
            {wizardStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50">Назва воронки *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Марафон Липень 2026"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Тип воронки</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {FUNNEL_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectFunnelType(t.id)}
                        className={`py-2 px-1 rounded-lg border font-bold text-center transition-all cursor-pointer text-xs ${
                          funnelType === t.id
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-450 shadow-sm"
                            : "bg-white/5 border-white/5 text-white/50 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Опис або нотатки (Необов'язково)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Коментар або особливості запуску..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!name.trim()) {
                        alert("Будь ласка, вкажіть назву воронки");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Дати та Фінансові цілі */}
            {wizardStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-white/50">Дата старту *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] uppercase font-bold text-white/50">Дата завершення</label>
                      {endDate && (
                        <button
                          type="button"
                          onClick={() => setEndDate("")}
                          className="text-[9px] text-red-400 hover:underline cursor-pointer"
                        >
                          Очистити (Безстрокова)
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Опціонально"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs"
                    />
                    <p className="text-[9px] text-white/30">
                      Необов'язково. Якщо не вказано, воронка активна постійно (можна завершити кнопкою).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-white/50">Плановий дохід ($ USD)</label>
                    <input
                      type="number"
                      value={plannedRevenue}
                      onChange={(e) => setPlannedRevenue(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-white/50">Планові витрати ($ USD)</label>
                    <input
                      type="number"
                      value={plannedSpend}
                      onChange={(e) => setPlannedSpend(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!startDate) {
                        alert("Будь ласка, вкажіть дату старту воронки");
                        return;
                      }
                      if (discoveredPages.length === 0) {
                        getDiscoveredPagesAction(projectId).then((pagesRes) => {
                          if (pagesRes && !("error" in pagesRes)) {
                            setDiscoveredPages(pagesRes.pages || []);
                          }
                        });
                      }
                      setWizardStep(3);
                    }}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Прив'язка лендінгів та сторінок сайту */}
            {wizardStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block">Лендінги та сторінки проекту</label>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Оберіть сторінки, через які ліди потрапляють у цю воронку
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSyncPages}
                      disabled={isSyncingPages}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-white/5 px-2.5 py-1 rounded-lg"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingPages ? "animate-spin" : ""}`} />
                      {isSyncingPages ? "Опитую..." : "Синхронізувати"}
                    </button>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={searchPageQuery}
                      onChange={(e) => setSearchPageQuery(e.target.value)}
                      placeholder="Пошук сторінки за назвою або URL..."
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                    />
                  </div>

                  <div className="border border-white/10 rounded-xl overflow-hidden bg-black/35 max-h-48 overflow-y-auto divide-y divide-white/5 custom-scrollbar text-xs">
                    {discoveredPages.length === 0 ? (
                      <div className="p-4 text-center text-white/40 text-xs">
                        Не знайдено збережених сторінок. Натисніть «Синхронізувати» або додайте маршрути вручну.
                      </div>
                    ) : (
                      discoveredPages
                        .filter((p) => {
                          const pathKey = p.path || p.slug || "/";
                          const q = searchPageQuery.toLowerCase();
                          return pathKey.toLowerCase().includes(q) || (p.title || "").toLowerCase().includes(q);
                        })
                        .map((p) => {
                          const pathKey = p.path || p.slug || "/";
                          const isSelected = selectedPages.includes(pathKey);
                          const isDirect = p.type === "discovered" || p.source === "auto" || p.source === "config";
                          const depth = (pathKey.match(/\//g) || []).length;
                          const displayLabel = pathKey;

                          return (
                            <div
                              key={p.id || pathKey}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPages(selectedPages.filter((path) => path !== pathKey));
                                } else {
                                  setSelectedPages([...selectedPages, pathKey]);
                                }
                              }}
                              className={`flex justify-between items-center px-3 py-2.5 cursor-pointer transition-all hover:bg-white/5 ${
                                isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 w-3.5 h-3.5"
                                />
                                <span className={`font-bold ${isSelected ? "text-emerald-450" : "text-white"} ${depth > 1 ? "text-white/60 font-semibold" : ""}`}>
                                  {displayLabel}
                                </span>
                                {p.title && p.title !== pathKey && (
                                  <span className="text-[10px] text-white/40 italic">({p.title})</span>
                                )}
                              </div>
                              <span className={`text-[8px] border px-1.5 py-0.5 rounded uppercase font-black ${
                                isDirect ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              }`}>
                                {isDirect ? "Auto" : "Traffic"}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Рекламні Кампанії */}
            {wizardStep === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/50 block">Рекламні Кампанії (Meta / Facebook Ads)</label>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Оберіть або додайте рекламні кампанії Meta, бюджет і витрати яких зараховуватимуться до цієї воронки.
                      </p>
                    </div>
                    {activeProject && (
                      <button
                        type="button"
                        onClick={() => setShowMetaModal(true)}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                      >
                        <Settings className="w-3 h-3 text-emerald-450" />
                        <span>Кабінет Meta</span>
                      </button>
                    )}
                  </div>

                  {/* Manual Campaign Input Field */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualCampaignInput}
                      onChange={(e) => setManualCampaignInput(e.target.value)}
                      placeholder="Введіть назву кампанії або UTM мітку (напр. MINIK, WIDE)..."
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (manualCampaignInput.trim()) {
                            const val = manualCampaignInput.trim();
                            if (!selectedCampaigns.includes(val)) {
                              setSelectedCampaigns([...selectedCampaigns, val]);
                            }
                            setManualCampaignInput("");
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (manualCampaignInput.trim()) {
                          const val = manualCampaignInput.trim();
                          if (!selectedCampaigns.includes(val)) {
                            setSelectedCampaigns([...selectedCampaigns, val]);
                          }
                          setManualCampaignInput("");
                        }
                      }}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black rounded-xl cursor-pointer transition-all shrink-0"
                    >
                      + Додати
                    </button>
                  </div>
                  
                  {/* Selected Campaigns Badges (Always Visible when campaigns are chosen) */}
                  {selectedCampaigns.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <div className="w-full text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Обрані кампанії для воронки ({selectedCampaigns.length}):</span>
                        <button
                          type="button"
                          onClick={() => setSelectedCampaigns([])}
                          className="text-white/40 hover:text-white text-[9px] underline cursor-pointer"
                        >
                          Очистити всі
                        </button>
                      </div>
                      {selectedCampaigns.map((camp) => (
                        <span
                          key={camp}
                          onClick={() => setSelectedCampaigns(selectedCampaigns.filter((c) => c !== camp))}
                          className="bg-emerald-500/15 hover:bg-red-500/20 border border-emerald-500/30 hover:border-red-500/30 text-emerald-300 hover:text-red-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all text-xs group"
                        >
                          {camp} <span className="text-white/40 group-hover:text-red-400 font-black">×</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {effectiveCampaignsList.length > 0 ? (
                    <>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                          <Search className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          value={searchCampaignQuery}
                          onChange={(e) => setSearchCampaignQuery(e.target.value)}
                          placeholder="Пошук серед знайдених кампаній проєкту..."
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                        />
                      </div>

                      <div className="border border-white/10 rounded-xl overflow-hidden bg-black/35">
                        <div className="max-h-48 overflow-y-auto divide-y divide-white/5 custom-scrollbar text-xs">
                          {Array.from(new Set([
                            ...effectiveCampaignsList.map((c: any) => String(c.campaign_name || '').trim()),
                            ...selectedCampaigns
                          ].filter(Boolean)))
                            .filter((campName) => campName.toLowerCase().includes(searchCampaignQuery.toLowerCase()))
                            .map((campName) => {
                              const isSelected = selectedCampaigns.includes(campName);
                              const stats = effectiveCampaignsList.find((c) => c.campaign_name === campName);
                              const spendUSD = stats ? Number(stats.spend || 0) : 0;
                              const leadsCount = stats ? Number(stats.leads_count || 0) : 0;

                              return (
                                <div
                                  key={campName}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedCampaigns(selectedCampaigns.filter((c) => c !== campName));
                                    } else {
                                      setSelectedCampaigns([...selectedCampaigns, campName]);
                                    }
                                  }}
                                  className={`flex justify-between items-center px-3 py-2.5 cursor-pointer transition-all hover:bg-white/5 ${
                                    isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 w-3.5 h-3.5"
                                    />
                                    <span className={`font-bold ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                      {campName}
                                    </span>
                                  </div>
                                  {(spendUSD > 0 || leadsCount > 0) && (
                                    <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded font-black text-white/50">
                                      {spendUSD > 0 ? `Витрати: $${Math.round(spendUSD).toLocaleString()}` : ""} {leadsCount > 0 ? `(${leadsCount} лід.)` : ""}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                      <p className="text-xs text-white/70 font-semibold">
                        Кампанії з Meta Ads ще не синхронізовано автоматично.
                      </p>
                      <p className="text-[11px] text-white/40">
                        Введіть назву кампанії або ключове слово вручну у полі вище та натисніть <b>«+ Додати»</b> або підв'яжіть рекламний кабінет Meta Ads.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={() => setWizardStep(5)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer"
                  >
                    Далі
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Етапи Шляху Клієнта */}
            {wizardStep === 5 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-white/50 block">Етапи шляху клієнта у воронці</label>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Послідовні кроки ліда від першого кліку до покупки. Оберіть потрібні або додайте власні.
                    </p>
                  </div>
                  
                  {/* Active stages list */}
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {stages.map((stage, index) => (
                      <div key={index} className="flex justify-between items-center bg-white/5 border border-white/10 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2.5 flex-1 mr-2">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0">
                            {index + 1}
                          </span>
                          <input
                            type="text"
                            value={stage}
                            onChange={(e) => {
                              const newStages = [...stages];
                              newStages[index] = e.target.value;
                              setStages(newStages);
                            }}
                            className="bg-transparent border-none font-bold text-white focus:outline-none text-xs w-full focus:border-b focus:border-emerald-500 focus:ring-0 p-0"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(index)}
                          className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-all shrink-0"
                          title="Видалити етап"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {stages.length === 0 && (
                      <p className="text-center text-white/40 py-4 italic text-xs">Немає обраних етапів. Додайте нижче або оберіть з рекомендованих.</p>
                    )}
                  </div>

                  {/* Recommended stages pool pills */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">
                      Швидке додавання популярних дій ліда:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {ALL_COMMON_STAGES.map((s) => {
                        const isAdded = stages.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              if (isAdded) {
                                setStages(stages.filter((st) => st !== s));
                              } else {
                                setStages([...stages, s]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                              isAdded
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : "bg-white/5 border-white/5 text-white/50 hover:text-white hover:border-white/15"
                            }`}
                          >
                            <span>{isAdded ? "✓" : "+"}</span> {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add custom stage */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <input
                      type="text"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddStage();
                        }
                      }}
                      placeholder="Введіть свій етап..."
                      className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs placeholder-white/30"
                    />
                    <button
                      type="button"
                      onClick={handleAddStage}
                      className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Додати
                    </button>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmitting ? "Збереження..." : editingFunnel ? "Оновити воронку" : "Створити воронку"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* VIEW 2: SINGLE FUNNEL FULL-SCREEN DASHBOARD */}
      {selectedFunnel ? (() => {
        const stats = getFunnelStats(selectedFunnel);
        const isActive = isFunnelActive(selectedFunnel);

        const cleanDescription = selectedFunnel.description?.includes("]")
          ? selectedFunnel.description.substring(selectedFunnel.description.indexOf("]") + 1).trim()
          : selectedFunnel.description;

        let funnelStagesList: string[] = [];
        if (Array.isArray(selectedFunnel.stages)) {
          funnelStagesList = selectedFunnel.stages as string[];
        } else {
          const metaStages = selectedFunnel.description?.match(/\[Stages:\s*([^\]]+)\]/);
          if (metaStages && metaStages[1]) {
            funnelStagesList = metaStages[1].split(",").map(s => s.trim()).filter(Boolean);
          }
        }

        const isUSD = globalCurrency === "USD";
        const usdRate = 41.5;
        const planSpendUSD = selectedFunnel.planned_spend || 0;
        const planSpendUAH = planSpendUSD * usdRate;
        const planSpend = isUSD ? planSpendUSD : planSpendUAH;
        const actualSpend = stats.spend;
        const spendPercent = planSpend > 0 ? (actualSpend / planSpend) * 100 : 0;
        
        const planRevUSD = selectedFunnel.planned_revenue || 0;
        const planRevUAH = planRevUSD * usdRate;
        const planRev = isUSD ? planRevUSD : planRevUAH;
        const actualRev = stats.revenue;
        const revPercent = planRev > 0 ? (actualRev / planRev) * 100 : 0;

        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-white/5 p-6 rounded-2xl gap-4">
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelectedFunnel(null)}
                  className="flex items-center gap-1.5 text-white/50 hover:text-white mb-2 transition-all font-bold cursor-pointer bg-transparent border-none p-0"
                >
                  <ArrowLeft className="w-4 h-4" /> Повернутися до списку
                </button>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-black text-white">{selectedFunnel.name}</h3>
                  <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full border ${
                    isActive 
                      ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" 
                      : "bg-neutral-800 text-white/50 border-white/5"
                  }`}>
                    {isActive ? "Активна" : "Завершена"}
                  </span>
                </div>
                <div className="text-[10px] text-white/40 flex items-center gap-3 font-semibold mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Старт: {new Date(selectedFunnel.start_date).toLocaleDateString("uk-UA")}
                  </span>
                  {selectedFunnel.end_date && (
                    <span className="flex items-center gap-1">
                      🏁 Фініш: {new Date(selectedFunnel.end_date).toLocaleDateString("uk-UA")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isActive ? (
                  <button
                    type="button"
                    onClick={() => handleFinishFunnel(selectedFunnel)}
                    className="px-3 py-2 bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 hover:bg-emerald-500/25 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs transition-all"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Завершити кампанію
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReopenFunnel(selectedFunnel)}
                    className="px-3 py-2 bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Відновити кампанію
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedFunnel)}
                  className="px-3 py-2 bg-white/5 text-white border border-white/5 hover:bg-white/10 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Редагувати
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFunnel(selectedFunnel)}
                  className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer text-xs transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Видалити
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Бюджет (Витрати)</h4>
                  <TrendingUp className="w-4 h-4 text-red-400" />
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-black text-white">{Math.round(actualSpend).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}</span>
                  <div className="flex justify-between text-[10px] text-white/40 font-semibold">
                    <span>План: {planSpendUSD > 0 ? `$${Math.round(planSpendUSD).toLocaleString("uk-UA")} (~${Math.round(planSpendUAH).toLocaleString("uk-UA")} ₴)` : "не вказано"}</span>
                    {planSpend > 0 && (
                      <span>{spendPercent > 100 ? "Перевитрата!" : `Залишок: ${Math.round(Math.max(0, planSpend - actualSpend)).toLocaleString("uk-UA")} ${isUSD ? "$" : "₴"}`}</span>
                    )}
                  </div>
                </div>
                {planSpend > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${spendPercent > 100 ? "bg-red-500" : spendPercent > 85 ? "bg-yellow-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(spendPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-white/30 font-black">
                      <span>ВИКОРИСТАНО</span>
                      <span>{Math.round(spendPercent)}%</span>
                    </div>
                  </div>
                )}
                {stats.manualSpend > 0 && (
                  <div className="text-[9px] bg-white/[0.01] border border-white/5 p-2 rounded-lg text-white/40">
                    Рекламні витрати: {Math.round(actualSpend - stats.manualSpend).toLocaleString()} {isUSD ? "$" : "₴"} <br />
                    Додаткові витрати (ручні): {Math.round(stats.manualSpend).toLocaleString()} {isUSD ? "$" : "₴"}
                  </div>
                )}
              </div>

              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Виручка (Доходи)</h4>
                  <Award className="w-4 h-4 text-emerald-450" />
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-black text-emerald-400">{Math.round(actualRev).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}</span>
                  <div className="flex justify-between text-[10px] text-white/40 font-semibold">
                    <span>План: {planRevUSD > 0 ? `$${Math.round(planRevUSD).toLocaleString("uk-UA")} (~${Math.round(planRevUAH).toLocaleString("uk-UA")} ₴)` : "не вказано"}</span>
                    {planRev > 0 && (
                      <span className={revPercent >= 100 ? "text-emerald-400 font-bold" : "text-amber-500"}>
                        {revPercent >= 100 ? "Виконано! 🎉" : `Залишилось: ${Math.round(Math.max(0, planRev - actualRev)).toLocaleString("uk-UA")} ${isUSD ? "$" : "₴"}`}
                      </span>
                    )}
                  </div>
                </div>
                {planRev > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.min(revPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-white/30 font-black">
                      <span>ВИКОНАННЯ ЦІЛІ</span>
                      <span>{Math.round(revPercent)}%</span>
                    </div>
                  </div>
                )}
                {stats.manualIncome > 0 && (
                  <div className="text-[9px] bg-white/[0.01] border border-white/5 p-2 rounded-lg text-white/40">
                    Надходження з курсів: {Math.round(actualRev - stats.manualIncome).toLocaleString()} {isUSD ? "$" : "₴"} <br />
                    Додаткові надходження (ручні): {Math.round(stats.manualIncome).toLocaleString()} {isUSD ? "$" : "₴"}
                  </div>
                )}
              </div>

              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Чистий прибуток & ROI</h4>
                  <TrendingUp className="w-4 h-4 text-emerald-455" />
                </div>
                <div className="space-y-1">
                  <span className={`text-2xl font-black block ${stats.profit >= 0 ? "text-white" : "text-red-400"}`}>
                    {Math.round(stats.profit).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}
                  </span>
                  <div className="flex justify-between text-[10px] text-white/40 font-black mt-1">
                    <span>Сквозний ROI</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      stats.roi >= 150 ? "bg-emerald-500/10 text-emerald-450 animate-pulse" : stats.roi >= 100 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {Math.round(stats.roi)}%
                    </span>
                  </div>
                </div>
                {planRev > 0 && planSpend > 0 && (
                  <div className="text-[9px] text-white/30 pt-1 leading-relaxed">
                    Планова маржинальність: {Math.round(((planRev - planSpend) / planRev) * 100)}% <br />
                    Фактична маржинальність: {actualRev > 0 ? Math.round((stats.profit / actualRev) * 100) : 0}%
                  </div>
                )}
              </div>

            </div>

            <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-6">
              <div className="border-b border-white/5 pb-2">
                <h4 className="font-black text-xs text-white uppercase tracking-wider">Сквозна Конверсійна Воронка</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-28 relative">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Крок 1: Трафік</span>
                    <span className="text-xl font-black block mt-2 text-white">{stats.totalClicks.toLocaleString()}</span>
                    <span className="text-[9px] text-white/30 block mt-1">унікальні кліки з UTM</span>
                  </div>
                  <div className="absolute right-[-10px] top-[40%] transform -translate-y-1/2 z-10 hidden md:block">
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-28 relative">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Крок 2: Реєстрації</span>
                    <span className="text-xl font-black block mt-2 text-emerald-450">{stats.leadsCount.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1">
                      Конверсія: {stats.totalClicks > 0 ? ((stats.leadsCount / stats.totalClicks) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="absolute right-[-10px] top-[40%] transform -translate-y-1/2 z-10 hidden md:block">
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-28 relative">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Крок 3: Анкети</span>
                    <span className="text-xl font-black block mt-2 text-purple-400">{stats.quizzesCount.toLocaleString()}</span>
                    <span className="text-[10px] text-purple-400 font-bold block mt-1">
                      Конверсія: {stats.leadsCount > 0 ? ((stats.quizzesCount / stats.leadsCount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="absolute right-[-10px] top-[40%] transform -translate-y-1/2 z-10 hidden md:block">
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-28">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Крок 4: Оплати</span>
                    <span className="text-xl font-black block mt-2 text-emerald-450">{stats.salesCount.toLocaleString()}</span>
                    <span className="text-[10px] text-emerald-400 font-bold block mt-1 text-center">
                      CR з ліда: {stats.cr.toFixed(1)}% <br />
                      {stats.totalClicks > 0 && <span className="text-[9px] text-white/40 font-semibold block mt-0.5">Клік-в-оплату: {((stats.salesCount / stats.totalClicks) * 100).toFixed(2)}%</span>}
                    </span>
                  </div>
                </div>

              </div>

              {/* Step 2 Offer Variants Breakdown */}
              {stats.offerVariants && stats.offerVariants.length > 0 && (
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">
                      🎯 Розподіл реєстрацій за офферами & лендінгами (A/B)
                    </span>
                    <span className="text-[9px] text-white/30 font-semibold">
                      Всього: {stats.leadsCount} лідів
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {stats.offerVariants.map((v: any) => (
                      <div
                        key={v.key}
                        className="bg-white/[0.02] border border-white/5 hover:border-white/15 p-3 rounded-xl space-y-2 transition-all"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-white block">{v.name}</span>
                            <span className="text-[9px] text-white/40 block">
                              {v.leadsCount} лідів ({v.percentage.toFixed(1)}% від усіх)
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {v.percentage.toFixed(0)}%
                          </span>
                        </div>

                        {/* Visual distribution bar */}
                        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(v.percentage, 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-white/40 pt-1 border-t border-white/5">
                          <span>Оплати: <strong className="text-white">{v.salesCount}</strong></span>
                          <span>CR: <strong className="text-emerald-400">{v.cr.toFixed(1)}%</strong></span>
                          <span>Сума: <strong className="text-emerald-400">{Math.round(v.revenue).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {funnelStagesList.length > 0 && (
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="font-black text-xs text-white uppercase tracking-wider">Customer Journey Map (Операційна карта етапів)</h4>
                </div>
                
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                  {funnelStagesList.map((stage, idx) => (
                    <React.Fragment key={idx}>
                      <div className="flex-1 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center gap-3">
                        <div className="w-6 h-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 font-black rounded-full flex items-center justify-center text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-extrabold text-xs text-white">{stage}</div>
                          <span className="text-[8px] text-white/30 uppercase tracking-widest font-black">Етап воронки</span>
                        </div>
                      </div>
                      {idx < funnelStagesList.length - 1 && (
                        <div className="hidden md:block text-white/20">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="font-black text-xs text-white uppercase tracking-wider">Зв'язані ресурси</h4>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black text-white/40 block">Прив'язані лендінги/сторінки</label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFunnel.landing_slugs?.map((slug) => (
                        <span key={slug} className="bg-white/5 border border-white/5 text-white/80 px-2.5 py-1 rounded-xl flex items-center gap-1 font-bold">
                          <LinkIcon className="w-3 h-3 text-white/45" /> {slug}
                        </span>
                      ))}
                      {(!selectedFunnel.landing_slugs || selectedFunnel.landing_slugs.length === 0) && (
                        <span className="text-white/30 italic">Не прив'язано жодного лендінгу</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[9px] uppercase font-black text-white/40 block">Прив'язані UTM-кампанії</label>
                    <div className="flex flex-col gap-1 max-h-40 overflow-y-auto divide-y divide-white/5 pr-1">
                      {selectedFunnel.campaign_ids?.map((cid) => (
                        <div key={cid} className="py-1.5 flex justify-between items-center text-white/70 font-semibold">
                          <span>{cid}</span>
                          <span className="text-[9px] text-emerald-455 bg-emerald-500/10 px-2 py-0.5 rounded font-black">
                            {leadsList.filter(l => String(l.utm_campaign).toLowerCase() === cid.toLowerCase()).length} лід.
                          </span>
                        </div>
                      ))}
                      {(!selectedFunnel.campaign_ids || selectedFunnel.campaign_ids.length === 0) && (
                        <span className="text-white/30 italic">Не прив'язано жодної кампанії</span>
                      )}
                    </div>
                  </div>

                  {cleanDescription && (
                    <div className="space-y-1 pt-3 border-t border-white/5">
                      <label className="text-[9px] uppercase font-black text-white/40 block">Опис / Нотатки</label>
                      <p className="bg-white/[0.01] border border-white/5 p-3 rounded-xl italic text-white/60 leading-relaxed">
                        {cleanDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="border-b border-white/5 pb-2">
                  <h4 className="font-black text-xs text-white uppercase tracking-wider">Мануальні фінансові операції воронки</h4>
                </div>

                <form onSubmit={handleAddInlineTransaction} className="bg-black/25 border border-white/5 p-4 rounded-xl space-y-3 text-xs">
                  <span className="text-[10px] font-black text-emerald-455 uppercase tracking-widest block">Зафіксувати ручну операцію</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-white/50 block">Тип операції</label>
                      <select 
                        value={txType} 
                        onChange={(e) => setTxType(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 focus:ring-0"
                      >
                        <option value="expense" className="bg-neutral-900">Витрата (Expense)</option>
                        <option value="income" className="bg-neutral-900">Дохід (Income)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-white/50 block">Рахунок</label>
                      <select
                        value={txAccountId}
                        onChange={(e) => setTxAccountId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 focus:ring-0"
                      >
                        {accounts.map(a => (
                          <option key={a.id} value={a.id} className="bg-neutral-900">{a.name} ({a.currency})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-white/50 block">Категорія</label>
                      <select
                        value={txCategory}
                        onChange={(e) => setTxCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                        required
                      >
                        <option value="">Оберіть категорію...</option>
                        {categoriesList.map(c => (
                          <option key={c} value={c} className="bg-neutral-900">{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-white/50 block">Сума</label>
                      <input
                        type="number"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder="Сума..."
                        required
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <label className="text-[9px] text-white/50 block">Короткий опис</label>
                      <input
                        type="text"
                        value={txDesc}
                        onChange={(e) => setTxDesc(e.target.value)}
                        placeholder="Наприклад: Закупка реклами в блогера"
                        className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="space-y-1">
                      <input
                        type="date"
                        value={txDate}
                        onChange={(e) => setTxDate(e.target.value)}
                        className="bg-transparent border-none text-[10px] text-white/50 focus:outline-none p-0 cursor-pointer"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isAddingTx}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {isAddingTx ? "Збереження..." : "Записати"}
                    </button>
                  </div>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto text-xs pr-1">
                  <span className="text-[9px] uppercase font-black text-white/40 block">Історія операцій воронки</span>
                  {funnelTransactions.filter(tx => tx.funnel_id === selectedFunnel.id).map((tx) => {
                    const isExpense = tx.type === "expense";
                    return (
                      <div key={tx.id} className="flex justify-between items-center p-2.5 bg-white/5 border border-white/5 rounded-xl text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white">{tx.category}</span>
                            <span className={`text-[8px] uppercase font-black px-1.5 py-0.2 rounded bg-red-500/10 text-red-400`}>
                              {isExpense ? "Витрата" : "Дохід"}
                            </span>
                          </div>
                          <div className="text-[10px] text-white/45 flex items-center gap-2 font-semibold">
                            <span>{new Date(tx.date).toLocaleDateString("uk-UA")}</span>
                            <span>•</span>
                            <span className="max-w-xs truncate">{tx.description}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-black text-xs text-red-400`}>
                            {isExpense ? "-" : "+"}{Number(tx.amount || 0).toLocaleString("uk-UA")} {tx.currency === "UAH" ? "₴" : tx.currency}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteInlineTransaction(tx.id)}
                            className="text-red-400 hover:text-red-300 p-1 cursor-pointer transition-colors bg-transparent border-none"
                            title="Видалити транзакцію"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {funnelTransactions.filter(tx => tx.funnel_id === selectedFunnel.id).length === 0 && (
                    <p className="text-[10px] text-white/30 italic text-center py-4">Жодної транзакції до цієї воронки ще не прив'язано</p>
                  )}
                </div>

              </div>

            </div>

          </div>
        );
      })() : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                <Target className="w-5 h-5 text-emerald-455" />
                Управління воронками
              </h2>
              <p className={`text-xs mt-1 ${isLight ? "text-neutral-500" : "text-white/40"}`}>
                Створення маркетингових воронок для відстеження сквозної окупності
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadFunnels()}
                className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 duration-150 transition-all bg-transparent ${
                  isLight ? "hover:bg-neutral-200 text-neutral-800 border-neutral-200" : "hover:bg-white/10 text-white border-white/5"
                }`}
                title="Оновити дані"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              {activeProject && (
                <button
                  type="button"
                  onClick={() => setShowMetaModal(true)}
                  className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isLight 
                      ? "bg-white border-neutral-300 text-neutral-800 hover:bg-neutral-100" 
                      : "bg-white/5 border-white/10 text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                  title="Налаштувати рекламний кабінет Meta Ads для цього проєкту"
                >
                  <Megaphone className="w-3.5 h-3.5 text-emerald-450" />
                  <span>Кабінет Meta Ads</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold rounded-xl flex items-center gap-2 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all text-xs border-none"
              >
                <Plus className="w-4 h-4" />
                Створити воронку
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {funnels.map((funnel) => {
              const stats = getFunnelStats(funnel);
              const isActive = isFunnelActive(funnel);

              const parsedType = funnel.description?.startsWith("[Type:")
                ? funnel.description.split("]")[0].replace("[Type: ", "")
                : "Інше";

              return (
                <div 
                  key={funnel.id} 
                  onClick={() => setSelectedFunnel(funnel)}
                  className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4 text-xs text-white relative overflow-hidden group hover:border-emerald-500/40 hover:shadow-2xl cursor-pointer transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base text-white">{funnel.name}</h4>
                        <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-black text-white/50">
                          {parsedType}
                        </span>
                        <span className={`text-[8px] uppercase font-black px-2 py-0.2 rounded-full border ${
                          isActive 
                            ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" 
                            : "bg-neutral-800 text-white/40 border-white/5"
                        }`}>
                          {isActive ? "Активна" : "Завершена"}
                        </span>
                      </div>
                      <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        Старт: {new Date(funnel.start_date).toLocaleDateString("uk-UA")}
                        {funnel.end_date && ` — 🏁 Фініш: ${new Date(funnel.end_date).toLocaleDateString("uk-UA")}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinishFunnel(funnel);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-all flex items-center gap-1"
                          title="Завершити кампанію сьогоднішнім днем"
                        >
                          <CheckCircle className="w-3 h-3" /> Завершити кампанію
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReopenFunnel(funnel);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/70 hover:bg-white/10 cursor-pointer transition-all flex items-center gap-1"
                          title="Відновити активність кампанії"
                        >
                          <RefreshCw className="w-3 h-3" /> Відновити
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedFunnel(funnel)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-[10px] font-black text-white hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> Аналітика
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap md:flex-nowrap items-stretch border border-white/5 rounded-xl overflow-hidden text-xs bg-black/20">
                    <div className="flex-1 bg-white/[0.01] p-3 text-center border-r border-white/5">
                      <span className="text-[9px] uppercase font-bold text-white/40 block">Бюджет</span>
                      <span className="text-sm font-black text-white block mt-0.5">{globalCurrency === "USD" ? `$${Math.round(stats.spend).toLocaleString("uk-UA")}` : `${Math.round(stats.spend).toLocaleString("uk-UA")} ₴`}</span>
                      {funnel.planned_spend ? (
                        <span className="text-[8px] text-white/40 block mt-0.5" title={`Планові витрати: $${funnel.planned_spend}`}>
                          План: ${funnel.planned_spend} ({Math.round(funnel.planned_spend * 41.5).toLocaleString()} ₴)
                        </span>
                      ) : null}
                    </div>
                    <div className="flex-1 bg-white/[0.01] p-3 text-center border-r border-white/5">
                      <span className="text-[9px] uppercase font-bold text-white/40 block">Ліди (CPL)</span>
                      <span className="text-sm font-black text-emerald-450 block mt-0.5">{stats.leadsCount}</span>
                      <span className="text-[9px] font-bold text-white/50 block">CPL: {stats.leadsCount > 0 ? (globalCurrency === "USD" ? `$${(stats.spend / stats.leadsCount).toFixed(2)}` : `${Math.round(stats.spend / stats.leadsCount)} ₴`) : 0}</span>
                    </div>
                    <div className="flex-1 bg-white/[0.01] p-3 text-center border-r border-white/5">
                      <span className="text-[9px] uppercase font-bold text-white/40 block">Продажі (CR)</span>
                      <span className="text-sm font-black text-white block mt-0.5">{stats.salesCount}</span>
                      <span className="text-[9px] text-white/50 block font-semibold">CR: {stats.cr.toFixed(1)}%</span>
                    </div>
                    <div className="flex-1 bg-emerald-500/10 p-3 text-center flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-emerald-450 block">Виручка</span>
                      <div className="mt-auto">
                        <span className="text-sm font-black text-emerald-450 block">{globalCurrency === "USD" ? `$${Math.round(stats.revenue).toLocaleString("uk-UA")}` : `${Math.round(stats.revenue).toLocaleString("uk-UA")} ₴`}</span>
                        {funnel.planned_revenue ? (
                          <span className="text-[8px] text-emerald-400/70 block mt-0.5" title={`Плановий дохід: $${funnel.planned_revenue}`}>
                            План: ${funnel.planned_revenue} ({Math.round(funnel.planned_revenue * 41.5).toLocaleString()} ₴)
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-white/30 pt-1 border-t border-white/5 font-semibold">
                    <span className="truncate max-w-xs">Лендінги: {funnel.landing_slugs.join(", ") || "Всі"}</span>
                    <span className={`px-2 py-0.5 rounded-full font-black text-[9px] ${
                      stats.roi >= 100 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}>
                      ROI: {Math.round(stats.roi)}%
                    </span>
                  </div>
                </div>
              );
            })}

            {funnels.length === 0 && !loading && (
              <div className="col-span-2 text-center py-12 bg-neutral-900/50 border border-dashed border-white/5 rounded-2xl">
                <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/30 italic">Маркетингових воронок для цього проекту поки що не створено</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Meta Ad Account Settings Modal */}
      {showMetaModal && activeProject && (
        <ProjectSettingsModal
          isOpen={showMetaModal}
          onClose={() => setShowMetaModal(false)}
          project={activeProject}
          userRole={userRole}
          onProjectUpdated={() => {
            if (onFinanceRefresh) onFinanceRefresh();
          }}
        />
      )}
    </div>
  );
}
