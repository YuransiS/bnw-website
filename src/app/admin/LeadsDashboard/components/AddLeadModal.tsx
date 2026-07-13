"use client";

import React, { useState } from "react";
import { XCircle, Briefcase } from "lucide-react";

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: { id: string; name: string } | null;
  onCreateLead: (payload: any) => Promise<any>;
  pipelineColumns: Array<{ key: string; label: string; dotColor: string }>;
  inputClass: string;
  selectClass: string;
  optionClass: string;
}

export default function AddLeadModal({
  isOpen,
  onClose,
  activeProject,
  onCreateLead,
  pipelineColumns,
  inputClass,
  selectClass,
  optionClass
}: AddLeadModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [telegram, setTelegram] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState("Новий лід");
  const [utmSource, setUtmSource] = useState("crm");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !activeProject) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert("Будь ласка, заповніть ім'я та телефон");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onCreateLead({
        name,
        phone,
        email: email || undefined,
        telegram: telegram || undefined,
        amount: Number(amount) || 0.0,
        status,
        utm_source: utmSource
      });

      if (res && res.error) {
        throw new Error(res.error);
      }

      // Reset form on success
      setName("");
      setPhone("");
      setEmail("");
      setTelegram("");
      setAmount("0");
      setStatus("Новий лід");
      setUtmSource("crm");
      onClose();
    } catch (err: any) {
      alert("Помилка створення ліда: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#0C0C0F] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
        >
          <XCircle className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-500" />
            Додати нову картку ліда
          </h3>
          <p className="text-white/40 text-xs mt-1">Створення картки клієнта вручну для проекту: {activeProject.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              ПІБ Клієнта *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Олексій Коваленко"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
              Телефон *
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380951234567"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Telegram (@username)
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@olexiy"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="olexiy@gmail.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Сума оплат
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className={`w-full px-4 py-3 rounded-xl focus:outline-none text-xs font-semibold ${inputClass}`}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1.5">
                Початковий статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full pl-3 pr-8 py-3.5 rounded-xl focus:outline-none text-xs font-bold ${selectClass}`}
              >
                {pipelineColumns.map((col) => (
                  <option key={col.key} value={col.key} className={optionClass}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black transition-all hover:scale-[1.01] active:scale-95 duration-200 mt-4 text-xs disabled:opacity-50"
          >
            {isSubmitting ? "Збереження..." : "Додати ліда до бази"}
          </button>
        </form>
      </div>
    </div>
  );
}
