"use client";

import React from "react";
import { useTheme } from "../../ThemeProvider";
import { formatDualCurrency, formatDualProfit } from "@/app/admin/utils";

interface LeaderboardTabProps {
  producersLeaderboard: any[];
}

export const LeaderboardTab = React.memo(function LeaderboardTab({ producersLeaderboard }: LeaderboardTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
        <div>
          <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
            🏆 Таблиця лідерів операційних продюсерів
          </h2>
        </div>

        <div className={`overflow-x-auto border ${borderClass} rounded-xl`}>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                <th className="p-4">Продюсер</th>
                <th className="p-4">Закріплені проекти</th>
                <th className="p-4 text-center">Витрати ($)</th>
                <th className="p-4 text-center">Кількість лідів</th>
                <th className="p-4 text-center">CPL ($)</th>
                <th className="p-4 text-center">Виручка ($)</th>
                <th className="p-4 text-center">Прибуток ($)</th>
                <th className="p-4 text-center">ROI (%)</th>
                <th className="p-4 text-right">Нагорода</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
              {producersLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-white/30 italic">Продюсери не знайдені в системі</td>
                </tr>
              ) : (
                producersLeaderboard.map((prod: any) => (
                  <tr key={prod.producerId} className={`${tableRowClass} transition-all`}>
                    <td className="p-4 font-black text-sm">
                      {prod.name || prod.email}
                    </td>
                    <td className="p-4 font-semibold">
                      {prod.projectNames}
                    </td>
                    <td className="p-4 text-center font-bold text-red-400">
                      ${Number(prod.spend).toFixed(2)}
                    </td>
                    <td className="p-4 text-center font-extrabold">
                      {prod.leadsCount}
                    </td>
                    <td className="p-4 text-center font-bold text-neutral-400">
                      ${Number(prod.cpl).toFixed(2)}
                    </td>
                    <td className="p-4 text-center font-bold text-emerald-400">
                      {formatDualCurrency(prod.usd_revenue, prod.uah_revenue, prod.eur_revenue)}
                    </td>
                    <td className="p-4 text-center font-black">
                      {formatDualProfit(prod.usd_revenue, prod.spend, prod.uah_revenue, prod.eur_revenue)}
                    </td>
                    <td className="p-4 text-center font-black">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] ${prod.roi >= 150
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : prod.roi >= 100
                          ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                        {Number(prod.roi).toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {prod.isLeaderOfMonth ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-bounce">
                          🏆 ОП Місяця
                        </span>
                      ) : (
                        <span className={`${textMutedClass}`}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default LeaderboardTab;
