"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ClipboardCheck,
  Calendar,
  XCircle,
  Search,
  Globe,
  Phone,
  Send,
  Mail,
  Copy,
  Check,
  User,
  Sparkles,
  Layers,
  Settings,
  ExternalLink,
  HelpCircle,
  FileText
} from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import {
  getLeadDate,
  isLeadMatchingLanding,
  getLeadInstagram,
  parseSurveyQuestions,
  formatLocaleNumber
} from "@/app/admin/utils";
import { LeadItem } from "../types";
import { DEFAULT_PROJECT_LANDINGS } from "@/lib/projectLandings";
import { SkeletonPulse } from "@/components/ui/ParabolicProgressBar";
import CustomCalendarPicker from "@/components/ui/CustomCalendarPicker";

const InstagramIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

interface QuizzesTabProps {
  processedLeads: LeadItem[];
  activeQuizLeadId: string | null;
  setActiveQuizLeadId: (val: string | null) => void;
  dateRangePreset: string;
  startDate: string;
  endDate: string;
  applyPreset: (preset: "all" | "30d" | "7d" | "1d" | "month") => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setDateRangePreset: (val: any) => void;
  openLeadModal: (lead: any) => void;
  activeSlug: string;
  activeProject?: any;
  onOpenSettings?: () => void;
  isLoading?: boolean;
}

export const QuizzesTab = React.memo(function QuizzesTab({
  processedLeads,
  activeQuizLeadId,
  setActiveQuizLeadId,
  dateRangePreset,
  startDate,
  endDate,
  applyPreset,
  setStartDate,
  setEndDate,
  setDateRangePreset,
  openLeadModal,
  activeSlug,
  activeProject,
  onOpenSettings,
  isLoading = false
}: QuizzesTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";

  // Local filter states
  const [selectedLandingFilter, setSelectedLandingFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  // 1. Resolve project survey landing paths (strictly from DB configured settings)
  const configuredSurveyPaths = useMemo<string[]>(() => {
    if (activeProject?.survey_landing_paths && Array.isArray(activeProject.survey_landing_paths)) {
      return activeProject.survey_landing_paths;
    }
    return [];
  }, [activeProject?.survey_landing_paths]);

  // 2. Build landing options list for dropdown
  const surveyLandingOptions = useMemo(() => {
    const defaultLandings = DEFAULT_PROJECT_LANDINGS[activeSlug] || [];
    const map = new Map<string, { path: string; label: string; url?: string }>();

    configuredSurveyPaths.forEach((path) => {
      const cleanPath = path.trim();
      const matched = defaultLandings.find((l) => l.path.trim() === cleanPath);
      if (matched) {
        map.set(cleanPath, { path: cleanPath, label: matched.label, url: matched.url });
      } else {
        map.set(cleanPath, { path: cleanPath, label: `Форма (${cleanPath})` });
      }
    });

    return Array.from(map.values());
  }, [configuredSurveyPaths, activeSlug]);

  // 3. Filter leads that match the configured survey landings
  const leadsWithSurveys = useMemo(() => {
    if (configuredSurveyPaths.length === 0) return [];
    return processedLeads.filter((lead: any) => {
      return configuredSurveyPaths.some((path) => {
        return isLeadMatchingLanding(lead, path);
      });
    });
  }, [processedLeads, configuredSurveyPaths]);

  // 4. Apply Landing and Search filters
  const filteredLeads = useMemo(() => {
    let list = leadsWithSurveys;

    // Landing filter
    if (selectedLandingFilter !== "all") {
      list = list.filter((lead) => isLeadMatchingLanding(lead, selectedLandingFilter));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((lead: any) => {
        const nameMatch = lead.name?.toLowerCase().includes(q);
        const phoneMatch = lead.phone?.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const tgMatch = lead.telegram?.toLowerCase().includes(q);
        const igMatch = getLeadInstagram(lead)?.toLowerCase().includes(q);
        const emailMatch = lead.email?.toLowerCase().includes(q);
        const commentMatch = lead.diagnosticsComment?.toLowerCase().includes(q);
        return nameMatch || phoneMatch || tgMatch || igMatch || emailMatch || commentMatch;
      });
    }

    return list;
  }, [leadsWithSurveys, selectedLandingFilter, searchQuery]);

  // Selected lead for Master-Detail view
  const selectedLead = useMemo(() => {
    if (!filteredLeads || filteredLeads.length === 0) return null;
    const found = filteredLeads.find((l: any) => l.id === activeQuizLeadId);
    return found || filteredLeads[0];
  }, [filteredLeads, activeQuizLeadId]);

  // Parsed Q&A lines for the selected lead
  const selectedLeadQA = useMemo(() => {
    if (!selectedLead) return [];
    return parseSurveyQuestions(selectedLead);
  }, [selectedLead]);

  // Selected lead contacts
  const selectedInstagram = useMemo(() => {
    return selectedLead ? getLeadInstagram(selectedLead) : null;
  }, [selectedLead]);

  // Helper to resolve landing label for a lead card
  const getLeadLandingLabel = useCallback((lead: any) => {
    const landings = DEFAULT_PROJECT_LANDINGS[activeSlug] || [];
    for (const land of landings) {
      if (isLeadMatchingLanding(lead, land.url) || isLeadMatchingLanding(lead, land.path)) {
        return land.label;
      }
    }
    const path = lead.page_path || lead.metadata?.page_path || lead.metadata?.raw_row?.page_path;
    if (path) return path;
    return null;
  }, [activeSlug]);

  // Calculate quick stats
  const totalSurveys = leadsWithSurveys.length;
  const withPhoneCount = leadsWithSurveys.filter((l: any) => l.phone && l.phone.trim().length > 5).length;
  const withSocialsCount = leadsWithSurveys.filter((l: any) => l.telegram || getLeadInstagram(l)).length;

  // If no survey landings configured for this project, show friendly first-setup prompt
  if (configuredSurveyPaths.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className={`${cardClass} p-8 sm:p-12 text-center rounded-3xl shadow-2xl max-w-2xl mx-auto space-y-6 my-8`}>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg">
            <ClipboardCheck className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-black text-crm-text tracking-tight">
              У вас ще немає налаштованих лендінгів з анкетами
            </h3>
            <p className="text-xs sm:text-sm text-crm-muted leading-relaxed max-w-lg mx-auto">
              Бажаєте додати сторінки з анкетами? Оберіть, які посадкові сторінки проекту містять анкети чи форми опитування, щоб зручно читати відповіді респондентів, контактні дані та бачити повний шлях клієнта.
            </p>
          </div>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>⚙️ Налаштувати анкетні лендінги</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2
            className={`text-lg font-black uppercase tracking-tight ${
              isLight ? "text-neutral-900" : "text-white"
            } flex items-center gap-2`}
          >
            <ClipboardCheck className="w-5 h-5 text-emerald-500" />
            Анкети та форми ({totalSurveys})
          </h2>
          <p className={`${textMutedClass} text-xs mt-1 font-semibold`}>
            Перегляд відповідей респондентів, контактних даних (Телефон, Telegram, Instagram) та історії лідів.
          </p>
        </div>

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto border ${
              isLight
                ? "bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300 shadow-sm"
                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border-white/10"
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-emerald-400" />
            <span>Налаштувати лендінги анкет</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              {configuredSurveyPaths.length}
            </span>
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-lg"} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-crm-muted flex items-center gap-1">
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400" />
            Всього анкет
          </span>
          <p className="text-xl font-black text-crm-text">{formatLocaleNumber(totalSurveys)}</p>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-lg"} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-crm-muted flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-blue-400" />
            З номером телефону
          </span>
          <p className="text-xl font-black text-crm-text">
            {formatLocaleNumber(withPhoneCount)}{" "}
            <span className="text-xs font-semibold text-crm-muted">
              ({totalSurveys > 0 ? Math.round((withPhoneCount / totalSurveys) * 100) : 0}%)
            </span>
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-lg"} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-crm-muted flex items-center gap-1">
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            З соцмережами (TG / IG)
          </span>
          <p className="text-xl font-black text-crm-text">
            {formatLocaleNumber(withSocialsCount)}{" "}
            <span className="text-xs font-semibold text-crm-muted">
              ({totalSurveys > 0 ? Math.round((withSocialsCount / totalSurveys) * 100) : 0}%)
            </span>
          </p>
        </div>

        <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-lg"} space-y-1`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-crm-muted flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-purple-400" />
            Анкетних лендінгів
          </span>
          <p className="text-xl font-black text-crm-text">{configuredSurveyPaths.length}</p>
        </div>
      </div>

      {/* Individual Survey Landings Sub-tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedLandingFilter("all")}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
            selectedLandingFilter === "all"
              ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20"
              : isLight
              ? "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
              : "bg-white/5 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Усі анкетні сторінки</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
              selectedLandingFilter === "all" ? "bg-black/20 text-black" : "bg-white/10 text-crm-muted"
            }`}
          >
            {leadsWithSurveys.length}
          </span>
        </button>

        {surveyLandingOptions.map((opt) => {
          const isSelected = selectedLandingFilter === opt.path;
          const count = leadsWithSurveys.filter((l) => isLeadMatchingLanding(l, opt.path)).length;
          return (
            <button
              key={opt.path}
              type="button"
              onClick={() => setSelectedLandingFilter(opt.path)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shrink-0 border ${
                isSelected
                  ? "bg-emerald-500 text-black border-emerald-400 shadow-lg shadow-emerald-500/20"
                  : isLight
                  ? "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300"
                  : "bg-white/5 text-white/70 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isSelected ? "bg-black/20 text-black" : "bg-white/10 text-crm-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div
        className={`p-4 rounded-2xl border ${
          isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-xl"
        } flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-crm-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук за ім'ям, телефоном, @tg, instagram..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-crm-input-bg border border-crm-border text-xs font-bold text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-crm-muted hover:text-crm-text"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (dateRangePreset === "1d") {
                applyPreset("all");
              } else {
                applyPreset("1d");
              }
            }}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
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

          <CustomCalendarPicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => {
              setStartDate(s);
              setEndDate(e);
              setDateRangePreset("custom");
            }}
            onApply={(s, e) => {
              setStartDate(s);
              setEndDate(e);
              setDateRangePreset("custom");
            }}
            isLight={isLight}
            align="right"
          />

          {(startDate || endDate || dateRangePreset !== "all" || selectedLandingFilter !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                applyPreset("all");
                setSelectedLandingFilter("all");
                setSearchQuery("");
              }}
              className={`p-2 transition-all rounded-xl cursor-pointer ${
                isLight ? "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
              title="Скинути всі фільтри"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Master-Detail Questionnaire Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-2xl border border-white/5 bg-[#0C0C0F] space-y-2.5 animate-pulse">
                <SkeletonPulse className="h-5 w-32" />
                <SkeletonPulse className="h-3 w-40" />
                <SkeletonPulse className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-2">
            <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6 animate-pulse`}>
              <SkeletonPulse className="h-6 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonPulse key={i} className="h-24 w-full rounded-2xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className={`${cardClass} py-16 text-center text-crm-muted italic rounded-3xl shadow-xl space-y-3`}>
          <ClipboardCheck className="w-10 h-10 mx-auto text-crm-muted opacity-40" />
          <p className="text-sm font-semibold">
            {leadsWithSurveys.length === 0
              ? "Для цього проекту ще не знайдено жодної заповненої анкети."
              : "За вказаними фільтрами не знайдено жодної анкети."}
          </p>
          {leadsWithSurveys.length === 0 && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Налаштувати анкетні лендінги
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left side: List of respondent cards */}
          <div className="lg:col-span-1 space-y-3 max-h-[820px] overflow-y-auto pr-1.5 custom-scrollbar">
            <div className="flex items-center justify-between px-1 text-[11px] font-black uppercase text-crm-muted tracking-wider">
              <span>Респонденти ({filteredLeads.length})</span>
              <span>Час заповнення</span>
            </div>

            {filteredLeads.map((lead: any) => {
              const isSelected = selectedLead?.id === lead.id;
              const dateStr = getLeadDate(lead).toLocaleDateString("uk-UA", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit"
              });
              const landingLabel = getLeadLandingLabel(lead);
              const instagram = getLeadInstagram(lead);

              return (
                <div
                  key={lead.id}
                  onClick={() => setActiveQuizLeadId(lead.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-emerald-950/20 border-emerald-500/40 shadow-xl ring-1 ring-emerald-500/30"
                      : isLight
                      ? "bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50"
                      : "bg-[#0C0C0F] border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Top Bar: Name & Status */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-extrabold text-sm text-crm-text truncate">
                        {lead.name && lead.name !== "Невідомий" ? lead.name : "Гість без імені"}
                      </h4>
                      {landingLabel && (
                        <span className="text-[9px] font-black uppercase text-emerald-450 truncate mt-0.5">
                          {landingLabel}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 border ${
                        lead.status === "Купив курс" || lead.status === "closed_won"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : lead.status === "Купив(-ла) Трипвайер"
                          ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          : lead.status === "Залишив заявку"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-white/5 text-crm-muted border-white/5"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>

                  {/* Contact Badges Row */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-crm-muted">
                    {lead.phone && (
                      <span className="inline-flex items-center gap-1 font-mono text-crm-text">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        {lead.phone}
                      </span>
                    )}
                    {lead.telegram && (
                      <span className="inline-flex items-center gap-1 text-cyan-400 font-semibold">
                        <Send className="w-3 h-3" />
                        @{lead.telegram.replace(/^@/, "")}
                      </span>
                    )}
                    {instagram && (
                      <span className="inline-flex items-center gap-1 text-pink-400 font-semibold">
                        <InstagramIcon className="w-3 h-3" />
                        @{instagram}
                      </span>
                    )}
                  </div>

                  {/* Submission date */}
                  <div className="mt-2.5 pt-2 border-t border-crm-border flex items-center justify-between text-[10px] text-crm-muted font-medium">
                    <span>
                      {lead.touchCount > 1 ? `${lead.touchCount} торкання` : "1 торкання"}
                    </span>
                    <span>{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right side: Detailed Candidate Dossier & Answers */}
          <div className="lg:col-span-2">
            {selectedLead && (
              <div className={`${cardClass} p-6 sm:p-7 rounded-3xl shadow-2xl space-y-6`}>
                
                {/* Dossier Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-crm-border pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        📋 Анкета респондента
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          selectedLead.status === "Купив курс" || selectedLead.status === "closed_won"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-crm-muted border-white/10"
                        }`}
                      >
                        {selectedLead.status}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-crm-text tracking-tight">
                      {selectedLead.name && selectedLead.name !== "Невідомий"
                        ? selectedLead.name
                        : "Гість без імені"}
                    </h3>

                    <p className="text-xs text-crm-muted font-medium">
                      Заповнено:{" "}
                      <strong className="text-crm-text">
                        {getLeadDate(selectedLead).toLocaleString("uk-UA", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </strong>
                    </p>
                  </div>

                  {/* View Full Journey Action */}
                  <button
                    type="button"
                    onClick={() => openLeadModal(selectedLead)}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Layers className="w-4 h-4" />
                    <span>🔍 Повний шлях клієнта</span>
                  </button>
                </div>

                {/* Candidate Contact Dossier Box */}
                <div className="bg-white/[0.02] border border-crm-border rounded-2xl p-4 sm:p-5 space-y-3">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block">
                    📞 Контакти респондента
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Phone */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-crm-border flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase text-crm-muted block">Телефон</span>
                        {selectedLead.phone ? (
                          <a
                            href={`tel:${selectedLead.phone}`}
                            className="font-bold text-crm-text hover:text-emerald-400 transition-colors truncate block"
                          >
                            {selectedLead.phone}
                          </a>
                        ) : (
                          <span className="text-crm-muted italic">Не вказано</span>
                        )}
                      </div>
                      {selectedLead.phone && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedLead.phone, "phone")}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all"
                          title="Скопіювати телефон"
                        >
                          {copiedKey === "phone" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Telegram */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-crm-border flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase text-crm-muted block">Telegram</span>
                        {selectedLead.telegram ? (
                          <a
                            href={`https://telegram.me/${selectedLead.telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-cyan-400 hover:text-cyan-300 transition-colors truncate block"
                          >
                            @{selectedLead.telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}
                          </a>
                        ) : (
                          <span className="text-crm-muted italic">Не вказано</span>
                        )}
                      </div>
                      {selectedLead.telegram && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedLead.telegram, "tg")}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all"
                          title="Скопіювати Telegram"
                        >
                          {copiedKey === "tg" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Instagram */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-crm-border flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase text-crm-muted block">Instagram</span>
                        {selectedInstagram ? (
                          <a
                            href={`https://instagram.com/${selectedInstagram}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-pink-400 hover:text-pink-300 transition-colors truncate block flex items-center gap-1"
                          >
                            <span>@{selectedInstagram}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-crm-muted italic">Не вказано</span>
                        )}
                      </div>
                      {selectedInstagram && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedInstagram, "ig")}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all"
                          title="Скопіювати Instagram"
                        >
                          {copiedKey === "ig" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Email */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-crm-border flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase text-crm-muted block">Email</span>
                        {selectedLead.email ? (
                          <a
                            href={`mailto:${selectedLead.email}`}
                            className="font-bold text-purple-400 hover:text-purple-300 transition-colors truncate block"
                          >
                            {selectedLead.email}
                          </a>
                        ) : (
                          <span className="text-crm-muted italic">Не вказано</span>
                        )}
                      </div>
                      {selectedLead.email && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedLead.email, "email")}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-crm-muted hover:text-crm-text transition-all"
                          title="Скопіювати Email"
                        >
                          {copiedKey === "email" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Structured Q&A Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Відповіді на запитання анкети ({selectedLeadQA.length})
                    </h4>
                    <span className="text-[10px] font-bold text-crm-muted">
                      Поля форми
                    </span>
                  </div>

                  {selectedLeadQA.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-white/[0.02] border border-crm-border text-center text-crm-muted text-xs italic">
                      У цій заявці немає додаткових розгорнутих запитань окрім контактних даних.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {selectedLeadQA.map((qa: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 bg-white/[0.02] border border-crm-border rounded-2xl space-y-1.5 hover:border-white/20 transition-all"
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-crm-muted block">
                            {qa.label}
                          </span>
                          <p className="text-xs font-bold text-crm-text leading-relaxed whitespace-pre-wrap">
                            {qa.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attribution & Traffic Context Footer */}
                <div className="border-t border-crm-border pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="block font-bold uppercase text-[9px] text-crm-muted">
                      Сторінка реєстрації
                    </span>
                    <span className="text-crm-text font-bold truncate block">
                      {getLeadLandingLabel(selectedLead) || selectedLead.page_path || "/"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block font-bold uppercase text-[9px] text-crm-muted">
                      Джерело (UTM Source)
                    </span>
                    <span className="text-crm-text font-bold block">
                      {selectedLead.utmSource || selectedLead.utm_source || "Прямий / Органіка"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block font-bold uppercase text-[9px] text-crm-muted">
                      Канал (UTM Medium)
                    </span>
                    <span className="text-crm-text font-bold block truncate">
                      {selectedLead.utmMedium || selectedLead.utm_medium || "-"}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block font-bold uppercase text-[9px] text-crm-muted">
                      Кампанія (UTM Campaign)
                    </span>
                    <span className="text-crm-text font-bold block truncate">
                      {selectedLead.utmCampaign || selectedLead.utm_campaign || "-"}
                    </span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default QuizzesTab;

