"use client";

import React from "react";
import { FolderOpen, TrendingUp, ExternalLink, Globe, DollarSign, Sparkles } from "lucide-react";
import { useTheme } from "../../ThemeProvider";
import { formatLocaleNumber, formatDualCurrency, formatDualProfit } from "@/app/admin/utils";

// Project landing links registry
const PROJECT_LANDINGS: Record<string, Array<{ label: string; url: string; badgeColor: string; type: "paid" | "free" }>> = {
  bw_main: [
    { label: "Основний", url: "https://bnw-prod.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" }
  ],
  victoria: [
    { label: "Майстер-клас", url: "https://victoria-mc.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "VSL", url: "https://victoria-mc.vercel.app/free-lection/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://victoria-mc.vercel.app/free-lection/vsl-form/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "rozbir", url: "https://victoria-mc.vercel.app/rozbir", badgeColor: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20", type: "paid" },
    { label: "Броні", url: "https://victoria-mc.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "Практикум", url: "https://victoria-mc.vercel.app/practicum", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  sofia: [
    { label: "Основний", url: "https://sofifinsight.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Інтенсив", url: "https://sofifinsight.vercel.app/intensive", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" },
    { label: "Вебінар", url: "https://sofifinsight.vercel.app/web", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "free" },
    { label: "Броні", url: "https://sofifinsight.vercel.app/price", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "paid" },
    { label: "VSL", url: "https://sofifinsight.vercel.app/sofia-invest", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "free" },
    { label: "VSL-форма", url: "https://sofifinsight.vercel.app/sofia-invest/lesson", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "Міні-курс", url: "https://sofifinsight.vercel.app/minicourse", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "paid" }
  ],
  valeria: [
    { label: "Основний", url: "https://pix-ai-ua.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "free" },
    { label: "Офіс", url: "https://pix-ai-ua.vercel.app/office", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "paid" },
    { label: "Мами", url: "https://pix-ai-ua.vercel.app/moms", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Б'юті", url: "https://pix-ai-ua.vercel.app/beauty", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "paid" },
    { label: "Для тінейджерів", url: "https://pix-ai-ua.vercel.app/teen", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Для батьків", url: "https://pix-ai-ua.vercel.app/parents", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ],
  clean_klinom: [
    { label: "Основний", url: "https://clean-klinom.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" }
  ],
  svitlana: [
    { label: "Основний", url: "https://svitlanatape.vercel.app/", badgeColor: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", type: "free" },
    { label: "Антиботокс", url: "https://antibotox.vercel.app/", badgeColor: "bg-blue-500/10 text-blue-400 border border-blue-500/20", type: "paid" },
    { label: "Заломи сну", url: "https://zalomu-sny.vercel.app/", badgeColor: "bg-purple-500/10 text-purple-400 border border-purple-500/20", type: "paid" },
    { label: "Тейпування тіла", url: "https://svitlanatape.vercel.app/body-taping", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" },
    { label: "Типи старіння", url: "https://tipstarinnyaa.vercel.app/", badgeColor: "bg-pink-500/10 text-pink-400 border border-pink-500/20", type: "free" },
    { label: "3 веби", url: "https://svitlana3web.vercel.app/", badgeColor: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20", type: "free" },
    { label: "Світлана тейп", url: "https://svetlanatape.vercel.app/", badgeColor: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20", type: "free" },
    { label: "Антиботокс клуб", url: "https://antibotox-club.vercel.app/", badgeColor: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", type: "paid" },
    { label: "Face Detox", url: "https://facedetox.vercel.app/", badgeColor: "bg-teal-500/10 text-teal-400 border border-teal-500/20", type: "free" }
  ],
  vova_win: [
    { label: "Марафон", url: "https://vova-win.club/marathon", badgeColor: "bg-orange-500/10 text-orange-400 border border-orange-500/20", type: "paid" }
  ]
};

interface HubTabProps {
  summaryData: any[];
  campaignsData: any[];
}

export const HubTab = React.memo(function HubTab({ summaryData, campaignsData }: HubTabProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const cardClass = "bg-crm-card border border-crm-border text-crm-text shadow-sm";
  const textMutedClass = "text-crm-muted";
  const borderClass = "border-crm-border";
  const tableHeaderClass = "bg-white/[0.02] text-crm-muted border-crm-border";
  const tableRowClass = "hover:bg-white/[0.01] border-crm-border text-crm-text/80";

  const totalSpend = summaryData.reduce((sum: number, p: any) => sum + Number(p.spend || 0), 0);
  const totalUsdRevenue = summaryData.reduce((sum: number, p: any) => sum + Number(p.usd_revenue || 0), 0);
  const totalUahRevenue = summaryData.reduce((sum: number, p: any) => sum + Number(p.uah_revenue || 0), 0);
  const totalEurRevenue = summaryData.reduce((sum: number, p: any) => sum + Number(p.eur_revenue || 0), 0);

  const totalBlendedRevenue = totalUsdRevenue + (totalUahRevenue / 41.0) + (totalEurRevenue * 1.08);
  const blendedProfit = totalBlendedRevenue - totalSpend;
  const blendedRoi = totalSpend > 0 ? (totalBlendedRevenue / totalSpend) * 100 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Global quick stats cards */}
        {[
          {
            title: "Сумарні Витрати ($)",
            val: `$${totalSpend.toFixed(2)}`,
            desc: "Всього інвестовано в рекламу",
            color: "text-red-400"
          },
          {
            title: "Сумарна Виручка",
            val: formatDualCurrency(totalUsdRevenue, totalUahRevenue, totalEurRevenue),
            desc: "Всього отримано оплат",
            color: "text-emerald-400 font-extrabold"
          },
          {
            title: "Чистий Прибуток",
            val: formatDualProfit(totalUsdRevenue, totalSpend, totalUahRevenue, totalEurRevenue),
            desc: "Маржинальність після реклами",
            color: "text-purple-400 font-extrabold"
          },
          {
            title: "Сумарний ROI (%)",
            val: `${blendedRoi.toFixed(1)}%`,
            desc: "Змішаний ROI холдингу",
            color: "text-yellow-400"
          }
        ].map((card) => (
          <div
            key={card.title}
            className={`p-6 rounded-2xl relative overflow-hidden shadow-xl ${cardClass}`}
          >
            <p className={`text-[10px] ${textMutedClass} font-black uppercase tracking-widest`}>{card.title}</p>
            <p className={`text-2xl font-black mt-3 ${card.color}`}>{card.val}</p>
            <p className={`text-[11px] ${textMutedClass} mt-1 font-semibold`}>{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Cross-Project consolidated grid */}
      <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
        <div className="flex justify-between items-center">
          <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
            <FolderOpen className="w-5 h-5 text-emerald-500" />
            Порівняльна таблиця експертів
          </h2>
        </div>

        <div className={`overflow-x-auto border ${borderClass} rounded-xl`}>
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className={`${tableHeaderClass} uppercase tracking-widest font-black border-b`}>
                <th className="p-4">Назва Проекту</th>
                <th className="p-4 text-center">Витрати ($)</th>
                <th className="p-4 text-center">Кількість Заявок</th>
                <th className="p-4 text-center">Вартість ліда (CPL)</th>
                <th className="p-4 text-center">Виручка</th>
                <th className="p-4 text-center">Прибуток</th>
                <th className="p-4 text-center">Окупність (ROI)</th>
                <th className="p-4">Поточні лендінги</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
              {summaryData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-white/30 italic">Проекти не зареєстровані в CRM</td>
                </tr>
              ) : (
                summaryData.map((proj: any) => {
                  const usdRev = Number(proj.usd_revenue || 0);
                  const uahRev = Number(proj.uah_revenue || 0);
                  const eurRev = Number(proj.eur_revenue || 0);
                  const blendedRev = usdRev + (uahRev / 41.0) + (eurRev * 1.08);
                  const spend = Number(proj.spend || 0);
                  const projRoi = spend > 0 ? (blendedRev / spend) * 100 : 0;

                  return (
                    <tr key={proj.id || proj.project_id} className={`${tableRowClass} transition-all`}>
                      <td className="p-4 font-black text-sm">
                        {proj.name || proj.project_name}
                        <span className={`block text-[10px] ${textMutedClass} font-semibold uppercase`}>{proj.slug || proj.project_slug}</span>
                      </td>
                      <td className="p-4 text-center font-bold text-red-400">${spend.toFixed(2)}</td>
                      <td className="p-4 text-center font-extrabold">{proj.leads_count}</td>
                      <td className="p-4 text-center font-bold text-neutral-400">${Number(proj.cpl).toFixed(2)}</td>
                      <td className="p-4 text-center font-bold text-emerald-400">{formatDualCurrency(usdRev, uahRev, eurRev)}</td>
                      <td className="p-4 text-center font-black">
                        {formatDualProfit(usdRev, spend, uahRev, eurRev)}
                      </td>
                      <td className="p-4 text-center font-black">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] ${projRoi >= 150
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : projRoi >= 100
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                          {projRoi.toFixed(0)}%
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                          {PROJECT_LANDINGS[proj.slug || proj.project_slug] ? (
                            PROJECT_LANDINGS[proj.slug || proj.project_slug].map((land) => (
                              <a
                                key={land.url}
                                href={land.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase border px-2.5 py-1 rounded-lg transition-all hover:scale-105 active:scale-95 duration-150 cursor-pointer ${land.badgeColor}`}
                              >
                                {land.label}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))
                          ) : (
                            <span className="text-[10px] text-white/20 italic">Не вказано</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign ROI Attribution summary */}
      <div className={`${cardClass} p-6 rounded-2xl shadow-xl space-y-6`}>
        <h2 className={`text-lg font-black uppercase tracking-tight ${isLight ? "text-neutral-900" : "text-white"} flex items-center gap-2`}>
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          Маркетинговий аналіз рекламних кампаній холдингу
        </h2>

        <div className={`overflow-x-auto border ${borderClass} rounded-xl`}>
          <table className="w-full border-collapse text-left text-[11px]">
            <thead>
              <tr className={`${tableHeaderClass} uppercase tracking-wider font-black border-b`}>
                <th className="p-4">Кампанія</th>
                <th className="p-4 text-center">Покази / Кліки / CTR</th>
                <th className="p-4 text-center">Витрати / CPM / CPC</th>
                <th className="p-4 text-center">Заявки / CR / CPL</th>
                <th className="p-4 text-center">Продажі / CR / Середній чек</th>
                <th className="p-4 text-center">Виручка / Прибуток</th>
                <th className="p-4 text-center">ROAS / ROI</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderClass} ${isLight ? "text-neutral-700" : "text-white/80"}`}>
              {campaignsData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-white/30 italic">Відсутні дані про рекламні кампанії</td>
                </tr>
              ) : (
                campaignsData.map((c: any, idx: number) => {
                  const usdRev = Number(c.usd_revenue || 0);
                  const uahRev = Number(c.uah_revenue || 0);
                  const eurRev = Number(c.eur_revenue || 0);
                  const revenue = usdRev + (uahRev / 41.0) + (eurRev * 1.08);
                  const spend = Number(c.spend || 0);
                  const clicks = Number(c.clicks || 0);
                  const impressions = Number(c.impressions || 0);
                  const leads = Number(c.leads_count || 0);
                  const sales = Number(c.sales || 0);

                  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
                  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
                  const cpc = clicks > 0 ? spend / clicks : 0;
                  const crWebsite = clicks > 0 ? (leads / clicks) * 100 : 0;
                  const cpl = leads > 0 ? spend / leads : 0;
                  const crSale = leads > 0 ? (sales / leads) * 100 : 0;
                  const aov = sales > 0 ? revenue / sales : 0;
                  const roas = spend > 0 ? revenue / spend : 0;
                  const roi = spend > 0 ? (revenue / spend) * 100 : 0;
                  const profit = revenue - spend;

                  return (
                    <tr key={idx} className={`${tableRowClass} transition-all`}>
                      <td className="p-4">
                        <div className="font-extrabold max-w-xs truncate text-xs">{c.campaign_name}</div>
                        <div className="text-[10px] text-crm-muted font-semibold mt-0.5">{c.project_name} | {c.campaign_id}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-bold">{impressions.toLocaleString()}</div>
                        <div className="text-[10px] text-crm-muted mt-0.5">{clicks.toLocaleString()} кліків</div>
                        <div className="text-[10px] text-blue-500 font-bold mt-0.5">CTR: {ctr.toFixed(2)}%</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-bold text-red-400">${spend.toFixed(2)}</div>
                        <div className="text-[10px] text-crm-muted mt-0.5">CPM: ${cpm.toFixed(2)}</div>
                        <div className="text-[10px] text-crm-muted mt-0.5">CPC: ${cpc.toFixed(2)}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-bold">{leads.toLocaleString()}</div>
                        <div className="text-[10px] text-blue-500 font-bold mt-0.5">CR: {crWebsite.toFixed(1)}%</div>
                        <div className="text-[10px] text-crm-muted mt-0.5">CPL: ${cpl.toFixed(2)}</div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-bold">{sales.toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-500 font-bold mt-0.5">CR: {crSale.toFixed(1)}%</div>
                        <div className="text-[10px] text-crm-muted mt-0.5">AOV: ${aov.toFixed(1)}</div>
                      </td>
                      <td className="p-4 text-center font-bold">
                        <div className="text-emerald-500">${revenue.toFixed(2)}</div>
                        <div className={`text-[10px] mt-0.5 ${profit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                          {profit >= 0 ? "+" : "-"}${Math.abs(profit).toFixed(2)}
                        </div>
                      </td>
                      <td className="p-4 text-center font-black">
                        <div className="text-indigo-400">ROAS: {roas.toFixed(2)}</div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] mt-1 ${
                          roi >= 150 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          roi >= 100 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}>
                          {roi.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

export default HubTab;
