"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Layers, 
  ArrowRight, 
  ShieldAlert, 
  Award, 
  ChevronRight,
  Calendar,
  DollarSign,
  TrendingUp,
  Target,
  Plus,
  RefreshCw,
  X,
  Check,
  Filter,
  Sparkles
} from "lucide-react";
import { getCellAnalyticsAction, updateProjectPlanAction } from "./cellActions";
import { ParabolicProgressBar } from "@/components/ui/ParabolicProgressBar";
import CustomCalendarPicker, { CustomDateRangeInputs } from "@/components/ui/CustomCalendarPicker";
import { VideoTutorialButton } from "@/components/ui/VideoTutorialModal";

interface CellDashboardClientProps {
  cell: any;
  cellProjects: any[];
  producersWithProjects: any[];
  cellTaskLogs: any[];
  cellRevenue: number;
  cellSpend: number;
  cellProfit: number;
  cellRoi: number;
}

const PERIOD_PRESETS = [
  { id: "all", label: "Весь час" },
  { id: "today", label: "Сьогодні" },
  { id: "7d", label: "7 днів" },
  { id: "30d", label: "30 днів" },
  { id: "this_month", label: "Цей місяць" },
  { id: "last_month", label: "Минулий місяць" },
  { id: "this_year", label: "2026 рік" },
  { id: "custom", label: "Кастомно" },
];

export default function CellDashboardClient({
  cell,
  cellProjects: initialProjects,
  producersWithProjects: initialProducers,
  cellTaskLogs,
  cellRevenue: initialRevenue,
  cellSpend: initialSpend,
  cellProfit: initialProfit,
  cellRoi: initialRoi
}: CellDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active state metrics
  const [projects, setProjects] = useState(initialProjects);
  const [producers, setProducers] = useState(initialProducers);
  const [revenueUah, setRevenueUah] = useState(initialRevenue);
  const [spendUah, setSpendUah] = useState(initialSpend);
  const [profitUah, setProfitUah] = useState(initialProfit);
  const [roi, setRoi] = useState(initialRoi);

  // Filter state
  const [activePreset, setActivePreset] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<"UAH" | "USD" | "EUR">("UAH");

  // Plan Edit Modal State
  const [planModal, setPlanModal] = useState<{
    isOpen: boolean;
    producer: any | null;
    selectedProjectId: string;
    targetAmountUsd: string;
    isSaving: boolean;
    error: string | null;
  }>({
    isOpen: false,
    producer: null,
    selectedProjectId: "",
    targetAmountUsd: "",
    isSaving: false,
    error: null
  });

  // CRM conversion rates: 1 USD = 41.80 UAH, 1 EUR = 44.50 UAH
  const convertAmount = (uahAmount: number) => {
    const val = Number(uahAmount || 0);
    if (selectedCurrency === "USD") {
      return { val: val / 41.80, symbol: "$" };
    }
    if (selectedCurrency === "EUR") {
      return { val: val / 44.50, symbol: "€" };
    }
    return { val: val, symbol: "₴" };
  };

  const formatConverted = (uahAmount: number) => {
    const { val, symbol } = convertAmount(uahAmount);
    const formatted = new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
    return symbol === "$" || symbol === "€" ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  };

  // Switch Period Action
  const handleSelectPeriod = (presetId: string) => {
    setActivePreset(presetId);
    if (presetId === "custom") {
      setShowCustomDates(true);
      return;
    }
    setShowCustomDates(false);

    startTransition(async () => {
      const res = await getCellAnalyticsAction(cell.id, presetId);
      if (res.success && res.data) {
        setProjects(res.data.cellProjects);
        setProducers(res.data.producersWithProjects);
        setRevenueUah(res.data.cellRevenueUah);
        setSpendUah(res.data.cellTotalSpendUah);
        setProfitUah(res.data.cellProfitUah);
        setRoi(res.data.cellRoi);
      }
    });
  };

  // Apply custom dates
  const handleApplyCustomDates = () => {
    if (!customStart) return;
    startTransition(async () => {
      const res = await getCellAnalyticsAction(cell.id, "custom", customStart, customEnd || customStart);
      if (res.success && res.data) {
        setProjects(res.data.cellProjects);
        setProducers(res.data.producersWithProjects);
        setRevenueUah(res.data.cellRevenueUah);
        setSpendUah(res.data.cellTotalSpendUah);
        setProfitUah(res.data.cellProfitUah);
        setRoi(res.data.cellRoi);
      }
    });
  };

  // Open Plan Modal
  const handleOpenPlanModal = (producer: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultProj = producer.projects[0];
    setPlanModal({
      isOpen: true,
      producer,
      selectedProjectId: defaultProj?.project_id || "",
      targetAmountUsd: String(defaultProj?.financial_goal_plan_usd || 10000),
      isSaving: false,
      error: null
    });
  };

  // Save Plan Action
  const handleSavePlan = async () => {
    if (!planModal.selectedProjectId) return;
    const amountNum = Number(planModal.targetAmountUsd);
    if (isNaN(amountNum) || amountNum < 0) {
      setPlanModal(prev => ({ ...prev, error: "Вкажіть коректну суму плану" }));
      return;
    }

    setPlanModal(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const res = await updateProjectPlanAction(planModal.selectedProjectId, amountNum);
      if (res.error) {
        setPlanModal(prev => ({ ...prev, isSaving: false, error: res.error || null }));
      } else {
        setPlanModal(prev => ({ ...prev, isOpen: false, isSaving: false }));
        // Refresh cell analytics
        const refreshRes = await getCellAnalyticsAction(cell.id, activePreset, customStart, customEnd);
        if (refreshRes.success && refreshRes.data) {
          setProjects(refreshRes.data.cellProjects);
          setProducers(refreshRes.data.producersWithProjects);
        }
      }
    } catch (err: any) {
      setPlanModal(prev => ({ ...prev, isSaving: false, error: err.message || "Помилка збереження плану" }));
    }
  };

  // Helper to handle Producer Tile Click
  const handleProducerClick = (producer: any) => {
    if (producer.projects.length === 1) {
      const singleProj = producer.projects[0];
      router.push(`/admin/project/${singleProj.project_id}`);
    } else {
      router.push(`/admin/producer/${producer.producerId}`);
    }
  };

  return (
    <div className="space-y-6 text-white w-full mx-auto font-sans">
      
      {/* Header & Controls Bar */}
      <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              Осередок (Cell)
            </span>
            <span className="text-[10px] text-white/40 font-bold bg-white/5 px-2.5 py-1 rounded">
              {projects.length} Проектів • {producers.length} Продюсерів
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-2">{cell.name}</h1>
          <p className="text-white/40 text-xs mt-0.5">Керівник ячейки: {cell.profiles?.email || "Не призначено"}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Currency Switcher */}
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/10">
            {(["UAH", "USD", "EUR"] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedCurrency(curr)}
                className={`px-3 py-1.5 text-[10px] font-black rounded-xl cursor-pointer transition-all ${
                  selectedCurrency === curr
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                    : "text-white/40 hover:text-white font-bold"
                }`}
              >
                {curr === "UAH" ? "₴ UAH" : curr === "USD" ? "$ USD" : "€ EUR"}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSelectPeriod(activePreset)}
            disabled={isPending}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-all"
            title="Оновити дані"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
          </button>

          {/* Video Tutorial Button */}
          <VideoTutorialButton
            videoId="M8e1B9rJ3Kc"
            title="Відеоінструкція: Панель керівника ячейки"
            badge="Керівник ячейки"
            description="Огляд аналітики осередку, проєктів, планів продюсерів та фінансових показників"
            label="Відеоінструкція"
          />
        </div>
      </div>

      <ParabolicProgressBar isLoading={isPending} className="rounded-full" />

      {/* Date Period Filter Bar */}
      <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl space-y-3 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white/80">Період звітності:</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            {PERIOD_PRESETS.find(p => p.id === activePreset)?.label || "Кастомний період"}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PERIOD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPeriod(preset.id)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                activePreset === preset.id
                  ? "bg-white text-black border-white shadow-md"
                  : "bg-white/5 border-white/5 text-white/50 hover:border-white/15 hover:text-white"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom date range picker if selected */}
        {showCustomDates && (
          <div className="pt-2 border-t border-white/5 animate-in fade-in">
            <CustomDateRangeInputs
              startDate={customStart}
              endDate={customEnd}
              onChange={(s, e) => {
                setCustomStart(s);
                setCustomEnd(e);
              }}
              onApply={handleApplyCustomDates}
            />
          </div>
        )}
      </div>

      {/* Top Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Виручка ячейки</p>
          <p className="text-2xl font-black mt-2 text-emerald-400 font-mono">
            {formatConverted(revenueUah)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Оборот усіх проектів за обраний період</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Витрати ячейки</p>
          <p className="text-2xl font-black mt-2 text-rose-400 font-mono">
            {formatConverted(spendUah)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Трафік Meta Ads ($) + Операційні витрати (₴)</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">Прибуток ячейки</p>
          <p className="text-2xl font-black mt-2 text-emerald-500 font-mono">
            {formatConverted(profitUah)}
          </p>
          <p className="text-[10px] text-white/30 mt-1">Чиста маржинальність осередку</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider">ROI ячейки</p>
          <p className="text-2xl font-black mt-2 text-purple-400 font-mono">
            {roi.toFixed(1)} %
          </p>
          <p className="text-[10px] text-white/30 mt-1">Сквозна окупність вкладень</p>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Producer Cards with Real Plan Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="font-bold text-base flex items-center gap-2 text-white">
              <Award className="w-5 h-5 text-emerald-400" />
              Продюсери ячейки
            </h2>
            <span className="text-[10px] text-white/40 font-semibold">Натисніть для переходу</span>
          </div>

          <div className="space-y-4">
            {producers.map((prod) => {
              const projCount = prod.projects.length;
              const hasPlan = prod.planFulfillmentPct !== null && prod.planFulfillmentPct !== undefined;
              const fulfillment = prod.planFulfillmentPct || 0;
              const initial = prod.name ? prod.name.charAt(0).toUpperCase() : "P";

              return (
                <div
                  key={prod.producerId || prod.email}
                  onClick={() => handleProducerClick(prod)}
                  className="bg-neutral-900 border border-white/10 hover:border-emerald-500/40 p-5 rounded-3xl cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:bg-white/[0.02] shadow-xl group relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Producer Avatar */}
                    <div className="flex items-center gap-3 min-w-0">
                      {prod.photoUrl ? (
                        <img 
                          src={prod.photoUrl} 
                          alt={prod.name} 
                          className="w-12 h-12 rounded-2xl object-cover border border-white/10 shrink-0" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-700 border border-white/10 flex items-center justify-center font-black text-white text-base shrink-0 group-hover:border-emerald-500/50 transition-colors">
                          {initial}
                        </div>
                      )}
                      
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                          {prod.name}
                        </h3>
                        <p className="text-[10px] text-white/30 truncate mt-0.5">{prod.email}</p>
                        <span className="inline-block text-[9px] font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded mt-1">
                          {projCount} {projCount === 1 ? "проект" : "проекти"}
                        </span>
                      </div>
                    </div>

                    {/* Plan Badge (Red if missing, Emerald/Blue if set, Clickable to edit) */}
                    <div className="text-right shrink-0">
                      {hasPlan ? (
                        <button
                          type="button"
                          onClick={(e) => handleOpenPlanModal(prod, e)}
                          className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                            fulfillment >= 100
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25"
                          }`}
                          title="Натисніть для зміни плану"
                        >
                          {fulfillment}% План
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleOpenPlanModal(prod, e)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                          title="Натисніть, щоб встановити місячний план"
                        >
                          <Plus className="w-3 h-3" /> Вказати план
                        </button>
                      )}
                      <p className="text-[9px] text-white/30 mt-1">
                        {hasPlan ? formatConverted(prod.targetRevenueUah) : "Ціль не задана"}
                      </p>
                    </div>
                  </div>

                  {/* Profit & Action Footer */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-white/40 block">Прибуток:</span>
                      <span className="font-black text-emerald-400">{formatConverted(prod.profitUah)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-white/60 group-hover:text-emerald-400 transition-colors">
                      {projCount === 1 ? "Перейти в проект" : "Огляд проектів"}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {producers.length === 0 && (
              <p className="text-xs text-white/30 italic text-center py-8 bg-neutral-900 border border-dashed border-white/5 rounded-2xl">
                Продюсерів у цій ячейці поки не закріплено
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Projects Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-3xl shadow-xl">
            <h2 className="font-bold text-base flex items-center gap-2 border-b border-white/5 pb-4 mb-4 text-white">
              <Layers className="w-5 h-5 text-emerald-400" />
              Проекти осередку ({projects.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj: any) => (
                <div 
                  key={proj.project_id} 
                  onClick={() => router.push(`/admin/project/${proj.project_id}`)}
                  className="border border-white/10 bg-[#0C0C0F] hover:border-emerald-500/40 rounded-2xl p-5 transition-all flex flex-col justify-between shadow-lg cursor-pointer group"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-black text-sm text-white group-hover:text-emerald-400 transition-colors">
                        {proj.project_name}
                      </h3>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        proj.roi >= 50
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : proj.roi > 0
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-neutral-800 text-neutral-400 border-neutral-700"
                      }`}>
                        ROI: {proj.roi}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-white/40 block">Виручка:</span>
                        <span className="font-black text-emerald-400 block mt-0.5">
                          {formatConverted(proj.revenue_uah)}
                        </span>
                      </div>
                      <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-white/40 block">Витрати:</span>
                        <span className="font-black text-rose-400 block mt-0.5">
                          {formatConverted(proj.expenses_uah)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-white/40 font-semibold">
                    <span>Ліди: {proj.leads_count} (CPL: {formatConverted(proj.cpl)})</span>
                    <span className="text-white/60 group-hover:text-emerald-400 flex items-center gap-1 font-bold">
                      В кабінет <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PLAN SETTING MODAL */}
      {planModal.isOpen && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0C0C0F] border border-white/10 p-6 rounded-3xl space-y-5 w-full max-w-md text-white shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Встановити фінансовий план</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {planModal.producer?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanModal(prev => ({ ...prev, isOpen: false }))}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Project selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-white/40">Оберіть проект продюсера</label>
                <select
                  value={planModal.selectedProjectId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const pr = planModal.producer?.projects.find((p: any) => p.project_id === selId);
                    setPlanModal(prev => ({
                      ...prev,
                      selectedProjectId: selId,
                      targetAmountUsd: String(pr?.financial_goal_plan_usd || 10000)
                    }));
                  }}
                  className="w-full px-3 py-2 bg-neutral-900 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
                >
                  {planModal.producer?.projects.map((p: any) => (
                    <option key={p.project_id} value={p.project_id} className="bg-neutral-900 text-white">
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Goal Amount */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-white/40">
                  Місячний план виручки в USD ($)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={planModal.targetAmountUsd}
                    onChange={(e) => setPlanModal(prev => ({ ...prev, targetAmountUsd: e.target.value }))}
                    placeholder="25000"
                    className="w-full pl-8 pr-4 py-2.5 bg-neutral-900 border border-white/10 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-2.5 font-bold text-white/40 text-sm">$</span>
                </div>
                <p className="text-[10px] text-white/40">
                  Еквівалент: ~{Math.round(Number(planModal.targetAmountUsd || 0) * 41.80).toLocaleString("uk-UA")} ₴
                </p>
              </div>
            </div>

            {planModal.error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                {planModal.error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                disabled={planModal.isSaving}
                onClick={() => setPlanModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={planModal.isSaving}
                onClick={handleSavePlan}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black cursor-pointer flex items-center gap-1.5"
              >
                {planModal.isSaving ? "Збереження..." : "Зберегти план"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
