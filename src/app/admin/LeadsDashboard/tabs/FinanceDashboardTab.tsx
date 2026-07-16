"use client";

import React, { useState } from "react";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Activity, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface FinanceDashboardTabProps {
  summary: {
    totalIncomeUSD: number;
    totalExpenseUSD: number;
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
      upsells: number;
      installments: number;
      other: number;
      refunds: number;
    };
    opex: {
      traffic: number;
      commissions: number;
      services: number;
      team: number;
      other: number;
    };
  };
  isLight: boolean;
}

export default function FinanceDashboardTab({
  summary,
  accounts,
  pnl,
  isLight
}: FinanceDashboardTabProps) {
  const [activeSegment, setActiveSegment] = useState<"dashboard" | "pnl">("dashboard");

  const formatMoney = (val: number, isUAH: boolean = false) => {
    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val);
    return isUAH ? `${formatted} ₴` : `$${formatted}`;
  };

  // UI styling references
  const cardClass = isLight ? "bg-white border border-neutral-200 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";
  const tableHeaderClass = isLight ? "bg-neutral-100 text-neutral-500 border-neutral-200" : "bg-white/[0.02] text-white/40 border-white/5";
  const tableRowClass = isLight ? "hover:bg-neutral-50 border-neutral-200 text-neutral-800" : "hover:bg-white/[0.01] border-white/5 text-white/80";

  // Calculate Traffic Radial Progress values
  const trafficPercent = summary.trafficBudgetPlan > 0
    ? Math.min(Math.round((summary.totalTrafficUSD / summary.trafficBudgetPlan) * 100), 100)
    : 0;
  const radius = 42;
  const strokeDashoffset = 2 * Math.PI * radius * (1 - trafficPercent / 100);

  return (
    <div className="space-y-6 font-sans">
      
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
        </div>
      </div>

      {activeSegment === "dashboard" ? (
        <>
          {/* Metrics row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Stat: Income */}
            <div className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01]`}>
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Надійшло</span>
                <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-emerald-400">
                  {formatMoney(summary.totalIncomeUSD)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {formatMoney(summary.totalIncomeUAH, true)}
                </p>
              </div>
            </div>

            {/* Stat: Spent */}
            <div className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01]`}>
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Затрати</span>
                <span className="p-1 rounded-lg bg-rose-500/10 text-rose-400">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight text-rose-400">
                  {formatMoney(summary.totalExpenseUSD)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {formatMoney(summary.totalExpenseUAH, true)}
                </p>
              </div>
            </div>

            {/* Stat: Op Profit */}
            <div className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01]`}>
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Опер. прибуток</span>
                <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                  <Activity className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight">
                  {formatMoney(summary.operatingProfitUSD)}
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  {formatMoney(summary.operatingProfitUAH, true)}
                </p>
              </div>
            </div>

            {/* Stat: Margin */}
            <div className={`p-5 rounded-2xl border ${cardClass} flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01]`}>
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textMutedClass}`}>Маржинальність</span>
                <span className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <h4 className="text-2xl font-bold tracking-tight">
                  {summary.marginPercent}%
                </h4>
                <p className={`text-[10px] font-medium mt-0.5 ${textMutedClass}`}>
                  Відношення прибутку до виручки
                </p>
              </div>
            </div>

          </div>

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
              {accounts.map((acc) => (
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
              ))}
            </div>
          </div>
        </>
      ) : (
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
                <span>Сума ($)</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Продажі продукту</span>
                  <span>{formatMoney(pnl.revenue.product)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Допродажі / Апселли</span>
                  <span>{formatMoney(pnl.revenue.upsells)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Розстрочки / Доплати</span>
                  <span>{formatMoney(pnl.revenue.installments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Повернення клієнтам</span>
                  <span className="text-rose-400">-{formatMoney(pnl.revenue.refunds)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Інший прихід</span>
                  <span>{formatMoney(pnl.revenue.other)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1 mt-1 text-sm">
                  <span>Всього виручка</span>
                  <span>{formatMoney(summary.totalIncomeUSD)}</span>
                </div>
              </div>
            </div>

            {/* Opex Items */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-rose-400 border-b border-white/5 pb-1">
                <span>Операційні витрати (OPEX)</span>
                <span>Сума ($)</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Трафік / Реклама</span>
                  <span>{formatMoney(pnl.opex.traffic)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Комісія платіжних систем</span>
                  <span>{formatMoney(pnl.opex.commissions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Сервіси (SendPulse тощо)</span>
                  <span>{formatMoney(pnl.opex.services)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Команда / Підряд</span>
                  <span>{formatMoney(pnl.opex.team)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Прочі витрати</span>
                  <span>{formatMoney(pnl.opex.other)}</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1 mt-1 text-sm">
                  <span>Всього операційні витрати</span>
                  <span>{formatMoney(summary.totalExpenseUSD)}</span>
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
                <span className="text-lg font-extrabold text-emerald-400 block">{formatMoney(summary.operatingProfitUSD)}</span>
                <span className="text-[10px] text-neutral-400 font-semibold">Маржинальність {summary.marginPercent}%</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
