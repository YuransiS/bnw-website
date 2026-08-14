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
  Link as LinkIcon
} from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { pingAllProjectsAction } from "../../actions";
import { DEFAULT_PROJECT_LANDINGS } from "@/lib/projectLandings";
import ProjectSettingsModal from "../components/ProjectSettingsModal";

interface LandingsRegistryTabProps {
  activeSlug: string;
  allowedProjects: any[];
  userRole?: string;
}

export default function LandingsRegistryTab({
  activeSlug,
  allowedProjects,
  userRole = "admin"
}: LandingsRegistryTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [isLoading, setIsLoading] = useState(false);
  const [pingResults, setPingResults] = useState<any[]>([]);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [selectedProjectForSettings, setSelectedProjectForSettings] = useState<any | null>(null);

  // Initialize with allowed projects and static defaults
  useEffect(() => {
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
        message: "Очікує ручного чи авто-опитування",
        lastPingAt: null
      };
    });
    setPingResults(initialList);
  }, [allowedProjects]);

  const handlePingAll = async () => {
    setIsLoading(true);
    setFeedbackMsg("Опитую всі сателітні сайти через Discovery Protocol...");
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

  const totalPagesCount = pingResults.reduce((acc, curr) => acc + (curr.landings?.length || 0), 0);
  const liveCount = pingResults.filter((r) => r.isLive).length;

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
                🌐 Реєстр Сателітів & Лендінгів (Auto-Discovery)
              </h2>
            </div>
            <p className="text-xs text-crm-muted max-w-2xl font-medium">
              Автоматичний моніторинг доступності, виявлення нових сторінок та перевірка зв&apos;язку з сателітними сайтами холдингу.
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
              {isLoading ? "Опитування..." : "⚡ Опитати всі сайти зараз"}
            </button>
          </div>
        </div>

        {feedbackMsg && (
          <div className="mt-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-crm-text flex items-center justify-between">
            <span className="font-semibold">{feedbackMsg}</span>
            {lastPingTime && <span className="text-crm-muted">Останній пінг: {lastPingTime}</span>}
          </div>
        )}

        {/* Level 1 Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-crm-border">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-crm-muted tracking-wider block mb-1">
              Всього проектів
            </span>
            <span className="text-lg font-black text-crm-text">{pingResults.length}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block mb-1">
              В мережі (Live)
            </span>
            <span className="text-lg font-black text-emerald-400">{liveCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block mb-1">
              Зареєстровано сторінок
            </span>
            <span className="text-lg font-black text-blue-400">{totalPagesCount}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-crm-border">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider block mb-1">
              Discovery Протокол
            </span>
            <span className="text-xs font-black text-purple-400 block mt-1">v1.0 (Active)</span>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pingResults.map((project) => {
          const landings = project.landings || [];
          return (
            <div
              key={project.slug}
              className="bg-crm-card border border-crm-border rounded-3xl p-6 shadow-xl space-y-4 hover:border-emerald-500/30 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Project Title & Status Header */}
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

                  {/* Health status badge */}
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
                    {project.latencyMs > 0 && (
                      <span className="text-[9px] text-crm-muted block mt-1 font-mono">
                        {project.latencyMs} ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Discovered Landings List */}
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
                      const isPaid = land.type === "paid";
                      const isQuiz = land.type === "quiz";

                      let typeBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                      let typeText = "Free";
                      if (isPaid) {
                        typeBadge = "bg-blue-500/10 text-blue-400 border-blue-500/20";
                        typeText = "Paid";
                      } else if (isQuiz) {
                        typeBadge = "bg-purple-500/10 text-purple-400 border-purple-500/20";
                        typeText = "Quiz";
                      }

                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-crm-border hover:border-white/20 transition-all flex items-center justify-between group"
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-crm-text truncate">
                                {land.label || land.path}
                              </span>
                              <span
                                className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${typeBadge}`}
                              >
                                {typeText}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-crm-muted truncate block">
                              {land.path || "/"}
                            </span>
                          </div>

                          <a
                            href={landUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all shrink-0"
                            title={`Відкрити ${landUrl}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card Footer status info */}
              <div className="pt-3 border-t border-crm-border flex items-center justify-between text-[10px] text-crm-muted">
                <span>{project.message || "Очікує пінг"}</span>
                <div className="flex items-center gap-2">
                  {["admin", "superman", "founder", "developer"].includes(userRole) && (
                    <button
                      type="button"
                      onClick={() => setSelectedProjectForSettings(project)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-crm-text text-crm-muted flex items-center gap-1 font-bold transition-all"
                      title="Налаштування проекту"
                    >
                      <Settings className="w-3 h-3" />
                      Налаштування
                    </button>
                  )}
                  {project.lastPingAt && (
                    <span>Пінг: {new Date(project.lastPingAt).toLocaleTimeString("uk-UA")}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
