"use client";

import React, { useState, useEffect } from "react";
import {
  getFunnelsAction,
  createFunnelAction,
  updateFunnelAction,
  deleteFunnelAction,
  getDiscoveredPagesAction,
  syncProjectPagesAction,
  getProjectCampaignsForFunnelAction,
  getFunnelDetailsAction,
  getSendPulseBotsAction,
  getFunnelBotEventsAction,
  getSendPulseBotContactsAction,
  syncSendPulseBotContactsAction
} from "../../actions";
import {
  createTransactionAction,
  deleteTransactionAction
} from "../../(dashboard)/project/financeActions";
import {
  Plus, Target, Calendar, Link as LinkIcon, RefreshCw, BarChart2, Layers, AlertCircle,
  Search, Sparkles, ArrowLeft, Edit3, Trash2, CheckCircle, TrendingUp, DollarSign,
  ChevronRight, Eye, Award, X, Settings, Megaphone, Bot, Copy, Check, Users, UserCheck,
  ExternalLink, Send, ShieldCheck, Phone, Mail, ArrowUpRight, Filter
} from "lucide-react";
import ProjectSettingsModal from "../components/ProjectSettingsModal";
import { isPaidStatus } from "@/lib/statusMapper";
import { transliterateToSlug } from "@/utils/transliterate";
import { SingleDatePicker } from "@/components/ui/CustomCalendarPicker";
import { SkeletonPulse } from "@/components/ui/ParabolicProgressBar";

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
  isLoading?: boolean;
}

interface Funnel {
  id: string;
  project_id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  campaign_ids: string[];
  landing_slugs: string[];
  description: string;
  bot_username?: string | null;
  bot_steps?: any[] | null;
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
    id: "Клуб",
    label: "Клуб / Підписка",
    defaultStages: [
      "Вхід на Тріал (/club/trial)",
      "Активація Тріалу (1 ₴)",
      "Telegram Mini App (/club/mini-app)",
      "Оплата 1 місяць",
      "Оплата 3 місяці",
      "Рекурентне продовження"
    ]
  },
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

  // Load deep real-time details (all leads, traffic, variants) when a funnel is opened
  const [funnelDetailsLoading, setFunnelDetailsLoading] = useState(false);
  useEffect(() => {
    if (!selectedFunnel?.id) return;
    let isCancelled = false;

    const fetchDetails = async () => {
      setFunnelDetailsLoading(true);
      try {
        const res = await getFunnelDetailsAction(projectId, selectedFunnel.id);
        if (!isCancelled && res?.success && res.stats) {
          setSelectedFunnel(prev => prev && prev.id === selectedFunnel.id ? { ...prev, stats: res.stats } : prev);
        }
      } catch (err) {
        console.error("Failed to fetch detailed funnel data:", err);
      } finally {
        if (!isCancelled) setFunnelDetailsLoading(false);
      }
    };

    fetchDetails();
    return () => { isCancelled = true; };
  }, [projectId, selectedFunnel?.id]);

  // SendPulse Bots & Funnel Bot Events
  const [sendPulseBots, setSendPulseBots] = useState<any[]>([]);
  const [selectedBotUsername, setSelectedBotUsername] = useState<string>("");
  const [botStepCounts, setBotStepCounts] = useState<Record<string, number>>({});
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  // Auto-sync selectedBotUsername with selectedFunnel's bot_username if defined
  useEffect(() => {
    if (selectedFunnel?.bot_username) {
      setSelectedBotUsername(selectedFunnel.bot_username);
    }
  }, [selectedFunnel?.id, selectedFunnel?.bot_username]);

  useEffect(() => {
    let isCancelled = false;
    const loadSendPulseData = async () => {
      try {
        const activeBot = selectedBotUsername || selectedFunnel?.bot_username || "";
        const [botsRes, eventsRes] = await Promise.all([
          getSendPulseBotsAction(projectId),
          getFunnelBotEventsAction(projectId, selectedFunnel?.id, activeBot)
        ]);

        if (!isCancelled) {
          if (botsRes && !("error" in botsRes) && Array.isArray(botsRes.bots)) {
            setSendPulseBots(botsRes.bots);
            if (!selectedBotUsername && !selectedFunnel?.bot_username && botsRes.bots.length > 0) {
              setSelectedBotUsername(botsRes.bots[0].username || "");
            }
          }
          if (eventsRes && !("error" in eventsRes) && eventsRes.stepCounts) {
            setBotStepCounts(eventsRes.stepCounts);
          } else {
            setBotStepCounts({});
          }
        }
      } catch (err) {
        console.error("Error loading SendPulse data:", err);
      }
    };

    loadSendPulseData();
    return () => { isCancelled = true; };
  }, [projectId, selectedFunnel?.id, selectedBotUsername]);

  // SendPulse Bot Contacts & 1-to-1 CRM bw_cid Mapping
  const [botContacts, setBotContacts] = useState<any[]>([]);
  const [loadingBotContacts, setLoadingBotContacts] = useState<boolean>(false);
  const [syncingBotContacts, setSyncingBotContacts] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [botContactSearch, setBotContactSearch] = useState<string>("");
  const [botContactFilter, setBotContactFilter] = useState<"all" | "active" | "trial" | "matched" | "unmatched" | "expired">("all");

  const loadBotContacts = async (botUsername?: string) => {
    const targetBot = botUsername || selectedBotUsername || selectedFunnel?.bot_username;
    if (!targetBot) return;
    setLoadingBotContacts(true);
    try {
      const res = await getSendPulseBotContactsAction(projectId, targetBot, 100);
      if (res && !("error" in res) && Array.isArray(res.contacts)) {
        setBotContacts(res.contacts);
      } else {
        setBotContacts([]);
      }
    } catch (e) {
      console.error("Error loading bot contacts:", e);
    } finally {
      setLoadingBotContacts(false);
    }
  };

  const handleSyncContacts = async () => {
    const targetBot = selectedBotUsername || selectedFunnel?.bot_username;
    if (!targetBot) return;
    setSyncingBotContacts(true);
    setSyncFeedback(null);
    try {
      const res = await syncSendPulseBotContactsAction(projectId, targetBot);
      if (res && !("error" in res)) {
        setSyncFeedback(`Успішно зіставлено ${res.syncedCount || 0} із ${res.totalContacts || 0} контактів за bw_cid!`);
        await loadBotContacts(targetBot);
      } else {
        setSyncFeedback(res.error || "Помилка синхронізації");
      }
    } catch (e: any) {
      setSyncFeedback(e.message || "Помилка запиту");
    } finally {
      setSyncingBotContacts(false);
      setTimeout(() => setSyncFeedback(null), 6000);
    }
  };

  useEffect(() => {
    if (selectedFunnel?.bot_username || selectedBotUsername) {
      loadBotContacts();
    }
  }, [selectedFunnel?.id, selectedFunnel?.bot_username, selectedBotUsername]);

  const [customStepInput, setCustomStepInput] = useState<string>("");

  const DEFAULT_BOT_STEPS = [
    { id: "bot_started", label: "1. Старт бота", slug: "bot_started", desc: "Активація ліда", color: "text-white" },
    { id: "lesson_1", label: "2. Урок 1", slug: "lesson_1", desc: "1-й модуль", color: "text-cyan-400" },
    { id: "lesson_2", label: "3. Урок 2", slug: "lesson_2", desc: "2-й модуль", color: "text-cyan-400" },
    { id: "lesson_3", label: "4. Урок 3", slug: "lesson_3", desc: "3-й модуль", color: "text-cyan-400" },
    { id: "completed", label: "5. Фініш / Бонуси", slug: "completed", desc: "Завершення", color: "text-purple-400" },
    { id: "offer_clicked", label: "6. Клік на офер", slug: "offer_clicked", desc: "Намір купити", color: "text-emerald-400" }
  ];

  const handleAddCustomBotStep = async () => {
    if (!customStepInput.trim() || !selectedFunnel) return;
    const label = customStepInput.trim();
    const slug = transliterateToSlug(label);

    const existingSteps = Array.isArray(selectedFunnel.bot_steps)
      ? selectedFunnel.bot_steps
      : DEFAULT_BOT_STEPS;

    if (existingSteps.some((s: any) => (s.slug || s.id) === slug)) {
      alert(`Крок з ідентифікатором "${slug}" вже існує у цій воронці!`);
      return;
    }

    const updatedSteps = [
      ...existingSteps,
      {
        id: slug,
        label,
        slug,
        desc: "Кастомний крок",
        color: "text-emerald-400"
      }
    ];

    try {
      const res = await updateFunnelAction(projectId, selectedFunnel.id, {
        name: selectedFunnel.name,
        startDate: selectedFunnel.start_date,
        endDate: selectedFunnel.end_date,
        campaignIds: selectedFunnel.campaign_ids || [],
        landingSlugs: selectedFunnel.landing_slugs || [],
        botUsername: selectedFunnel.bot_username || null,
        botSteps: updatedSteps,
        description: selectedFunnel.description || "",
        plannedRevenue: selectedFunnel.planned_revenue,
        plannedSpend: selectedFunnel.planned_spend,
        stages: selectedFunnel.stages || []
      });

      if (res.success && res.funnel) {
        setSelectedFunnel(res.funnel);
        setCustomStepInput("");
        loadFunnels(selectedFunnel.id);
      } else {
        alert("Помилка додавання кроку: " + res.error);
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  const handleRemoveCustomBotStep = async (stepSlug: string) => {
    if (!selectedFunnel) return;
    if (!confirm(`Видалити крок "${stepSlug}" із чат-бота воронки?`)) return;

    const currentSteps = Array.isArray(selectedFunnel.bot_steps)
      ? selectedFunnel.bot_steps
      : DEFAULT_BOT_STEPS;

    const updatedSteps = currentSteps.filter((s: any) => {
      const sSlug = s.slug || transliterateToSlug(s.label || s.name || s.id || "step");
      return sSlug !== stepSlug && s.id !== stepSlug;
    });

    try {
      const res = await updateFunnelAction(projectId, selectedFunnel.id, {
        name: selectedFunnel.name,
        startDate: selectedFunnel.start_date,
        endDate: selectedFunnel.end_date,
        campaignIds: selectedFunnel.campaign_ids || [],
        landingSlugs: selectedFunnel.landing_slugs || [],
        botUsername: selectedFunnel.bot_username || null,
        botSteps: updatedSteps,
        description: selectedFunnel.description || "",
        plannedRevenue: selectedFunnel.planned_revenue,
        plannedSpend: selectedFunnel.planned_spend,
        stages: selectedFunnel.stages || []
      });

      if (res.success && res.funnel) {
        setSelectedFunnel(res.funnel);
        loadFunnels(selectedFunnel.id);
      } else {
        alert("Помилка видалення кроку: " + (res.error || "Невідома помилка"));
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  const handleResetToDefaultBotSteps = async () => {
    if (!selectedFunnel) return;
    if (!confirm("Завантажити стандартні 6 кроків воронки?")) return;

    try {
      const res = await updateFunnelAction(projectId, selectedFunnel.id, {
        name: selectedFunnel.name,
        startDate: selectedFunnel.start_date,
        endDate: selectedFunnel.end_date,
        campaignIds: selectedFunnel.campaign_ids || [],
        landingSlugs: selectedFunnel.landing_slugs || [],
        botUsername: selectedFunnel.bot_username || null,
        botSteps: DEFAULT_BOT_STEPS,
        description: selectedFunnel.description || "",
        plannedRevenue: selectedFunnel.planned_revenue,
        plannedSpend: selectedFunnel.planned_spend,
        stages: selectedFunnel.stages || []
      });

      if (res.success && res.funnel) {
        setSelectedFunnel(res.funnel);
        loadFunnels(selectedFunnel.id);
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

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

  const [formBotUsername, setFormBotUsername] = useState<string>("");

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
    setFormBotUsername("");
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
    setFormBotUsername(funnel.bot_username || "");
    
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
          botUsername: formBotUsername || null,
          description: finalDesc,
          plannedRevenue: plannedRevNum,
          plannedSpend: plannedSpendNum,
          stages: stages
        });
      } else {
        res = await createFunnelAction(
          projectId, name, startDate, campaignIds, landingSlugs, finalDesc,
          finalEndDate, plannedRevNum, plannedSpendNum, stages, formBotUsername || null
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

  // Calculate Funnel Stats from deep data or matching leads
  const getFunnelStats = (funnel: Funnel) => {
    const isUSD = globalCurrency === "USD";

    // 1. If deep stats are preloaded or fetched via getFunnelDetailsAction, use them
    if (funnel.stats) {
      const s = funnel.stats;
      const rev = isUSD ? Number(s.revenueUSD || 0) : Number(s.revenueUAH || s.revenue || 0);
      const spd = isUSD ? Number(s.spendUSD || 0) : Number(s.spendUAH || s.spend || 0);
      const prf = rev - spd;
      const r = spd > 0 ? (prf / spd) * 100 : 0;
      const lCount = Number(s.leadsCount || 0);
      const sCount = Number(s.salesCount || 0);
      const convRate = lCount > 0 ? (sCount / lCount) * 100 : 0;

      const rawTraffic = s.trafficAnalytics;
      const trafficAnalytics = rawTraffic ? {
        totalSpend: isUSD ? Number(rawTraffic.totalSpendUSD ?? rawTraffic.totalSpend ?? spd) : Number(rawTraffic.totalSpendUAH ?? rawTraffic.totalSpend ?? spd),
        totalClicks: Number(rawTraffic.totalClicks || s.totalClicks || 0),
        impressions: Number(rawTraffic.impressions || s.impressions || 0),
        ctr: Number(rawTraffic.ctr || (rawTraffic.impressions > 0 ? (rawTraffic.totalClicks / rawTraffic.impressions) * 100 : 0) || 0),
        cpc: isUSD ? Number(rawTraffic.cpcUSD ?? rawTraffic.cpc ?? 0) : Number(rawTraffic.cpcUAH ?? rawTraffic.cpc ?? 0),
        cpm: isUSD ? Number(rawTraffic.cpmUSD ?? rawTraffic.cpm ?? 0) : Number(rawTraffic.cpmUAH ?? rawTraffic.cpm ?? 0),
        cpl: isUSD ? Number(rawTraffic.cplUSD ?? rawTraffic.cpl ?? 0) : Number(rawTraffic.cplUAH ?? rawTraffic.cpl ?? 0),
        dailyBreakdown: Array.isArray(rawTraffic.dailyBreakdown) ? rawTraffic.dailyBreakdown : []
      } : {
        totalSpend: spd,
        totalClicks: Number(s.totalClicks || 0),
        impressions: Number(s.impressions || 0),
        ctr: Number(s.ctr || 0),
        cpc: isUSD ? Number(s.cpcUSD || 0) : Number(s.cpcUAH || 0),
        cpm: isUSD ? Number(s.cpmUSD || 0) : Number(s.cpmUAH || 0),
        cpl: isUSD ? Number(s.cplUSD || 0) : Number(s.cplUAH || 0),
        dailyBreakdown: []
      };

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
        manualIncome: Number(s.manualIncome || 0),
        offerVariants: Array.isArray(s.offerVariants) ? s.offerVariants : [],
        trafficAnalytics
      };
    }

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

    const startDateTime = parseSafeTs(funnel.start_date, false);
    const endDateTime = parseSafeTs(funnel.end_date, true);
    
    // Filter leads created in the active range, matching campaign, medium, source or landing slugs
    const matchedLeads = leadsList.filter((lead: any) => {
      const leadTime = new Date(lead.created_at || lead.createdAt).getTime();
      if (startDateTime && leadTime < startDateTime) return false;
      if (endDateTime && leadTime > endDateTime) return false;

      const leadCampaign = String(lead.utm_campaign || lead.utmCampaign || lead.metadata?.raw_row?.utm_campaign || "").trim().toLowerCase();
      const leadMedium = String(lead.utm_medium || lead.utmMedium || lead.metadata?.raw_row?.utm_medium || "").trim().toLowerCase();
      const leadSource = String(lead.utm_source || lead.utmSource || lead.metadata?.raw_row?.utm_source || "").trim().toLowerCase();
      const leadCampaignId = String(lead.campaign_id || lead.campaignId || lead.metadata?.campaign_id || "").trim().toLowerCase();
      const leadLanding = String(lead.landing || lead.page_path || lead.page_url || lead.target_sheet || lead.targetSheet || lead.metadata?.target_sheet || lead.metadata?.raw_row?.page_path || lead.metadata?.raw_row?.page_url || "").trim().toLowerCase();

      // Exclude unrelated /checkout
      if (leadLanding.includes("checkout")) return false;

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
        const s = slug.toLowerCase().trim().replace(/https?:\/\/[^\/]+/g, "");
        return leadLanding.includes(s) || s.includes(leadLanding);
      });

      if (!hasCampaigns && !hasLandings) {
        return true;
      }

      return Boolean(campaignMatch || landingMatch);
    });

    let revenueUAH = 0;
    let revenueUSD = 0;
    let salesCount = 0;
    matchedLeads.forEach((lead: any) => {
      const isPaid = !lead.metadata?.raw_row?.is_free && String(lead.status || "").toLowerCase().includes("оплат") && Number(lead.amount || 0) > 0;
      if (isPaid) {
        const amt = Number(lead.amount || 0);
        salesCount++;
        revenueUAH += amt;
        revenueUSD += amt / 41.5;
      }
    });

    // Offer variants (A/B testing)
    // Rule: Default is ALWAYS Offer 1 (?o=1) if no ?o=2 or ?o=3
    const variantMap: Record<string, any> = {
      o1: { key: "o1", name: "Оффер 1 (?o=1)", url: "?o=1", leadsCount: 0, salesCount: 0, revenue: 0, percentage: 0, cr: 0, color: "cyan" },
      o2: { key: "o2", name: "Оффер 2 (?o=2)", url: "?o=2", leadsCount: 0, salesCount: 0, revenue: 0, percentage: 0, cr: 0, color: "emerald" },
      o3: { key: "o3", name: "Оффер 3 (?o=3)", url: "?o=3", leadsCount: 0, salesCount: 0, revenue: 0, percentage: 0, cr: 0, color: "purple" }
    };

    matchedLeads.forEach((lead: any) => {
      const pageUrl = String(lead.page_url || lead.pageUrl || lead.metadata?.page_url || lead.metadata?.raw_row?.page_url || "").toLowerCase();
      const sourceFlag = String(lead.source_flag || lead.metadata?.source_flag || lead.metadata?.raw_row?.source_flag || "").toLowerCase();
      const utmCampaign = String(lead.utm_campaign || lead.utmCampaign || lead.metadata?.utm_campaign || "").toLowerCase();

      let targetKey = "o1";
      if (pageUrl.includes("?o=2") || pageUrl.includes("&o=2") || sourceFlag.includes("offer 2") || utmCampaign.includes("offer2")) {
        targetKey = "o2";
      } else if (pageUrl.includes("?o=3") || pageUrl.includes("&o=3") || sourceFlag.includes("offer 3") || utmCampaign.includes("offer3")) {
        targetKey = "o3";
      }

      variantMap[targetKey].leadsCount++;
    });

    const leadsCount = matchedLeads.length;
    const offerVariants = Object.values(variantMap)
      .map((v: any) => ({
        ...v,
        percentage: leadsCount > 0 ? (v.leadsCount / leadsCount) * 100 : 0,
        cr: v.leadsCount > 0 ? (v.salesCount / v.leadsCount) * 100 : 0
      }))
      .filter((v: any) => v.leadsCount > 0)
      .sort((a: any, b: any) => b.leadsCount - a.leadsCount);

    return {
      leadsCount,
      salesCount,
      quizzesCount: 0,
      totalClicks: 0,
      impressions: 0,
      revenue: isUSD ? revenueUSD : revenueUAH,
      spend: 0,
      profit: isUSD ? revenueUSD : revenueUAH,
      roi: 0,
      cr: 0,
      manualSpend: 0,
      manualIncome: 0,
      offerVariants,
      trafficAnalytics: {
        totalSpend: 0,
        totalClicks: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpl: 0,
        dailyBreakdown: []
      }
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

                {/* Connected SendPulse Telegram Bot */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Прив'язаний Telegram-бот (SendPulse)</label>
                  <select
                    value={formBotUsername}
                    onChange={(e) => setFormBotUsername(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs"
                  >
                    <option value="" className="bg-neutral-900 text-white/50">-- Не прив'язано (або обрати пізніше) --</option>
                    {sendPulseBots.map((b: any) => (
                      <option key={b.id} value={b.username || b.name} className="bg-neutral-900 text-white">
                        {b.username ? `@${b.username}` : b.name} ({b.totalSubscribers} підписників)
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-white/40">
                    Оберіть конкретного чат-бота, події та підписники якого будуть прив'язані саме до цієї воронки.
                  </p>
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
                    <SingleDatePicker
                      value={startDate}
                      onChange={(d) => setStartDate(d)}
                      placeholder="Дата старту..."
                      required
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
                    <SingleDatePicker
                      value={endDate}
                      onChange={(d) => setEndDate(d)}
                      placeholder="Опціонально (Безстрокова)..."
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
                  {funnelDetailsLoading ? (
                    <SkeletonPulse className="h-8 w-28" />
                  ) : (
                    <span className="text-2xl font-black text-white">{Math.round(actualSpend).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}</span>
                  )}
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
                  {funnelDetailsLoading ? (
                    <SkeletonPulse className="h-8 w-28" />
                  ) : (
                    <span className="text-2xl font-black text-emerald-400">{Math.round(actualRev).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}</span>
                  )}
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
                  {funnelDetailsLoading ? (
                    <SkeletonPulse className="h-8 w-28" />
                  ) : (
                    <span className={`text-2xl font-black block ${stats.profit >= 0 ? "text-white" : "text-red-400"}`}>
                      {Math.round(stats.profit).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}
                    </span>
                  )}
                  <div className="flex justify-between text-[10px] text-white/40 font-black mt-1">
                    <span>{actualSpend > 0 ? "Сквозний ROI" : "Маржинальність"}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      actualSpend === 0 ? "bg-emerald-500/10 text-emerald-400" : stats.roi >= 150 ? "bg-emerald-500/10 text-emerald-450 animate-pulse" : stats.roi >= 100 ? "bg-blue-500/10 text-blue-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {actualSpend === 0 ? "100% (Органіка)" : `${Math.round(stats.roi)}%`}
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
              <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                <h4 className="font-black text-xs text-white uppercase tracking-wider">Сквозна Конверсійна Воронка</h4>
                {funnelDetailsLoading && <span className="text-[10px] text-emerald-400 animate-pulse font-mono">Оновлення метрик...</span>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-28 relative">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Крок 1: Трафік</span>
                    {funnelDetailsLoading ? (
                      <SkeletonPulse className="h-7 w-16 mx-auto mt-2" />
                    ) : (
                      <span className="text-xl font-black block mt-2 text-white">{stats.totalClicks.toLocaleString()}</span>
                    )}
                    <span className="text-[9px] text-white/30 block mt-1">унікальні кліки з UTM</span>
                  </div>
                  <div className="absolute right-[-10px] top-[40%] transform -translate-y-1/2 z-10 hidden md:block">
                    <ChevronRight className="w-5 h-5 text-white/20" />
                  </div>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col justify-between min-h-28 relative">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Крок 2: Реєстрації</span>
                    {funnelDetailsLoading ? (
                      <SkeletonPulse className="h-7 w-16 mx-auto mt-2" />
                    ) : (
                      <span className="text-xl font-black block mt-2 text-emerald-450">{stats.leadsCount.toLocaleString()}</span>
                    )}
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
                    {funnelDetailsLoading ? (
                      <SkeletonPulse className="h-7 w-16 mx-auto mt-2" />
                    ) : (
                      <span className="text-xl font-black block mt-2 text-purple-400">{stats.quizzesCount.toLocaleString()}</span>
                    )}
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
                    {funnelDetailsLoading ? (
                      <SkeletonPulse className="h-7 w-16 mx-auto mt-2" />
                    ) : (
                      <span className="text-xl font-black block mt-2 text-emerald-450">{stats.salesCount.toLocaleString()}</span>
                    )}
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
                    {stats.offerVariants.map((v: any) => {
                      const pct = Number(v?.percentage) || 0;
                      const crVal = Number(v?.cr) || 0;
                      const revVal = Number(v?.revenue) || 0;
                      const lCount = Number(v?.leadsCount) || 0;
                      const sCount = Number(v?.salesCount) || 0;

                      return (
                        <div
                          key={v?.key || Math.random()}
                          className="bg-white/[0.02] border border-white/5 hover:border-white/15 p-3 rounded-xl space-y-2 transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <span className="font-bold text-xs text-white block">{v?.name || "Оффер"}</span>
                              <span className="text-[9px] text-white/40 block">
                                {lCount} лідів ({pct.toFixed(1)}% від усіх)
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {pct.toFixed(0)}%
                            </span>
                          </div>

                          {/* Visual distribution bar */}
                          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-white/40 pt-1 border-t border-white/5">
                            <span>Оплати: <strong className="text-white">{sCount}</strong></span>
                            <span>CR: <strong className="text-emerald-400">{crVal.toFixed(1)}%</strong></span>
                            <span>Сума: <strong className="text-emerald-400">{Math.round(revVal).toLocaleString("uk-UA")} {isUSD ? "$" : "₴"}</strong></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Traffic Analytics Section - ONLY RENDER IF FUNNEL HAS ASSIGNED CAMPAIGNS */}
            {stats.trafficAnalytics && Array.isArray(selectedFunnel.campaign_ids) && selectedFunnel.campaign_ids.length > 0 && (
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-3">
                  <div>
                    <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-emerald-400" /> Детальна аналітика рекламного трафіку воронки
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                      Показники ефективності рекламних кампаній, що живлять дану воронку
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                    Активний трафік ({selectedFunnel.campaign_ids.length} камп.)
                  </span>
                </div>

                {/* 6 Metric KPI Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Покази (Impressions)</span>
                    <span className="text-lg font-black text-white block">
                      {(Number(stats.trafficAnalytics.impressions) || 0).toLocaleString("uk-UA")}
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">Кліки (Clicks)</span>
                    <span className="text-lg font-black text-emerald-400 block">
                      {(Number(stats.trafficAnalytics.totalClicks) || 0).toLocaleString("uk-UA")}
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">CTR (Клікабельність)</span>
                    <span className="text-lg font-black text-cyan-400 block">
                      {(Number(stats.trafficAnalytics.ctr) || 0).toFixed(2)}%
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">CPC (Ціна кліку)</span>
                    <span className="text-lg font-black text-white block">
                      {isUSD ? `$${(Number(stats.trafficAnalytics.cpc) || 0).toFixed(2)}` : `${(Number(stats.trafficAnalytics.cpc) || 0).toFixed(2)} ₴`}
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">CPM (За 1000 показів)</span>
                    <span className="text-lg font-black text-purple-400 block">
                      {isUSD ? `$${(Number(stats.trafficAnalytics.cpm) || 0).toFixed(2)}` : `${Math.round(Number(stats.trafficAnalytics.cpm) || 0).toLocaleString("uk-UA")} ₴`}
                    </span>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 p-3.5 rounded-xl space-y-1">
                    <span className="text-[9px] uppercase font-bold text-white/40 block">CPL (Ціна за лід)</span>
                    <span className="text-lg font-black text-emerald-400 block">
                      {isUSD ? `$${(Number(stats.trafficAnalytics.cpl) || 0).toFixed(2)}` : `${Math.round(Number(stats.trafficAnalytics.cpl) || 0).toLocaleString("uk-UA")} ₴`}
                    </span>
                  </div>
                </div>

                {/* Daily Traffic Breakdown Table */}
                {Array.isArray(stats.trafficAnalytics.dailyBreakdown) && stats.trafficAnalytics.dailyBreakdown.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] uppercase font-black text-white/40 block">
                      📅 Щоденна динаміка трафіку та конверсій у ліди
                    </span>

                    <div className="overflow-x-auto rounded-xl border border-white/5">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-white/[0.02] border-b border-white/5 text-[9px] uppercase font-black text-white/40">
                          <tr>
                            <th className="p-3">Дата</th>
                            <th className="p-3">Кампанія</th>
                            <th className="p-3 text-right">Витрати</th>
                            <th className="p-3 text-right">Покази</th>
                            <th className="p-3 text-right">Кліки</th>
                            <th className="p-3 text-right">CTR</th>
                            <th className="p-3 text-right">CPC</th>
                            <th className="p-3 text-right">Ліди</th>
                            <th className="p-3 text-right">CPL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-semibold text-white/70">
                          {stats.trafficAnalytics.dailyBreakdown.map((row: any, i: number) => {
                            const spendUSDVal = Number(row?.spendUSD) || 0;
                            const spendUAHVal = Number(row?.spendUAH) || (spendUSDVal * 41.5);
                            const imprVal = Number(row?.impressions) || 0;
                            const clicksVal = Number(row?.clicks) || 0;
                            const ctrVal = Number(row?.ctr) || (imprVal > 0 ? (clicksVal / imprVal) * 100 : 0);
                            const cpcUSDVal = Number(row?.cpcUSD) || (clicksVal > 0 ? spendUSDVal / clicksVal : 0);
                            const cpcUAHVal = Number(row?.cpcUAH) || (clicksVal > 0 ? spendUAHVal / clicksVal : 0);
                            const leadsVal = Number(row?.leadsCount) || 0;
                            const cplUSDVal = Number(row?.cplUSD) || (leadsVal > 0 ? spendUSDVal / leadsVal : 0);
                            const cplUAHVal = Number(row?.cplUAH) || (leadsVal > 0 ? spendUAHVal / leadsVal : 0);

                            return (
                              <tr key={i} className="hover:bg-white/[0.02] transition-all">
                                <td className="p-3 text-white font-bold">{row?.date || "—"}</td>
                                <td className="p-3 truncate max-w-xs text-white/60">{row?.campaignName || "Кампанія"}</td>
                                <td className="p-3 text-right text-white font-bold">
                                  {isUSD ? `$${spendUSDVal.toFixed(2)}` : `${Math.round(spendUAHVal).toLocaleString("uk-UA")} ₴`}
                                </td>
                                <td className="p-3 text-right">{imprVal.toLocaleString("uk-UA")}</td>
                                <td className="p-3 text-right text-cyan-400">{clicksVal.toLocaleString("uk-UA")}</td>
                                <td className="p-3 text-right">{ctrVal.toFixed(2)}%</td>
                                <td className="p-3 text-right">
                                  {isUSD ? `$${cpcUSDVal.toFixed(2)}` : `${cpcUAHVal.toFixed(2)} ₴`}
                                </td>
                                <td className="p-3 text-right text-emerald-400 font-bold">{leadsVal}</td>
                                <td className="p-3 text-right text-emerald-400 font-bold">
                                  {leadsVal > 0 ? (isUSD ? `$${cplUSDVal.toFixed(2)}` : `${Math.round(cplUAHVal).toLocaleString("uk-UA")} ₴`) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {funnelStagesList.length > 0 && (
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="border-b border-white/5 pb-2 flex justify-between items-center">
                  <h4 className="font-black text-xs text-white uppercase tracking-wider">Customer Journey Map (Операційна карта етапів)</h4>
                  <span className="text-[10px] text-white/40 font-bold">Сквозна конверсія</span>
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

            {/* SendPulse Chatbot Integration & Live Milestones - ONLY RENDER IF BOT IS BOUND */}
            {Boolean(selectedFunnel.bot_username) && (
              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h4 className="font-black text-xs text-white uppercase tracking-wider flex items-center gap-2">
                      <Bot className="w-4 h-4 text-emerald-400" /> SendPulse Чат-бот: @{selectedFunnel.bot_username?.replace('@', '')}
                    </h4>
                    <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                      Наскрізний трекінг кроків ланцюжка. Створюйте кроки та копіюйте Webhook для блоків «Дія» в SendPulse.
                    </p>
                  </div>

                  {/* Add Step Input & Button */}
                  <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                      <input
                        type="text"
                        value={customStepInput}
                        onChange={(e) => setCustomStepInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomBotStep();
                          }
                        }}
                        placeholder="Назва кроку (напр. Урок 1, Здав ДЗ)..."
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCustomBotStep}
                      disabled={!customStepInput.trim()}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Додати крок</span>
                    </button>
                  </div>
                </div>

                {/* Bot Milestones Step Cards */}
                {(() => {
                  const funnelSteps = Array.isArray(selectedFunnel.bot_steps)
                    ? selectedFunnel.bot_steps
                    : DEFAULT_BOT_STEPS;

                  if (funnelSteps.length === 0) {
                    return (
                      <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-6 text-center space-y-3">
                        <p className="text-xs text-white/50">
                          У цьому чат-боті ще не створено жодного кроку для відстеження.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetToDefaultBotSteps}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                        >
                          Завантажити стандартний набір кроків (Урок 1-3, Фініш, Офер)
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {funnelSteps.map((item: any) => {
                        const cleanSlug = item.slug || transliterateToSlug(item.label || item.name || 'step');
                        const count = botStepCounts[cleanSlug] || 0;
                        const boundBot = selectedFunnel.bot_username?.replace('@', '') || '';
                        const webhookUrl = `https://bnw-prod.vercel.app/api/v1/integrations/sendpulse/webhook?project=${activeProject?.slug || 'sergiy'}&bot=${boundBot}&funnel_id=${selectedFunnel.id}&step=${cleanSlug}`;
                        const isCopied = copiedStep === cleanSlug;

                        return (
                          <div key={cleanSlug} className="bg-white/[0.02] border border-white/5 hover:border-white/15 p-3 rounded-xl space-y-2 flex flex-col justify-between transition-all group">
                            <div>
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[11px] font-extrabold text-white block truncate" title={item.label}>
                                  {item.label}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-sm font-black ${item.color || 'text-white'}`}>{count}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveCustomBotStep(cleanSlug)}
                                    className="opacity-40 group-hover:opacity-100 hover:text-rose-400 text-white/50 hover:bg-rose-500/10 transition-all p-1 rounded-lg cursor-pointer"
                                    title="Видалити цей крок із воронки"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                              <span className="text-[9px] text-white/40 block font-mono mt-0.5 truncate" title={`step=${cleanSlug}`}>
                                step={cleanSlug}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (navigator?.clipboard) {
                                  navigator.clipboard.writeText(webhookUrl);
                                  setCopiedStep(cleanSlug);
                                  setTimeout(() => setCopiedStep(null), 2500);
                                }
                              }}
                              className="w-full mt-2 px-2 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-bold text-white/70 hover:text-white rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Скопіювати Webhook URL для SendPulse"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Скопійовано!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-white/50" />
                                  <span>Копіювати Webhook</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* SendPulse Subscribers & CRM bw_cid Mapping Section */}
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-white">
                          Підписники бота & Сквозний маппінг (bw_cid)
                        </h5>
                        <span className="text-[10px] text-white/40">
                          {botContacts.length > 0
                            ? `Завантажено ${botContacts.length} контактів (${botContacts.filter(c => c.isMatched).length} зв'язано з CRM)`
                            : "Завантаження контактів..."}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleSyncContacts}
                        disabled={syncingBotContacts}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 shrink-0"
                        title="Зіставити контактів бота з лідами CRM та проставити bw_cid"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingBotContacts ? "animate-spin" : ""}`} />
                        <span>{syncingBotContacts ? "Синхронізація..." : "Синхронізувати з CRM"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => loadBotContacts()}
                        disabled={loadingBotContacts}
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer"
                        title="Оновити список"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingBotContacts ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {syncFeedback && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{syncFeedback}</span>
                    </div>
                  )}

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        value={botContactSearch}
                        onChange={(e) => setBotContactSearch(e.target.value)}
                        placeholder="Пошук за ім'ям, @username, телефоном або bw_cid..."
                        className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
                      />
                      {botContactSearch && (
                        <button
                          onClick={() => setBotContactSearch("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setBotContactFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          botContactFilter === "all" ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        Всі ({botContacts.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBotContactFilter("active")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                          botContactFilter === "active" ? "bg-emerald-500/20 text-emerald-400" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        🟢 Активні ({botContacts.filter(c => c.rawClubStatus === "active" && c.rawTariff !== "trial_1_week").length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBotContactFilter("trial")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                          botContactFilter === "trial" ? "bg-amber-500/20 text-amber-300" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        🟡 Тріал ({botContacts.filter(c => c.rawTariff === "trial_1_week" || String(c.rawClubStatus || "").includes("trial") || String(c.rawClubStatus || "").includes("funnel")).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBotContactFilter("matched")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 cursor-pointer ${
                          botContactFilter === "matched" ? "bg-cyan-500/20 text-cyan-300" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        <Check className="w-3 h-3" /> Зв'язані ({botContacts.filter(c => c.isMatched).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBotContactFilter("expired")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                          botContactFilter === "expired" ? "bg-red-500/20 text-red-400" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        🔴 Закінчились ({botContacts.filter(c => c.rawClubStatus === "expired" || c.rawClubStatus === "payment_failed").length})
                      </button>
                    </div>
                  </div>

                  {/* Contacts Table */}
                  <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.01]">
                    <div className="overflow-x-auto max-h-[460px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[#0c0c10] border-b border-white/10 text-[9px] uppercase font-black text-white/40 z-10">
                          <tr>
                            <th className="p-3">Учасник / Telegram</th>
                            <th className="p-3">Тариф & Статус Клубу</th>
                            <th className="p-3">Сквозний ID (bw_cid)</th>
                            <th className="p-3">Контакти (Телефон / Email)</th>
                            <th className="p-3 text-right">Оплати в CRM</th>
                            <th className="p-3 text-right">Останній актив</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-semibold text-white/80">
                          {(() => {
                            const filtered = botContacts.filter((c: any) => {
                              if (botContactFilter === "active" && !(c.rawClubStatus === "active" && c.rawTariff !== "trial_1_week")) return false;
                              if (botContactFilter === "trial" && !(c.rawTariff === "trial_1_week" || String(c.rawClubStatus || "").includes("trial") || String(c.rawClubStatus || "").includes("funnel"))) return false;
                              if (botContactFilter === "matched" && !c.isMatched) return false;
                              if (botContactFilter === "expired" && !(c.rawClubStatus === "expired" || c.rawClubStatus === "payment_failed")) return false;
                              if (!botContactSearch.trim()) return true;
                              const q = botContactSearch.toLowerCase();
                              const nameMatch = String(c.name || "").toLowerCase().includes(q);
                              const usernameMatch = String(c.username || "").toLowerCase().includes(q);
                              const phoneMatch = String(c.phone || "").toLowerCase().includes(q);
                              const bwMatch = String(c.bwCid || "").toLowerCase().includes(q);
                              const tariffMatch = String(c.tariff || "").toLowerCase().includes(q);
                              const statusMatch = String(c.clubStatus || "").toLowerCase().includes(q);
                              const varMatch = Object.values(c.variables || {}).some(v => String(v).toLowerCase().includes(q));
                              return nameMatch || usernameMatch || phoneMatch || bwMatch || tariffMatch || statusMatch || varMatch;
                            });

                            if (loadingBotContacts) {
                              return (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-white/40 italic">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                                    Завантаження бази підписників та учасників клубу...
                                  </td>
                                </tr>
                              );
                            }

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={6} className="p-8 text-center text-white/30 italic">
                                    {botContacts.length === 0
                                      ? "Не знайдено підписників або перевірте зв'язок з базою."
                                      : "Немає підписників, які відповідають критеріям пошуку."}
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map((c: any) => {
                              const cleanUsername = (c.username || "").replace(/^@/, "");
                              return (
                                <tr key={c.id} className="hover:bg-white/[0.02] transition-all">
                                  <td className="p-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                                        c.rawClubStatus === "active"
                                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                          : c.isMatched
                                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                          : "bg-white/5 text-white/50 border border-white/5"
                                      }`}>
                                        {(c.name || "U")[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <span className="font-extrabold text-white block truncate max-w-[150px]" title={c.name}>
                                          {c.name}
                                        </span>
                                        {cleanUsername ? (
                                          <a
                                            href={`https://t.me/${cleanUsername}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 mt-0.5"
                                          >
                                            @{cleanUsername} <ExternalLink className="w-2.5 h-2.5" />
                                          </a>
                                        ) : (
                                          <span className="text-[9px] text-white/30 font-mono block">ID: {String(c.telegramId || c.id)?.substring(0, 10)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Tariff & Club Status */}
                                  <td className="p-3">
                                    <div className="space-y-1">
                                      {c.tariff ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-extrabold">
                                            {c.tariff}
                                          </span>
                                          {c.isSubscription && (
                                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                                              🔄 Рекурент
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-white/30 italic">Без тарифу</span>
                                      )}
                                      {c.clubStatus && (
                                        <span className="text-[10px] text-white/60 block font-semibold">
                                          {c.clubStatus}
                                        </span>
                                      )}
                                      {c.expiresAt && (
                                        <span className="text-[9px] text-white/30 font-mono block">
                                          Діє до: {new Date(c.expiresAt).toLocaleDateString("uk-UA")}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    {c.bwCid ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                                        <ShieldCheck className="w-3 h-3 shrink-0" />
                                        {c.bwCid}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-white/30 italic">
                                        Не прив'язано
                                      </span>
                                    )}
                                  </td>

                                  <td className="p-3">
                                    <div className="space-y-0.5">
                                      {c.phone ? (
                                        <span className="text-white/80 font-mono text-[11px] flex items-center gap-1">
                                          <Phone className="w-3 h-3 text-white/30" /> {c.phone}
                                        </span>
                                      ) : (
                                        <span className="text-white/20 text-[10px] italic">Немає телефону</span>
                                      )}
                                      {c.email && (
                                        <span className="text-white/50 text-[10px] flex items-center gap-1">
                                          <Mail className="w-3 h-3 text-white/30" /> {c.email}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="p-3 text-right">
                                    {c.totalPaidAmount > 0 ? (
                                      <div>
                                        <span className="text-emerald-400 font-black text-xs block">
                                          {c.totalPaidAmount.toLocaleString("uk-UA")} ₴
                                        </span>
                                        <span className="text-[9px] text-white/40">
                                          {c.ordersCount} {c.ordersCount === 1 ? "замовлення" : "замовлень"}
                                        </span>
                                      </div>
                                    ) : c.ordersCount > 0 ? (
                                      <span className="text-amber-400 text-[10px] font-bold">Очікує оплати</span>
                                    ) : (
                                      <span className="text-white/30 text-[10px] italic">0 ₴</span>
                                    )}
                                  </td>

                                  <td className="p-3 text-right">
                                    <span className="text-[10px] text-white/50 block font-mono">
                                      {c.lastActivity ? new Date(c.lastActivity).toLocaleDateString("uk-UA", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
                      <SingleDatePicker
                        value={txDate}
                        onChange={(d) => setTxDate(d)}
                        placeholder="Дата..."
                        className="w-36"
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
