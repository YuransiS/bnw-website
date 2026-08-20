"use client";

import React, { useState, useEffect } from "react";
import {
  Globe,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Layers,
  Sparkles,
  Settings,
  Link as LinkIcon,
  Eye,
  Copy,
  Check,
  X
} from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { pingAllProjectsAction, getProjectLandingsRegistryAction } from "../../actions";
import { DEFAULT_PROJECT_LANDINGS } from "@/lib/projectLandings";
import ProjectSettingsModal from "../components/ProjectSettingsModal";

interface LandingsRegistryTabProps {
  activeSlug: string;
  allowedProjects: any[];
  userRole?: string;
  viewType?: "all" | "single";
}

export default function LandingsRegistryTab({
  activeSlug,
  allowedProjects,
  userRole = "admin",
  viewType = "single"
}: LandingsRegistryTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [isLoading, setIsLoading] = useState(false);
  const [pingResults, setPingResults] = useState<any[]>([]);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [selectedProjectForSettings, setSelectedProjectForSettings] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load persistent landings registry from Supabase DB on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Instant fallback layout while loading
    const initialList = (allowedProjects || []).map((p: any) => {
      const slug = p.slug;
      const defaultLandings = DEFAULT_PROJECT_LANDINGS[slug] || [];
      const rootUrl = defaultLandings[0]?.url || `https://${slug.replace(/_/g, "-")}.vercel.app`;
      return {
        id: p.id,
        slug,
        name: p.name,
        cell_id: p.cell_id,
        default_currency: p.default_currency || "UAH",
        expert_share_percent: p.expert_share_percent ?? 50,
        domain: rootUrl.replace(/\/$/, ""),
        isLive: true,
        status: "live",
        latencyMs: 0,
        discoveredCount: defaultLandings.length,
        landings: defaultLandings,
        message: "Синхронізація з базою...",
        lastPingAt: null
      };
    });
    setPingResults(initialList);

    // 2. Fetch full persisted registry from Supabase
    getProjectLandingsRegistryAction().then((res) => {
      if (isMounted && res.results && res.results.length > 0) {
        // Match with allowed projects
        const allowedSlugs = new Set((allowedProjects || []).map((p: any) => p.slug));
        const filtered = allowedSlugs.size > 0 
          ? res.results.filter((r: any) => allowedSlugs.has(r.slug))
          : res.results;
        setPingResults(filtered);
      }
    }).catch((err) => {
      console.warn("Could not load persistent landings registry:", err);
    });

    return () => {
      isMounted = false;
    };
  }, [allowedProjects]);

  const handlePingAll = async () => {
    setIsLoading(true);
    setFeedbackMsg("Опитую сателітні сайти через Discovery Protocol...");
    try {
      const res = await pingAllProjectsAction();
      if (res.error) throw new Error(res.error);

      if (res.results) {
        setPingResults(res.results);
        setLastPingTime(new Date().toLocaleTimeString("uk-UA"));
        const live = res.results.filter((r: any) => r.isLive).length;
        setFeedbackMsg(`Успішно опитано ${res.results.length} проектів (${live} в мережі)`);
      }
    } catch (err: any) {
      setFeedbackMsg(`Помилка опитування: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const currentProject = pingResults.find(p => p.slug === activeSlug) || pingResults[0];
  const currentLandings = currentProject?.landings || (activeSlug ? DEFAULT_PROJECT_LANDINGS[activeSlug] || [] : []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & KPI Card */}
      <div className="bg-crm-card border border-crm-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-crm-text">
                {viewType === "single" ? `🌐 Лендінги проекту: ${currentProject?.name || activeSlug}` : "🌐 Реєстр Сателітів & Лендінгів"}
              </h2>
            </div>
            <p className="text-xs text-crm-muted max-w-2xl font-medium">
              {viewType === "single"
                ? "Каталог усіх зареєстрованих веб-сторінок, лідмагнітів, анкет та воронок для цього проекту з швидким прев'ю."
                : "Автоматичний моніторинг доступності, виявлення нових сторінок та перевірка зв'язку з сателітними сайтами холдингу."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePingAll}
              disabled={isLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg ${
                isLoading
                  ? "bg-emerald-500/50 text-black cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black hover:scale-[1.02] shadow-emerald-500/20"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Опитування..." : "⚡ Опитати статус (Ping)"}
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-crm-text flex items-center justify-between">
            <span className="font-semibold">{feedbackMsg}</span>
            {lastPingTime && <span className="text-crm-muted">Останній пінг: {lastPingTime}</span>}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-crm-border">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-crm-muted tracking-wider block mb-1">
              {viewType === "single" ? "Активних сторінок" : "Всього проектів"}
            </span>
            <span className="text-lg font-black text-crm-text">
              {viewType === "single" ? currentLandings.length : pingResults.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block mb-1">
              Статус сайту
            </span>
            <span className="text-lg font-black text-emerald-400">
              {currentProject?.isLive !== false ? "🟢 Live (В мережі)" : "🔴 Не відповідає"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block mb-1">
              Домен проекту
            </span>
            <span className="text-xs font-mono font-bold text-blue-400 truncate block mt-1">
              {currentProject?.domain || (activeSlug ? `https://${activeSlug}.vercel.app` : "—")}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block mb-1">
              Auto-Discovery
            </span>
            <span className="text-xs font-black text-purple-400 block mt-1">v1.0 (Синхронізовано)</span>
          </div>
        </div>
      </div>

      {/* SINGLE PROJECT VIEW: Large, Rich Landing Cards */}
      {viewType === "single" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-crm-text flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Каталог лендінгів ({currentLandings.length})
            </h3>
          </div>

          {currentLandings.length === 0 ? (
            <div className="bg-crm-card border border-crm-border rounded-3xl p-12 text-center space-y-3">
              <Globe className="w-8 h-8 text-crm-muted mx-auto" />
              <p className="text-sm font-bold text-crm-text">Для цього проекту ще немає зареєстрованих сторінок</p>
              <p className="text-xs text-crm-muted">Сторінки додаються автоматично при відкритті сайту або через SDK</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {currentLandings.map((land: any, idx: number) => {
                const landUrl = land.url || `${currentProject?.domain || ''}${land.path}`;
                const isPaid = land.type === "paid";
                const isQuiz = land.type === "quiz";
                const isThankYou = land.type === "thank_you" || land.path?.includes("thank");

                let typeBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                let typeText = "Free / Лендінг";
                if (isPaid) {
                  typeBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                  typeText = "Paid / Оплата";
                } else if (isQuiz) {
                  typeBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                  typeText = "Quiz / Анкета";
                } else if (isThankYou) {
                  typeBadge = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                  typeText = "Thank You / Дякуємо";
                }

                const paramsList = land.parameters
                  ? Object.keys(land.parameters)
                  : ["utm_source", "utm_campaign", "p", "o"];

                return (
                  <div
                    key={idx}
                    className="bg-crm-card border border-crm-border rounded-3xl p-6 shadow-xl space-y-4 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${typeBadge}`}>
                              {typeText}
                            </span>
                            <span className="text-[10px] font-mono text-crm-muted">
                              {land.path || "/"}
                            </span>
                          </div>
                          <h4 className="font-black text-base text-crm-text mt-1.5">
                            {land.label || land.path || "Головна сторінка"}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(landUrl)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all cursor-pointer"
                            title="Скопіювати посилання"
                          >
                            {copiedUrl === landUrl ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewUrl(landUrl)}
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                            title="Прев'ю сторінки"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={landUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all"
                            title="Відкрити в новій вкладці"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      {/* URL Box */}
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-crm-border flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-crm-text/90 truncate mr-2">
                          {landUrl}
                        </span>
                        <span className="text-[9px] text-emerald-400 font-bold uppercase shrink-0">
                          Live
                        </span>
                      </div>

                      {/* Supported Parameters */}
                      {paramsList.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] uppercase font-black text-crm-muted tracking-wider block">
                            Підтримувані параметри:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {paramsList.map((param: string) => (
                              <span
                                key={param}
                                className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-mono font-semibold text-crm-muted border border-white/5"
                              >
                                ?{param}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="pt-3 border-t border-crm-border flex items-center justify-between text-[10px] text-crm-muted">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Готово для запуску трафіку
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewUrl(landUrl)}
                        className="text-emerald-400 hover:underline font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" /> Переглянути
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ALL PROJECTS VIEW: When viewing from global admin */}
      {viewType === "all" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pingResults.map((project) => {
            const landings = project.landings || [];
            return (
              <div
                key={project.slug}
                className="bg-crm-card border border-crm-border rounded-3xl p-6 shadow-xl space-y-4 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-crm-text">{project.name}</h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-crm-muted border border-white/10">
                          {project.slug}
                        </span>
                      </div>
                      <a
                        href={project.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mt-1 font-semibold"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {project.domain}
                      </a>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${
                          project.isLive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            project.isLive ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                          }`}
                        />
                        {project.isLive ? "В мережі (Live)" : "Не відповідає"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-crm-border">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-crm-muted tracking-wider">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Виявлені лендінги ({landings.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {landings.map((land: any, idx: number) => {
                        const landUrl = land.url || `${project.domain}${land.path}`;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-white/[0.02] border border-crm-border hover:border-white/20 transition-all flex items-center justify-between group"
                          >
                            <div className="truncate pr-2">
                              <span className="text-xs font-bold text-crm-text truncate block">
                                {land.label || land.path}
                              </span>
                              <span className="text-[10px] font-mono text-crm-muted truncate block">
                                {land.path || "/"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(landUrl)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all shrink-0 cursor-pointer"
                              title="Прев'ю"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Responsive Live Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col border shadow-2xl ${
            isLight ? "bg-white border-neutral-200" : "bg-[#0C0C0F] border-white/10"
          }`}>
            {/* Preview Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              isLight ? "border-neutral-200 bg-neutral-50" : "border-white/5 bg-white/[0.02]"
            }`}>
              <div className="flex items-center gap-3 truncate">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h4 className="text-sm font-extrabold text-crm-text truncate">
                    Прев'ю сторінки
                  </h4>
                  <p className="text-[11px] font-mono text-crm-muted truncate">
                    {previewUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/10"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Відкрити в новій вкладці
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewUrl(null)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe Viewport */}
            <div className="flex-1 bg-white relative">
              <iframe
                src={previewUrl}
                title="Landing Preview"
                className="w-full h-full border-none"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      {selectedProjectForSettings && (
        <ProjectSettingsModal
          isOpen={!!selectedProjectForSettings}
          onClose={() => setSelectedProjectForSettings(null)}
          project={selectedProjectForSettings}
          userRole={userRole}
          onProjectUpdated={(updated) => {
            setPingResults((prev) =>
              prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
            );
            setSelectedProjectForSettings(null);
          }}
        />
      )}
    </div>
  );
}
