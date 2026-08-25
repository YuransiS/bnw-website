"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Clock,
  Send,
  Loader2,
  Sparkles,
  Layers,
  HelpCircle,
  XCircle,
  Filter,
  Check,
  ChevronDown,
  User,
  Calendar,
  Tag,
  ShieldCheck,
  Flame,
  AlertCircle
} from "lucide-react";
import { submitCrmFeedbackAction, getCrmFeedbackList, updateFeedbackStatusAction } from "../../actions";

interface FeedbackTabProps {
  initialType?: "error" | "improvement";
  activeProject?: any;
  role: string;
  userEmail: string;
  theme?: string;
}

const CATEGORIES = [
  { id: "leads", label: "👥 База лідів & Таймлайн" },
  { id: "funnels", label: "🎯 Маркетингові воронки" },
  { id: "finance", label: "💳 Фінанси & Оплати" },
  { id: "traffic", label: "🚥 Трафік & Рекламні кампанії" },
  { id: "quizzes", label: "📋 Анкети & Розбори" },
  { id: "mobile", label: "📱 Мобільна версія / Адаптив" },
  { id: "access", label: "🔐 Доступи & Профіль" },
  { id: "other", label: "🌐 Інше / Загальне" }
];

const PRIORITIES = [
  { id: "low", label: "🟢 Низький (Побажання / Питання)", color: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20" },
  { id: "medium", label: "🟡 Середній (Незручність у роботі)", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: "high", label: "🔴 Високий (Не працює важлива функція)", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { id: "critical", label: "🚨 Критичний (Повний збій / Блокер)", color: "text-red-450 bg-red-500/20 border-red-500/40 animate-pulse" }
];

const STATUSES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "⏳ Очікує розгляду", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  in_progress: { label: "⚙️ В роботі", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
  resolved: { label: "✅ Виправлено / Реалізовано", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  rejected: { label: "⛔ Відхилено", bg: "bg-neutral-500/10", text: "text-neutral-400", border: "border-neutral-500/20" }
};

export default function FeedbackTab({
  initialType = "error",
  activeProject,
  role,
  userEmail,
  theme = "dark"
}: FeedbackTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"form" | "history" | "admin_all">("form");
  const [feedbackType, setFeedbackType] = useState<"error" | "improvement">(initialType);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("leads");
  const [priority, setPriority] = useState("medium");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Admin filter states
  const [adminTypeFilter, setAdminTypeFilter] = useState<string>("all");
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isPrivileged =
    ["admin", "superman", "developer", "founder"].includes(role) ||
    userEmail === "yura3zaxar@gmail.com" ||
    userEmail === "yura3zaxar@outlook.com";

  // Sync initial type if changed from props
  useEffect(() => {
    setFeedbackType(initialType);
  }, [initialType]);

  // Real-time localStorage auto-save for form resilience
  useEffect(() => {
    const draftKey = `crm_feedback_draft_${feedbackType}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.message) setMessage(parsed.message);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.priority) setPriority(parsed.priority);
      } catch {}
    }
  }, [feedbackType]);

  useEffect(() => {
    const draftKey = `crm_feedback_draft_${feedbackType}`;
    if (title || message) {
      localStorage.setItem(draftKey, JSON.stringify({ title, message, category, priority }));
    }
  }, [title, message, category, priority, feedbackType]);

  // Load feedback items on tab switch
  const loadFeedbackItems = async () => {
    setIsLoadingHistory(true);
    try {
      const items = await getCrmFeedbackList();
      if (Array.isArray(items)) {
        setFeedbackList(items);
      }
    } catch (err) {
      console.error("Failed to fetch feedback history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "history" || activeSubTab === "admin_all") {
      loadFeedbackItems();
    }
  }, [activeSubTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setSubmitError("Будь ласка, введіть опис повідомлення.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const clientMetadata = {
      project_name: activeProject?.name || "Global CRM",
      project_slug: activeProject?.slug || "all",
      page_url: typeof window !== "undefined" ? window.location.href : "",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      screen_resolution: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
      submitted_at: new Date().toISOString()
    };

    try {
      const res = await submitCrmFeedbackAction({
        type: feedbackType,
        title: title.trim() || (feedbackType === "error" ? "Повідомлення про помилку" : "Ідея покращення"),
        message: message.trim(),
        category,
        priority,
        metadata: clientMetadata
      });

      if (res.error) {
        setSubmitError(res.error);
      } else {
        setSubmitSuccess(res.message || "Дякуємо! Ваш запит успішно зареєстровано.");
        // Clear local storage draft
        localStorage.removeItem(`crm_feedback_draft_${feedbackType}`);
        setTitle("");
        setMessage("");
      }
    } catch (err: any) {
      setSubmitError(err.message || "Невідома помилка під час відправки.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: string) => {
    setUpdatingId(feedbackId);
    try {
      const res = await updateFeedbackStatusAction(feedbackId, newStatus);
      if (res.error) {
        alert("Помилка оновлення статусу: " + res.error);
      } else {
        setFeedbackList((prev) =>
          prev.map((item) => (item.id === feedbackId ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err: any) {
      alert("Помилка: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAdminList = feedbackList.filter((item) => {
    if (adminTypeFilter !== "all" && item.type !== adminTypeFilter) return false;
    if (adminStatusFilter !== "all" && item.status !== adminStatusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-[#0C0C0F] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              feedbackType === "error"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}>
              {feedbackType === "error" ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" /> Центр зворотного зв'язку
                </>
              ) : (
                <>
                  <Lightbulb className="w-3.5 h-3.5" /> Лабораторія ідей & покращень
                </>
              )}
            </span>
            {activeProject?.name && (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-white/5 text-white/60 border border-white/10">
                Проект: {activeProject.name}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
            {feedbackType === "error" ? "Повідомити про помилку в CRM" : "Запропонувати покращення"}
          </h2>
          <p className="text-xs text-white/50 max-w-2xl leading-relaxed">
            {feedbackType === "error"
              ? "Знайшли баг, неточність або некоректні дані? Опишіть проблему — команда розробників оперативно виправить її."
              : "Маєте ідею, як зробити роботу з дашбордом швидшою, зручнішою чи додати новий функціонал? Поділіться з нами!"}
          </p>
        </div>

        {/* Sub-tab Switchers */}
        <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5 self-start md:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab("form")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "form"
                ? "bg-white text-black shadow-lg"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Форма заявки
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === "history"
                ? "bg-white text-black shadow-lg"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Мої звернення
          </button>
          {isPrivileged && (
            <button
              type="button"
              onClick={() => setActiveSubTab("admin_all")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === "admin_all"
                  ? "bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20"
                  : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Всі звернення CRM
            </button>
          )}
        </div>
      </div>

      {/* VIEWPORT: SUBMISSION FORM */}
      {activeSubTab === "form" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 bg-[#0C0C0F] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
            
            {/* Type selector toggle */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                Тип звернення
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeedbackType("error")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                    feedbackType === "error"
                      ? "bg-red-500/10 border-red-500/40 text-white shadow-lg shadow-red-500/5"
                      : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    feedbackType === "error" ? "bg-red-500 text-white font-bold" : "bg-white/5 text-white/40"
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Повідомити про помилку</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Збій, некоректні розрахунки чи зависання</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackType("improvement")}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                    feedbackType === "improvement"
                      ? "bg-amber-500/10 border-amber-500/40 text-white shadow-lg shadow-amber-500/5"
                      : "bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    feedbackType === "improvement" ? "bg-amber-500 text-black font-bold" : "bg-white/5 text-white/40"
                  }`}>
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">Запропонувати покращення</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Нова функція, оптимізація чи зручність</p>
                  </div>
                </button>
              </div>
            </div>

            {submitSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="flex-1">
                  <p>{submitSuccess}</p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab("history")}
                    className="underline text-[11px] mt-1 text-emerald-300 hover:text-white block cursor-pointer"
                  >
                    Переглянути статус у розділі "Мої звернення" →
                  </button>
                </div>
              </div>
            )}

            {submitError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-3 animate-in fade-in">
                <XCircle className="w-5 h-5 shrink-0" />
                <p>{submitError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category & Priority in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                    Розділ CRM
                  </label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full appearance-none pl-3.5 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-bold text-white cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-[#0C0C0F] text-white">
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/40" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                    Пріоритет терміновості
                  </label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full appearance-none pl-3.5 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-bold text-white cursor-pointer"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0C0C0F] text-white">
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-white/40" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Тема / Короткий заголовок
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    feedbackType === "error"
                      ? "Наприклад: Не відображаються ліди за вибраний місяць"
                      : "Наприклад: Додати експорт списку лідів у формат Excel / CSV"
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold text-white placeholder:text-white/20 transition-all"
                />
              </div>

              {/* Message Details */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Детальний опис <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    feedbackType === "error"
                      ? "1. Що саме ви робили перед виникненням проблеми?\n2. Що саме пішло не так або яка помилка з'явилася?\n3. Який результат ви очікували побачити?"
                      : "1. Опишіть вашу ідею або новий функціонал.\n2. Як саме це спростить роботу команді або продюсерам?\n3. Які додаткові поля/кнопки варто передбачити?"
                  }
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-medium text-white placeholder:text-white/20 resize-none leading-relaxed transition-all"
                />
              </div>

              {/* Auto context badge info */}
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center gap-2 text-[10px] text-white/40">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Контекст сторінки (проект, URL, браузер) буде прикріплено автоматично для швидкого аналізу розробником.
                </span>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-xl ${
                    feedbackType === "error"
                      ? "bg-red-500 hover:bg-red-400 disabled:bg-white/5 text-white disabled:text-white/30"
                      : "bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 text-black disabled:text-white/30"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Надсилання запиту...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {feedbackType === "error" ? "Надіслати звіт про помилку" : "Надіслати пропозицію"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Tips & SLA Info */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0C0C0F] border border-white/10 space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Як розглядаються звернення
              </h3>
              <ul className="space-y-3 text-xs text-white/70 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-black">•</span>
                  <span><strong>Критичні помилки:</strong> розглядаються та беруться в роботу розробниками в пріоритетному порядку.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 font-black">•</span>
                  <span><strong>Ідеї та покращення:</strong> аналізуються продюсерами та архітекторами для включення в щотижневі релізи CRM.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-black">•</span>
                  <span><strong>Статус у реальному часі:</strong> ви завжди можете відстежити стан виконання у вкладці «Мої звернення».</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.01] border border-white/5 space-y-3">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
                Ваш контактний акаунт
              </span>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{userEmail}</p>
                  <span className="text-[10px] text-white/40 uppercase font-semibold block mt-0.5">
                    Роль: {role}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEWPORT: USER HISTORY */}
      {activeSubTab === "history" && (
        <div className="bg-[#0C0C0F] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-tight">
                Історія моїх звернень ({feedbackList.length})
              </h3>
              <p className="text-xs text-white/40 mt-0.5">Відстежуйте стан розгляду та виправлення ваших запитів</p>
            </div>
            <button
              type="button"
              onClick={loadFeedbackItems}
              disabled={isLoadingHistory}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isLoadingHistory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Оновити список"}
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
              <p className="text-xs text-white/40 font-bold uppercase tracking-wider">Завантаження звернень...</p>
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="py-16 text-center space-y-3 border border-dashed border-white/10 rounded-2xl">
              <HelpCircle className="w-8 h-8 text-white/20 mx-auto" />
              <p className="text-sm font-bold text-white/60">Ви ще не надсилали звернень</p>
              <button
                type="button"
                onClick={() => setActiveSubTab("form")}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Створити перше звернення
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((item) => {
                const statusMeta = STATUSES[item.status] || STATUSES.pending;
                const isErr = item.type === "error";

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 hover:border-white/10 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          isErr ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {isErr ? <AlertTriangle className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                          {isErr ? "Помилка" : "Покращення"}
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-white">{item.title || item.message.slice(0, 40)}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                          {statusMeta.label}
                        </span>
                        <span className="text-[10px] text-white/40 font-bold">
                          {new Date(item.created_at).toLocaleString("uk-UA", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-white/80 whitespace-pre-wrap leading-relaxed font-medium">
                      {item.message}
                    </p>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {item.category && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-white/50 border border-white/10">
                          Розділ: {CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                        </span>
                      )}
                      {item.priority && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-white/5 text-white/50 border border-white/10">
                          Пріоритет: {item.priority}
                        </span>
                      )}
                      {item.metadata?.project_name && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          Проект: {item.metadata.project_name}
                        </span>
                      )}
                    </div>

                    {/* Admin Response If Present */}
                    {item.metadata?.admin_note && (
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
                        <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider block">
                          💬 Відповідь розробника:
                        </span>
                        <p className="text-xs text-white/90 font-medium leading-relaxed">
                          {item.metadata.admin_note}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEWPORT: ADMIN & DEVELOPER DASHBOARD */}
      {activeSubTab === "admin_all" && isPrivileged && (
        <div className="bg-[#0C0C0F] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Центр управління зверненнями CRM ({filteredAdminList.length})
              </h3>
              <p className="text-xs text-white/40 mt-0.5">Керування статусами, обробка помилок та впровадження ідей</p>
            </div>

            {/* Admin Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={adminTypeFilter}
                onChange={(e) => setAdminTypeFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                <option value="all" className="bg-[#0C0C0F]">Всі типи</option>
                <option value="error" className="bg-[#0C0C0F]">🐞 Тільки помилки</option>
                <option value="improvement" className="bg-[#0C0C0F]">💡 Тільки покращення</option>
              </select>

              <select
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer"
              >
                <option value="all" className="bg-[#0C0C0F]">Всі статуси</option>
                <option value="pending" className="bg-[#0C0C0F]">⏳ Очікує розгляду</option>
                <option value="in_progress" className="bg-[#0C0C0F]">⚙️ В роботі</option>
                <option value="resolved" className="bg-[#0C0C0F]">✅ Виправлено</option>
                <option value="rejected" className="bg-[#0C0C0F]">⛔ Відхилено</option>
              </select>

              <button
                type="button"
                onClick={loadFeedbackItems}
                disabled={isLoadingHistory}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-all cursor-pointer"
                title="Оновити"
              >
                {isLoadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {filteredAdminList.length === 0 ? (
            <p className="text-xs text-white/40 italic py-8 text-center">Звернень за вибраними фільтрами не знайдено</p>
          ) : (
            <div className="space-y-4">
              {filteredAdminList.map((item) => {
                const statusMeta = STATUSES[item.status] || STATUSES.pending;
                const isErr = item.type === "error";

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 hover:border-white/10 transition-all"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                          isErr ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {isErr ? <AlertTriangle className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                          {isErr ? "Помилка" : "Покращення"}
                        </span>
                        <h4 className="text-sm font-black text-white">{item.title || item.message.slice(0, 40)}</h4>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status change buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, "in_progress")}
                            disabled={updatingId === item.id || item.status === "in_progress"}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all cursor-pointer disabled:opacity-40"
                          >
                            В роботу
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, "resolved")}
                            disabled={updatingId === item.id || item.status === "resolved"}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer disabled:opacity-40"
                          >
                            Виправлено
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.id, "rejected")}
                            disabled={updatingId === item.id || item.status === "rejected"}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-400 border border-neutral-500/20 transition-all cursor-pointer disabled:opacity-40"
                          >
                            Відхилити
                          </button>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed font-medium">
                      {item.message}
                    </p>

                    {/* Metadata & Author Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[10px] text-white/50">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white/80 font-bold">👤 {item.user_email}</span>
                        {item.category && <span>• Розділ: <strong>{item.category}</strong></span>}
                        {item.priority && <span>• Пріоритет: <strong>{item.priority}</strong></span>}
                        {item.metadata?.project_name && <span>• Проект: <strong>{item.metadata.project_name}</strong></span>}
                      </div>

                      <span className="text-white/40 font-mono">
                        {new Date(item.created_at).toLocaleString("uk-UA")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
