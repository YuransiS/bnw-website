"use client";

import React, { useState } from "react";
import {
  X, GitBranch, Search, RefreshCw, Check, Plus, Filter, Sparkles,
  ExternalLink, Bot, Zap, ArrowRight, Layers, CheckCircle2
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
  onImportFlowAsStep,
  onFilterByFlow,
  selectedFilterStep
}: SendPulseFlowsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);

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

  const handleImport = async (flow: SendPulseFlowItem) => {
    setImportingId(flow.id);
    try {
      await onImportFlowAsStep(flow);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-[#0f0f13] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
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
                Оберіть ланцюжок з бота SendPulse для додавання у воронку «{funnelName || "Поточна воронка"}» або швидкої фільтрації підписників.
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
            <span>У воронці: <strong className="text-emerald-400">{currentSteps.length}</strong></span>
          </div>
        </div>

        {/* Flows List */}
        <div className="p-5 overflow-y-auto max-h-[550px] space-y-3 custom-scrollbar">
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
              const imported = isStepImported(flow);
              const isImporting = importingId === flow.id;
              const cleanSlug = transliterateToSlug(flow.name);
              const isFiltering = selectedFilterStep === cleanSlug;

              return (
                <div
                  key={flow.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                    imported
                      ? "bg-emerald-500/[0.04] border-emerald-500/30"
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
                      {imported && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[9px] font-black flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Додано у воронку
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-mono">
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

                    <button
                      type="button"
                      onClick={() => handleImport(flow)}
                      disabled={imported || isImporting}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                        imported
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default opacity-80"
                          : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10"
                      }`}
                    >
                      {isImporting ? (
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
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-xs text-white/40">
          <span>
            💡 Кожен доданий ланцюжок автоматично генерує унікальний Webhook URL для відстеження конверсій.
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
