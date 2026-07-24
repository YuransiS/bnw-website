"use client";

import React, { useState, useTransition } from "react";
import { User, Lock, MessageSquare, AlertTriangle, Lightbulb, Save, Loader2, Check } from "lucide-react";
import { submitCrmFeedbackAction } from "../../actions";
import { updateSelfAccountAction } from "./actions";

interface AccountSettingsClientProps {
  currentUserId: string;
  userEmail: string;
  initialFullName: string;
}

export default function AccountSettingsClient({
  currentUserId,
  userEmail,
  initialFullName,
}: AccountSettingsClientProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreset, setAvatarPreset] = useState("emerald");
  
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Feedback Modal states
  const [feedbackType, setFeedbackType] = useState<"error" | "improvement" | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  const avatarPresets = [
    { id: "emerald", bg: "from-emerald-400 to-emerald-600", label: "Emerald" },
    { id: "purple", bg: "from-purple-400 to-indigo-600", label: "Purple" },
    { id: "amber", bg: "from-amber-400 to-orange-600", label: "Amber" },
    { id: "cyan", bg: "from-cyan-400 to-blue-600", label: "Cyan" },
  ];

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);

    if (password && password !== confirmPassword) {
      setProfileMessage({ type: "error", text: "Паролі не збігаються." });
      return;
    }

    if (password && password.length < 6) {
      setProfileMessage({ type: "error", text: "Мінімальна довжина пароля — 6 символів." });
      return;
    }

    startTransition(async () => {
      const res = await updateSelfAccountAction(fullName, password.trim() || undefined);
      if (res.error) {
        setProfileMessage({ type: "error", text: res.error });
      } else {
        setProfileMessage({ type: "success", text: res.message || "Профіль успішно оновлено!" });
        setPassword("");
        setConfirmPassword("");
      }
    });
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || !feedbackType) return;

    startTransition(async () => {
      const res = await submitCrmFeedbackAction(feedbackType, feedbackText);
      if (res.error) {
        setFeedbackStatus("Помилка відправки: " + res.error);
      } else {
        setFeedbackStatus("Дякуємо! Ваше повідомлення успішно надіслано розробникам.");
        setFeedbackText("");
        setTimeout(() => {
          setFeedbackType(null);
          setFeedbackStatus(null);
        }, 2000);
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans text-white">
      
      {/* Page Header */}
      <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2.5">
            <User className="w-6 h-6 text-emerald-400" />
            Налаштування акаунта
          </h1>
          <p className="text-xs text-white/40 mt-1">Керування особистими даними, безпекою та зв'язок з розробниками</p>
        </div>
      </div>

      {profileMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold leading-relaxed border animate-in fade-in ${
          profileMessage.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          {profileMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Main Settings Form */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Details Form */}
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-6">
            <h2 className="text-base font-bold flex items-center gap-2 border-b border-white/5 pb-3">
              <User className="w-4 h-4 text-emerald-400" />
              Особисті дані
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              
              {/* Avatar Preset Selector */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                  Виберіть стиль аватара
                </label>
                <div className="flex items-center gap-3">
                  {avatarPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarPreset(preset.id)}
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.bg} flex items-center justify-center font-black text-black text-sm cursor-pointer transition-transform ${
                        avatarPreset === preset.id ? "scale-110 ring-2 ring-emerald-400" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {fullName ? fullName.charAt(0).toUpperCase() : "U"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                  Ім'я та Прізвище
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Введіть ваше ім'я та прізвище"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500 focus:outline-none text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">
                  Електронна пошта
                </label>
                <input
                  type="email"
                  value={userEmail}
                  disabled
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 text-sm cursor-not-allowed"
                />
                <span className="text-[9px] text-white/30 mt-1 block">Email прив'язаний до входу в систему</span>
              </div>

              <div className="border-t border-white/5 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-white/80 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Зміна пароля
                </h3>

                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Новий пароль (залиште порожнім, якщо не змінюєте)"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500 focus:outline-none text-sm transition-all"
                  />
                </div>

                {password && (
                  <div className="animate-in fade-in">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Підтвердіть новий пароль"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500 focus:outline-none text-sm transition-all"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Збереження...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Зберегти зміни профілю
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Quick Action Feedback Buttons */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 border-b border-white/5 pb-3">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              Зворотній зв'язок
            </h2>
            <p className="text-xs text-white/50 leading-relaxed">
              Знайшли баг або маєте ідею для покращення платформі? Повідомте розробникам прямо тут.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setFeedbackType("error")}
                className="w-full p-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Повідомити про проблему</span>
                </div>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </button>

              <button
                onClick={() => setFeedbackType("improvement")}
                className="w-full p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>Запропонувати покращення</span>
                </div>
                <span className="group-hover:translate-x-1 transition-transform">➔</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Feedback Modal Popup */}
      {feedbackType && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-black text-sm uppercase flex items-center gap-2 text-white">
                {feedbackType === "error" ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Повідомити про проблему
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Запропонувати покращення
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setFeedbackType(null);
                  setFeedbackStatus(null);
                }}
                className="text-white/40 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {feedbackStatus && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                {feedbackStatus}
              </div>
            )}

            <form onSubmit={handleSendFeedback} className="space-y-4">
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  feedbackType === "error"
                    ? "Опишіть, яка помилка виникла або що саме працює некоректно..."
                    : "Опишіть вашу ідею або функцію, яку б ви хотіли бачити в CRM..."
                }
                className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:border-emerald-500 focus:outline-none text-xs transition-all resize-none"
                required
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackType(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:text-white text-xs font-bold"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase shadow-lg"
                >
                  {isPending ? "Надсилання..." : "Надіслати"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
