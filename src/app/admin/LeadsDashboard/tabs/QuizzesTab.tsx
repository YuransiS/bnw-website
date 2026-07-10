"use client";

import React from "react";
import { ClipboardCheck, Calendar, XCircle } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { getLeadDate, isLeadMatchingLanding } from "@/app/admin/utils";
import { LeadItem } from "../types";

// Project landing links registry
const PROJECT_LANDINGS: Record<string, Array<{ label: string; url: string; badgeColor: string; type: "paid" | "free" }>> = {
  bw_main: [
    { label: "Основний", url: "https://bnw-prod.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" }
  ],
  victoria: [
    { label: "Майстер-клас", url: "https://victoria-mc.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "VSL", url: "https://victoria-mc.vercel.app/free-lection/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "rozbir", url: "https://victoria-mc.vercel.app/rozbir", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid" },
    { label: "Броні", url: "https://victoria-mc.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "Практикум", url: "https://victoria-mc.vercel.app/practicum", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  sofia: [
    { label: "Основний", url: "https://sofifinsight.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Інтенсив", url: "https://sofifinsight.vercel.app/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" },
    { label: "Вебінар", url: "https://sofifinsight.vercel.app/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "Броні", url: "https://sofifinsight.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "VSL", url: "https://sofifinsight.vercel.app/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://sofifinsight.vercel.app/sofia-invest/lesson", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "Міні-курс", url: "https://sofifinsight.vercel.app/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  valeria: [
    { label: "Основний", url: "https://pix-ai-ua.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free" },
    { label: "Офіс", url: "https://pix-ai-ua.vercel.app/office", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "paid" },
    { label: "Мами", url: "https://pix-ai-ua.vercel.app/moms", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Б'юті", url: "https://pix-ai-ua.vercel.app/beauty", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "paid" },
    { label: "Для тінейджерів", url: "https://pix-ai-ua.vercel.app/teen", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Для батьків", url: "https://pix-ai-ua.vercel.app/parents", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ],
  clean_klinom: [
    { label: "Основний", url: "https://clean-klinom.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free" },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid" },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" }
  ],
  vova_win: [
    { label: "Марафон", url: "https://vova-win.club/marathon", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ]
};

interface QuizzesTabProps {
  processedLeads: LeadItem[];
  activeQuizLeadId: string | null;
  setActiveQuizLeadId: (val: string | null) => void;
  dateRangePreset: string;
  startDate: string;
  endDate: string;
  applyPreset: (preset: "all" | "30d" | "7d" | "1d") => void;
  setStartDate: (val: string) => void;
  setEndDate: (val: string) => void;
  setDateRangePreset: (val: any) => void;
  openLeadModal: (lead: any) => void;
  activeSlug: string;
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
  activeSlug
}: QuizzesTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const borderClass = "border-crm-border";

  const leadsWithQuizzes = processedLeads.filter(
    (l: any) => l.diagnosticsComment && l.diagnosticsComment.trim().length > 0
  );

  const selectedLead =
    leadsWithQuizzes.find((l: any) => l.id === activeQuizLeadId) || leadsWithQuizzes[0];

  // Parse diagnostics comments into separate Q&A lines
  const qaLines = selectedLead && selectedLead.diagnosticsComment
    ? selectedLead.diagnosticsComment
        .split("\n")
        .map((line: string) => {
          const parts = line.split(":");
          const label = parts[0]?.trim() || "";
          const value = parts.slice(1).join(":")?.trim() || "";
          return { label, value };
        })
        .filter((x: any) => x.label && x.value)
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2
          className={`text-lg font-black uppercase tracking-tight ${
            isLight ? "text-neutral-900" : "text-white"
          } flex items-center gap-2`}
        >
          <ClipboardCheck className="w-5 h-5 text-emerald-500" />
          Заповнені анкети та опитування
        </h2>
        <p className={`${textMutedClass} text-xs mt-1 font-semibold`}>
          Список усіх користувачів, які заповнили анкети чи форми реєстрації на сайтах проекту.
        </p>
      </div>

      {/* Quizzes Date Filter Panel */}
      <div
        className={`p-4 rounded-2xl border ${
          isLight ? "bg-white border-neutral-200 shadow-sm" : "bg-[#0C0C0F] border-white/5 shadow-2xl"
        } flex flex-wrap items-center justify-between gap-4`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-[10px] font-black uppercase ${isLight ? "text-neutral-500" : "text-white/30"}`}>
            Фільтр за періодом:
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

      {leadsWithQuizzes.length === 0 ? (
        <div className={`${cardClass} py-16 text-center text-white/20 italic rounded-2xl shadow-xl`}>
          Для цього проекту ще не знайдено жодної заповненої анкети
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left side: List of leads */}
          <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {leadsWithQuizzes.map((lead: any) => {
              const isSelected = activeQuizLeadId === lead.id;
              const dateStr = getLeadDate(lead).toLocaleDateString("uk-UA");

              const landingLabel = (() => {
                const landings = PROJECT_LANDINGS[activeSlug] || [];
                for (const land of landings) {
                  if (isLeadMatchingLanding(lead, land.url)) {
                    return land.label;
                  }
                }
                return null;
              })();

              return (
                <div
                  key={lead.id}
                  onClick={() => setActiveQuizLeadId(lead.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 shadow-md"
                        : "bg-emerald-950/20 border-emerald-500/20 shadow-lg"
                      : isLight
                      ? "bg-white border-neutral-200 hover:border-neutral-300"
                      : "bg-[#0C0C0F] border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-extrabold text-sm truncate max-w-[150px]">{lead.name}</h4>
                      {landingLabel && (
                        <span className="text-[9px] font-black uppercase text-left text-blue-450 mt-0.5">
                          {landingLabel}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                        lead.status === "Купив курс" ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/40"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-white/50">
                    {lead.telegram && (
                      <p>
                        TG: <span className="text-[#81D8D0]">@{lead.telegram}</span>
                      </p>
                    )}
                    {lead.phone && <p>Тел: {lead.phone}</p>}
                    <p className="text-[10px] text-white/30 text-right mt-1">{dateStr}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right side: Detailed Answers Panel */}
          <div className="lg:col-span-2">
            {selectedLead && (
              <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-md font-black uppercase tracking-tight text-white">{selectedLead.name}</h3>
                    <div className="flex flex-wrap gap-2.5 mt-2 text-xs text-white/60">
                      {selectedLead.phone && <span>📞 {selectedLead.phone}</span>}
                      {selectedLead.telegram && <span className="text-[#81D8D0]">💬 @{selectedLead.telegram}</span>}
                      {selectedLead.email && <span>📧 {selectedLead.email}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => openLeadModal(selectedLead)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-black rounded-xl transition-all cursor-pointer"
                  >
                    Історія ліда
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                    Відповіді на запитання анкети:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {qaLines.map((qa: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                          {qa.label}
                        </span>
                        <p className="text-xs font-semibold text-white/90 leading-relaxed">{qa.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attribution context */}
                <div className="border-t border-white/5 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-white/40">
                  <div>
                    <span className="block font-bold uppercase text-[9px] text-white/20">Сторінка реєстрації</span>
                    <span className="text-white/80 font-bold truncate block mt-1">
                      {(() => {
                        const path = selectedLead.page_path || selectedLead.metadata?.page_path || "/";
                        if (path === "/rozbir") return "rozbir";
                        return path;
                      })()}
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold uppercase text-[9px] text-white/20">Джерело трафіку</span>
                    <span className="text-white/80 font-bold block mt-1">
                      {selectedLead.utm_source || "direct"}
                    </span>
                  </div>
                  <div>
                    <span className="block font-bold uppercase text-[9px] text-white/20">Кампанія</span>
                    <span className="text-white/80 font-bold block mt-1 truncate">
                      {selectedLead.utm_campaign || "-"}
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
