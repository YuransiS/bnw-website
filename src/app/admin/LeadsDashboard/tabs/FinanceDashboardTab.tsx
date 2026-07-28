"use client";

import React, { useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Activity, Percent, ArrowUpRight, ArrowDownRight, Settings, Plus, Loader2, Save, FileText, Target, CheckCircle2 } from "lucide-react";
import { saveFinanceSettingsAction, createAccountAction, createCustomCategoryAction, generatePnlReportAction } from "../../(dashboard)/project/financeActions";
import PnlReportModal from "../components/PnlReportModal";

interface FinanceDashboardTabProps {
  summary: {
    totalIncomeUSD: number;
    totalExpenseUSD: number;
    netRevenueUSD?: number;
    operatingProfitUSD: number;
    totalIncomeUAH: number;
    totalExpenseUAH: number;
    operatingProfitUAH: number;
    marginPercent: number;
    receivablesUSD: number;
    receivablesUAH: number;
    expertShareUSD: number;
    expertShareUAH: number;
    pcShareUSD: number;
    pcShareUAH: number;
    totalPaidToExpertUSD: number;
    remainingExpertUSD: number;
    totalTrafficUSD: number;
    goalPlanUSD?: number;
    goalProgressPercent?: number;
    trafficBudgetPlan: number;
  };
  accounts: {
    id: string;
    name: string;
    currency: string;
    starting_balance: number;
    current_balance: number;
  }[];
  pnl: {
    revenue: {
      product: number;
      tripwires?: number;
      upsells?: number;
      club?: number;
      installments: number;
      other: number;
      refunds: number;
    };
    opex: {
      marketing?: number;
      traffic?: number;
      commissions: number;
      services: number;
      team: number;
      other: number;
    };
  };
  isLight: boolean;
  userRole: string;
  projectId: string;
  onRefresh: () => void;
  categories: {
    custom: { name: string; type: string }[];
    default: { income: string[]; expense: string[] };
  };
  project: any;
  globalCurrency: "USD" | "UAH";
}

export default function FinanceDashboardTab({
  summary,
  accounts,
  pnl,
  isLight,
  userRole,
  projectId,
  onRefresh,
  categories,
  project,
  globalCurrency
}: FinanceDashboardTabProps) {
  const [activeSegment, setActiveSegment] = useState<"dashboard" | "pnl" | "settings">("dashboard");
  const [expandedCard, setExpandedCard] = useState<"revenue" | "opex" | "profit" | "receivables" | null>(null);

  const [isPending, startTransition] = useTransition();

  // PnL Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [pnlReportData, setPnlReportData] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");

  // Baseline Settings States
  const [contractModel, setContractModel] = useState(project.contract_model || "50/50 Profit Split");
  const [targetCurrency, setTargetCurrency] = useState(project.target_currency || "USD");
  const [trafficBudgetPlan, setTrafficBudgetPlan] = useState(String(project.traffic_budget_plan || 0));
  const [expertSharePercentage, setExpertSharePercentage] = useState(String(project.expert_share_percent || project.expert_share_percentage || 50));
  const [financialGoalPlanUSD, setFinancialGoalPlanUSD] = useState(String(project.financial_goal_plan_usd || summary.goalPlanUSD || 0));
  const [fixedFeeAmount, setFixedFeeAmount] = useState(String(project.fixed_fee_amount || 0));
  const [acquiringFeePercent, setAcquiringFeePercent] = useState(String(project.acquiring_fee_percent || 2.0));

  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsError, setSettingsError] = useState("");

  // Bank Accounts States
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountCurrency, setNewAccountCurrency] = useState("USD");
  const [newAccountStartingBalance, setNewAccountStartingBalance] = useState("0");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [accountError, setAccountError] = useState("");

  // Custom Categories States
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"income" | "expense">("expense");
  const [categorySuccess, setCategorySuccess] = useState("");
  const [categoryError, setCategoryError] = useState("");

  // Handlers
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess("");
    setSettingsError("");

    startTransition(async () => {
      const res = await saveFinanceSettingsAction(projectId, {
        contractModel,
        targetCurrency,
        trafficBudgetPlan: Number(trafficBudgetPlan),
        expertSharePercentage: Number(expertSharePercentage),
        financialGoalPlanUSD: Number(financialGoalPlanUSD),
        fixedFeeAmount: Number(fixedFeeAmount),
        acquiringFeePercent: Number(acquiringFeePercent)
      });
      if (res.error) {
        setSettingsError(res.error);
      } else {
        setSettingsSuccess("Налаштування збережено успішно!");
        onRefresh();
      }
    });
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const res = await generatePnlReportAction(
        projectId,
        reportStartDate || undefined,
        reportEndDate || undefined
      );
      if (res.success && res.report) {
        setPnlReportData(res.report);
        setShowReportModal(true);
      } else {
        alert(res.error || "Не вдалося згенерувати звіт");
      }
    } catch (e) {
      alert("Помилка генерації звіту");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountSuccess("");
    setAccountError("");

    if (!newAccountName.trim()) {
      setAccountError("Вкажіть назву рахунку");
      return;
    }

    startTransition(async () => {
      const res = await createAccountAction(projectId, {
        name: newAccountName.trim(),
        currency: newAccountCurrency,
        startingBalance: Number(newAccountStartingBalance)
      });
      if (res.error) {
        setAccountError(res.error);
      } else {
        setAccountSuccess("Рахунок додано успішно!");
        setNewAccountName("");
        setNewAccountStartingBalance("0");
        onRefresh();
      }
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCategorySuccess("");
    setCategoryError("");

    if (!newCategoryName.trim()) {
      setCategoryError("Вкажіть назву категорії");
      return;
    }

    startTransition(async () => {
      const res = await createCustomCategoryAction(projectId, newCategoryName.trim(), newCategoryType);
      if (res.error) {
        setCategoryError(res.error);
      } else {
        setCategorySuccess("Категорію створено успішно!");
        setNewCategoryName("");
        onRefresh();
      }
    });
  };

  const formatMoney = (val: number, isUAH: boolean = false) => {
    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val || 0);
    return isUAH ? `${formatted} ₴` : `$${formatted}`;
  };

  const displayMoney = (usdVal: number, uahVal: number) => {
    if (globalCurrency === "UAH") {
      return formatMoney(uahVal, true);
    } else {
      return formatMoney(usdVal, false);
    }
  };

  // UI styling references
  const cardClass = isLight ? "bg-white border border-neutral-200 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";

  const goalPlan = summary.goalPlanUSD || Number(financialGoalPlanUSD) || 0;
  const goalProgress = summary.goalProgressPercent || (goalPlan > 0 ? (summary.totalIncomeUSD / goalPlan) * 100 : 0);

  // Calculate Traffic Radial Progress values
  const trafficPercent = summary.trafficBudgetPlan > 0
    ? Math.min(Math.round((summary.totalTrafficUSD / summary.trafficBudgetPlan) * 100), 100)
    : 0;
  const radius = 42;
  const strokeDashoffset = 2 * Math.PI * radius * (1 - trafficPercent / 100);

  const productRev = pnl.revenue?.product || 0;
  const tripwireRev = pnl.revenue?.tripwires || pnl.revenue?.upsells || 0;
  const clubRev = pnl.revenue?.club || 0;
  const installmentRev = pnl.revenue?.installments || 0;
  const otherRev = pnl.revenue?.other || 0;
  const refundRev = pnl.revenue?.refunds || 0;

  const marketingOpex = pnl.opex?.marketing || pnl.opex?.traffic || 0;
  const servicesOpex = pnl.opex?.services || 0;
  const teamOpex = pnl.opex?.team || 0;
  const commissionsOpex = pnl.opex?.commissions || 0;
  const otherOpex = pnl.opex?.other || 0;

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1-Click P&L Act Report Modal */}
      {showReportModal && pnlReportData && (
        <PnlReportModal
          report={pnlReportData}
          onClose={() => setShowReportModal(false)}
          isLight={isLight}
        />
      )}

      {/* Top Segment Controls */}
      <div className="flex justify-between items-center">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveSegment("dashboard")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeSegment === "dashboard"
                ? "bg-white text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Дашборд
          </button>
          <button
            onClick={() => setActiveSegment("pnl")}
            className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              activeSegment === "pnl"
                ? "bg-white text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Звіт P&L
          </button>
          {["admin", "superman", "founder", "developer"].includes(userRole) && (
            <button
              onClick={() => setActiveSegment("settings")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${
                activeSegment === "settings"
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Налаштування
            </button>
          )}
        </div>

        {/* 1-Click Act Report Generator with Period Selection */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-neutral-400 font-bold uppercase">Період:</span>
            <input
              type="date"
              value={reportStartDate}
              onChange={(e) => setReportStartDate(e.target.value)}
              className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none focus:ring-0 w-24 cursor-pointer"
              title="Початок періоду"
            />
            <span className="text-white/20 text-[10px]">—</span>
            <input
              type="date"
              value={reportEndDate}
              onChange={(e) => setReportEndDate(e.target.value)}
              className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none focus:ring-0 w-24 cursor-pointer"
              title="Кінець періоду"
            />
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-extrabold rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isGeneratingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Сформувати Звіт / Акт
          </button>
        </div>
      </div>

      {/* LEVEL 1: Monthly Goal Target Progress Bar */}
      {goalPlan > 0 && activeSegment === "dashboard" && (
        <div className={`p-5 rounded-2xl border ${cardClass} space-y-3 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Місячний План по Виручці</span>
            </div>
            <span className="text-xs font-black text-emerald-400">
              {goalProgress.toFixed(1)}% виконано
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(goalProgress, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400">Факт: <strong className="text-white">{formatMoney(summary.totalIncomeUSD)}</strong> ({formatMoney(summary.totalIncomeUAH, true)})</span>
            <span className="text-neutral-400">Ціль: <strong className="text-emerald-400">{formatMoney(goalPlan)}</strong></span>
          </div>
        </div>
      )}

      {activeSegment === "dashboard" && (
        <>
          {/* Metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Stat: Income */}
            <div
              onClick={() => setExpandedCard(expandedCard === "revenue" ? null : "revenue")}
              className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01] cursor-pointer hover:border-emerald-500/30 ${
                expandedCard === "revenue" ? "border-emerald-500/50 bg-emerald-500/[0.02]" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Надійшло (Виручка)</span>
                <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-emerald-400">
                  {displayMoney(summary.totalIncomeUSD, summary.totalIncomeUAH)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {globalCurrency === "UAH" ? formatMoney(summary.totalIncomeUSD, false) : formatMoney(summary.totalIncomeUAH, true)}
                </p>
              </div>
            </div>

            {/* Stat: Spent */}
            <div
              onClick={() => setExpandedCard(expandedCard === "opex" ? null : "opex")}
              className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01] cursor-pointer hover:border-rose-500/30 ${
                expandedCard === "opex" ? "border-rose-500/50 bg-rose-500/[0.02]" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Затрати (OPEX)</span>
                <span className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-rose-400">
                  {displayMoney(summary.totalExpenseUSD, summary.totalExpenseUAH)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {globalCurrency === "UAH" ? formatMoney(summary.totalExpenseUSD, false) : formatMoney(summary.totalExpenseUAH, true)}
                </p>
              </div>
            </div>

            {/* Stat: Op Profit */}
            <div
              onClick={() => setExpandedCard(expandedCard === "profit" ? null : "profit")}
              className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01] cursor-pointer hover:border-amber-500/30 ${
                expandedCard === "profit" ? "border-amber-500/50 bg-amber-500/[0.02]" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Опер. прибуток</span>
                <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-emerald-450">
                  {displayMoney(summary.operatingProfitUSD, summary.operatingProfitUAH)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {globalCurrency === "UAH" ? formatMoney(summary.operatingProfitUSD, false) : formatMoney(summary.operatingProfitUAH, true)} ({summary.marginPercent}% маржа)
                </p>
              </div>
            </div>

            {/* Stat: Receivables (Дебіторка) */}
            <div
              onClick={() => setExpandedCard(expandedCard === "receivables" ? null : "receivables")}
              className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01] cursor-pointer hover:border-indigo-500/30 ${
                expandedCard === "receivables" ? "border-indigo-500/50 bg-indigo-500/[0.02]" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Дебіторка</span>
                <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-indigo-400">
                  {displayMoney(summary.receivablesUSD, summary.receivablesUAH)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {globalCurrency === "UAH" ? formatMoney(summary.receivablesUSD, false) : formatMoney(summary.receivablesUAH, true)}
                </p>
              </div>
            </div>

          </div>

          {/* Expanded Drawer Details */}
          {expandedCard && (
            <div className={`p-6 rounded-2xl border ${cardClass} animate-in slide-in-from-top-3 duration-250 mt-1 space-y-4`}>
              {expandedCard === "revenue" && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Склад валової виручки</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Продажі продукту</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(productRev, productRev * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Допродажі / Апселли</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(tripwireRev, tripwireRev * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Розстрочки</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(installmentRev, installmentRev * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Інший прихід</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(otherRev, otherRev * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                      <span className="text-red-400 text-[10px] uppercase font-bold">Повернення</span>
                      <span className="block text-sm font-bold mt-1 text-red-400">-{displayMoney(refundRev, refundRev * 44)}</span>
                    </div>
                  </div>
                </div>
              )}

              {expandedCard === "opex" && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-rose-400">Склад операційних витрат</h5>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Реклама / Трафік</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(marketingOpex, marketingOpex * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Комісії платформ</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(pnl.opex.commissions, pnl.opex.commissions * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Сервіси (SendPulse)</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(pnl.opex.services, pnl.opex.services * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Команда / Підряд</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(pnl.opex.team, pnl.opex.team * 44)}</span>
                    </div>
                    <div className="bg-white/5 p-3 rounded-xl">
                      <span className="text-neutral-400 text-[10px] uppercase font-bold">Інші кости</span>
                      <span className="block text-sm font-bold mt-1 text-white">{displayMoney(pnl.opex.other, pnl.opex.other * 44)}</span>
                    </div>
                  </div>
                </div>
              )}

              {expandedCard === "profit" && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400">Розрахунок операційного прибутку</h5>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Валова виручка</span>
                      <span className="font-bold text-white">{displayMoney(summary.totalIncomeUSD, summary.totalIncomeUAH)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-neutral-400">Операційні кости (OPEX)</span>
                      <span className="font-bold text-red-400">-{displayMoney(summary.totalExpenseUSD, summary.totalExpenseUAH)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5 text-sm font-black">
                      <span className="text-emerald-450">Операційний прибуток (Net)</span>
                      <span className="text-emerald-400">{displayMoney(summary.operatingProfitUSD, summary.operatingProfitUAH)}</span>
                    </div>
                  </div>
                </div>
              )}

              {expandedCard === "receivables" && (
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Дебіторська заборгованість</h5>
                  <p className="text-[11px] text-white/50">Сума очікуваних розстрочок або неповних оплат клієнтів за поточний період.</p>
                  <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center text-xs">
                    <span>Очікувана сума надходжень</span>
                    <span className="font-extrabold text-indigo-400 text-sm">
                      {displayMoney(summary.receivablesUSD, summary.receivablesUAH)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Core Analytics Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Split Contract Ratios (B&W Center vs Expert) */}
            <div className={`p-6 rounded-2xl border md:col-span-2 ${cardClass} space-y-6`}>
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold tracking-wider uppercase text-neutral-300">Розподіл часток по контракту</h4>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-extrabold">50% / 50%</span>
              </div>
              
              <div className="space-y-4">
                {/* Visual Bar */}
                <div className="h-4 w-full bg-rose-500/20 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: "50%" }} />
                  <div className="h-full bg-amber-500" style={{ width: "50%" }} />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Доля ПЦ (B&W)
                    </span>
                    <h5 className="text-lg font-bold">{formatMoney(summary.pcShareUSD)}</h5>
                    <p className={`text-[10px] ${textMutedClass}`}>{formatMoney(summary.pcShareUAH, true)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Доля експерта (Соня)
                    </span>
                    <h5 className="text-lg font-bold">{formatMoney(summary.expertShareUSD)}</h5>
                    <p className={`text-[10px] ${textMutedClass}`}>{formatMoney(summary.expertShareUAH, true)}</p>
                  </div>
                </div>

                {/* Unpaid expert statistics */}
                <div className={`mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] flex justify-between items-center`}>
                  <div>
                    <span className="text-[10px] font-medium text-neutral-400">Нараховано експерту до виплати:</span>
                    <h5 className="text-sm font-bold text-amber-400 mt-0.5">{formatMoney(summary.remainingExpertUSD)}</h5>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium text-neutral-400">Виплачено по факту:</span>
                    <p className="text-xs font-semibold text-neutral-300 mt-0.5">{formatMoney(summary.totalPaidToExpertUSD)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Traffic Spend Tracker */}
            <div className={`p-6 rounded-2xl border ${cardClass} flex flex-col items-center justify-between min-h-[220px]`}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 self-start">Бюджет на трафік</h4>
              
              {/* Radial circle tracker */}
              <div className="relative w-28 h-28 flex items-center justify-center mt-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-neutral-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-emerald-500 transition-all duration-500"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * radius}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold">{trafficPercent}%</span>
                  <span className="text-[8px] uppercase tracking-wider text-neutral-400">Використано</span>
                </div>
              </div>

              <div className="w-full grid grid-cols-2 gap-2 text-center pt-4 border-t border-white/5">
                <div>
                  <span className="text-[9px] text-neutral-400 block">План</span>
                  <span className="text-xs font-bold">{formatMoney(summary.trafficBudgetPlan)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-400 block">Потрачено</span>
                  <span className="text-xs font-bold text-rose-400">{formatMoney(summary.totalTrafficUSD)}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Accounts balance summary */}
          <div className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold tracking-wider uppercase text-neutral-300">Баланси по рахунках</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.length === 0 ? (
                <div className="col-span-full p-6 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
                  <p className="text-xs text-neutral-400 font-medium">Немає доданих рахунків у проекті</p>
                  {["admin", "superman", "founder", "developer"].includes(userRole) && (
                    <button
                      onClick={() => setActiveSegment("settings")}
                      className="mt-2 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1 mx-auto cursor-pointer border-none bg-transparent"
                    >
                      <Plus className="w-3 h-3" /> Створити рахунок у налаштуваннях
                    </button>
                  )}
                </div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-300">{acc.name}</span>
                      <span className={`text-[10px] block ${textMutedClass}`}>Поточний баланс</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-emerald-400">
                        {formatMoney(acc.current_balance, acc.currency === "UAH")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeSegment === "pnl" && (
        /* P&L Statement breakdown */
        <div className={`p-6 rounded-2xl border ${cardClass} space-y-6`}>
          <div className="flex justify-between items-center border-b border-white/5 pb-4">
            <div>
              <h4 className="text-base font-bold">Звіт про прибутки і збитки (P&L)</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">Автоматизована калькуляція доходів та витрат</p>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Revenue Items */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-emerald-400 border-b border-white/5 pb-1">
                <span>Виручка (Доходи)</span>
                <span>Сума ({globalCurrency})</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Продажі продукту</span>
                  <span>{displayMoney(productRev, productRev * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Допродажі / Апселли</span>
                  <span>{displayMoney(tripwireRev, tripwireRev * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Розстрочки / Доплати</span>
                  <span>{displayMoney(installmentRev, installmentRev * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Інший прихід</span>
                  <span>{displayMoney(otherRev, otherRev * 44)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1 mt-1 text-sm">
                  <span>Всього виручка</span>
                  <span>{displayMoney(productRev + tripwireRev + installmentRev + otherRev, (productRev + tripwireRev + installmentRev + otherRev) * 44)}</span>
                </div>
              </div>
            </div>

            {/* Opex Items */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-white/5 pb-1">
                <span>Операційні витрати (OPEX)</span>
                <span>Сума ({globalCurrency})</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Трафік / Реклама</span>
                  <span>{displayMoney(marketingOpex, marketingOpex * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Комісія платіжних систем</span>
                  <span>{displayMoney( commissionsOpex, commissionsOpex * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Сервіси (SendPulse тощо)</span>
                  <span>{displayMoney(servicesOpex, servicesOpex * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Команда / Підряд</span>
                  <span>{displayMoney(teamOpex, teamOpex * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Повернення клієнтам (Refunds)</span>
                  <span className="text-rose-400">{displayMoney(refundRev, refundRev * 44)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Прочі витрати</span>
                  <span>{displayMoney(otherOpex, otherOpex * 44)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1 mt-1 text-sm">
                  <span>Всього операційні витрати</span>
                  <span>{displayMoney(marketingOpex + commissionsOpex + servicesOpex + teamOpex + refundRev + otherOpex, (marketingOpex + commissionsOpex + servicesOpex + teamOpex + refundRev + otherOpex) * 44)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Net Line */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-neutral-300">Операційний прибуток (P&L)</span>
                <span className="text-[9px] block text-neutral-400">Різниця між Виручкою та Витратами</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-emerald-400 block">{displayMoney(summary.operatingProfitUSD, summary.operatingProfitUAH)}</span>
                <span className="text-[10px] text-neutral-400 font-semibold">Маржинальність {summary.marginPercent}%</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeSegment === "settings" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Form 1: Baseline Settings */}
            <div className={`p-6 rounded-2xl border ${cardClass} space-y-4`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Базові налаштування</h3>
              <p className={`text-[11px] ${textMutedClass}`}>Модель контракту, валюта звітності та планові показники.</p>
              
              {settingsSuccess && <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">{settingsSuccess}</div>}
              {settingsError && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{settingsError}</div>}

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs text-white">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Модель контракту</label>
                  <select
                    value={contractModel}
                    onChange={(e) => setContractModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0C0C0F] border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="50_50_net_profit">50/50 від Чистого прибутку (Net Profit Split)</option>
                    <option value="70_30_gross_revenue">70/30 від Виручки (Gross Revenue)</option>
                    <option value="80_20_gross_revenue">80/20 від Виручки (Gross Revenue)</option>
                    <option value="fixed_plus_percent">Фіксований оклад + % від перевиконання плану</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Місячний План ($)</label>
                    <input
                      type="number"
                      value={financialGoalPlanUSD}
                      onChange={(e) => setFinancialGoalPlanUSD(e.target.value)}
                      placeholder="50000"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">План на трафік ($)</label>
                    <input
                      type="number"
                      value={trafficBudgetPlan}
                      onChange={(e) => setTrafficBudgetPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Частка експерта (%)</label>
                    <input
                      type="number"
                      max="100"
                      min="0"
                      value={expertSharePercentage}
                      onChange={(e) => setExpertSharePercentage(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Фікс. Оклад ($)</label>
                    <input
                      type="number"
                      value={fixedFeeAmount}
                      onChange={(e) => setFixedFeeAmount(e.target.value)}
                      placeholder="1000"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Еквайринг комісія (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={acquiringFeePercent}
                      onChange={(e) => setAcquiringFeePercent(e.target.value)}
                      placeholder="2.0"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Валюта проекту</label>
                    <select
                      value={targetCurrency}
                      onChange={(e) => setTargetCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0C0C0F] border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="UAH">UAH (₴)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Зберегти налаштування
                </button>
              </form>
            </div>

            {/* Form 2: Accounts Management */}
            <div className={`p-6 rounded-2xl border ${cardClass} space-y-4 lg:col-span-2`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Рахунки та гаманці проекту</h3>
              <p className={`text-[11px] ${textMutedClass}`}>Наявні банківські рахунки, WayForPay чи крипто-гаманці.</p>

              <div className="overflow-x-auto border border-white/5 rounded-xl text-[11px]">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-white/[0.02] text-white/40 border-b border-white/5 uppercase tracking-widest font-black">
                      <th className="p-3">Назва рахунку</th>
                      <th className="p-3 text-center">Валюта</th>
                      <th className="p-3 text-right">Початковий баланс</th>
                      <th className="p-3 text-right">Поточний баланс</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-white/[0.01]">
                        <td className="p-3 font-semibold">{acc.name}</td>
                        <td className="p-3 text-center">{acc.currency}</td>
                        <td className="p-3 text-right">{formatMoney(acc.starting_balance, acc.currency === "UAH")}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {formatMoney(acc.current_balance, acc.currency === "UAH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {accountSuccess && <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">{accountSuccess}</div>}
              {accountError && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{accountError}</div>}

              <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end pt-2 text-xs text-white">
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400">Назва рахунку</label>
                  <input
                    type="text"
                    required
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    placeholder="Напр. ФОП-3 або PayPal Business"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400">Валюта</label>
                  <select
                    value={newAccountCurrency}
                    onChange={(e) => setNewAccountCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0C0C0F] border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="UAH">UAH (₴)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400">Стартовий баланс</label>
                  <input
                    type="number"
                    value={newAccountStartingBalance}
                    onChange={(e) => setNewAccountStartingBalance(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2.5 bg-white hover:bg-neutral-100 text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 md:col-span-4"
                >
                  <Plus className="w-3.5 h-3.5" /> Додати новий рахунок
                </button>
              </form>
            </div>

            {/* Form 3: Custom Categories Management */}
            <div className={`p-6 rounded-2xl border ${cardClass} space-y-4 lg:col-span-3`}>
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">Кастомні категорії витрат та доходів</h3>
              <p className={`text-[11px] ${textMutedClass}`}>Категорії для деталізації P&L та Cashflow.</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {categories.custom.map((cat, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1.5 rounded-full border text-[10px] font-bold ${
                      cat.type === "income"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    }`}
                  >
                    {cat.type === "income" ? "📈" : "📉"} {cat.name}
                  </span>
                ))}
                {categories.custom.length === 0 && (
                  <p className="text-xs text-white/30 italic">Власні категорії ще не створені</p>
                )}
              </div>

              {categorySuccess && <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">{categorySuccess}</div>}
              {categoryError && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{categoryError}</div>}

              <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end pt-2 text-xs text-white">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400">Назва категорії</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Напр. Оренда офісу чи Інше"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-neutral-400">Тип</label>
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 h-[38px] items-center">
                    <button
                      type="button"
                      onClick={() => setNewCategoryType("income")}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        newCategoryType === "income" ? "bg-emerald-500 text-black" : "text-white/60"
                      }`}
                    >
                      Прихід
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCategoryType("expense")}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        newCategoryType === "expense" ? "bg-rose-500 text-white" : "text-white/60"
                      }`}
                    >
                      Витрата
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2.5 bg-white hover:bg-neutral-100 text-black font-extrabold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> Створити категорію
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
