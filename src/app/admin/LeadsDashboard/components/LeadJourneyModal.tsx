"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  XCircle,
  Globe,
  ExternalLink,
  Briefcase,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  DollarSign,
  Calendar,
  X,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { updateCustomerCommentAction, assignLeadToManagerAction } from "../../actions";
import { getLeadDate, formatLocaleNumber, parseComments, CommentItem } from "@/app/admin/utils";
import { LeadItem } from "../types";

interface LeadJourneyModalProps {
  lead: LeadItem;
  history: any[];
  onClose: () => void;
  role: string;
  salesManagers: any[];
  isDevMode: boolean;
  onLeadUpdated: (updatedLead: any) => void;
}

export default function LeadJourneyModal({
  lead,
  history,
  onClose,
  role,
  salesManagers,
  isDevMode,
  onLeadUpdated
}: LeadJourneyModalProps) {
  const router = useRouter();
  const [activeModalTab, setActiveModalTab] = useState<string>("journey");
  const [tempManagerComment, setTempManagerComment] = useState("");
  const [tempAssignedManagerId, setTempAssignedManagerId] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [isAssigningManager, setIsAssigningManager] = useState(false);

  useEffect(() => {
    setTempManagerComment("");
    setTempAssignedManagerId(lead.assignedManagerId || lead.assigned_manager_id || "");
  }, [lead]);

  const commentsList = useMemo(() => {
    return parseComments(lead.managerComment || lead.manager_comment || null);
  }, [lead.managerComment, lead.manager_comment]);

  const handleSaveComment = async () => {
    const customerId = lead.customerId || lead.id;
    if (!customerId) return;
    if (!tempManagerComment.trim()) return;
    setIsSavingComment(true);
    try {
      const res = await updateCustomerCommentAction(customerId, tempManagerComment);
      if (res.error) throw new Error(res.error);

      onLeadUpdated({
        ...lead,
        managerComment: res.managerComment,
        manager_comment: res.managerComment
      });
      setTempManagerComment("");
      router.refresh();
    } catch (err: any) {
      alert("Помилка збереження коментаря: " + err.message);
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleAssignManager = async (managerId: string) => {
    const customerId = lead.customerId || lead.id;
    if (!customerId) return;
    setIsAssigningManager(true);
    const val = managerId === "" ? null : managerId;
    try {
      const res = await assignLeadToManagerAction(customerId, val);
      if (res.error) throw new Error(res.error);

      const matchedManager = salesManagers.find((m: any) => m.id === val);
      const matchedName = matchedManager ? (matchedManager.full_name || matchedManager.email) : "";

      onLeadUpdated({
        ...lead,
        assignedManagerId: val,
        assigned_manager_id: val,
        assigned_manager_name: matchedName
      });

      setTempAssignedManagerId(managerId);
      router.refresh();
    } catch (err: any) {
      alert("Помилка призначення менеджера: " + err.message);
    } finally {
      setIsAssigningManager(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#0C0C0F] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
        >
          <XCircle className="w-5 h-5" />
        </button>

        <div className="border-b border-white/5 pb-4">
          <span className="inline-block px-2.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-450 border border-emerald-500/20">
            Карточка Клієнта (DSU)
          </span>
          <h3 className="text-xl font-black uppercase text-white mt-2">{lead.name}</h3>
          <p className="text-white/45 text-[10px] font-bold uppercase mt-1 tracking-wider">
            Телефон: {lead.phone || "—"} | Telegram: {lead.telegram || "—"}
          </p>
        </div>

        {/* Mobile modal sub-tabs header */}
        <div className="md:hidden flex border-b border-white/5 pb-2">
          <button
            type="button"
            onClick={() => setActiveModalTab("journey")}
            className={`flex-1 pb-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeModalTab === "journey"
                ? "border-emerald-500 text-white"
                : "border-transparent text-white/45"
            }`}
          >
            Шлях клієнта
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab("details")}
            className={`flex-1 pb-2 text-center text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeModalTab === "details"
                ? "border-emerald-500 text-white"
                : "border-transparent text-white/45"
            }`}
          >
            Дані & Коментарі
          </button>
        </div>

        {/* Redesigned Roadmap Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-hidden">
          {/* Left Column: Timeline list */}
          <div
            className={`overflow-y-auto custom-scrollbar space-y-0 pr-2 pt-2 h-full ${
              activeModalTab === "journey" ? "flex flex-col flex-grow" : "hidden md:flex md:flex-col"
            }`}
          >
            <h4 className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-3">
              Хронологія шляху клієнта
            </h4>
            {history.map((touch: any, idx: number) => {
              const isPaidCourse = touch.status === "Купив курс";
              const isTripwire = touch.status === "Купив(-ла) Трипвайер";
              const isCall = touch.status === "Назначено Дзвінок" || touch.status === "Дзвінок проведено";
              const isThink = touch.status === "Вирішив подумати";
              const isDecline = touch.status === "Відмова";

              // Resolve timeline design tokens
              let ringColor = "border-white/10 text-white/50 bg-white/5";
              let glowColor = "bg-white/20";
              let touchIcon = <Globe className="w-3.5 h-3.5" />;

              if (isPaidCourse) {
                ringColor =
                  "border-emerald-500/30 text-emerald-450 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse";
                glowColor = "bg-emerald-500";
                touchIcon = <DollarSign className="w-3.5 h-3.5" />;
              } else if (isTripwire) {
                ringColor = "border-indigo-500/30 text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]";
                glowColor = "bg-indigo-500";
                touchIcon = <Sparkles className="w-3.5 h-3.5" />;
              } else if (isCall) {
                ringColor = "border-orange-500/30 text-orange-400 bg-orange-500/10 shadow-[0_0_10px_rgba(249,115,22,0.05)]";
                glowColor = "bg-orange-550";
                touchIcon = <Calendar className="w-3.5 h-3.5" />;
              } else if (isThink) {
                ringColor = "border-pink-500/30 text-pink-400 bg-pink-550/10";
                glowColor = "bg-pink-500";
                touchIcon = <HelpCircle className="w-3.5 h-3.5" />;
              } else if (isDecline) {
                ringColor = "border-red-500/30 text-red-400 bg-red-550/10";
                glowColor = "bg-red-550";
                touchIcon = <X className="w-3.5 h-3.5" />;
              }

              return (
                <div key={touch.id} className="relative pl-12 pb-8 last:pb-2 group">
                  {/* Visual connecting line */}
                  <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-white/10 to-transparent group-last:hidden" />

                  {/* Node */}
                  <div
                    className={`absolute left-0 top-1.5 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 z-10 ${ringColor}`}
                  >
                    {touchIcon}
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0C0C0F] ${glowColor}`} />
                  </div>

                  {/* Milestone card content */}
                  <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3.5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">
                          Крок #{idx + 1}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                            isPaidCourse
                              ? "bg-emerald-500/10 text-emerald-455 border-emerald-500/20"
                              : isTripwire
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : "bg-white/5 text-white/50 border-white/5"
                          }`}
                        >
                          {touch.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/30 font-bold">
                        {getLeadDate(touch).toLocaleString("uk-UA")}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-[11px] border-t border-white/5 pt-3">
                      <div>
                        <span className="text-white/30 font-bold uppercase text-[9px] block">Джерело</span>
                        <span className="text-white font-extrabold uppercase tracking-wide bg-white/5 px-2.5 py-0.5 rounded mt-1.5 inline-block">
                          {touch.utm_source || "direct"}
                        </span>
                      </div>
                      {touch.amount > 0 && (
                        <div>
                          <span className="text-white/30 font-bold uppercase text-[9px] block">Сума</span>
                          <span className="text-emerald-455 font-black text-sm block mt-1">
                            {(() => {
                              const amt = Number(touch.amount || 0);
                              const metaCurrency = String(
                                touch.metadata?.currency ||
                                  touch.metadata?.lead?.currency ||
                                  touch.metadata?.raw_row?.currency ||
                                  touch.metadata?.raw_row?.raw_payload?.currency ||
                                  ""
                              )
                                .trim()
                                .toLowerCase();
                              const isExplicitEur = ["EUR", "eur", "€", "Eur"].includes(
                                String(metaCurrency).trim()
                              );
                              if (isExplicitEur) return `${formatLocaleNumber(amt)} €`;
                              const isExplicitUah = ["UAH", "uah", "грн", "грн.", "Uah"].includes(
                                String(metaCurrency).trim()
                              );
                              const isExplicitUsd = ["USD", "usd", "Usd", "$"].includes(
                                String(metaCurrency).trim()
                              );
                              const isUah = isExplicitUah || (!isExplicitUsd && !isExplicitEur && amt >= 500);
                              return isUah ? `${formatLocaleNumber(amt)} ₴` : `$${formatLocaleNumber(amt)}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {(() => {
                      if (!touch.metadata || Object.keys(touch.metadata).length === 0) return null;
                      const meta = touch.metadata;

                      const fullUrl = meta.full_url || meta.fullUrl || meta.page_url || "";
                      const pathVal = meta.path || meta.page_path || "";
                      const targetSheet = meta.target_sheet || meta.targetSheet || "";
                      const tariff = meta.tariffName || meta.tariff_name || meta.tariff || "";
                      const isElt = meta.elt_import === true || meta.elt_import === "true";
                      const origSheet = meta.original_sheet || "";
                      const rowIdx = meta.row || "";

                      const displayUrl = fullUrl ? fullUrl.replace(/^https?:\/\//, "") : "";

                      const shownKeys = new Set([
                        "full_url",
                        "fullUrl",
                        "page_url",
                        "path",
                        "page_path",
                        "target_sheet",
                        "targetSheet",
                        "tariffName",
                        "tariff_name",
                        "tariff",
                        "elt_import",
                        "original_sheet",
                        "row",
                        "device_info",
                        "user_agent",
                        "visitor_id",
                        "visitorId",
                        "visitor_uuid",
                        "phone",
                        "email",
                        "telegram",
                        "name",
                        "customerName",
                        "customerPhone",
                        "customerEmail",
                        "social",
                        "amount",
                        "currency",
                        "failUrl",
                        "successUrl",
                        "utms"
                      ]);

                      const remainingEntries = Object.entries(meta).filter(([k]) => !shownKeys.has(k));

                      return (
                        <div className="space-y-2.5 border-t border-white/5 pt-3">
                          <span className="text-[9px] font-black uppercase text-white/30 tracking-widest block">
                            Шлях клієнта & Торкання
                          </span>

                          <div className="flex flex-wrap gap-2">
                            {fullUrl && (
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-[10px] font-extrabold text-blue-450 flex items-center gap-1.5 transition-all animate-none"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="w-3 h-3 shrink-0 text-blue-400" />
                                <span className="truncate max-w-[200px]" title={fullUrl}>
                                  {pathVal ? `Сторінка: ${pathVal}` : displayUrl}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-65 shrink-0" />
                              </a>
                            )}

                            {!fullUrl && pathVal && (
                              <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] font-extrabold text-blue-450 flex items-center gap-1.5">
                                <Globe className="w-3 h-3 shrink-0 text-blue-400" />
                                Шлях: {pathVal}
                              </span>
                            )}

                            {targetSheet && (
                              <span className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] font-extrabold text-purple-400 flex items-center gap-1.5">
                                <Briefcase className="w-3 h-3 shrink-0" />
                                Форма: {targetSheet}
                              </span>
                            )}

                            {tariff && (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-extrabold text-amber-450 flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 shrink-0 text-amber-455" />
                                Тариф: {tariff}
                              </span>
                            )}

                            {isElt && (
                              <span
                                className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-extrabold text-emerald-400 flex items-center gap-1.5"
                                title="Імпортовано з таблиць Google за допомогою ELT"
                              >
                                <FileSpreadsheet className="w-3 h-3 shrink-0" />
                                {(() => {
                                  const sheetLower = String(origSheet).toLowerCase().trim();
                                  if (sheetLower === "веб (бот)") return "3 Webinars (legacy)";
                                  if (sheetLower === "новый веб") return "Face Detox (legacy)";
                                  if (sheetLower === "діагностики") return "Diagnostics (legacy)";
                                  if (sheetLower === "квіз") return "Quiz (legacy)";
                                  if (sheetLower === "відповіді бот (19.05)") return "Bot Answers (legacy)";
                                  if (sheetLower === "заявки ленд веб") return "Antibotox (legacy)";
                                  if (sheetLower === "vsl сайт" || sheetLower === "vsl сайт трафік")
                                    return "VSL site (legacy)";
                                  return `Імпорт: ${origSheet || "Sheet"}${rowIdx ? ` (Рядок ${rowIdx})` : ""}`;
                                })()}
                              </span>
                            )}
                          </div>

                          {remainingEntries.length > 0 && (
                            <div className="bg-[#08080A] rounded-xl border border-white/5 p-3.5 text-[10px] space-y-1.5 mt-2">
                              <span className="text-[8px] font-black uppercase text-white/20 tracking-wider block mb-1">
                                Додаткові параметри:
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-white/50">
                                {remainingEntries.map(([k, v]) => (
                                  <div
                                    key={k}
                                    className="flex justify-between items-center bg-white/[0.01] border border-white/5 px-2.5 py-1.5 rounded-lg"
                                  >
                                    <span className="font-semibold text-white/30 truncate pr-2 uppercase text-[9px]">
                                      {k.replace(/_/g, " ")}
                                    </span>
                                    <span
                                      className="font-mono font-bold text-white/80 truncate max-w-[150px]"
                                      title={String(v)}
                                    >
                                      {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Lead info, Questionnaire, comments editor & manager assignments */}
          <div
            className={`overflow-y-auto custom-scrollbar pl-2 space-y-6 h-full border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6 ${
              activeModalTab === "details" ? "block" : "hidden md:block"
            }`}
          >
            {/* Core parameters */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                Основні параметри
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.01] border border-white/5 p-3.5 rounded-2xl">
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-white/30 uppercase text-[9px] font-bold block">Email</span>
                  <span className="text-white font-extrabold truncate block">{lead.email || "—"}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-white/30 uppercase text-[9px] font-bold block">Джерело (UTM Source)</span>
                  <span className="text-white font-extrabold block">{lead.utmSource || lead.utm_source || "direct"}</span>
                </div>
                <div>
                  <span className="text-white/30 uppercase text-[9px] font-bold block">Канал (UTM Medium)</span>
                  <span className="text-white font-extrabold block">{lead.utmMedium || lead.utm_medium || "—"}</span>
                </div>
                <div>
                  <span className="text-white/30 uppercase text-[9px] font-bold block">Кампанія (UTM Campaign)</span>
                  <span className="text-white font-extrabold block">{lead.utmCampaign || lead.utm_campaign || "—"}</span>
                </div>
                {(lead.utmContent || lead.utm_content) && (
                  <div className="col-span-2">
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Вміст (UTM Content)</span>
                    <span className="text-white font-extrabold block">{lead.utmContent || lead.utm_content}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Aggregated Questionnaire */}
            {(lead.diagnosticsComment || lead.diagnostics_comment) && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                  Заповнена анкета / Запит
                </span>
                <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 text-xs text-white/80 max-h-48 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-medium">
                  {lead.diagnosticsComment || lead.diagnostics_comment}
                </div>
              </div>
            )}

            {/* Comments History */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                Історія коментарів ({commentsList.length})
              </span>

              {commentsList.length === 0 ? (
                <p className="text-xs text-white/30 italic py-1">Коментарів ще немає</p>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {commentsList.map((c: CommentItem) => {
                    const formattedDate = new Date(c.createdAt).toLocaleString("uk-UA", {
                      day: "numeric",
                      month: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                    return (
                      <div key={c.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-emerald-450">
                          <span className="truncate max-w-[150px]">{c.authorName || "Менеджер"}</span>
                          <span className="text-white/30 shrink-0">{formattedDate}</span>
                        </div>
                        <p className="text-[11px] text-white/85 leading-relaxed break-words whitespace-pre-wrap font-medium">
                          {c.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add New Comment */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <textarea
                  value={tempManagerComment}
                  onChange={(e) => setTempManagerComment(e.target.value)}
                  placeholder="Введіть новий коментар..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white placeholder:text-white/20 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveComment}
                    disabled={isSavingComment || !tempManagerComment.trim()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 text-black disabled:text-white/45 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSavingComment ? "Надсилання..." : "Надіслати"}
                  </button>
                </div>
              </div>
            </div>

            {/* Manager assignment selector */}
            {["admin", "superman", "producer", "rop"].includes(role) && (
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                  Призначити менеджера з продажів
                </span>
                <div className="relative">
                  <select
                    value={tempAssignedManagerId || ""}
                    onChange={(e) => handleAssignManager(e.target.value)}
                    disabled={isAssigningManager}
                    className="w-full appearance-none pl-3.5 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white cursor-pointer"
                  >
                    <option value="" className="bg-[#0C0C0F] text-white/40">
                      Не призначено
                    </option>
                    {salesManagers.map((mgr: any) => (
                      <option key={mgr.id} value={mgr.id} className="bg-[#0C0C0F] text-white">
                        {mgr.full_name || mgr.email}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/40" />
                </div>
                {isAssigningManager && (
                  <p className="text-[10px] text-emerald-455 animate-pulse font-semibold">
                    Оновлення відповідального...
                  </p>
                )}
              </div>
            )}

            {/* Diagnostics Section */}
            {isDevMode && (
              <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-2xl space-y-3 mt-4">
                <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  🐞 Developer Diagnostics
                </h4>
                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Customer UUID</span>
                    <span className="font-mono text-white/80 select-all">{lead.visitor_uuid || "—"}</span>
                  </div>
                  <div>
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Customer ID (Primary Key)</span>
                    <span className="font-mono text-white/80 select-all">{lead.customerId || "—"}</span>
                  </div>
                  <div>
                    <span className="text-white/30 uppercase text-[9px] font-bold block">DSU History Size</span>
                    <span className="text-white/80 font-bold">{lead.history?.length || 0} items</span>
                  </div>
                  <div>
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Stitching Criteria Logs</span>
                    <span className="text-white/80 font-medium">
                      {lead.phone ? `Matched by Phone: ${lead.phone}. ` : ""}
                      {lead.telegram ? `Matched by Telegram: ${lead.telegram}. ` : ""}
                      {lead.email ? `Matched by Email: ${lead.email}. ` : ""}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-white/30 uppercase text-[9px] font-bold block mb-1">Raw JSON Payload</span>
                    <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-[10px] text-emerald-400 font-mono max-h-48 custom-scrollbar">
                      {JSON.stringify(
                        {
                          id: lead.id,
                          name: lead.name,
                          phone: lead.phone,
                          telegram: lead.telegram,
                          email: lead.email,
                          status: lead.status,
                          utm_source: lead.utmSource || lead.utm_source,
                          utm_medium: lead.utmMedium || lead.utm_medium,
                          utm_campaign: lead.utmCampaign || lead.utm_campaign,
                          metadata: lead.metadata,
                          history: lead.history
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
