"use client";

import React from "react";
import { AlertCircle, Globe, Users, Coins } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { LeadItem } from "../types";

interface DiagnosticsTabProps {
  diagnosticsIssues: {
    nameless: any[];
    unmatchedUrls: any[];
    currencyErrors: any[];
  };
  totalCount: number;
  isDevMode: boolean;
  openLeadModal: (lead: any) => void;
}

export const DiagnosticsTab = React.memo(function DiagnosticsTab({
  diagnosticsIssues,
  totalCount,
  isDevMode,
  openLeadModal
}: DiagnosticsTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";

  if (!isDevMode) {
    return (
      <div className={`${cardClass} py-16 text-center text-white/20 italic rounded-2xl shadow-xl`}>
        Цей розділ доступний лише для розробників та адміністраторів.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-red-500/[0.02] border border-red-500/10 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 animate-pulse" />
            🐞 Панель інженерної діагностики
          </h3>
          <p className="text-[11px] text-white/45 font-semibold">
            Автоматичний аналіз розбіжностей у бд, незареєстрованих лендінгів та аномальних UTM-метрик
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-white/50">
            Загалом лідів у кластері: {totalCount}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${cardClass} p-5 rounded-2xl relative overflow-hidden shadow-xl border border-amber-500/10`}>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Контакти без імені</p>
          <p className="text-2xl font-black mt-3 text-amber-500">{diagnosticsIssues.nameless.length}</p>
          <p className="text-[11px] text-white/30 mt-1 font-semibold">Мають телефон/telegram, але ім'я пусте</p>
        </div>
        <div className={`${cardClass} p-5 rounded-2xl relative overflow-hidden shadow-xl border border-red-500/10`}>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Невідомі URL лендінгів</p>
          <p className="text-2xl font-black mt-3 text-red-400">{diagnosticsIssues.unmatchedUrls.length}</p>
          <p className="text-[11px] text-white/30 mt-1 font-semibold">Немає відповідного URL в PROJECT_LANDINGS</p>
        </div>
        <div className={`${cardClass} p-5 rounded-2xl relative overflow-hidden shadow-xl border border-purple-500/10`}>
          <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">Аномалії валют</p>
          <p className="text-2xl font-black mt-3 text-purple-400">{diagnosticsIssues.currencyErrors.length}</p>
          <p className="text-[11px] text-white/30 mt-1 font-semibold">Транзакції з незареєстрованою валютою</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Unmatched URLs Panel */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6 border border-red-500/10`}>
          <h3 className="text-sm font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Некартовані URL-шляхи & Лендінги
          </h3>
          <p className="text-xs text-white/40 font-medium">
            Ці URL були зафіксовані в сесіях користувачів, але відсутні в масиві `PROJECT_LANDINGS` для поточного
            проекту. Додайте їх у код `PROJECT_LANDINGS`, щоб увімкнути точне відображення конверсій.
          </p>

          <div className="overflow-x-auto border border-white/5 rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                  <th className="p-3">Шлях / URL</th>
                  <th className="p-3 text-center">Переходів</th>
                  <th className="p-3">Джерело / Sheet</th>
                  <th className="p-3">Приклад ліда</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {diagnosticsIssues.unmatchedUrls.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-white/20 italic">
                      Усі URL успішно картовані!
                    </td>
                  </tr>
                ) : (
                  diagnosticsIssues.unmatchedUrls.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.01]">
                      <td
                        className="p-3 font-mono text-[11px] text-white select-all max-w-xs truncate"
                        title={item.rawUrl}
                      >
                        {item.rawUrl}
                      </td>
                      <td className="p-3 text-center font-extrabold text-red-400">{item.count}</td>
                      <td className="p-3 font-semibold text-neutral-400">{item.originalSheet}</td>
                      <td className="p-3 text-white/60 font-medium">{item.sampleLead}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nameless Leads Panel */}
        <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6 border border-amber-500/10`}>
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Контакти з невідомим ім'ям
          </h3>
          <p className="text-xs text-white/40 font-medium">
            Ці ліди залишили свої контактні дані, але їхні імена в базі пусті або записані як "Невідомий". Ви можете
            використати їхній телефон чи Telegram для пошуку.
          </p>

          <div className="overflow-x-auto border border-white/5 rounded-xl max-h-[350px] custom-scrollbar">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                  <th className="p-3">Телефон</th>
                  <th className="p-3">Telegram</th>
                  <th className="p-3">Email</th>
                  <th className="p-3 text-center">Дія</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {diagnosticsIssues.nameless.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-white/20 italic">
                      Контактів без імені не знайдено
                    </td>
                  </tr>
                ) : (
                  diagnosticsIssues.nameless.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-white/[0.01]">
                      <td className="p-3 font-bold text-white">{lead.phone || "—"}</td>
                      <td className="p-3 text-[#81D8D0] font-bold">
                        {lead.telegram ? `@${lead.telegram}` : "—"}
                      </td>
                      <td className="p-3 text-neutral-400">{lead.email || "—"}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openLeadModal(lead)}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white font-extrabold text-[10px] cursor-pointer"
                        >
                          Докладно
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DiagnosticsTab;
