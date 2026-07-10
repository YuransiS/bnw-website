"use client";

import React, { useState, useEffect } from "react";
import { Link as LinkIcon, CheckCircle, ExternalLink, Copy } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { LeadItem } from "../types";

interface PaylinkTabProps {
  activeProjectSlug: string;
  selectedLeadInfo: LeadItem | null;
}

export const PaylinkTab = React.memo(function PaylinkTab({
  activeProjectSlug,
  selectedLeadInfo
}: PaylinkTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const inputClass =
    "bg-crm-input-bg border border-crm-border text-crm-text placeholder:text-crm-muted focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const selectClass =
    "bg-crm-input-bg border border-crm-border text-crm-text focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
  const optionClass = "bg-crm-card text-crm-text";

  // Isolated states
  const [payCustName, setPayCustName] = useState("");
  const [payCustPhone, setPayCustPhone] = useState("");
  const [payAmount, setPayAmount] = useState("1000");
  const [payCurrency, setPayCurrency] = useState("UAH");
  const [payProduct, setPayProduct] = useState("Бронювання курсу");
  const [generatedLink, setGeneratedLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  // Sync client name and phone from selected lead
  useEffect(() => {
    if (selectedLeadInfo) {
      setPayCustName(selectedLeadInfo.name || "");
      setPayCustPhone(selectedLeadInfo.phone || "");
    }
  }, [selectedLeadInfo]);

  const handleBuildPaymentButton = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingLink(true);
    try {
      const slug = activeProjectSlug || "bnw_main";
      const res = await fetch("/api/admin/generate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug: slug,
          amount: Number(payAmount),
          currency: payCurrency,
          tariffName: payProduct,
          customerName: payCustName,
          customerPhone: payCustPhone,
          uuid: selectedLeadInfo?.visitor_uuid || selectedLeadInfo?.id || ""
        })
      });
      const data = await res.json();
      if (data.url) {
        setGeneratedLink(data.url);
      } else {
        alert("Помилка генерації: " + (data.error || "Невідома помилка"));
      }
    } catch (err) {
      alert("Помилка генерації посилання");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
      <div className="lg:col-span-1 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-emerald-500" />
            Генератор платежів (WayForPay)
          </h2>
          <p className="text-white/40 text-xs mt-1 font-semibold">
            Швидке створення унікальних кнопок та лінків оплати для клієнтів
          </p>
        </div>

        <form onSubmit={handleBuildPaymentButton} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Ім'я клієнта
            </label>
            <input
              type="text"
              value={payCustName}
              onChange={(e) => setPayCustName(e.target.value)}
              placeholder="Іван Гончар"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Телефон клієнта
            </label>
            <input
              type="text"
              value={payCustPhone}
              onChange={(e) => setPayCustPhone(e.target.value)}
              placeholder="+380991234567"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Сума оплати
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="1000"
                className={`flex-grow px-4 py-3 rounded-xl focus:outline-none text-xs font-extrabold ${inputClass}`}
                required
              />
              <select
                value={payCurrency}
                onChange={(e) => setPayCurrency(e.target.value)}
                className={`px-3 rounded-xl text-xs font-black focus:outline-none ${selectClass}`}
              >
                <option value="UAH" className={optionClass}>
                  &nbsp; UAH
                </option>
                <option value="USD" className={optionClass}>
                  $ USD
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Назва послуги / Продукту
            </label>
            <input
              type="text"
              value={payProduct}
              onChange={(e) => setPayProduct(e.target.value)}
              placeholder="Бронювання консультації"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isGeneratingLink}
            className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all cursor-pointer shadow-lg hover:scale-[1.01] active:scale-95 duration-200 mt-2 text-xs disabled:opacity-55"
          >
            {isGeneratingLink ? "Генерація..." : "Згенерувати посилання"}
          </button>
        </form>
      </div>

      {/* Payment link preview section */}
      <div className="lg:col-span-2 bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col justify-center items-center text-center space-y-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/[0.01] rounded-full blur-3xl pointer-events-none" />

        {generatedLink ? (
          <div className="w-full max-w-md space-y-6">
            <div className="p-8 rounded-3xl border border-emerald-500/20 bg-white/[0.01] relative space-y-4">
              <div className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                <CheckCircle className="w-3 h-3" /> Лінк готовий
              </div>

              <p className="text-xs text-white/40 uppercase tracking-wider font-bold">Стиль Pay-Button (WayForPay)</p>

              <div className="py-4 border-t border-b border-white/5 space-y-2">
                <p className="text-2xl font-black text-white">{payProduct}</p>
                <p className="text-3xl font-black text-emerald-400">
                  {payAmount} {payCurrency === "UAH" ? "₴" : "$"}
                </p>
              </div>

              {/* Mock pay button */}
              <a
                href={generatedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-full bg-[#FCB316] hover:bg-[#ffbe33] text-black font-black transition-all shadow-[0_0_20px_rgba(252,179,22,0.15)] flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                Оплатити через WayForPay
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Plain text link Copy box */}
            <div className="flex gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left items-center">
              <input
                type="text"
                value={generatedLink}
                readOnly
                className="flex-grow bg-transparent border-none text-[11px] text-white/60 focus:outline-none select-all truncate font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  alert("Посилання скопійовано!");
                }}
                className="p-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/15 hover:border-emerald-500/30 text-emerald-400 cursor-pointer shrink-0 transition-all"
                title="Скопіювати посилання"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mx-auto">
              <LinkIcon className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-black uppercase text-white tracking-widest">Посилання не створено</h3>
            <p className="text-xs text-white/30 max-w-sm">
              Заповніть форму ліворуч, щоб згенерувати посилання на оплату (WayForPay) для вашого клієнта.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default PaylinkTab;
