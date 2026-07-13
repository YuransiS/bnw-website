"use client";

import React, { useState } from "react";
import { XCircle, AlertCircle } from "lucide-react";

interface UnresolvedOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  unresolvedOrders: any[];
  setUnresolvedOrders: React.Dispatch<React.SetStateAction<any[]>>;
  onUpdateCurrency: (
    orderId: string,
    currency: "usd" | "uah" | "eur",
    bulkParam?: { landingName: string; amount: number }
  ) => Promise<any>;
  modalBgClass: string;
  formatLocaleNumber: (val: number) => string;
  onRefresh: () => void;
}

export default function UnresolvedOrdersModal({
  isOpen,
  onClose,
  unresolvedOrders,
  setUnresolvedOrders,
  onUpdateCurrency,
  modalBgClass,
  formatLocaleNumber,
  onRefresh
}: UnresolvedOrdersModalProps) {
  const [updatingCurrencyId, setUpdatingCurrencyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCurrencySelect = async (order: any, currencyCode: "usd" | "uah" | "eur") => {
    setUpdatingCurrencyId(order.id);
    try {
      let updateAll = false;
      if (order.landingName) {
        const currencySymbol = currencyCode === "uah" ? "₴ UAH" : currencyCode === "usd" ? "$ USD" : "€ EUR";
        updateAll = window.confirm(
          `Бажаєте встановити валюту ${currencySymbol} для всіх замовлень з лендингу "${
            order.landingName
          }" з ціною ${formatLocaleNumber(order.amount)}?`
        );
      }

      const bulkParam = updateAll ? { landingName: order.landingName, amount: order.amount } : undefined;
      const res = await onUpdateCurrency(order.id, currencyCode, bulkParam);
      if (res && res.error) {
        throw new Error(res.error);
      }

      if (updateAll) {
        setUnresolvedOrders((prev) =>
          prev.filter((o) => !(o.landingName === order.landingName && o.amount === order.amount))
        );
      } else {
        setUnresolvedOrders((prev) => prev.filter((o) => o.id !== order.id));
      }
      
      onRefresh();
    } catch (err: any) {
      alert("Помилка оновлення валюти: " + err.message);
    } finally {
      setUpdatingCurrencyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`relative w-full max-w-2xl max-h-[80vh] ${modalBgClass} rounded-3xl p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-bottom-4 duration-300`}
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-2 rounded-xl text-crm-muted hover:text-crm-text hover:bg-crm-card/50 cursor-pointer transition-all"
        >
          <XCircle className="w-5 h-5" />
        </button>

        <div>
          <h3 className="text-lg font-black uppercase tracking-tight text-crm-text flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
            Транзакції без вказаної валюти
          </h3>
          <p className="text-crm-muted text-xs mt-1">
            Будь ласка, оберіть валюту для кожної транзакції, щоб вони правильно відображалися в аналітиці.
          </p>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
          {unresolvedOrders.length === 0 ? (
            <p className="text-center text-xs text-crm-muted/60 py-8 italic">Усі транзакції мають вказану валюту!</p>
          ) : (
            unresolvedOrders.map((order: any) => (
              <div
                key={order.id}
                className="p-4 rounded-xl border border-crm-border bg-white/[0.01] hover:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-crm-text">{order.customerName || "Невідомий клієнт"}</p>
                  <p className="text-[10px] text-crm-muted">
                    Проект: {order.projectName} | Дата: {new Date(order.created_at).toLocaleString("uk-UA")}
                  </p>
                  {order.customerPhone && <p className="text-[10px] text-crm-muted">Тел: {order.customerPhone}</p>}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                  <span className="text-sm font-black text-crm-text pr-2">{formatLocaleNumber(order.amount)}</span>
                  <div className="flex gap-1.5 shrink-0">
                    {[
                      { code: "uah", symbol: "₴ UAH" },
                      { code: "usd", symbol: "$ USD" },
                      { code: "eur", symbol: "€ EUR" }
                    ].map((curr) => (
                      <button
                        key={curr.code}
                        disabled={updatingCurrencyId === order.id}
                        onClick={() => handleCurrencySelect(order, curr.code as any)}
                        className="px-2.5 py-1.5 rounded-lg bg-crm-input-bg hover:bg-emerald-500 hover:text-black disabled:opacity-40 text-[10px] font-extrabold text-crm-text border border-crm-border hover:border-emerald-550 transition-all cursor-pointer"
                      >
                        {curr.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
