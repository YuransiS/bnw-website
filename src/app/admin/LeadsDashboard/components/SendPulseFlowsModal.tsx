"use client";

import React, { useState } from "react";
import {
  X, GitBranch, Search, RefreshCw, Check, Plus, Filter, Sparkles,
  ExternalLink, Bot, Zap, ArrowRight, Layers, CheckCircle2, Link2, Unlink, HelpCircle
} from "lucide-react";
import { transliterateToSlug } from "@/utils/transliterate";

export interface SendPulseFlowItem {
  id: string;
  botId: string;
  name: string;
  status: number;
  createdAt?: string;
  triggers?: Array<{ id: string; name: string; type?: number }>;
  channel?: "TELEGRAM" | "INSTAGRAM";
}

interface SendPulseFlowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  botUsername: string;
  funnelName?: string;
  flows: SendPulseFlowItem[];
  loading: boolean;
  onRefresh: () => void;
  currentSteps: any[];
  boundFlowId?: string | null;
  boundFlowName?: string | null;
  flowMode?: "single" | "multi";
  onBindFlow?: (flow: SendPulseFlowItem) => Promise<void> | void;
  onUnbindFlow?: () => Promise<void> | void;
  onSetFlowMode?: (mode: "single" | "multi") => void;
  onImportFlowAsStep: (flow: SendPulseFlowItem) => Promise<void> | void;
  onFilterByFlow?: (slug: string) => void;
  selectedFilterStep?: string | null;
}

export default function SendPulseFlowsModal({
  isOpen,
  onClose,
  botUsername,
  funnelName,
  flows,
  loading,
  onRefresh,
  currentSteps,
  boundFlowId,
  boundFlowName,
  flowMode = "single",
  onBindFlow,
  onUnbindFlow,
  onSetFlowMode,
  onImportFlowAsStep,
  onFilterByFlow,
  selectedFilterStep
}: SendPulseFlowsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMode, setActiveMode] = useState<"single" | "multi">(flowMode || "single");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanBot = botUsername.replace(/^@/, "");

  const filteredFlows = flows.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = f.name.toLowerCase().includes(q);
    const trigMatch = (f.triggers || []).some((t) => t.name?.toLowerCase().includes(q));
    return nameMatch || trigMatch;
  });

  const isStepImported = (flow: SendPulseFlowItem) => {
    const slug = transliterateToSlug(flow.name);
    return currentSteps.some(
      (s: any) =>
        (s.flow_id && s.flow_id === flow.id) ||
        (s.slug && s.slug === slug) ||
        (s.label && s.label.toLowerCase() === flow.name.toLowerCase())
    );
  };

  const handleBind = async (flow: SendPulseFlowItem) => {
    if (!onBindFlow) return;
    setActionLoadingId(flow.id);
    try {
      await onBindFlow(flow);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnbind = async (flowId: string) => {
    if (!onUnbindFlow) return;
    setActionLoadingId(flowId);
    try {
      await onUnbindFlow();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleImport = async (flow: SendPulseFlowItem) => {
    setActionLoadingId(flow.id);
    try {
      await onImportFlowAsStep(flow);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleModeChange = (mode: "single" | "multi") => {
    setActiveMode(mode);
    if (onSetFlowMode) onSetFlowMode(mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#0f0f13] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Ланцюжки SendPulse (Flows)</h3>
                <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[10px] font-extrabold text-white/70 rounded-full flex items-center gap-1">
                  <Bot className="w-3 h-3 text-emerald-400" /> @{cleanBot}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">
                Підв'язка ланцюжка до воронки «{funnelName || "Поточна воронка"}» або імпорт окремих кроків.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl border border-white/10 transition-all cursor-pointer disabled:opacity-50"
              title="Оновити ланцюжки з SendPulse"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Architecture Mode Selector (90% vs 10%) */}
        <div className="px-5 pt-4 pb-3 border-b border-white/5 bg-black/40 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-black tracking-wider text-white/50 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Архітектура підв'язки воронки:
            </span>

            <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => handleModeChange("single")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === "single"
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>⚡ 1 ланцюжок = 1 воронка</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${activeMode === "single" ? "bg-black/20 text-black" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                  90%
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("multi")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeMode === "multi"
                    ? "bg-purple-500 text-white shadow-md shadow-purple-500/20"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>🔀 Кілька ланцюжків як кроки</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${activeMode === "multi" ? "bg-black/20 text-white" : "bg-white/10 text-white/40"}`}>
                  10%
                </span>
              </button>
            </div>
          </div>

          {/* Mode Context Hint */}
          <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
            activeMode === "single"
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300/90"
              : "bg-purple-500/5 border-purple-500/20 text-purple-300/90"
          }`}>
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-70" />
            <div className="text-[11px] leading-relaxed">
              {activeMode === "single" ? (
                <>
                  <strong>Режим 1 ланцюжка (Рекомендовано):</strong> воронка повністю прив'язується до одного обраного ланцюжка. База підписників та аналітика цієї воронки фільтруються виключно за учасниками цього ланцюжка, а не за всією аудиторією бота.
                </>
              ) : (
                <>
                  <strong>Покроковий режим (10% випадків):</strong> для складних воронок, розбитих на окремі частини. Ви можете додати будь-яку кількість ланцюжків як окремі кроки воронки зі своїми Webhook URL.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar & Quick Stats */}
        <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук ланцюжка за назвою чи тригером..."
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-xs text-white/50">
            <span>Знайдено: <strong className="text-white">{filteredFlows.length}</strong></span>
            <span>•</span>
            {activeMode === "single" ? (
              <span>Підв'язано: <strong className="text-emerald-400">{boundFlowName ? boundFlowName : "Не обрано"}</strong></span>
            ) : (
              <span>У воронці: <strong className="text-purple-400">{currentSteps.length} кроків</strong></span>
            )}
          </div>
        </div>

        {/* Flows List */}
        <div className="p-5 overflow-y-auto max-h-[500px] space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-white/40 italic space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-semibold">Завантаження ланцюжків з SendPulse API...</p>
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="py-16 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-2xl p-6 space-y-2">
              <GitBranch className="w-8 h-8 text-white/20 mx-auto mb-1" />
              <p className="text-xs text-white/50 font-bold">
                {flows.length === 0
                  ? "У боті ще немає створених ланцюжків або перевірте API ключі SendPulse."
                  : "Не знайдено ланцюжків за вашим запитом."}
              </p>
            </div>
          ) : (
            filteredFlows.map((flow) => {
              const isBound = boundFlowId === flow.id;
              const imported = isStepImported(flow);
              const isLoading = actionLoadingId === flow.id;
              const cleanSlug = transliterateToSlug(flow.name);
              const isFiltering = selectedFilterStep === cleanSlug;

              return (
                <div
                  key={flow.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                    isBound
                      ? "bg-emerald-500/[0.08] border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                      : imported && activeMode === "multi"
                      ? "bg-purple-500/[0.06] border-purple-500/40"
                      : "bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-sm text-white truncate max-w-md">
                        {flow.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          flow.status === 1
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-white/5 text-white/40 border border-white/10"
                        }`}
                      >
                        {flow.status === 1 ? "Активний" : "Чернетка"}
                      </span>
                      {isBound && (
                        <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[9px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Основний ланцюжок воронки
                        </span>
                      )}
                      {!isBound && imported && activeMode === "multi" && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full text-[9px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Додано як крок
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono flex-wrap">
                      <span>ID: {flow.id}</span>
                      <span>•</span>
                      <span>slug: step={cleanSlug}</span>
                      {flow.triggers && flow.triggers.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-white/60">
                            Тригери: {flow.triggers.map((t) => t.name).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onFilterByFlow && (
                      <button
                        type="button"
                        onClick={() => {
                          onFilterByFlow(cleanSlug);
                          onClose();
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isFiltering
                            ? "bg-emerald-500 text-black font-black"
                            : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
                        }`}
                        title="Показати підписників, які брали участь у цьому ланцюжку"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span>{isFiltering ? "Фільтр активний" : "Фільтрувати"}</span>
                      </button>
                    )}

                    {activeMode === "single" ? (
                      isBound ? (
                        <button
                          type="button"
                          onClick={() => handleUnbind(flow.id)}
                          disabled={isLoading}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 border border-white/10 hover:border-rose-500/30"
                          title="Відв'язати цей ланцюжок від воронки"
                        >
                          <Unlink className="w-3.5 h-3.5 text-rose-400" />
                          <span>{isLoading ? "Відв'язування..." : "Відв'язати"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBind(flow)}
                          disabled={isLoading}
                          className="px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10"
                          title="Підв'язати цей ланцюжок як основний для цієї воронки"
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Підв'язую...</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3.5 h-3.5" />
                              <span>🔗 Підв'язати до воронки</span>
                            </>
                          )}
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleImport(flow)}
                        disabled={imported || isLoading}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          imported
                            ? "bg-purple-500/10 text-purple-300 border border-purple-500/20 cursor-default opacity-80"
                            : "bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/10"
                        }`}
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Додавання...</span>
                          </>
                        ) : imported ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>У воронці</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Додати як крок</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-xs text-white/40">
          <span>
            {activeMode === "single"
              ? "⚡ У режимі «1 ланцюжок = 1 воронка» база контактів автоматично фільтрується за цим ланцюжком."
              : "🔀 Кожен доданий крок автоматично генерує Webhook URL для SendPulse блоків «Дія»."}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all cursor-pointer border border-white/10"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
}
