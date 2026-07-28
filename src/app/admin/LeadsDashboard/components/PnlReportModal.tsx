"use client";

import React, { useRef } from "react";
import { X, Printer, Download, DollarSign, Calendar, FileText, CheckCircle2, ShieldCheck } from "lucide-react";

interface PnlReportModalProps {
  report: {
    generatedAt: string;
    startDate: string;
    endDate: string;
    project: any;
    summary: any;
    pnl: any;
    accounts: any[];
    transactionCount: number;
  };
  onClose: () => void;
  isLight: boolean;
}

export default function PnlReportModal({ report, onClose, isLight }: PnlReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const formatMoney = (val: number, isUAH: boolean = false) => {
    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val || 0);
    return isUAH ? `${formatted} ₴` : `$${formatted}`;
  };

  const { project, summary, pnl } = report;
  const contractModelName = project.contract_model || "50/50 Profit Split";

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-4xl bg-neutral-900 border border-white/10 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-450" />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Управлінський Акт & P&L Звіт</h3>
              <p className="text-[10px] text-white/40">Офіційний фінансовий роззрахунок проекту за обраний період</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
            >
              <Printer className="w-3.5 h-3.5" /> Друкувати Акт
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Container */}
        <div ref={printRef} className="p-8 overflow-y-auto space-y-6 text-xs text-white print:p-0 print:text-black print:bg-white">
          
          {/* Header Metadata */}
          <div className="flex justify-between items-start border-b border-white/10 pb-6 print:border-black">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <h2 className="text-xl font-extrabold tracking-tight print:text-black">{project.name || "Проект CRM"}</h2>
              </div>
              <p className="text-[11px] text-white/50 print:text-gray-600 mt-1">
                Модель контракту: <strong className="text-emerald-400 print:text-black">{contractModelName}</strong>
              </p>
            </div>
            <div className="text-right text-[10px] text-white/40 print:text-gray-600 space-y-1">
              <p>Дата формування: <strong>{new Date(report.generatedAt).toLocaleDateString("uk-UA")} {new Date(report.generatedAt).toLocaleTimeString("uk-UA", { hour: '2-digit', minute: '2-digit' })}</strong></p>
              <p>Період звіту: <strong className="text-white print:text-black">{report.startDate} — {report.endDate}</strong></p>
              <p>Всього операцій у реєстрі: <strong>{report.transactionCount}</strong></p>
            </div>
          </div>

          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/5 print:border-gray-300">
              <span className="text-[9px] uppercase font-bold text-white/40 print:text-gray-600 block">Валова Виручка</span>
              <span className="text-base font-black text-emerald-400 print:text-black block mt-1">{formatMoney(summary.totalIncomeUSD)}</span>
              <span className="text-[9px] text-white/30 print:text-gray-500 block mt-0.5">{formatMoney(summary.totalIncomeUAH, true)}</span>
            </div>
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/5 print:border-gray-300">
              <span className="text-[9px] uppercase font-bold text-white/40 print:text-gray-600 block">Операційні Витрати</span>
              <span className="text-base font-black text-rose-400 print:text-black block mt-1">{formatMoney(summary.totalExpenseUSD)}</span>
              <span className="text-[9px] text-white/30 print:text-gray-500 block mt-0.5">{formatMoney(summary.totalExpenseUAH, true)}</span>
            </div>
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/5 print:border-gray-300">
              <span className="text-[9px] uppercase font-bold text-white/40 print:text-gray-600 block">Чистий Прибуток</span>
              <span className="text-base font-black text-emerald-450 print:text-black block mt-1">{formatMoney(summary.operatingProfitUSD)}</span>
              <span className="text-[9px] text-white/30 print:text-gray-500 block mt-0.5">{summary.marginPercent}% маржинальність</span>
            </div>
            <div className="bg-white/5 print:bg-gray-100 p-4 rounded-2xl border border-white/5 print:border-gray-300">
              <span className="text-[9px] uppercase font-bold text-white/40 print:text-gray-600 block">Дебіторка</span>
              <span className="text-base font-black text-indigo-400 print:text-black block mt-1">{formatMoney(summary.receivablesUSD)}</span>
              <span className="text-[9px] text-white/30 print:text-gray-500 block mt-0.5">{formatMoney(summary.receivablesUAH, true)}</span>
            </div>
          </div>

          {/* Level 2 Detailed P&L Breakdown Table */}
          <div className="space-y-4 pt-2">
            <h4 className="font-extrabold text-sm uppercase tracking-wider text-emerald-400 print:text-black border-b border-white/10 print:border-black pb-2">
              Деталізований Звіт P&L (Прибутки та Збитки)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              
              {/* Revenue Breakdown */}
              <div className="bg-white/5 print:bg-white p-4 rounded-2xl border border-white/5 print:border-gray-300 space-y-2">
                <span className="text-[10px] uppercase font-black text-emerald-400 print:text-black block border-b border-white/5 pb-1">
                  1. Секція Доходів (Revenue)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Продажі основного курсу</span>
                    <span className="font-bold">{formatMoney(pnl.revenue.product)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Трипваєри / Міні-продукти</span>
                    <span className="font-bold">{formatMoney(pnl.revenue.tripwires)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Клубні підписки (LTV)</span>
                    <span className="font-bold">{formatMoney(pnl.revenue.club)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Розстрочки (Банки)</span>
                    <span className="font-bold">{formatMoney(pnl.revenue.installments)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Повернення (Refunds)</span>
                    <span className="font-bold text-rose-400">-{formatMoney(pnl.revenue.refunds)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-extrabold text-emerald-400 print:text-black border-t border-white/10 pt-2 text-xs">
                    <span>Чиста Виручка (Net Revenue)</span>
                    <span>{formatMoney(summary.netRevenueUSD || summary.totalIncomeUSD)}</span>
                  </div>
                </div>
              </div>

              {/* OpEx Breakdown */}
              <div className="bg-white/5 print:bg-white p-4 rounded-2xl border border-white/5 print:border-gray-300 space-y-2">
                <span className="text-[10px] uppercase font-black text-rose-400 print:text-black block border-b border-white/5 pb-1">
                  2. Операційні Витрати (OpEx)
                </span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Маркетинг та Реклама (Ad Spend)</span>
                    <span className="font-bold">{formatMoney(pnl.opex.marketing)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Сервіси та Інфраструктура</span>
                    <span className="font-bold">{formatMoney(pnl.opex.services)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Оплата Команди та Підрядників</span>
                    <span className="font-bold">{formatMoney(pnl.opex.team)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-white/5">
                    <span className="text-white/60 print:text-gray-700">Комісії платформ та Еквайринг</span>
                    <span className="font-bold">{formatMoney(pnl.opex.commissions)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-extrabold text-rose-400 print:text-black border-t border-white/10 pt-2 text-xs">
                    <span>Всього Витрат (Total OpEx)</span>
                    <span>{formatMoney(summary.totalExpenseUSD)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Expert Settlement Statement Card */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 p-6 rounded-3xl space-y-4 print:bg-white print:border-black">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 print:text-black" />
                <h4 className="font-black text-sm uppercase tracking-wider text-emerald-400 print:text-black">
                  Акт Розрахунку з Експертом & Центром
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-3 py-1 rounded-full print:border print:border-black">
                {contractModelName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="bg-black/30 print:bg-gray-100 p-4 rounded-2xl border border-white/5 print:border-gray-300">
                <span className="text-[9px] uppercase font-bold text-white/40 print:text-gray-600 block">Нарахована Частка Експерта</span>
                <span className="text-lg font-black text-emerald-400 print:text-black block mt-1">{formatMoney(summary.expertShareUSD)}</span>
                <span className="text-[9px] text-white/40 block mt-0.5">{formatMoney(summary.expertShareUAH, true)}</span>
              </div>
              <div className="bg-black/30 print:bg-gray-100 p-4 rounded-2xl border border-white/5 print:border-gray-300">
                <span className="text-[9px] uppercase font-bold text-white/40 print:text-gray-600 block">Фактично Виплачені Аванси</span>
                <span className="text-lg font-black text-white print:text-black block mt-1">{formatMoney(summary.totalPaidToExpertUSD)}</span>
                <span className="text-[9px] text-white/40 block mt-0.5">Згідно Cash Flow записів</span>
              </div>
              <div className="bg-emerald-500/20 print:bg-gray-200 p-4 rounded-2xl border border-emerald-500/40 print:border-black">
                <span className="text-[9px] uppercase font-extrabold text-emerald-400 print:text-black block">Залишок до виплати Експерту</span>
                <span className="text-lg font-black text-amber-400 print:text-black block mt-1">{formatMoney(summary.remainingExpertUSD)}</span>
                <span className="text-[9px] text-amber-400/70 print:text-black block mt-0.5">{formatMoney(summary.remainingExpertUSD * 44, true)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 print:border-black pt-4 text-[11px] text-white/60 print:text-black">
              <span>Частка Продюсерського Центру (B&W): <strong>{formatMoney(summary.pcShareUSD)} ({formatMoney(summary.pcShareUAH, true)})</strong></span>
              <span className="flex items-center gap-1 text-emerald-400 print:text-black font-bold">
                <CheckCircle2 className="w-4 h-4" /> Автоматичний розрахунок виконано
              </span>
            </div>
          </div>

          {/* Signatures Footer for Act Printing */}
          <div className="hidden print:grid print:grid-cols-2 print:gap-12 print:pt-12 print:text-xs">
            <div>
              <p className="font-bold border-b border-black pb-1 mb-6">Від Продюсерського Центру:</p>
              <p>Підпис: ________________________</p>
              <p className="text-[10px] text-gray-500 mt-1">Дата: ____ / ____ / 2026 р.</p>
            </div>
            <div>
              <p className="font-bold border-b border-black pb-1 mb-6">Від Експерта Проекту:</p>
              <p>Підпис: ________________________</p>
              <p className="text-[10px] text-gray-500 mt-1">Дата: ____ / ____ / 2026 р.</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
