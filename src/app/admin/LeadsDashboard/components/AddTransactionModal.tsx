"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Plus, Calendar, DollarSign, RefreshCw, Layers } from "lucide-react";
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
  const [funnelId, setFunnelId] = useState<string | null>(preselectedFunnelId);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("UAH");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Get active list of categories
  const categoriesList = type === "income" 
    ? [...defaultCategories.income, ...customCategories.filter(c => c.type === "income").map(c => c.name)]
    : [...defaultCategories.expense, ...customCategories.filter(c => c.type === "expense").map(c => c.name)];

  // Auto-set account currency and default account
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
      setCurrency(accounts[0].currency);
    }
  }, [accounts, accountId]);

  const handleAccountChange = (id: string) => {
    setAccountId(id);
    const acc = accounts.find(a => a.id === id);
    if (acc) {
      setCurrency(acc.currency);
      // Auto-set reasonable exchange rates (UAH standard rate ~0.0227, USD/EUR ~1.0)
      if (acc.currency === "UAH") {
        setExchangeRate("0.0227");
      } else {
        setExchangeRate("1.0");
      }
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

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setErrorMsg("Будь ласка, вкажіть коректну суму");
      return;
    }
    if (!category) {
      setErrorMsg("Оберіть категорію транзакції");
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
        description,
        accountId,
        currency,
        amount: Number(amount),
        exchangeRate: Number(exchangeRate)
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
  const bgClass = isLight ? "bg-white border border-neutral-200 text-neutral-900 shadow-xl" : "bg-[#0C0C0F] border border-white/5 text-white shadow-[0_0_50px_rgba(0,0,0,0.8)]";
  const inputClass = isLight ? "bg-white border border-neutral-300 text-neutral-900 focus:ring-emerald-500/20 focus:border-emerald-500" : "bg-white/5 border border-white/10 text-white focus:border-emerald-500 focus:ring-emerald-500/20";
  const btnNextClass = isLight ? "bg-neutral-900 hover:bg-neutral-800 text-white" : "bg-white hover:bg-neutral-100 text-black";
  const btnPrevClass = isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700" : "bg-white/5 hover:bg-white/10 text-white";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl overflow-hidden font-sans ${bgClass} transition-all duration-300`}>
        
        {/* Header */}
        <div className={`flex justify-between items-center px-6 py-4 border-b ${isLight ? 'border-neutral-200 bg-neutral-50' : 'border-white/5 bg-white/[0.01]'}`}>
          <div>
            <h3 className="text-base font-bold tracking-tight">Додати операцію</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">Крок {step} з 4</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps */}
        <div className="p-6 space-y-6">
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
                  onClick={() => setType("income")}
                  className={`py-8 px-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    type === "income"
                      ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-emerald-400"
                      : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === "income" ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-neutral-400'}`}>
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">Прихід (Дохід)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`py-8 px-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    type === "expense"
                      ? "bg-rose-500/10 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] text-rose-400"
                      : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === "expense" ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-neutral-400'}`}>
                    <X className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold">Витрата (Расход)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Presets Categories Grid */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Оберіть категорію</label>
              
              {showCustomCategory ? (
                <div className="space-y-3 p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <h4 className="text-xs font-semibold">Нова категорія ({type === "income" ? "Приходу" : "Витрати"})</h4>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Назва категорії..."
                    className={`w-full px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${inputClass}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded-lg hover:bg-emerald-400 cursor-pointer"
                    >
                      Зберегти
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomCategory(false)}
                      className="px-3 py-1.5 bg-white/5 text-neutral-300 text-xs font-semibold rounded-lg hover:bg-white/10 cursor-pointer"
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
                          ? "bg-white text-black font-extrabold border-white"
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

          {/* STEP 3: Account, Currency and Funnel Binding */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Account badges */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Счёт списания / получения</label>
                <div className="grid grid-cols-2 gap-3">
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleAccountChange(acc.id)}
                      className={`px-4 py-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        accountId === acc.id
                          ? "bg-white text-black border-white"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:border-white/10"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{acc.name}</div>
                        <div className={`text-[10px] mt-0.5 ${accountId === acc.id ? 'text-black/50' : 'text-neutral-500'}`}>Валюта рахунку</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${accountId === acc.id ? 'bg-black/10 text-black' : 'bg-white/5 text-white/60'}`}>{acc.currency}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Funnel Bind */}
              {!preselectedFunnelId && funnels.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Прив'язка до воронки (Опціонально)</label>
                  <div className="relative">
                    <Layers className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <select
                      value={funnelId || ""}
                      onChange={(e) => setFunnelId(e.target.value || null)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-xs ${inputClass}`}
                    >
                      <option value="">Загальнопроектна витрата (без прив'язки)</option>
                      {funnels.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[9px] text-neutral-500">Якщо не привязувати до воронки, сума буде розділена порівну між усіма активними воронками проекту при розрахунку ROI.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Sum, rate and description details */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-2 gap-4">
                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Сумма в оригіналі ({currency})</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold ${inputClass}`}
                    />
                  </div>
                </div>

                {/* Exchange rate input */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Курс до USD ($)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      placeholder="1.00"
                      className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-bold ${inputClass}`}
                    />
                  </div>
                </div>
              </div>

              {/* Date & Note details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Дата операції</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${inputClass}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400">Коментар / Джерело</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Наприклад: ЗП таргетолог"
                    className={`w-full px-4 py-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs ${inputClass}`}
                  />
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
                className={`px-5 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all ${btnNextClass}`}
              >
                Далі
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Збереження...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Підтвердити
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
