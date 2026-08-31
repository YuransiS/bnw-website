"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Sparkles,
  DollarSign,
  Calendar,
  X,
  Clock,
  Copy,
  Check,
  CheckCircle2,
  Bot,
  User,
  Phone,
  Send,
  Mail,
  ChevronDown,
  Layers,
  FileText,
  AlertCircle
} from "lucide-react";
import { isPaidStatus } from "@/lib/statusMapper";
import { updateCustomerCommentAction, assignLeadToManagerAction } from "../../actions";
import { getLeadDate, formatLocaleNumber, parseComments, CommentItem, getLeadInstagram } from "@/app/admin/utils";
import { LeadItem } from "../types";

interface LeadJourneyModalProps {
  lead: LeadItem;
  history: any[];
  funnels?: any[];
  onClose: () => void;
  role: string;
  salesManagers: any[];
  isDevMode: boolean;
  onLeadUpdated: (updatedLead: any) => void;
}

export default function LeadJourneyModal({
  lead,
  history,
  funnels = [],
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setTempManagerComment("");
    setTempAssignedManagerId(lead.assignedManagerId || lead.assigned_manager_id || "");
  }, [lead]);

  const commentsList = useMemo(() => {
    return parseComments(lead.managerComment || lead.manager_comment || null);
  }, [lead.managerComment, lead.manager_comment]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

  // Helper to resolve clean landing name
  const formatLandingDisplay = (urlOrPath: string): string => {
    if (!urlOrPath) return "Головна (/)";
    try {
      let path = urlOrPath;
      if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
        const parsed = new URL(urlOrPath);
        path = parsed.pathname;
      } else {
        path = urlOrPath.split("?")[0].split("#")[0];
      }
      path = path.trim().replace(/\/$/, "");
      if (!path || path === "/") return "Головна (/)";
      if (path.includes("5-likes")) return "Інтенсив (5 Лайків)";
      if (path === "/anketa") return "Анкета (/anketa)";
      if (path.includes("free/ai") || path.includes("free-ai")) return "Безкоштовний AI";
      if (path.includes("mini-course/ai")) return "Міні-курс AI";
      if (path.includes("mini-course/figma")) return "Міні-курс Figma";
      if (path.includes("minicourse") || path.includes("mini-course")) return "Міні-курс";
      if (path.includes("rozbir") || path.includes("diagnostic")) return "Діагностика / Розбір";
      if (path.includes("price") || path.includes("tariffs")) return "Тарифи / Ціни";
      if (path.includes("system")) return "Система (/intensive/system)";
      return path;
    } catch {
      return urlOrPath;
    }
  };

  // Helper to match touch to a registered funnel
  const matchTouchFunnel = (touch: any) => {
    if (!funnels || funnels.length === 0) return null;
    const path = (touch.page_path || touch.metadata?.page_path || "").toLowerCase();
    const url = (touch.page_url || touch.metadata?.page_url || "").toLowerCase();
    const campaign = (touch.utm_campaign || touch.metadata?.utm_campaign || "").toLowerCase();
    const targetSheet = (touch.target_sheet || touch.metadata?.target_sheet || "").toLowerCase();

    return funnels.find((f: any) => {
      if (f.landing_slugs && Array.isArray(f.landing_slugs)) {
        if (f.landing_slugs.some((slug: string) => slug && slug !== "/" && (path.includes(slug.toLowerCase()) || url.includes(slug.toLowerCase())))) {
          return true;
        }
      }
      if (f.campaign_ids && Array.isArray(f.campaign_ids)) {
        if (f.campaign_ids.some((cid: string) => cid && campaign.includes(cid.toLowerCase()))) {
          return true;
        }
      }
      if (f.name && targetSheet && targetSheet.includes(f.name.toLowerCase())) {
        return true;
      }
      return false;
    });
  };

  const bwCid = lead.visitor_uuid || (lead as any).bw_cid || lead.customerId || lead.id;

  return (
    <div className="fixed inset-0 z-[999] bg-black/75 backdrop-blur-md animate-in fade-in duration-200 flex justify-end">
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

      <div className="relative w-full max-w-2xl h-full bg-[#0C0C0F] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10 overflow-hidden">
        
        {/* Sticky Header with generous safe padding and no top clipping */}
        <div className="sticky top-0 z-30 bg-[#0C0C0F]/95 backdrop-blur-xl border-b border-white/10 px-6 sm:px-8 pt-7 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <User className="w-3 h-3" /> Профіль клієнта
                </span>

                {bwCid && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bwCid, "bw_cid")}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-all cursor-pointer"
                    title="Натисніть щоб скопіювати насквозний Client ID (bw_cid)"
                  >
                    <span>ID: {bwCid.substring(0, 14)}...</span>
                    {copiedKey === "bw_cid" ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                  </button>
                )}

                {(lead.createdAt || (lead as any).created_at) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-emerald-400 border border-emerald-500/20">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>{new Date(lead.createdAt || (lead as any).created_at).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {lead.name && lead.name !== "Невідомий" ? lead.name : "Гість без імені"}
              </h3>

              {/* Direct clickable contact channels */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60 pt-0.5">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="flex items-center gap-1.5 text-white/80 hover:text-emerald-400 transition-colors font-medium"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400/80" />
                    <span>{lead.phone}</span>
                  </a>
                )}
                {lead.telegram && (
                  <a
                    href={`https://telegram.me/${lead.telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-white/80 hover:text-cyan-400 transition-colors font-medium"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400/80" />
                    <span>@{lead.telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}</span>
                  </a>
                )}
                {getLeadInstagram(lead) && (
                  <a
                    href={`https://instagram.com/${getLeadInstagram(lead)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-white/80 hover:text-pink-400 transition-colors font-medium"
                  >
                    <span className="text-pink-400 font-bold text-xs">IG:</span>
                    <span>@{getLeadInstagram(lead)}</span>
                  </a>
                )}
                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="flex items-center gap-1.5 text-white/80 hover:text-purple-400 transition-colors font-medium"
                  >
                    <Mail className="w-3.5 h-3.5 text-purple-400/80" />
                    <span className="truncate max-w-[180px]">{lead.email}</span>
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
              title="Закрити"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Tab Switcher */}
          <div className="flex items-center gap-2 mt-4 border-t border-white/5 pt-3">
            <button
              type="button"
              onClick={() => setActiveModalTab("journey")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeModalTab === "journey"
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Шлях клієнта ({history.length} дій)
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab("details")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeModalTab === "details"
                  ? "bg-white text-black shadow-lg"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-white/5"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Дані & Коментарі ({commentsList.length})
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-6">

          {/* TAB 1: JOURNEY & TIMELINE */}
          {activeModalTab === "journey" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Tag Hierarchy Card */}
              {((lead.tags && lead.tags.length > 0) || (lead as any).tags) && (
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest flex items-center gap-1.5">
                      🏷️ Теги клієнта в системі
                    </span>
                    <span className="text-[9px] font-bold text-white/40">
                      Тегів: {(lead.tags || (lead as any).tags || []).length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.tags || (lead as any).tags || []).map((tag: string) => {
                      let badgeStyle = "bg-neutral-500/10 text-neutral-300 border-neutral-500/20";
                      if (tag.includes("Оплачено") || tag === "Клієнт" || tag.includes("Придбано")) {
                        badgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-bold";
                      } else if (tag.includes("кошик") || tag.includes("Кинув")) {
                        badgeStyle = "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold";
                      } else if (tag.includes("Залишив заявку") || tag.includes("Анкета")) {
                        badgeStyle = "bg-blue-500/15 text-blue-400 border-blue-500/30 font-bold";
                      } else if (tag.includes("Зареєструвався") || tag.includes("Безкоштовна")) {
                        badgeStyle = "bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-bold";
                      } else if (tag.includes("Лендинг")) {
                        badgeStyle = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30 font-semibold";
                      } else if (tag.includes("Мульти-канал")) {
                        badgeStyle = "bg-purple-500/15 text-purple-400 border-purple-500/30 font-semibold";
                      }
                      return (
                        <span key={tag} className={`px-2.5 py-1 rounded-lg text-[10px] border ${badgeStyle}`}>
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 360 Multi-Touch Attribution Summary */}
              {history.length > 0 && (() => {
                const firstTouch = history[0];
                const paidTouch = history.find((h: any) =>
                  isPaidStatus(h.status) || ["closed_won", "approved", "оплачено", "купив курс", "купив_курс", "купив трипвайєр", "купив трипвайер"].includes(String(h.status || "").toLowerCase().trim())
                );
                const lastTouch = history[history.length - 1];
                const targetTouch = paidTouch || lastTouch;
                const isConversion = Boolean(paidTouch);

                const firstFunnel = matchTouchFunnel(firstTouch);
                const lastFunnel = matchTouchFunnel(targetTouch);

                return (
                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <span className="text-[10px] font-black uppercase text-purple-300 tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Сквозна атрибуція 360°
                      </span>
                      <span className="text-[10px] font-extrabold text-white/50">
                        {history.length === 1 ? "1 торкання" : `${history.length} торкань`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      {/* First Touch */}
                      <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1">
                            🏁 Перше торкання (First Touch)
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-bold truncate">
                            {firstTouch?.utm_source ? `Джерело: ${firstTouch.utm_source}` : "Прямий перехід"}
                          </p>
                          {firstTouch?.utm_campaign && (
                            <p className="text-white/60 text-[11px] truncate mt-0.5">
                              Кампанія: <strong className="text-white/90">{firstTouch.utm_campaign}</strong>
                            </p>
                          )}
                          <p className="text-white/60 text-[11px] truncate mt-0.5">
                            Посадковий: <strong className="text-emerald-400 font-semibold">{formatLandingDisplay(firstTouch.page_path || firstTouch.page_url)}</strong>
                          </p>
                          {firstFunnel && (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                              🎯 Воронка: {firstFunnel.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Last Touch */}
                      <div className="space-y-2 bg-white/[0.02] p-3.5 rounded-xl border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${isConversion ? "text-emerald-400" : "text-amber-400"}`}>
                            {isConversion ? "✅ Фінальна дія (Оплата)" : "📌 Поточний стан (Last Touch)"}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-bold truncate">
                            Статус: <span className={isConversion ? "text-emerald-400 font-extrabold" : "text-white"}>{targetTouch?.status || "Лід"}</span>
                          </p>
                          <p className="text-white/60 text-[11px] truncate mt-0.5">
                            Остання сторінка: <strong className="text-emerald-400 font-semibold">{formatLandingDisplay(targetTouch?.page_path || targetTouch?.page_url)}</strong>
                          </p>
                          {targetTouch?.utm_source && (
                            <p className="text-white/60 text-[11px] truncate mt-0.5">
                              Джерело: <strong className="text-white/90">{targetTouch.utm_source}</strong>
                            </p>
                          )}
                          {lastFunnel && (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                              🎯 Воронка: {lastFunnel.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TIMELINE STEPS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-black uppercase text-white/50 tracking-widest">
                    Хронологія дій клієнта (Крок за кроком)
                  </h4>
                  <span className="text-[10px] text-white/30 font-bold">
                    Від старих до нових дій
                  </span>
                </div>

                <div className="space-y-4">
                  {history.map((touch: any, idx: number) => {
                    const rawStatus = String(touch.status || "").toLowerCase().trim();
                    const isExplicitPaid = isPaidStatus(touch.status);
                    const isCheckoutIntent =
                      rawStatus.includes("перехід до оплат") ||
                      rawStatus.includes("клик на форму") ||
                      rawStatus.includes("почато оплату") ||
                      rawStatus.includes("кошик") ||
                      rawStatus.includes("очікує");

                    const isTripwire = isExplicitPaid && (
                      touch.status === "Купив(-ла) Трипвайер" ||
                      String(touch.page_path || touch.metadata?.raw_row?.page_path || "").toLowerCase().includes("minicourse") ||
                      String(touch.quiz_result || "").toLowerCase().includes("міні-курс") ||
                      String(touch.metadata?.raw_row?.tariffName || "").toLowerCase().includes("міні-курс")
                    );
                    const isPaidCourse = isExplicitPaid && !isTripwire;
                    const isDecline = touch.status === "Відмова" || rawStatus.includes("відхил") || rawStatus.includes("decline") || rawStatus.includes("отклон");
                    const isQuizOrForm = Boolean(
                      touch.target_sheet || touch.metadata?.target_sheet || touch.metadata?.raw_row?.target_sheet ||
                      touch.quiz_result || touch.metadata?.quiz_result || touch.metadata?.raw_row?.quiz_result ||
                      (touch.page_path && (touch.page_path.includes("anketa") || touch.page_path.includes("rozbir") || touch.page_path.includes("diagnostic")))
                    );
                    const isBotEvent = Boolean(touch.step || touch.metadata?.step || touch.metadata?.bot_event);

                    // Descriptive Action Title
                    let actionTitle = "Реєстрація / Лід";
                    let ringColor = "border-white/15 text-white/60 bg-white/5";
                    let badgeBg = "bg-white/5 text-white/60 border-white/10";
                    let touchIcon = <Globe className="w-3.5 h-3.5" />;

                    if (isPaidCourse) {
                      actionTitle = "✅ Успішна оплата основного курсу";
                      ringColor = "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10";
                      badgeBg = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                      touchIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
                    } else if (isTripwire) {
                      actionTitle = "⚡ Оплата трипваєра / спецпропозиції";
                      ringColor = "border-indigo-500/40 text-indigo-400 bg-indigo-500/10";
                      badgeBg = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
                      touchIcon = <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
                    } else if (isDecline) {
                      actionTitle = "❌ Відхилена спроба оплати";
                      ringColor = "border-rose-500/40 text-rose-400 bg-rose-500/10";
                      badgeBg = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                      touchIcon = <X className="w-3.5 h-3.5 text-rose-400" />;
                    } else if (isCheckoutIntent) {
                      actionTitle = "🛒 Перехід до оформлення / Оплата";
                      ringColor = "border-amber-500/40 text-amber-400 bg-amber-500/10";
                      badgeBg = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                      touchIcon = <Clock className="w-3.5 h-3.5 text-amber-400" />;
                    } else if (isBotEvent) {
                      actionTitle = `🤖 Подія в чат-боті: ${touch.step || touch.metadata?.step || "Взаємодія"}`;
                      ringColor = "border-cyan-500/40 text-cyan-400 bg-cyan-500/10";
                      badgeBg = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
                      touchIcon = <Bot className="w-3.5 h-3.5 text-cyan-400" />;
                    } else if (isQuizOrForm) {
                      actionTitle = "📝 Заповнено анкету / Запит на розбір";
                      ringColor = "border-blue-500/40 text-blue-400 bg-blue-500/10";
                      badgeBg = "bg-blue-500/15 text-blue-300 border-blue-500/30";
                      touchIcon = <FileText className="w-3.5 h-3.5 text-blue-400" />;
                    }

                    const touchFunnel = matchTouchFunnel(touch);
                    const touchLanding = formatLandingDisplay(touch.page_path || touch.page_url || touch.metadata?.page_path || touch.metadata?.page_url);

                    // Resolve Amount if present
                    const amt = Number(touch.amount || touch.metadata?.raw_row?.amount || touch.metadata?.raw_row?.raw_payload?.amount || 0);
                    const metaCurrency = String(touch.metadata?.currency || touch.metadata?.raw_row?.currency || "UAH").toUpperCase();
                    const isEur = metaCurrency === "EUR" || metaCurrency === "€";
                    const isUsd = metaCurrency === "USD" || metaCurrency === "$";
                    const formattedAmount = isEur ? `${formatLocaleNumber(amt)} €` : isUsd ? `$${formatLocaleNumber(amt)}` : `${formatLocaleNumber(amt)} ₴`;

                    // Extract Clean Business Metadata
                    const meta = touch.metadata || {};
                    const cleanBusinessParams: Array<{ label: string; value: string }> = [];

                    if (meta.tariffName || meta.tariff_name || meta.tariff) {
                      cleanBusinessParams.push({ label: "Тариф", value: String(meta.tariffName || meta.tariff_name || meta.tariff) });
                    }
                    if (meta.offer_title || meta.offerTitle) {
                      cleanBusinessParams.push({ label: "Офер", value: String(meta.offer_title || meta.offerTitle) });
                    }
                    if (meta.promo_id || meta.promoCode || meta.promo) {
                      cleanBusinessParams.push({ label: "Промокод", value: String(meta.promo_id || meta.promoCode || meta.promo) });
                    }
                    if (touch.target_sheet && touch.target_sheet !== "all" && touch.target_sheet !== "direct") {
                      cleanBusinessParams.push({ label: "Форма сайту", value: String(touch.target_sheet) });
                    }

                    // Extract questionnaire content if present
                    const quizText = touch.quiz_result || meta.quiz_result || meta.raw_row?.quiz_result || "";

                    return (
                      <div key={touch.id || idx} className="relative pl-10 sm:pl-12 pb-6 last:pb-2 group">
                        {/* Connecting Line */}
                        <div className="absolute left-[15px] sm:left-[17px] top-9 bottom-0 w-0.5 bg-white/10 group-last:hidden" />

                        {/* Step Node */}
                        <div
                          className={`absolute left-0 top-1 w-8 h-8 rounded-full border flex items-center justify-center transition-all z-10 ${ringColor}`}
                        >
                          {touchIcon}
                        </div>

                        {/* Step Card */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 hover:border-white/10 transition-all">
                          
                          {/* Step Top Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">
                                Крок #{idx + 1}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${badgeBg}`}>
                                {actionTitle}
                              </span>
                            </div>
                            <span className="text-[10px] text-white/40 font-semibold">
                              {getLeadDate(touch).toLocaleString("uk-UA", {
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>

                          {/* Step Marketing and Landing Badges */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            {/* Landing & Funnel */}
                            <div className="space-y-1 bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-white/40 block">
                                Посадкова сторінка
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                                <strong className="text-white font-extrabold truncate text-[11px]">{touchLanding}</strong>
                              </div>
                              {touchFunnel && (
                                <div className="pt-1">
                                  <span className="inline-block px-2 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                    🎯 Воронка: {touchFunnel.name}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* UTM & Ads */}
                            <div className="space-y-1 bg-white/[0.01] p-2.5 rounded-xl border border-white/5">
                              <span className="text-[9px] uppercase font-bold text-white/40 block">
                                Джерело та реклама (UTM)
                              </span>
                              <p className="text-white font-bold truncate text-[11px]">
                                {touch.utm_source ? `Джерело: ${touch.utm_source}` : "Органічний / Прямий перехід"}
                              </p>
                              {(touch.utm_campaign || touch.utm_content) && (
                                <p className="text-white/60 text-[10px] truncate">
                                  {touch.utm_campaign ? `Кампанія: ${touch.utm_campaign}` : ""}
                                  {touch.utm_content ? ` • Оголошення: ${touch.utm_content}` : ""}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Order Amount If Applicable */}
                          {amt > 0 && (
                            <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 px-3.5 py-2.5 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-white/50">
                                {isExplicitPaid ? "Сума оплати:" : isDecline ? "Сума спроби (відхилено):" : "Сума замовлення:"}
                              </span>
                              <span className={`text-base font-black ${isExplicitPaid ? "text-emerald-400" : isDecline ? "text-rose-400 line-through opacity-80" : "text-amber-400"}`}>
                                {formattedAmount}
                              </span>
                            </div>
                          )}

                          {/* Clean Business Parameters */}
                          {cleanBusinessParams.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {cleanBusinessParams.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/5 text-white/80 border border-white/10"
                                >
                                  <span className="text-white/40">{p.label}:</span>
                                  <strong className="text-white font-bold">{p.value}</strong>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Questionnaire / Diagnostics Text If Filled on this Step */}
                          {quizText && (
                            <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl space-y-1 text-xs">
                              <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider block">
                                📋 Відповіді на анкету цього кроку:
                              </span>
                              <p className="text-white/80 font-medium whitespace-pre-wrap leading-relaxed text-[11px]">
                                {quizText}
                              </p>
                            </div>
                          )}

                          {/* Developer Technical Logs Drawer (Cleanly Hidden from Normal View) */}
                          <details className="text-[10px] text-white/30 pt-1 group/logs">
                            <summary className="cursor-pointer hover:text-white/60 transition-colors font-mono select-none flex items-center gap-1">
                              <span>⚙️ Системні логи дії (JSON)</span>
                            </summary>
                            <pre className="mt-2 p-3 bg-black/60 rounded-xl overflow-x-auto text-[9px] text-emerald-400/80 font-mono max-h-36 custom-scrollbar border border-white/5">
                              {JSON.stringify({ id: touch.id, status: touch.status, metadata: touch.metadata }, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILS, QUESTIONNAIRE & COMMENTS */}
          {activeModalTab === "details" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Aggregated Questionnaire */}
              {(lead.diagnosticsComment || lead.diagnostics_comment) ? (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block">
                    📋 Заповнена анкета / Запит клієнта
                  </span>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-white/90 max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-medium leading-relaxed shadow-sm">
                    {lead.diagnosticsComment || lead.diagnostics_comment}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-xs text-white/30 italic">
                  Анкета для цього ліда не була заповнена або не містить відповідей
                </div>
              )}

              {/* Marketing Summary */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                  Маркетингові параметри ліда
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs bg-white/[0.01] border border-white/5 p-4 rounded-2xl">
                  <div>
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Джерело (UTM Source)</span>
                    <span className="text-white font-extrabold block mt-0.5">{lead.utmSource || lead.utm_source || "direct"}</span>
                  </div>
                  <div>
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Канал (UTM Medium)</span>
                    <span className="text-white font-extrabold block mt-0.5">{lead.utmMedium || lead.utm_medium || "—"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Кампанія (UTM Campaign)</span>
                    <span className="text-white font-extrabold block mt-0.5 truncate">{lead.utmCampaign || lead.utm_campaign || "—"}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-white/30 uppercase text-[9px] font-bold block">Оголошення (UTM Content)</span>
                    <span className="text-white font-extrabold block mt-0.5 truncate">{lead.utmContent || lead.utm_content || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Comments History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                    Коментарі менеджерів ({commentsList.length})
                  </span>
                </div>

                {commentsList.length === 0 ? (
                  <p className="text-xs text-white/30 italic py-1">Коментарів ще немає</p>
                ) : (
                  <div className="space-y-2.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                    {commentsList.map((c: CommentItem) => {
                      const formattedDate = new Date(c.createdAt).toLocaleString("uk-UA", {
                        day: "numeric",
                        month: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });
                      return (
                        <div key={c.id} className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-emerald-400">
                            <span className="truncate max-w-[180px]">{c.authorName || "Менеджер"}</span>
                            <span className="text-white/30 shrink-0">{formattedDate}</span>
                          </div>
                          <p className="text-xs text-white/85 leading-relaxed break-words whitespace-pre-wrap font-medium">
                            {c.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add New Comment */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <textarea
                    value={tempManagerComment}
                    onChange={(e) => setTempManagerComment(e.target.value)}
                    placeholder="Напишіть коментар по клієнту..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-medium text-white placeholder:text-white/20 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveComment}
                      disabled={isSavingComment || !tempManagerComment.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 text-black disabled:text-white/40 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isSavingComment ? "Збереження..." : "Додати коментар"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Manager assignment selector */}
              {["admin", "superman", "producer", "rop"].includes(role) && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                    Призначити відповідального менеджера
                  </span>
                  <div className="relative">
                    <select
                      value={tempAssignedManagerId || ""}
                      onChange={(e) => handleAssignManager(e.target.value)}
                      disabled={isAssigningManager}
                      className="w-full appearance-none pl-3.5 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-bold text-white cursor-pointer"
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
                    <p className="text-[10px] text-emerald-400 animate-pulse font-semibold">
                      Оновлення відповідального...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

