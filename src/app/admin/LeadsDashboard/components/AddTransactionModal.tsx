"use client";

import React, { useState, useEffect, useMemo } from "react";
import { X, Check, Plus, Calendar, DollarSign, RefreshCw, Layers, CreditCard, ChevronDown } from "lucide-react";
import { createTransactionAction, createCustomCategoryAction } from "../../(dashboard)/project/financeActions";

interface AddTransactionModalProps {
  projectId: string;
  funnels: { id: string; name: string }[];
  accounts: { id: string; name: string; currency: string }[];
  customCategories: { name: string; type: string }[];
  defaultCategories: { income: string[]; expense: string[] };
  onClose: () => void;
  onSuccess: () => void;
  isLight: boolean;
  preselectedFunnelId?: string | null;
}

// Standard accounts specified by company workflow
const DEFAULT_EXPENSE_ACCOUNTS = [
  { name: "Особиста картка", defaultCurrency: "UAH" },
  { name: "Картка ФОП", defaultCurrency: "UAH" },
  { name: "Рахунок ФОП", defaultCurrency: "UAH" },
  { name: "Рахунок виконавця", defaultCurrency: "UAH" },
];

const DEFAULT_INCOME_ACCOUNTS = [
  { name: "Рахунок ФОП", defaultCurrency: "UAH" },
  { name: "WayForPay", defaultCurrency: "UAH" },
  { name: "Рахунок виконавця", defaultCurrency: "UAH" },
  { name: "PayPal виконавця", defaultCurrency: "USD" },
];

export default function AddTransactionModal({
  projectId,
  funnels,
  accounts,
  customCategories,
  defaultCategories,
  onClose,
  onSuccess,
  isLight,
  preselectedFunnelId = null
}: AddTransactionModalProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [funnelId, setFunnelId] = useState<string | null>(preselectedFunnelId);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UAH");
  
  // Rate input: e.g. 1 USD ($) = 41.80 UAH (₴)
  const [uahRate, setUahRate] = useState("41.80");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Deduplicate categories list
  const categoriesList = useMemo(() => {
    const raw = type === "income"
      ? [...(defaultCategories?.income || []), ...customCategories.filter(c => c.type === "income").map(c => c.name)]
      : [...(defaultCategories?.expense || []), ...customCategories.filter(c => c.type === "expense").map(c => c.name)];
    
    // Clean and deduplicate via Set
    return Array.from(new Set(raw.map(c => String(c || "").trim()))).filter(Boolean);
  }, [type, defaultCategories, customCategories]);

  // Combine DB accounts with standard workflow options
  const activeAccountOptions = useMemo(() => {
    const standardList = type === "expense" ? DEFAULT_EXPENSE_ACCOUNTS : DEFAULT_INCOME_ACCOUNTS;
    
    if (accounts && accounts.length > 0) {
      return accounts;
    }
    
    return standardList.map((acc, idx) => ({
      id: `std_${idx}_${acc.name}`,
      name: acc.name,
      currency: acc.defaultCurrency
    }));
  }, [type, accounts]);

  // Auto-set account when step or type changes
  useEffect(() => {
    if (activeAccountOptions.length > 0 && (!accountId || !activeAccountOptions.some(a => a.id === accountId))) {
      const defaultAcc = activeAccountOptions[0];
      setAccountId(defaultAcc.id);
      setAccountName(defaultAcc.name);
      
      // Auto-set currency based on account (FOP is always UAH by default)
      if (defaultAcc.name.toLowerCase().includes("фоп") || defaultAcc.currency === "UAH") {
        setCurrency("UAH");
      } else if (defaultAcc.name.toLowerCase().includes("paypal")) {
        setCurrency("USD");
      } else {
        setCurrency(defaultAcc.currency || "UAH");
      }
    }
  }, [activeAccountOptions, accountId]);

  const handleAccountSelect = (acc: { id: string; name: string; currency: string }) => {
    setAccountId(acc.id);
    setAccountName(acc.name);
    
    // Set currency based on selected account
    if (acc.name.toLowerCase().includes("фоп")) {
      setCurrency("UAH");
    } else if (acc.name.toLowerCase().includes("paypal")) {
      setCurrency("USD");
    } else {
      setCurrency(acc.currency || "UAH");
    }
  };

  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await createCustomCategoryAction(projectId, newCategoryName.trim(), type);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setCategory(newCategoryName.trim());
        setNewCategoryName("");
        setShowCustomCategory(false);
      }
    } catch (e: any) {
      setErrorMsg("Помилка створення категорії");
    }
  };

  // Calculate equivalent in USD
  const calculatedUsdAmount = useMemo(() => {
    const num = Number(amount) || 0;
    if (currency === "USD") return num;
    if (currency === "EUR") return num * 1.08;
    const rate = Number(uahRate) || 41.80;
    return rate > 0 ? num / rate : num;
  }, [amount, currency, uahRate]);

  // Convert rate for database (exchangeRate to USD)
  const exchangeRateForDb = useMemo(() => {
    if (currency === "USD") return 1.0;
    if (currency === "EUR") return 1.08;
    const rate = Number(uahRate) || 41.80;
    return rate > 0 ? 1 / rate : 0.0239;
  }, [currency, uahRate]);

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("Будь ласка, вкажіть коректну суму операції");
      return;
    }
    if (!category) {
      setErrorMsg("Оберіть категорію транзакції");
      return;
    }
    if (!accountId) {
      setErrorMsg("Оберіть рахунок для транзакції");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createTransactionAction({
        projectId,
        funnelId,
        date,
        type,
        category,
        description: description || (accountName ? `[${accountName}]` : ""),
        accountId,
        currency,
        amount: Number(amount),
        exchangeRate: exchangeRateForDb
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      setErrorMsg("Помилка збереження транзакції");
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI styling references
  const bgClass = isLight ? "bg-white border border-neutral-200 text-neutral-900 shadow-xl" : "bg-[#0C0C0F] border border-white/10 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)]";
  const inputClass = isLight ? "bg-white border border-neutral-300 text-neutral-900 focus:ring-emerald-500/20 focus:border-emerald-500" : "bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:ring-emerald-500/20";
  const btnNextClass = isLight ? "bg-neutral-900 hover:bg-neutral-800 text-white" : "bg-white hover:bg-neutral-100 text-black";
  const btnPrevClass = isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700" : "bg-white/5 hover:bg-white/10 text-white";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-3xl overflow-hidden font-sans ${bgClass} transition-all duration-300`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center px-6 py-4 border-b ${isLight ? 'border-neutral-200 bg-neutral-50' : 'border-white/5 bg-white/[0.01]'}`}>
          <div>
            <h3 className="text-base font-bold tracking-tight">Додати фінансову операцію</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5 font-medium">Крок {step} з 4</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Income vs Expense Toggles */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Тип операції</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setType("income");
                    setCategory("");
                  }}
                  className={`py-8 px-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    type === "income"
                      ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-emerald-400"
                      : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === "income" ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-neutral-400'}`}>
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-black block">Дохід (Надходження)</span>
                    <span className="text-[10px] opacity-60">Продаж курсів, трипваєри, підписки</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType("expense");
                    setCategory("");
                  }}
                  className={`py-8 px-4 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    type === "expense"
                      ? "bg-rose-500/10 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] text-rose-400"
                      : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === "expense" ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-neutral-400'}`}>
                    <X className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-black block">Витрата (Списання)</span>
                    <span className="text-[10px] opacity-60">Трафік, команда, сервіси, комісії</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Categories Selection (Deduplicated & Clean Ukrainian) */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Оберіть категорію ({type === "income" ? "Дохід" : "Витрата"})
              </label>
              
              {showCustomCategory ? (
                <div className="space-y-3 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
                  <h4 className="text-xs font-semibold">Нова категорія</h4>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Назва категорії..."
                    className={`w-full px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${inputClass}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="px-3.5 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-xl hover:bg-emerald-400 cursor-pointer"
                    >
                      Зберегти
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(false)}
                      className="px-3.5 py-1.5 bg-white/5 text-neutral-300 text-xs font-semibold rounded-xl hover:bg-white/10 cursor-pointer"
                    >
                      Скасувати
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {categoriesList.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        category === cat
                          ? "bg-white text-black font-extrabold border-white shadow-lg"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowCustomCategory(true)}
                    className="px-4 py-2.5 rounded-xl border border-dashed border-neutral-700 text-neutral-400 text-xs font-medium hover:border-white hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Додати свою
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Account & Funnel Binding */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Account badges */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  {type === "expense" ? "Рахунок списання" : "Рахунок отримання"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {activeAccountOptions.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAccountSelect(acc)}
                      className={`px-4 py-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        accountId === acc.id
                          ? "bg-white text-black border-white shadow-lg"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{acc.name}</div>
                        <div className={`text-[10px] mt-0.5 ${accountId === acc.id ? 'text-black/60' : 'text-neutral-500'}`}>
                          {acc.name.toLowerCase().includes("фоп") ? "Фіксовано UAH" : "Основна валюта"}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        accountId === acc.id ? 'bg-black/10 text-black' : 'bg-white/5 text-white/60'
                      }`}>
                        {acc.currency || "UAH"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Funnel Bind */}
              {!preselectedFunnelId && funnels.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Прив'язка до воронки (Опціонально)
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <select
                      value={funnelId || ""}
                      onChange={(e) => setFunnelId(e.target.value || null)}
                      className={`w-full appearance-none pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs font-semibold cursor-pointer ${
                        isLight
                          ? "bg-white border border-neutral-300 text-neutral-900"
                          : "bg-[#121217] border border-white/10 text-white"
                      }`}
                    >
                      <option value="" className={isLight ? "bg-white text-neutral-900" : "bg-[#121217] text-white"}>
                        Загальнопроектна операція (без прив'язки)
                      </option>
                      {funnels.map((f) => (
                        <option key={f.id} value={f.id} className={isLight ? "bg-white text-neutral-900" : "bg-[#121217] text-white"}>
                          🎯 {f.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                  </div>
                  <p className="text-[9px] text-neutral-500">
                    Якщо не прив'язувати до воронки, витрати розподіляються пропорційно між усіма активними воронками проекту.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Sum, rate and description details */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Currency Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Валюта операції
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["UAH", "USD", "EUR"].map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setCurrency(curr)}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        currency === curr
                          ? "bg-white text-black border-white shadow-md"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                      }`}
                    >
                      <span>{curr === "UAH" ? "₴" : curr === "USD" ? "$" : "€"}</span>
                      <span>{curr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Сума в оригіналі ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold ${inputClass}`}
                  />
                </div>

                {/* Exchange rate input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Курс обміну (1 USD ($) =)
                  </label>
                  {currency === "UAH" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400 shrink-0">1$ =</span>
                      <input
                        type="number"
                        step="any"
                        value={uahRate}
                        onChange={(e) => setUahRate(e.target.value)}
                        placeholder="41.80"
                        className={`w-full px-3 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold ${inputClass}`}
                      />
                      <span className="text-xs font-bold text-neutral-400 shrink-0">грн</span>
                    </div>
                  ) : (
                    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-emerald-400 flex items-center justify-between">
                      <span>Пряма валюта:</span>
                      <span>1 {currency} = {currency === "USD" ? "$1.00" : "$1.08"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Note details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Дата операції
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${inputClass}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Коментар / Призначення
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Напр. ЗП таргетолога або Оплата софту"
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${inputClass}`}
                  />
                </div>
              </div>

              {/* Informational calculation card */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs flex items-center justify-between font-medium">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Еквівалент у базі:</span>
                  <span className="font-bold text-white">
                    {Number(amount || 0).toLocaleString("uk-UA")} {currency}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Враховано у P&L:</span>
                  <strong className="text-base font-black text-emerald-400">
                    ${calculatedUsdAmount.toFixed(2)} USD
                  </strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer controls */}
        <div className={`flex justify-between items-center px-6 py-4 border-t ${isLight ? 'border-neutral-200 bg-neutral-50' : 'border-white/5 bg-white/[0.01]'}`}>
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer transition-all ${btnPrevClass}`}
              >
                Назад
              </button>
            )}
          </div>
          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 2 && !category) {
                    setErrorMsg("Будь ласка, оберіть категорію перед переходом.");
                    return;
                  }
                  setErrorMsg("");
                  setStep(step + 1);
                }}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${btnNextClass}`}
              >
                Далі
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Збереження...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Підтвердити операцію
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
