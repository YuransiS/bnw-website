"use client";

import React, { useState, useEffect } from "react";
import {
  getFunnelsAction,
  createFunnelAction,
  updateFunnelAction,
  deleteFunnelAction,
  getDiscoveredPagesAction,
  syncProjectPagesAction
} from "../../actions";
import {
  createTransactionAction,
  deleteTransactionAction
} from "../../(dashboard)/project/financeActions";
import {
  Plus, Target, Calendar, Link as LinkIcon, RefreshCw, BarChart2, Layers, AlertCircle,
  Search, Sparkles, ArrowLeft, Edit3, Trash2, CheckCircle, TrendingUp, DollarSign,
  ChevronRight, Eye, Award
} from "lucide-react";

interface FunnelsTabProps {
  projectId: string;
  campaignsList: any[]; // Existing UTM campaigns
  leadsList: any[];     // Existing leads
  costsList?: any[];    // Raw daily cost records
  isLight: boolean;
  accounts: { id: string; name: string; currency: string }[];
  customCategories: { name: string; type: string }[];
  defaultCategories: { income: string[]; expense: string[] };
  onFinanceRefresh?: () => void;
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
}

const FUNNEL_TYPES = [
  {
    id: "Інтенсив",
    label: "Інтенсив",
    defaultStages: [
      "Реєстрація на інтенсив",
      "Участь в інтенсиві (День 1-3)",
      "Домашні завдання",
      "Анкета / Офер",
      "Оплата (Заявка)"
    ]
  },
  {
    id: "Вебінар",
    label: "Вебінар",
    defaultStages: [
      "Підписка в бот",
      "Реєстрація на вебінар",
      "Перегляд вебінару",
      "Анкета діагностики",
      "Оплата (Заявка)"
    ]
  },
  {
    id: "Автовеб",
    label: "Автовеб",
    defaultStages: [
      "Підписка в бот",
      "Реєстрація на автовеб",
      "Перегляд ефіру",
      "Анкета діагностики",
      "Оплата (Заявка)"
    ]
  },
  {
    id: "Марафон",
    label: "Марафон",
    defaultStages: [
      "Підписка на марафон",
      "Участь у марафоні",
      "Виконання завдань",
      "Анкета діагностики",
      "Оплата (Заявка)"
    ]
  },
  {
    id: "VSL",
    label: "VSL",
    defaultStages: [
      "Перехід на VSL",
      "Перегляд відео",
      "Клік по кнопці оферу",
      "Анкета діагностики",
      "Оплата (Заявка)"
    ]
  },
  {
    id: "Діагностика",
    label: "Діагностика",
    defaultStages: [
      "Заявка на діагностику",
      "Кваліфікація ліда",
      "Проведення розбору",
      "Виставлення рахунку",
      "Оплата"
    ]
  },
  {
    id: "Трипваєр",
    label: "Трипваєр",
    defaultStages: [
      "Перехід на лендінг",
      "Купівля трипваєру",
      "Допродаж основного курсу",
      "Оплата основного продукту"
    ]
  }
];

export default function FunnelsTab({
  projectId,
  campaignsList,
  leadsList,
  costsList = [],
  isLight,
  accounts,
  customCategories,
  defaultCategories,
  onFinanceRefresh
}: FunnelsTabProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelTransactions, setFunnelTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected funnel details view state
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);

  // Discovered Pages & Multiselect State
  const [discoveredPages, setDiscoveredPages] = useState<any[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchPageQuery, setSearchPageQuery] = useState("");
  const [manualPageInput, setManualPageInput] = useState("");

  // Campaigns Multiselect State
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [searchCampaignQuery, setSearchCampaignQuery] = useState("");
  
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

  // Load Funnels and Pages
  const loadFunnels = async (keepSelectionId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [funnelRes, _syncRes] = await Promise.all([
        getFunnelsAction(projectId),
        syncProjectPagesAction(projectId).catch((err) => {
          console.warn("Domain pages sync failed, falling back to local DB:", err);
          return { error: err.message };
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

  // Quick Finish Funnel action
  const handleFinishFunnel = async (funnel: Funnel) => {
    const today = new Date().toISOString().split("T")[0];
    const confirmFinish = confirm(`Завершити кампанію / воронку "${funnel.name}" сьогоднішнім числом (${today})?`);
    if (!confirmFinish) return;

    try {
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
        campaignIds: funnel.campaign_ids,
        landingSlugs: funnel.landing_slugs,
        description: funnel.description,
        plannedRevenue: funnel.planned_revenue || 0,
        plannedSpend: funnel.planned_spend || 0,
        stages: parsedStages
      });

      if (res.error) {
        alert("Не вдалося завершити кампанію: " + res.error);
      } else {
        loadFunnels(funnel.id);
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  // Re-open Completed Funnel action (remove end_date)
  const handleReopenFunnel = async (funnel: Funnel) => {
    const confirmReopen = confirm(`Відновити воронку "${funnel.name}" як активну (зняти дату завершення)?`);
    if (!confirmReopen) return;

    try {
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
        campaignIds: funnel.campaign_ids,
        landingSlugs: funnel.landing_slugs,
        description: funnel.description,
        plannedRevenue: funnel.planned_revenue || 0,
        plannedSpend: funnel.planned_spend || 0,
        stages: parsedStages
      });

      if (res.error) {
        alert("Не вдалося відновити воронку: " + res.error);
      } else {
        loadFunnels(funnel.id);
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    }
  };

  // Delete Funnel
  const handleDeleteFunnel = async (funnel: Funnel) => {
    const confirmDelete = confirm(`Ви впевнені, що хочете остаточно видалити воронку "${funnel.name}"? Усі прив'язані транзакції буде відв'язано.`);
    if (!confirmDelete) return;

    try {
      const res = await deleteFunnelAction(projectId, funnel.id);
      if (res.error) {
        alert("Помилка видалення: " + res.error);
      } else {
        setSelectedFunnel(null);
        loadFunnels();
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
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
    const startDateTime = new Date(funnel.start_date + "T00:00:00").getTime();
    const endDateTime = funnel.end_date 
      ? new Date(funnel.end_date + "T23:59:59").getTime()
      : null;
    
    // Filter leads created in the active range, matching campaign or landing slugs
    const matchedLeads = leadsList.filter((lead: any) => {
      const leadTime = new Date(lead.created_at).getTime();
      if (leadTime < startDateTime) return false;
      if (endDateTime && leadTime > endDateTime) return false;

      const leadCampaign = String(lead.utm_campaign || lead.utmCampaign || "").trim().toLowerCase();
      const leadLanding = String(lead.landing || lead.page_path || lead.page_url || lead.target_sheet || lead.metadata?.target_sheet || "").trim().toLowerCase();
      const visitedLandings = (lead.visited_landings || lead.visitedLandings || []).map((l: string) => String(l).toLowerCase());

      const hasCampaigns = Array.isArray(funnel.campaign_ids) && funnel.campaign_ids.length > 0;
      const hasLandings = Array.isArray(funnel.landing_slugs) && funnel.landing_slugs.length > 0;

      const campaignMatch = hasCampaigns && funnel.campaign_ids.some((id) => id && leadCampaign.includes(id.toLowerCase()));
      const landingMatch = hasLandings && funnel.landing_slugs.some((slug) => {
        if (!slug) return false;
        const s = slug.toLowerCase();
        return leadLanding.includes(s) || visitedLandings.some((vl: string) => vl.includes(s));
      });

      if (!hasCampaigns && !hasLandings) {
        return true;
      }

      return Boolean(campaignMatch || landingMatch);
    });

    // Sum revenue from these leads
    let revenue = 0;
    let salesCount = 0;
    matchedLeads.forEach((lead: any) => {
      if (lead.status === "closed_won" || lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер") {
        revenue += Number(lead.amount || 0);
        salesCount++;
      }
    });

    // Calculate surveys/quizzes count
    const quizzesCount = matchedLeads.filter(
      (l: any) => l.diagnosticsComment && l.diagnosticsComment.trim().length > 0
    ).length;

    // Sum Ad Spends from daily traffic costs in the active range
    let spend = 0;
    costsList.forEach((c: any) => {
      const isMatched = funnel.campaign_ids.some((id) => 
        String(c.campaign_name || "").toLowerCase().includes(id.toLowerCase())
      );
      if (!isMatched) return;
      
      const costDate = new Date(c.date + "T12:00:00").getTime();
      if (costDate < startDateTime) return;
      if (endDateTime && costDate > endDateTime) return;
      
      // Spend in UAH
      spend += Number(c.spend || 0);
    });

    // Sum manual transactions bound to this funnel
    let manualSpendUAH = 0;
    let manualIncomeUAH = 0;

    funnelTransactions.forEach((tx: any) => {
      if (tx.funnel_id === funnel.id) {
        const amt = Number(tx.amount || 0);
        const isUAH = tx.currency === "UAH";
        const amtUAH = isUAH ? amt : amt * 41; // Conversion rate to UAH
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

    // Click sum from campaigns
    let totalClicks = 0;
    campaignsList.forEach((c: any) => {
      const isMatched = funnel.campaign_ids.some((id) => 
        String(c.campaign_name || "").toLowerCase().includes(id.toLowerCase())
      );
      if (isMatched) {
        totalClicks += Number(c.clicks || 0);
      }
    });

    return {
      leadsCount,
      salesCount,
      quizzesCount,
      totalClicks,
      revenue,
      spend,
      profit,
      roi,
      cr,
      manualSpend: manualSpendUAH,
      manualIncome: manualIncomeUAH
    };
  };

  // Determine funnel active state
  const isFunnelActive = (funnel: Funnel) => {
    if (!funnel.end_date) return true;
    const today = new Date().toISOString().split("T")[0];
    return funnel.end_date >= today;
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

      {/* VIEW 1: CREATION / EDITING WIZARD */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4 max-w-2xl text-xs text-white">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">
              {editingFunnel ? "Редагування" : "Створення"} воронки (Крок {wizardStep} з 5)
            </h3>
            <button 
              type="button" 
              onClick={() => { setShowForm(false); setEditingFunnel(null); }}
              className="text-white/40 hover:text-white cursor-pointer"
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
                <label className="text-[10px] uppercase font-bold text-white/50">Опис / Нотатки</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Додаткова інформація..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!name.trim()}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Далі
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Дати та Фінансові Плани */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50">Дата старту *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50 flex justify-between">
                    <span>Дата завершення</span>
                    <span className="text-[9px] text-emerald-400 font-bold">(необов'язково)</span>
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                  />
                  <p className="text-[9px] text-white/40 pt-0.5">
                    Необов'язково. Якщо не вказано — воронка триватиме безперервно до натискання «Завершити кампанію».
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50">Плановий бюджет (витрати) в ₴</label>
                  <input
                    type="number"
                    value={plannedSpend}
                    onChange={(e) => setPlannedSpend(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-white/50">Планова виручка (доходи) в ₴</label>
                  <input
                    type="number"
                    value={plannedRevenue}
                    onChange={(e) => setPlannedRevenue(e.target.value)}
                    placeholder="150000"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
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
                  onClick={() => setWizardStep(3)}
                  disabled={!startDate}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Далі
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Активні сторінки */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-white/50">Лендінги / Сторінки проекту</label>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Autoсинхронізація
                  </span>
                </div>
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchPageQuery}
                    onChange={(e) => setSearchPageQuery(e.target.value)}
                    placeholder="Пошук сторінки (наприклад: /intensive)..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                  />
                </div>

                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/35">
                  <div className="max-h-40 overflow-y-auto divide-y divide-white/5 custom-scrollbar text-xs">
                    {discoveredPages
                      .filter((p) =>
                        String(p.path).toLowerCase().includes(searchPageQuery.toLowerCase()) ||
                        String(p.title || "").toLowerCase().includes(searchPageQuery.toLowerCase())
                      )
                      .map((p) => {
                        const isSelected = selectedPages.includes(p.path);
                        const isDirect = p.source === "direct_register";
                        const segments = p.path.split("/").filter(Boolean);
                        const depth = segments.length;
                        const lastSegment = segments[segments.length - 1] || "/";
                        const displayLabel = depth <= 1 ? p.path : `└─ /${lastSegment}`;

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPages(selectedPages.filter((path) => path !== p.path));
                              } else {
                                setSelectedPages([...selectedPages, p.path]);
                              }
                            }}
                            style={{ paddingLeft: depth > 1 ? `${(depth - 1) * 1.25 + 0.75}rem` : '0.75rem' }}
                            className={`flex justify-between items-center pr-3 py-2 cursor-pointer transition-all hover:bg-white/5 ${
                              isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 w-3.5 h-3.5"
                              />
                              <span className={`font-bold ${isSelected ? "text-emerald-450" : "text-white"} ${depth > 1 ? "text-white/60 font-semibold" : ""}`}>
                                {displayLabel}
                              </span>
                              {p.title && <span className="text-[10px] text-white/40">({p.title})</span>}
                            </div>
                            <div>
                              <span className={`text-[8px] border px-1.5 py-0.5 rounded uppercase font-bold ${
                                isDirect ? "bg-emerald-500/10 text-emerald-450 border-emerald-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              }`}>
                                {isDirect ? "Виявлено" : "Трафік"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {selectedPages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    {selectedPages.map((path) => (
                      <span
                        key={path}
                        onClick={() => setSelectedPages(selectedPages.filter((p) => p !== path))}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-450 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all text-[10px]"
                      >
                        {path} <span className="text-white/40">×</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="space-y-1 pt-1">
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Інші сторінки сайту вручну (через кому)</label>
                  <input
                    type="text"
                    value={manualPageInput}
                    onChange={(e) => setManualPageInput(e.target.value)}
                    placeholder="marathon_page, web_landing_new"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                  />
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
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Рекламні Кампанії (Meta / Facebook Ads)</label>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Оберіть рекламні кампанії Facebook, трафік з яких належить до цієї воронки (необов'язково).
                  </p>
                </div>
                
                {campaignsList.length > 0 ? (
                  <>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={searchCampaignQuery}
                        onChange={(e) => setSearchCampaignQuery(e.target.value)}
                        placeholder="Пошук рекламних кампаній..."
                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                      />
                    </div>

                    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/35">
                      <div className="max-h-48 overflow-y-auto divide-y divide-white/5 custom-scrollbar text-xs">
                        {Array.from(new Set(campaignsList.map((c: any) => String(c.campaign_name || '').trim()).filter(Boolean)))
                          .filter((campName) => campName.toLowerCase().includes(searchCampaignQuery.toLowerCase()))
                          .map((campName) => {
                            const isSelected = selectedCampaigns.includes(campName);
                            const stats = campaignsList.find((c) => c.campaign_name === campName);
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
                                {spendUSD > 0 && (
                                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded font-black text-white/50">
                                    Витрати: ${Math.round(spendUSD).toLocaleString()} ({leadsCount} лід.)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {selectedCampaigns.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                        {selectedCampaigns.map((camp) => (
                          <span
                            key={camp}
                            onClick={() => setSelectedCampaigns(selectedCampaigns.filter((c) => c !== camp))}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-450 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all text-[10px]"
                          >
                            {camp} <span className="text-white/40">×</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-5 text-center rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                    <p className="text-xs text-white/70 font-semibold">
                      Рекламні кампанії з кабінету Meta Ads підтягнуться автоматично після синхронізації витрат.
                    </p>
                    <p className="text-[11px] text-white/40">
                      Цей крок необов'язковий — воронка рахуватиме лідів за обраними лендінгами та датами.
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
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-white/50 block">Етапи шляху клієнта у воронці</label>
                <p className="text-[10px] text-white/40">Налаштуйте кроки, які проходить лід у межах цієї маркетингової воронки</p>
                
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {stages.map((stage, index) => (
                    <div key={index} className="flex justify-between items-center bg-white/5 border border-white/5 p-2 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] bg-white/5 w-4 h-4 rounded-full flex items-center justify-center font-bold text-white/40">
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
                          className="bg-transparent border-none font-bold text-white focus:outline-none text-xs w-48 focus:border-b focus:border-emerald-500 focus:ring-0 p-0"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStage(index)}
                        className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                        title="Видалити етап"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Наприклад: Замовлення дзвінка"
                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs placeholder-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Додати етап
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

        const planSpend = selectedFunnel.planned_spend || 0;
        const actualSpend = stats.spend;
        const spendPercent = planSpend > 0 ? (actualSpend / planSpend) * 100 : 0;
        
        const planRev = selectedFunnel.planned_revenue || 0;
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
                  <span className="text-2xl font-black text-white">{Math.round(actualSpend).toLocaleString("uk-UA")} ₴</span>
                  <div className="flex justify-between text-[10px] text-white/40 font-semibold">
                    <span>План: {planSpend > 0 ? `${Math.round(planSpend).toLocaleString("uk-UA")} ₴` : "не вказано"}</span>
                    {planSpend > 0 && (
                      <span>{spendPercent > 100 ? "Перевитрата!" : `Залишок: ${Math.round(planSpend - actualSpend).toLocaleString("uk-UA")} ₴`}</span>
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
                    Рекламні витрати: {Math.round(actualSpend - stats.manualSpend).toLocaleString()} ₴ <br />
                    Додаткові витрати (ручні): {Math.round(stats.manualSpend).toLocaleString()} ₴
                  </div>
                )}
              </div>

              <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h4 className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Виручка (Доходи)</h4>
                  <Award className="w-4 h-4 text-emerald-450" />
                </div>
                <div className="space-y-1">
                  <span className="text-2xl font-black text-emerald-400">{Math.round(actualRev).toLocaleString("uk-UA")} ₴</span>
                  <div className="flex justify-between text-[10px] text-white/40 font-semibold">
                    <span>План: {planRev > 0 ? `${Math.round(planRev).toLocaleString("uk-UA")} ₴` : "не вказано"}</span>
                    {planRev > 0 && (
                      <span className={revPercent >= 100 ? "text-emerald-400 font-bold" : "text-amber-500"}>
                        {revPercent >= 100 ? "Виконано! 🎉" : `Залишилось: ${Math.round(Math.max(0, planRev - actualRev)).toLocaleString("uk-UA")} ₴`}
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
                    Надходження з курсів: {Math.round(actualRev - stats.manualIncome).toLocaleString()} ₴ <br />
                    Додаткові надходження (ручні): {Math.round(stats.manualIncome).toLocaleString()} ₴
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
                    {Math.round(stats.profit).toLocaleString("uk-UA")} ₴
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
                  className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4 text-xs text-white relative overflow-hidden group hover:border-white/10 transition-all duration-300"
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
                      <span className="text-sm font-black text-white block mt-0.5">{Math.round(stats.spend).toLocaleString("uk-UA")} ₴</span>
                      {funnel.planned_spend ? (
                        <span className="text-[8px] text-white/30 block mt-0.5">План: {Math.round(funnel.planned_spend).toLocaleString()} ₴</span>
                      ) : null}
                    </div>
                    <div className="flex-1 bg-white/[0.01] p-3 text-center border-r border-white/5">
                      <span className="text-[9px] uppercase font-bold text-white/40 block">Ліди (CPL)</span>
                      <span className="text-sm font-black text-emerald-450 block mt-0.5">{stats.leadsCount}</span>
                      <span className="text-[9px] font-bold text-white/50 block">CPL: {stats.leadsCount > 0 ? Math.round(stats.spend / stats.leadsCount) : 0} ₴</span>
                    </div>
                    <div className="flex-1 bg-white/[0.01] p-3 text-center border-r border-white/5">
                      <span className="text-[9px] uppercase font-bold text-white/40 block">Продажі (CR)</span>
                      <span className="text-sm font-black text-white block mt-0.5">{stats.salesCount}</span>
                      <span className="text-[9px] text-white/50 block font-semibold">CR: {stats.cr.toFixed(1)}%</span>
                    </div>
                    <div className="flex-1 bg-emerald-500/10 p-3 text-center flex flex-col justify-between">
                      <span className="text-[9px] uppercase font-bold text-emerald-450 block">Виручка</span>
                      <div className="mt-auto">
                        <span className="text-sm font-black text-emerald-450 block">{Math.round(stats.revenue).toLocaleString("uk-UA")} ₴</span>
                        {funnel.planned_revenue ? (
                          <span className="text-[8px] text-emerald-400/50 block mt-0.5">План: {Math.round(funnel.planned_revenue).toLocaleString()} ₴</span>
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
    </div>
  );
}
