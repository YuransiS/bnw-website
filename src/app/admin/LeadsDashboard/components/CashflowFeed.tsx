"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  RefreshCw, 
  Megaphone, 
  Users, 
  Layers, 
  CreditCard, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { deleteTransactionAction } from "../../(dashboard)/project/financeActions";

interface Transaction {
  id: string;
  project_id: string;
  funnel_id: string | null;
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  account_id: string;
  currency: string;
  amount: number;
  exchange_rate: number;
  amount_usd: number;
  created_at: string;
}

interface CashflowFeedProps {
  projectId: string;
  transactions: Transaction[];
  hasMore: boolean;
  onLoadMore: () => void;
  onDeleteSuccess: () => void;
  accounts: { id: string; name: string }[];
  isLight: boolean;
  userRole: string;
}

export default function CashflowFeed({
  projectId,
  transactions,
  hasMore,
  onLoadMore,
  onDeleteSuccess,
  accounts,
  isLight,
  userRole
}: CashflowFeedProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("трафік") || cat.includes("реклам") || cat.includes("traffic")) {
      return <Megaphone className="w-4 h-4 text-indigo-400" />;
    }
    if (cat.includes("команд") || cat.includes("підряд") || cat.includes("зп") || cat.includes("salary")) {
      return <Users className="w-4 h-4 text-emerald-400" />;
    }
    if (cat.includes("сервіс") || cat.includes("sendpulse")) {
      return <Layers className="w-4 h-4 text-amber-400" />;
    }
    if (cat.includes("комісі") || cat.includes("эквайр")) {
      return <DollarSign className="w-4 h-4 text-rose-400" />;
    }
    return <CreditCard className="w-4 h-4 text-sky-400" />;
  };

  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? acc.name : "Невідомий рахунок";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ви впевнені, що хочете видалити цю транзакцію?")) return;
    setDeletingId(id);
    try {
      const res = await deleteTransactionAction(projectId, id);
      if (res.success) {
        onDeleteSuccess();
      } else {
        alert(res.error || "Помилка видалення");
      }
    } catch (e) {
      alert("Не вдалося виконати видалення");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadMoreClick = async () => {
    setIsLoadingMore(true);
    await onLoadMore();
    setIsLoadingMore(false);
  };

  const isSupervisor = ["admin", "superman", "founder", "developer", "producer"].includes(userRole);

  const cardClass = isLight ? "bg-white border border-neutral-200 text-neutral-900 shadow-sm" : "bg-[#0C0C0F] border border-white/5 text-white";
  const textMutedClass = isLight ? "text-neutral-500" : "text-white/40";
  const borderClass = isLight ? "border-neutral-200" : "border-white/5";

  return (
    <div className="space-y-4 font-sans">
      
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold tracking-wider uppercase text-neutral-300">Журнал Cashflow (Останні операції)</h4>
      </div>

      {transactions.length === 0 ? (
        <div className={`p-8 rounded-2xl border text-center ${cardClass} flex flex-col items-center justify-center gap-3`}>
          <AlertCircle className="w-8 h-8 text-neutral-500" />
          <div>
            <h5 className="text-sm font-bold text-neutral-300">Операцій не знайдено</h5>
            <p className={`text-xs mt-1 ${textMutedClass}`}>Спробуйте змінити дати фільтру або додайте першу операцію.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div 
              key={tx.id} 
              className={`p-4 rounded-2xl border ${cardClass} flex items-center justify-between transition-all hover:border-white/10`}
            >
              <div className="flex items-center gap-4">
                {/* Category Icon Badge */}
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                  {getCategoryIcon(tx.category)}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-200">{tx.category}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-0.5 ${
                      tx.type === "income" 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {tx.type === "income" ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      {tx.type === "income" ? "Прихід" : "Витрата"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                    <span className="font-semibold">{getAccountName(tx.account_id)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      {tx.date}
                    </span>
                    {tx.description && (
                      <>
                        <span>•</span>
                        <span className="italic text-neutral-500">{tx.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount and delete action */}
              <div className="flex items-center gap-4 text-right">
                <div className="space-y-0.5">
                  <span className={`text-sm font-extrabold block ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {tx.type === "income" ? "+" : "-"}{tx.currency === "UAH" ? `${tx.amount} ₴` : `$${tx.amount}`}
                  </span>
                  {tx.currency !== "USD" && (
                    <span className={`text-[9px] block ${textMutedClass}`}>
                      ≈ ${tx.amount_usd.toFixed(2)}
                    </span>
                  )}
                </div>

                {isSupervisor && (
                  <button
                    disabled={deletingId === tx.id}
                    onClick={() => handleDelete(tx.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === tx.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                disabled={isLoadingMore}
                onClick={handleLoadMoreClick}
                className="px-6 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-xs font-semibold tracking-wider text-neutral-300 transition-all cursor-pointer inline-flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Завантаження...
                  </>
                ) : (
                  "Показати ще"
                )}
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
