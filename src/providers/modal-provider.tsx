"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";

interface ModalContextType {
  isOpen: boolean;
  activeButtonId: string | null;
  openModal: (buttonId: string) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("visitor_id");
    }
    return null;
  });

  // Analytics Initialization Script
  useEffect(() => {
    let currentVisitorId = localStorage.getItem("visitor_id");
    if (!currentVisitorId) {
      currentVisitorId = crypto.randomUUID();
      localStorage.setItem("visitor_id", currentVisitorId);
      setVisitorId(currentVisitorId);
    }

    // Record background page view
    const trackPageView = async () => {
      try {
        const supabase = createClient();
        await supabase.from("page_views").insert({
          visitor_id: currentVisitorId,
          path: window.location.pathname,
        });
      } catch (err) {
        console.error("Page view tracking error:", err);
      }
    };

    trackPageView();
  }, []);

  const openModal = async (buttonId: string) => {
    setActiveButtonId(buttonId);
    setIsOpen(true);

    // Track button click immediately
    let currentVisitorId = visitorId || localStorage.getItem("visitor_id");
    if (!currentVisitorId) {
      currentVisitorId = crypto.randomUUID();
      localStorage.setItem("visitor_id", currentVisitorId);
      setVisitorId(currentVisitorId);
    }

    try {
      const supabase = createClient();
      await supabase.from("button_clicks").insert({
        visitor_id: currentVisitorId,
        button_id: buttonId,
      });
    } catch (err) {
      console.error("Button click tracking error:", err);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setActiveButtonId(null);
  };

  return (
    <ModalContext.Provider
      value={{ isOpen, activeButtonId, openModal, closeModal }}
    >
      {children}
      <AnimatePresence>
        {isOpen && <LeadModal />}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

import { createLeadAction, getClientCountry } from "@/app/actions/leads";
import { validatePhoneNumber } from "@/utils/phone";

const COUNTRY_PREFIXES: Record<string, string> = {
  UA: "+380",
  PL: "+48",
  US: "+1",
  CA: "+1",
  GB: "+44",
  DE: "+49",
  FR: "+33",
  IT: "+39",
  ES: "+34",
  NL: "+31",
  BE: "+32",
  AT: "+43",
  CH: "+41",
  SE: "+46",
  NO: "+47",
  FI: "+358",
  DK: "+45",
  IE: "+353",
  PT: "+351",
  GR: "+30",
  IL: "+972",
  KZ: "+7",
  GE: "+995",
  AM: "+374",
  AZ: "+994",
  MD: "+373",
  LT: "+370",
  LV: "+371",
  EE: "+372",
  RO: "+40",
  BG: "+359",
  HU: "+36",
  CZ: "+420",
  SK: "+421",
  HR: "+385",
  SI: "+386",
  RS: "+381",
  CY: "+357",
  AE: "+971",
  TR: "+90",
  TH: "+66",
  ID: "+62",
  MY: "+60",
  SG: "+65",
  VN: "+84",
  PH: "+63",
  IN: "+91",
  AU: "+61",
  NZ: "+64",
  ZA: "+27",
  BR: "+55",
  MX: "+52",
  AR: "+54",
  CL: "+56",
  CO: "+57",
  PE: "+51",
};

function LeadModal() {
  const { activeButtonId, closeModal } = useModal();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [instagram, setInstagram] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Clear fields on open/close & fetch prefix
  useEffect(() => {
    const fetchCountryPrefix = async () => {
      try {
        const country = await getClientCountry();
        const prefix = COUNTRY_PREFIXES[country.toUpperCase()] || "+380";
        setPhone(prefix);
      } catch (err) {
        setPhone("+380");
      }
    };
    fetchCountryPrefix();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Client-side Deduplication lock (24-hour TTL)
    const submittedAt = localStorage.getItem("lead_submitted_at");
    if (submittedAt) {
      const elapsed = Date.now() - parseInt(submittedAt, 10);
      if (elapsed < 24 * 60 * 60 * 1000) {
        setError("Ми вже отримали вашу заявку і скоро з вами зв'яжемось.");
        return;
      }
    }

    if (!name.trim()) {
      setError("Будь ласка, вкажіть ваше ім'я");
      return;
    }
    if (!phone.trim()) {
      setError("Будь ласка, вкажіть ваш номер телефону");
      return;
    }

    // Phone format validation using libphonenumber-js
    const cleanPhone = phone.trim();
    if (!validatePhoneNumber(cleanPhone)) {
      setError("Будь ласка, введіть коректний номер телефону з кодом країни (наприклад, +380...)");
      return;
    }

    if (!telegram.trim() && !instagram.trim()) {
      setError("Вкажіть хоча б один спосіб зв'язку (Telegram або Instagram)");
      return;
    }

    setIsSubmitting(true);
    try {
      const visitorId = localStorage.getItem("visitor_id") || crypto.randomUUID();

      // Call Server Action
      const res = await createLeadAction({
        name: name.trim(),
        phone: cleanPhone,
        telegram: telegram.trim() || undefined,
        instagram: instagram.trim() || undefined,
        buttonId: activeButtonId || "unknown",
        visitorId: visitorId,
      });

      if (res.error) {
        if (res.error === "duplicate_lead") {
          localStorage.setItem("lead_submitted_at", Date.now().toString());
          setError("Ми вже отримали вашу заявку і скоро з вами зв'яжемось.");
          return;
        }
        throw new Error(res.error);
      }

      // Successful submission: persist submitted timestamp
      localStorage.setItem("lead_submitted_at", Date.now().toString());

      setIsSuccess(true);
      setTimeout(() => {
        closeModal();
      }, 2500);
    } catch (err: unknown) {
      const errorVal = err as Error;
      setError(errorVal.message || "Помилка відправки. Спробуйте ще раз.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0C0C0F]/90 p-8 text-white shadow-2xl backdrop-blur-xl"
      >
        {/* Dynamic decorative gradients */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={closeModal}
          className="absolute top-5 right-5 p-2 text-white/40 hover:text-white transition-all rounded-full hover:bg-white/5 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-10 text-center"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight uppercase">
              Успішно надіслано!
            </h3>
            <p className="text-white/60 text-sm max-w-xs leading-relaxed">
              {"Ми отримали вашу заявку і вже шукаємо точки росту для вашого проекту. Скоро зв'яжемось!"}
            </p>
          </motion.div>
        ) : (
          <div>
            <h3 className="text-2xl font-black tracking-tight mb-2 uppercase">
              Пройти діагностику
            </h3>
            <p className="text-white/50 text-sm mb-6 leading-relaxed">
              Залиште ваші дані, щоб розібрати проект та побудувати системний маркетинг.
            </p>

            {error && (
              <div className="p-3.5 mb-5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  {"Ім'я *"}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Як до вас звертатися?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                  {"Телефон *"}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Telegram
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@username"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-white placeholder:text-white/20 text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/30 italic">
                {"* Вкажіть щонайменше один контакт: Telegram чи Instagram"}
              </p>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-black font-black transition-all cursor-pointer shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-95 duration-300 flex items-center justify-center gap-2 text-base mt-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Відправка...
                  </>
                ) : (
                  "Надіслати заявку"
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
