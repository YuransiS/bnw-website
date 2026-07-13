"use client";

import React, { useState, useEffect } from "react";
import { KanbanSquare, Plus, Search, ChevronDown } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { formatLocaleNumber, formatDualCurrency } from "@/app/admin/utils";
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

interface KanbanTabProps {
  kanbanProcessedLeads: LeadItem[];
  uniqueSources: string[];
  updatingId: string | null;
  kanbanSearchQuery: string;
  setKanbanSearchQuery: (val: string) => void;
  kanbanTouchFilter: string;
  setKanbanTouchFilter: (val: string) => void;
  kanbanSourceFilter: string;
  setKanbanSourceFilter: (val: string) => void;
  activeKanbanCol: string;
  setActiveKanbanCol: (val: string) => void;
  onDragStart: (e: React.DragEvent, orderId: string) => void;
  onDrop: (e: React.DragEvent, targetColumn: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  openLeadModal: (lead: any) => void;
  setShowAddLead: (val: boolean) => void;
}

export const KanbanTab = React.memo(function KanbanTab({
  kanbanProcessedLeads,
  uniqueSources,
  updatingId,
  kanbanSearchQuery,
  setKanbanSearchQuery,
  kanbanTouchFilter,
  setKanbanTouchFilter,
  kanbanSourceFilter,
  setKanbanSourceFilter,
  activeKanbanCol,
  setActiveKanbanCol,
  onDragStart,
  onDrop,
  onDragOver,
  openLeadModal,
  setShowAddLead
}: KanbanTabProps) {
  const [localSearch, setLocalSearch] = useState(kanbanSearchQuery);

  useEffect(() => {
    setLocalSearch(kanbanSearchQuery);
  }, [kanbanSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== kanbanSearchQuery) {
        setKanbanSearchQuery(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, kanbanSearchQuery, setKanbanSearchQuery]);

  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const selectClass =
    "bg-crm-input-bg border border-crm-border text-crm-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const optionClass = "bg-crm-card text-crm-text";

  // Limit of visible items per column (Default 50, incremented by 50)
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({});

  const getLimitForColumn = (colKey: string) => visibleLimits[colKey] || 50;

  const showMoreLeads = (colKey: string) => {
    setVisibleLimits((prev) => ({
      ...prev,
      [colKey]: getLimitForColumn(colKey) + 50
    }));
  };

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
            <KanbanSquare className="w-5 h-5 text-emerald-500" />
            Управління статусами клієнтів (Канбан)
          </h2>
          <p className="text-white/40 text-xs mt-1 font-semibold">
            Перетягуйте картки лідів для автоматичного оновлення ихнього етапу в базі
          </p>
        </div>
        <button
          onClick={() => setShowAddLead(true)}
          className="px-4 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Додати ліда вручную
        </button>
      </div>

      {/* Kanban local isolated filtering controls */}
      <div
        className={`${cardClass} p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-4 items-center animate-in fade-in duration-300`}
      >
        {/* Search */}
        <div className="relative flex-grow w-full sm:w-auto">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-white/30">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Швидкий пошук на дошці..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#050507] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white"
          />
        </div>

        {/* Touch count select */}
        <div className="relative w-full sm:w-48 shrink-0">
          <select
            value={kanbanTouchFilter}
            onChange={(e) => setKanbanTouchFilter(e.target.value)}
            className={`w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
          >
            <option value="all" className={optionClass}>
              🎯 Торкання: Всі
            </option>
            <option value="multi" className={optionClass}>
              ⚡ Мульти (2+)
            </option>
            <option value="single" className={optionClass}>
              👤 Одиночні (1)
            </option>
          </select>
          <ChevronDown
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
              isLight ? "text-neutral-500" : "text-white/40"
            }`}
          />
        </div>

        {/* Source sheet select */}
        <div className="relative w-full sm:w-48 shrink-0">
          <select
            value={kanbanSourceFilter}
            onChange={(e) => setKanbanSourceFilter(e.target.value)}
            className={`w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl focus:outline-none text-xs font-extrabold cursor-pointer ${selectClass}`}
          >
            <option value="all" className={optionClass}>
              📊 Воронка: Всі
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

      {/* Desktop Kanban Board View */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-10 min-h-[500px] custom-scrollbar">
        {PIPELINE_COLUMNS.map((col) => {
          const colLeads = kanbanProcessedLeads.filter((l: any) => l.status === col.key);
          const limit = getLimitForColumn(col.key);
          const displayedColLeads = colLeads.slice(0, limit);

          return (
            <div
              key={col.key}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, col.key)}
              className={`w-72 shrink-0 ${cardClass} rounded-2xl p-4 flex flex-col space-y-4 hover:border-white/10 transition-all`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="text-xs font-black uppercase text-white">{col.label}</h3>
                </div>
                <span className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Area */}
              <div className="flex-grow space-y-3 overflow-y-auto max-h-[600px] custom-scrollbar p-0.5">
                {colLeads.length === 0 ? (
                  <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[10px] text-white/20 uppercase font-black">
                    Перетягніть сюди
                  </div>
                ) : (
                  <>
                    {displayedColLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, lead.id)}
                        onClick={() => openLeadModal(lead)}
                        className={`p-4 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group ${
                          updatingId === lead.id
                            ? "opacity-50 pointer-events-none scale-95 border-emerald-500/50"
                            : lead.usdPaid > 0 || lead.uahPaid > 0
                            ? "border-emerald-500/15"
                            : "border-white/5"
                        }`}
                      >
                        {lead.usdPaid > 0 || lead.uahPaid > 0 ? (
                          <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500/10 border-l border-b border-emerald-500/20 text-[9px] font-black text-emerald-400">
                            Оплачено
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold text-white truncate group-hover:text-emerald-400 transition-all pr-12">
                            {lead.name}
                          </h4>
                          <p className="text-[10px] text-white/40">{lead.phone}</p>

                          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                            {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/40 border border-white/5 shrink-0">
                              {lead.utmSource || lead.utm_source || "direct"}
                            </span>
                            {lead.assigned_manager_name && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                title={`Менеджер: ${lead.assigned_manager_name}`}
                              >
                                👤{" "}
                                {lead.assigned_manager_name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>

                          {(lead.diagnosticsComment || lead.managerComment) && (
                            <div className="mt-2 text-[10px] space-y-1 bg-white/[0.02] border border-white/5 p-2 rounded-lg text-white/60">
                              {lead.diagnosticsComment && (
                                <div className="truncate" title={lead.diagnosticsComment}>
                                  <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">
                                    Запит:
                                  </span>
                                  {lead.diagnosticsComment}
                                </div>
                              )}
                              {lead.managerComment && (
                                <div className="truncate" title={lead.managerComment}>
                                  <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">
                                    Ком:
                                  </span>
                                  {lead.managerComment}
                                </div>
                              )}
                            </div>
                          )}

                          {lead.usdPaid > 0 || lead.uahPaid > 0 ? (
                            <p className="text-xs font-black text-emerald-400 mt-1">
                              {formatDualCurrency(lead.usdPaid, lead.uahPaid)}
                            </p>
                          ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 ? (
                            <p
                              className="text-xs font-bold text-amber-500/80 mt-1 flex items-center gap-1"
                              title="Спроба оплати (Unpaid Intent)"
                            >
                              ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {colLeads.length > limit && (
                      <button
                        onClick={() => showMoreLeads(col.key)}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] transition-all cursor-pointer text-center"
                      >
                        Показати ще (+50)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Kanban Column Switcher */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-3 pt-1 mb-4 custom-scrollbar">
        {PIPELINE_COLUMNS.map((col) => {
          const colLeadsCount = kanbanProcessedLeads.filter((l: any) => l.status === col.key).length;
          const isActive = activeKanbanCol === col.key;
          return (
            <button
              key={col.key}
              type="button"
              onClick={() => setActiveKanbanCol(col.key)}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all border flex items-center gap-2 cursor-pointer ${
                isActive
                  ? isLight
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-md"
                    : "bg-white text-black border-white shadow-lg"
                  : isLight
                  ? "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-900"
                  : "bg-white/5 border-white/5 text-white/40 hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
              <span>{col.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[8px] font-black ${
                  isActive ? "bg-black/10 text-black/60" : "bg-white/5 text-white/30"
                }`}
              >
                {colLeadsCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Kanban Cards Column View */}
      <div className="md:hidden">
        {(() => {
          const activeCol = PIPELINE_COLUMNS.find((c) => c.key === activeKanbanCol) || PIPELINE_COLUMNS[0];
          const colLeads = kanbanProcessedLeads.filter((l: any) => l.status === activeCol.key);
          const limit = getLimitForColumn(activeCol.key);
          const displayedColLeads = colLeads.slice(0, limit);

          return (
            <div className={`${cardClass} rounded-2xl p-4 flex flex-col space-y-4`}>
              {/* Column Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${activeCol.dotColor}`} />
                  <h3 className="text-xs font-black uppercase text-white">{activeCol.label}</h3>
                </div>
                <span className="text-[10px] font-black text-white/30 bg-white/5 px-2 py-0.5 rounded">
                  {colLeads.length}
                </span>
              </div>

              {/* Cards Area */}
              <div className="space-y-3">
                {colLeads.length === 0 ? (
                  <div className="h-28 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[10px] text-white/20 uppercase font-black">
                    Колонка порожня
                  </div>
                ) : (
                  <>
                    {displayedColLeads.map((lead: any) => (
                      <div
                        key={lead.id}
                        onClick={() => openLeadModal(lead)}
                        className={`p-4 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-pointer relative overflow-hidden group ${
                          lead.usdPaid > 0 || lead.uahPaid > 0 ? "border-emerald-500/15" : "border-white/5"
                        }`}
                      >
                        {lead.usdPaid > 0 || lead.uahPaid > 0 ? (
                          <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-emerald-500/10 border-l border-b border-emerald-500/20 text-[9px] font-black text-emerald-400">
                            Оплачено
                          </div>
                        ) : null}

                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold text-white group-hover:text-emerald-400 transition-all pr-12">
                            {lead.name}
                          </h4>
                          <p className="text-[10px] text-white/40">{lead.phone}</p>

                          <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5">
                            {lead.telegram && renderSocialsLink(lead.telegram, "tg")}
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-white/40 border border-white/5 shrink-0">
                              {lead.utmSource || lead.utm_source || "direct"}
                            </span>
                            {lead.assigned_manager_name && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                title={`Менеджер: ${lead.assigned_manager_name}`}
                              >
                                👤{" "}
                                {lead.assigned_manager_name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((n: string) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>

                          {(lead.diagnosticsComment || lead.managerComment) && (
                            <div className="mt-2 text-[10px] space-y-1 bg-white/[0.02] border border-white/5 p-2 rounded-lg text-white/60">
                              {lead.diagnosticsComment && (
                                <div className="truncate" title={lead.diagnosticsComment}>
                                  <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">
                                    Запит:
                                  </span>
                                  {lead.diagnosticsComment}
                                </div>
                              )}
                              {lead.managerComment && (
                                <div className="truncate" title={lead.managerComment}>
                                  <span className="font-extrabold text-[8px] uppercase tracking-wider text-white/30 mr-1">
                                    Ком:
                                  </span>
                                  {lead.managerComment}
                                </div>
                              )}
                            </div>
                          )}

                          {lead.usdPaid > 0 || lead.uahPaid > 0 ? (
                            <p className="text-xs font-black text-emerald-455 mt-1">
                              {formatDualCurrency(lead.usdPaid, lead.uahPaid)}
                            </p>
                          ) : lead.usdAttempted > 0 || lead.uahAttempted > 0 ? (
                            <p
                              className="text-xs font-bold text-amber-500/80 mt-1 flex items-center gap-1"
                              title="Спроба оплати (Unpaid Intent)"
                            >
                              ⏳ {formatDualCurrency(lead.usdAttempted, lead.uahAttempted)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {colLeads.length > limit && (
                      <button
                        onClick={() => showMoreLeads(activeCol.key)}
                        className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] transition-all cursor-pointer text-center"
                      >
                        Показати ще (+50)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
});

export default KanbanTab;
