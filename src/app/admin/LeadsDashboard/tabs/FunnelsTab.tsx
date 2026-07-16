"use client";

import React, { useState, useEffect } from "react";
import { getFunnelsAction, createFunnelAction } from "../../actions";
import { Plus, Target, Calendar, Link as LinkIcon, RefreshCw, BarChart2, Layers, AlertCircle } from "lucide-react";

interface FunnelsTabProps {
  projectId: string;
  campaignsList: any[]; // Existing UTM campaigns
  leadsList: any[];     // Existing leads
  isLight: boolean;
}

interface Funnel {
  id: string;
  name: string;
  start_date: string;
  campaign_ids: string[];
  landing_slugs: string[];
  description: string;
  created_at: string;
}

export default function FunnelsTab({ projectId, campaignsList, leadsList, isLight }: FunnelsTabProps) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [campaignInput, setCampaignInput] = useState("");
  const [landingInput, setLandingInput] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Funnels
  const loadFunnels = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFunnelsAction(projectId);
      if ("error" in res) {
        setError(res.error);
      } else {
        setFunnels(res as Funnel[]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load funnels");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFunnels();
  }, [projectId]);

  // Handle Funnel Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate) {
      alert("Будь ласка, вкажіть назву та дату старту");
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignIds = campaignInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      
      const landingSlugs = landingInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await createFunnelAction(projectId, name, startDate, campaignIds, landingSlugs, description);
      if (res.error) {
        alert("Помилка створення воронки: " + res.error);
      } else {
        setShowCreateForm(false);
        setName("");
        setStartDate("");
        setCampaignInput("");
        setLandingInput("");
        setDescription("");
        loadFunnels();
      }
    } catch (err: any) {
      alert("Невідома помилка: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funnel Analytics Calculator
  const getFunnelStats = (funnel: Funnel) => {
    const startDateTime = new Date(funnel.start_date).getTime();
    
    // Filter leads created after start date, and matching campaign or landing slugs
    const matchedLeads = leadsList.filter((lead: any) => {
      const leadTime = new Date(lead.created_at).getTime();
      if (leadTime < startDateTime) return false;

      const leadCampaign = String(lead.utm_campaign || "").trim().toLowerCase();
      const leadLanding = String(lead.landing || lead.metadata?.target_sheet || "").trim().toLowerCase();

      const campaignMatch = funnel.campaign_ids.some((id) => leadCampaign.includes(id.toLowerCase()));
      const landingMatch = funnel.landing_slugs.some((slug) => leadLanding.includes(slug.toLowerCase()));

      return campaignMatch || landingMatch;
    });

    // Sum revenue from these leads (orders)
    let revenue = 0;
    let salesCount = 0;
    matchedLeads.forEach((lead: any) => {
      if (lead.status === "Купив курс" || lead.status === "Купив(-ла) Трипвайер") {
        revenue += Number(lead.amount || 0);
        salesCount++;
      }
    });

    // Sum Ad Spends from matched campaigns after funnel start date
    let spend = 0;
    campaignsList.forEach((c: any) => {
      const isMatched = funnel.campaign_ids.some((id) => String(c.campaign_name || "").toLowerCase().includes(id.toLowerCase()));
      if (isMatched) {
        spend += Number(c.spend || 0);
      }
    });

    const leadsCount = matchedLeads.length;
    const profit = revenue - spend;
    const roi = spend > 0 ? (profit / spend) * 100 : 0;
    const cr = leadsCount > 0 ? (salesCount / leadsCount) * 100 : 0;

    return {
      leadsCount,
      salesCount,
      revenue,
      spend,
      profit,
      roi,
      cr
    };
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-450" />
            Управління воронками
          </h2>
          <p className={`text-xs mt-1 ${isLight ? "text-neutral-500" : "text-white/40"}`}>
            Створення маркетингових воронок для відстеження сквозної окупності
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadFunnels}
            className={`p-2.5 rounded-xl border cursor-pointer hover:scale-105 active:scale-95 duration-150 transition-all ${
              isLight ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-200" : "bg-white/5 hover:bg-white/10 text-white border-white/5"
            }`}
            title="Оновити дані"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-emerald-500 text-black hover:bg-emerald-400 font-extrabold rounded-xl flex items-center gap-2 shadow-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Створити воронку
          </button>
        </div>
      </div>

      {/* Creation Form Panel */}
      {showCreateForm && (
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4 max-w-2xl">
          <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Параметри нової воронки</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/50">Назва воронки *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Марафон Липень 2026"
                className="w-full pl-3 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/50">Дата старту *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-3 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs text-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Рекламні кампанії (через кому)</label>
            <input
              type="text"
              value={campaignInput}
              onChange={(e) => setCampaignInput(e.target.value)}
              placeholder="utm_campaign_1, meta_ads_july, EUR"
              className="w-full pl-3 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs text-white"
            />
            <p className="text-[9px] text-white/30">Будуть відібрані ліди та витрати, що містять ці фрагменти в назвах кампаній</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Лендінги / Сторінки (через кому)</label>
            <input
              type="text"
              value={landingInput}
              onChange={(e) => setLandingInput(e.target.value)}
              placeholder="rozbir, marathon_landing, page_vsl"
              className="w-full pl-3 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs text-white"
            />
            <p className="text-[9px] text-white/30">Будуть відібрані ліди з реєстрацією на цих сторінках</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/50">Опис / Нотатки</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Маркетинговий опис цілей та очікуваних результатів..."
              rows={3}
              className="w-full pl-3 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Створення..." : "Зберегти воронку"}
            </button>
          </div>
        </form>
      )}

      {/* Funnels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {funnels.map((funnel) => {
          const stats = getFunnelStats(funnel);
          return (
            <div key={funnel.id} className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-black text-base text-white">{funnel.name}</h4>
                  <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Старт: {new Date(funnel.start_date).toLocaleDateString("uk-UA")}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  stats.roi >= 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"
                }`}>
                  ROI: {Math.round(stats.roi)}%
                </span>
              </div>

              {funnel.description && (
                <p className="text-xs text-white/60 line-clamp-2 italic bg-white/[0.01] p-2 rounded border border-white/5">
                  {funnel.description}
                </p>
              )}

              {/* Stats Panel */}
              <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
                <div className="bg-white/5 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Ліди</span>
                  <span className="text-sm font-black text-white">{stats.leadsCount}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Продажі (CR)</span>
                  <span className="text-sm font-black text-emerald-400">{stats.salesCount} ({stats.cr.toFixed(1)}%)</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Оборот</span>
                  <span className="text-sm font-black text-white">{stats.revenue.toLocaleString("uk-UA")} ₴</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Витрати</span>
                  <span className="text-sm font-black text-red-400">{stats.spend.toLocaleString("uk-UA")} ₴</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Прибуток</span>
                  <span className="text-sm font-black text-emerald-500">{stats.profit.toLocaleString("uk-UA")} ₴</span>
                </div>
              </div>

              {/* Metadata details */}
              <div className="text-[10px] text-white/30 space-y-1 bg-white/[0.005] p-2 rounded-lg border border-white/5">
                <p className="truncate"><b className="text-white/40">Кампанії:</b> {funnel.campaign_ids.join(", ") || "Всі"}</p>
                <p className="truncate"><b className="text-white/40">Лендінги:</b> {funnel.landing_slugs.join(", ") || "Всі"}</p>
              </div>
            </div>
          );
        })}

        {funnels.length === 0 && !loading && (
          <div className="col-span-2 text-center py-10 bg-neutral-900/50 border border-dashed border-white/5 rounded-2xl">
            <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs text-white/30 italic">Воронок для цього проекту поки що не створено</p>
          </div>
        )}
      </div>
    </div>
  );
}
