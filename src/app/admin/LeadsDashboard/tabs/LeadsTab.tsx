"use client";

import React from "react";
import { Grid, Plus, Search, ChevronDown, Calendar, X, XCircle, Copy, Check, AlertCircle } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { formatDualCurrency, formatLocaleNumber } from "@/app/admin/utils";
import { LeadItem } from "../types";

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

interface LeadsTabProps {
  processedLeads: LeadItem[];
  paginatedLeads: LeadItem[];
  uniqueSources: string[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  touchCountFilter: string;
  setTouchCountFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  unpaidIntentOnly: boolean;
  setUnpaidIntentOnly: (val: boolean) => void;
  dateRangePreset: string;
  startDate: string;
  endDate: string;
  applyPreset: (preset: "all" | "30d" | "7d" | "1d") => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setDateRangePreset: (val: any) => void;
  copiedId: string | null;
  handleCopyPhone: (phone: string, id: string) => void;
  totalCount: number;
  pageSize: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  openLeadModal: (lead: any) => void;
  setShowAddLead: (val: boolean) => void;
  isDevMode: boolean;
}

export const LeadsTab = React.memo(function LeadsTab({
  processedLeads,
  paginatedLeads,
  uniqueSources,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  touchCountFilter,
  setTouchCountFilter,
  sourceFilter,
  setSourceFilter,
  unpaidIntentOnly,
  setUnpaidIntentOnly,
  dateRangePreset,
  startDate,
  endDate,
  applyPreset,
  setStartDate,
  setEndDate,
  setDateRangePreset,
  copiedId,
  handleCopyPhone,
  totalCount,
  pageSize,
  currentPage,
  setCurrentPage,
  openLeadModal,
  setShowAddLead,
  isDevMode
}: LeadsTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";
  const inputClass =
    "bg-crm-input-bg border border-crm-border text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const selectClass =
    "bg-crm-input-bg border border-crm-border text-crm-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const optionClass = "bg-crm-card text-crm-text";

  const renderSocialsLink = (username: string, type: "tg" | "ig") => {
    if (!username) return null;
    const clean = username
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/t\.me\//, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
    if (!clean) return null;

    const href = type === "tg" ? `https://t.me/${clean}` : `https://instagram.com/${clean}`;

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 transition-all ${
          type === "tg"
            ? "bg-[#81D8D0]/10 border border-[#81D8D0]/20 text-[#81D8D0]"
            : "bg-pink-500/10 border border-pink-500/20 text-pink-400"
        }`}
      >
        {type === "tg" ? "tg" : "ig"}
      </a>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Grid className="w-5 h-5 text-emerald-500" />
            База даних лідів холдингу
          </h2>
          <p className="text-white/40 text-xs mt-1 font-semibold">
            Повний список клієнтів із автоматичним дедуплікуванням (DSU)
          </p>
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
              <option value="all" className={optionClass}>
                🎯 Фільтр: Всі статуси
              </option>
              {PIPELINE_COLUMNS.map((col) => (
                <option key={col.key} value={col.key} className={optionClass}>
                  {col.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>

          {/* Touch Count select */}
          <div className="relative">
            <select
              value={touchCountFilter}
              onChange={(e) => setTouchCountFilter(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
            >
              <option value="all" className={optionClass}>
                🔥 Фільтр: Всі торкання
              </option>
              <option value="multi" className={optionClass}>
                ⚡ Мульти-торкання (2+)
              </option>
              <option value="single" className={optionClass}>
                👤 Одиночні ліди (1)
              </option>
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>

          {/* Source sheet select */}
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={`w-full appearance-none pl-4 pr-10 py-3.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
            >
              <option value="all" className={optionClass}>
                📊 Фільтр: Всі воронки
              </option>
              {uniqueSources.map((source: string) => (
                <option key={source} value={source} className={optionClass}>
                  {source}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                isLight ? "text-neutral-500" : "text-white/40"
              }`}
            />
          </div>
        </div>

        {/* Advanced Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
          <div className="flex items-center gap-3">
            {/* Unpaid Intent Checkbox */}
            <button
              type="button"
              onClick={() => setUnpaidIntentOnly(!unpaidIntentOnly)}
              className={`px-4 py-2.5 rounded-full border text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                unpaidIntentOnly
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-white/[0.02] text-white/50 border-white/10 hover:text-white"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Втрачена ініціатива (Unpaid Intent)
            </button>
          </div>

          {/* Date pickers */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-[10px] font-black uppercase ${isLight ? "text-neutral-500" : "text-white/30"}`}>
              Період:
            </span>
            <button
              type="button"
              onClick={() => {
                if (dateRangePreset === "1d") {
                  applyPreset("all");
                } else {
                  applyPreset("1d");
                }
              }}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                dateRangePreset === "1d"
                  ? isLight
                    ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                    : "bg-emerald-500 text-black shadow-lg hover:bg-emerald-400"
                  : isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300"
                  : "bg-white/[0.02] hover:bg-white/5 text-white/60 hover:text-white border border-white/10"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              За останню добу
            </button>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateRangePreset("custom");
                }}
                className={`px-3 py-2 rounded-lg text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                    : "bg-white/[0.02] border border-white/10 text-white"
                }`}
              />
              <span className={isLight ? "text-neutral-300" : "text-white/20"}>—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateRangePreset("custom");
                }}
                className={`px-3 py-2 rounded-lg text-[10px] font-extrabold focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? "bg-neutral-100 border border-neutral-300 text-neutral-900"
                    : "bg-white/[0.02] border border-white/10 text-white"
                }`}
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    applyPreset("all");
                  }}
                  className={`p-2 transition-all rounded-lg ${
                    isLight ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CRM Clustered grid table */}
      <div className={`${cardClass} rounded-2xl overflow-hidden shadow-xl`}>
        {/* Desktop Table View */}
        <div className={`hidden md:block overflow-x-auto border-b ${borderClass}`}>
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
                  <td colSpan={6} className="p-8 text-center text-white/20 italic">
                    Заявки за заданими параметрами відсутні
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead: any) => {
                  const col = PIPELINE_COLUMNS.find((c) => c.key === lead.status) || PIPELINE_COLUMNS[0];
                  const isUnpaidIntent =
                    lead.history.some(
                      (o: any) =>
                        o.status === "⏳ Очікується оплата" || (o.order_id && !o.order_id.startsWith("ELT_ORD_"))
                    ) &&
                    !lead.history.some(
                      (o: any) => o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер" || o.amount > 0
                    );

                  return (
                    <tr
                      key={lead.id}
                      onClick={(e) => {
                        if (
                          (e.target as HTMLElement).closest("a") ||
                          (e.target as HTMLElement).closest("button")
                        ) {
                          return;
                        }
                        openLeadModal(lead);
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
                          {isDevMode && (lead.name === "Невідомий" || !lead.name) && (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/10 text-amber-550 border border-amber-500/20"
                              title="Ім'я контакту відсутнє в базі даних"
                            >
                              Без імені
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[150px] mt-0.5`}
                          title={lead.visitor_uuid}
                        >
                          Visitor ID: {lead.visitor_uuid}
                        </div>
                      </td>

                      {/* Contacts copy and Social handles */}
                      <td className="p-4 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>
                            {lead.phone || "Невідомий телефон"}
                          </span>
                          {lead.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPhone(lead.phone, lead.id);
                              }}
                              className={`p-1 rounded transition-all cursor-pointer ${
                                isLight
                                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                                  : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                              }`}
                            >
                              {copiedId === lead.id ? (
                                <Check className="w-3 h-3 text-emerald-450" />
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
                        <span
                          className={`font-semibold uppercase text-[10px] tracking-wider px-2 py-0.5 rounded ${
                            isLight
                              ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                              : "bg-white/5 text-white/60 border border-white/5"
                          }`}
                        >
                          {lead.utmSource || lead.utm_source || "direct"}
                        </span>
                      </td>

                      {/* Touch count tracking */}
                      <td className="p-4 text-center font-extrabold">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openLeadModal(lead);
                          }}
                          className={`px-2 py-1 rounded border transition-all font-black text-[11px] cursor-pointer ${
                            isLight
                              ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-emerald-600"
                              : "bg-white/5 hover:bg-white/10 border-white/5 text-emerald-450"
                          }`}
                        >
                          {lead.touchCount} торкань
                        </button>
                      </td>

                      {/* Sum Amount */}
                      <td className="p-4 text-center font-black text-sm">
                        {lead.usdPaid > 0 || lead.uahPaid > 0 || lead.eurPaid > 0 ? (
                          <span className="text-emerald-450 font-black">
                            {formatDualCurrency(lead.usdPaid, lead.uahPaid, lead.eurPaid)}
                          </span>
                        ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 || lead.eurAttempted > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 text-amber-500/80 text-[11px] font-extrabold"
                            title="Спроба оплати (Unpaid Intent)"
                          >
                            ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted, lead.eurAttempted)}
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      {/* Pipeline status pill */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold ${
                            lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : lead.status === "Відмова"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : isLight
                              ? "bg-neutral-150 border-neutral-300 text-neutral-700"
                              : "bg-neutral-800 border-neutral-700 text-neutral-300"
                          }`}
                        >
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

        {/* Mobile Card List View */}
        <div className={`md:hidden divide-y ${isLight ? "divide-neutral-200" : "divide-white/5"}`}>
          {processedLeads.length === 0 ? (
            <div className="p-8 text-center text-white/20 italic">Заявки за заданими параметрами відсутні</div>
          ) : (
            paginatedLeads.map((lead: any) => {
              const col = PIPELINE_COLUMNS.find((c) => c.key === lead.status) || PIPELINE_COLUMNS[0];
              const isUnpaidIntent =
                lead.history.some(
                  (o: any) => o.status === "⏳ Очікується оплата" || (o.order_id && !o.order_id.startsWith("ELT_ORD_"))
                ) &&
                !lead.history.some(
                  (o: any) => o.status === "Купив курс" || o.status === "Купив(-ла) Трипвайер" || o.amount > 0
                );

              return (
                <div
                  key={lead.id}
                  onClick={() => openLeadModal(lead)}
                  className="p-5 hover:bg-emerald-500/[0.02] active:bg-emerald-500/[0.04] transition-all cursor-pointer space-y-4"
                >
                  {/* Header: Name, Badges & Amount */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <h3
                        className={`font-extrabold text-sm flex flex-wrap items-center gap-1.5 ${
                          isLight ? "text-neutral-900" : "text-white"
                        }`}
                      >
                        {lead.name}
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
                      </h3>
                      <div
                        className={`text-[10px] ${textMutedClass} font-semibold truncate max-w-[200px]`}
                        title={lead.visitor_uuid}
                      >
                        ID: {lead.visitor_uuid?.substring(0, 8)}...
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {lead.usdPaid > 0 || lead.uahPaid > 0 || lead.eurPaid > 0 ? (
                        <span className="text-emerald-455 font-black text-xs block">
                          {formatDualCurrency(lead.usdPaid, lead.uahPaid, lead.eurPaid)}
                        </span>
                      ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 || lead.eurAttempted > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 text-amber-500/80 text-[10px] font-extrabold"
                          title="Спроба оплати (Unpaid Intent)"
                        >
                          ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted, lead.eurAttempted)}
                        </span>
                      ) : (
                        <span className="text-white/20 text-xs block">—</span>
                      )}
                    </div>
                  </div>

                  {/* Contacts Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isLight ? "text-neutral-800" : "text-white/90"}`}>
                        {lead.phone || "Невідомий телефон"}
                      </span>
                      {lead.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPhone(lead.phone, lead.id);
                          }}
                          className={`p-1.5 rounded transition-all cursor-pointer ${
                            isLight
                              ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900"
                              : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white"
                          }`}
                        >
                          {copiedId === lead.id ? (
                            <Check className="w-3 h-3 text-emerald-450" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                      {lead.instagram && renderSocialsLink(lead.instagram, "ig")}
                    </div>
                  </div>

                  {/* Source, Touch & Status Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded ${
                          isLight
                            ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            : "bg-white/5 text-white/60 border border-white/5"
                        }`}
                      >
                        {lead.utmSource || lead.utm_source || "direct"}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openLeadModal(lead);
                        }}
                        className={`px-2 py-0.5 rounded border transition-all font-black text-[9px] cursor-pointer ${
                          isLight
                            ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-emerald-600"
                            : "bg-white/5 hover:bg-white/10 border-white/5 text-emerald-450"
                        }`}
                      >
                        {lead.touchCount} торк.
                      </button>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-extrabold ${
                        lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер"
                          ? "bg-emerald-500/10 text-emerald-455 border-emerald-500/20"
                          : lead.status === "Відмова"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : isLight
                          ? "bg-neutral-150 border-neutral-300 text-neutral-700"
                          : "bg-neutral-800 border-neutral-700 text-neutral-300"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`} />
                      {lead.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination controls */}
        {totalCount > pageSize && (
          <div className={`flex justify-between items-center p-4 border-t ${borderClass}`}>
            <span className={`text-[11px] font-black uppercase ${textMutedClass}`}>
              Показано {Math.min((currentPage - 1) * pageSize + 1, totalCount)}—{Math.min(currentPage * pageSize, totalCount)} із {totalCount} лідів
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${
                  isLight
                    ? "border-neutral-200 hover:bg-neutral-100 disabled:hover:bg-transparent"
                    : "border-white/10 hover:bg-white/5 disabled:hover:bg-transparent"
                }`}
              >
                Назад
              </button>
              <button
                disabled={currentPage * pageSize >= totalCount}
                onClick={() => setCurrentPage((prev) => prev + 1)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 ${
                  isLight
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
  );
});

export default LeadsTab;
