"use client";

import React, { useState, useEffect } from "react";
import { getFunnelsAction, createFunnelAction, getDiscoveredPagesAction, syncProjectPagesAction } from "../../actions";
import { Plus, Target, Calendar, Link as LinkIcon, RefreshCw, BarChart2, Layers, AlertCircle, Search, Sparkles } from "lucide-react";

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
  const [funnelTransactions, setFunnelTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discovered Pages & Multiselect State
  const [discoveredPages, setDiscoveredPages] = useState<any[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [searchPageQuery, setSearchPageQuery] = useState("");
  const [manualPageInput, setManualPageInput] = useState("");

  // Campaigns Multiselect State
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [searchCampaignQuery, setSearchCampaignQuery] = useState("");
  const [manualCampaignInput, setManualCampaignInput] = useState("");
  
  // Creation Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [funnelType, setFunnelType] = useState("Вебінар");
  const [selectedStages, setSelectedStages] = useState({
    bot: true,
    registration: true,
    webinar: true,
    quiz: false,
    payment: true
  });
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [campaignInput, setCampaignInput] = useState("");
  const [landingInput, setLandingInput] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedFunnelId, setExpandedFunnelId] = useState<string | null>(null);

  // Load Funnels and Pages
  const loadFunnels = async () => {
    setLoading(true);
    setError(null);
    try {
      const [funnelRes, _syncRes] = await Promise.all([
        getFunnelsAction(projectId),
        syncProjectPagesAction(projectId).catch((err) => {
          console.warn("Domain pages sync failed, falling back to local DB:", err);
          return { error: err.message };
        })
      ]);

      if (funnelRes && "error" in funnelRes) {
        setError(funnelRes.error as string);
      } else {
        const data = funnelRes as { funnels: Funnel[]; transactions: any[] };
        setFunnels(data.funnels || []);
        setFunnelTransactions(data.transactions || []);
      }

      const pagesRes = await getDiscoveredPagesAction(projectId);
      if (pagesRes && !("error" in pagesRes)) {
        setDiscoveredPages(pagesRes.pages || []);
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
      const manualCampaigns = manualCampaignInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      
      const campaignIds = Array.from(new Set([...selectedCampaigns, ...manualCampaigns]));
      
      const manualSlugs = manualPageInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      
      const landingSlugs = Array.from(new Set([...selectedPages, ...manualSlugs]));

      const metaString = `[Type: ${funnelType}][Stages: ${Object.entries(selectedStages).filter(([_, v]) => v).map(([k]) => k).join(",")}]`;
      const finalDesc = `${metaString} ${description.trim()}`.trim();

      const res = await createFunnelAction(projectId, name, startDate, campaignIds, landingSlugs, finalDesc);
      if (res.error) {
        alert("Помилка створення воронки: " + res.error);
      } else {
        setShowCreateForm(false);
        setWizardStep(1);
        setFunnelType("Вебінар");
        setSelectedStages({ bot: true, registration: true, webinar: true, quiz: false, payment: true });
        setName("");
        setStartDate("");
        setCampaignInput("");
        setLandingInput("");
        setSelectedPages([]);
        setManualPageInput("");
        setSearchPageQuery("");
        setSelectedCampaigns([]);
        setManualCampaignInput("");
        setSearchCampaignQuery("");
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

    // Sum manual transactions bound to this funnel
    let manualSpendUAH = 0;
    let manualIncomeUAH = 0;

    funnelTransactions.forEach((tx: any) => {
      if (tx.funnel_id === funnel.id) {
        const amt = Number(tx.amount || 0);
        const isUAH = tx.currency === "UAH";
        const amtUAH = isUAH ? amt : amt * 44; // Conversion rate to UAH
        if (tx.type === "expense") {
          manualSpendUAH += amtUAH;
        } else {
          manualIncomeUAH += amtUAH;
        }
      }
    });

    revenue += manualIncomeUAH;
    spend += manualSpendUAH;

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
      cr,
      manualSpend: manualSpendUAH,
      manualIncome: manualIncomeUAH
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
        <form onSubmit={handleSubmit} className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4 max-w-2xl text-xs text-white">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <h3 className="font-bold text-sm uppercase tracking-wider text-emerald-400">Створення воронки (Крок {wizardStep} з 4)</h3>
            <span className="text-[10px] text-white/40">Конструктор B&W UX</span>
          </div>

          {/* STEP 1: Назва та тип */}
          {wizardStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/50">Назва воронки *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Марафон Липень 2026"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-white/50 block">Тип воронки</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {["Вебінар", "Автовеб", "VSL", "Діагностика", "Трипваєр"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFunnelType(t)}
                      className={`py-2 px-1 rounded-lg border font-bold text-center transition-all cursor-pointer ${
                        funnelType === t
                          ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                          : "bg-white/5 border-white/5 text-white/50 hover:border-white/10"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  disabled={!name.trim()}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Далі
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Дата старту та Лендінги */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/50">Дата старту *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-white/50">Лендінги / Активні Сторінки сайту</label>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Автосинхронізація
                  </span>
                </div>
                
                {/* Search input for discovered pages */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchPageQuery}
                    onChange={(e) => setSearchPageQuery(e.target.value)}
                    placeholder="Пошук по шляху сторінки (наприклад: /intensive)..."
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                  />
                </div>

                {/* Scrolled list of discovered pages */}
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/35">
                  <div className="max-h-40 overflow-y-auto divide-y divide-white/5 custom-scrollbar text-xs">
                    {discoveredPages
                      .filter((p) =>
                        String(p.path).toLowerCase().includes(searchPageQuery.toLowerCase()) ||
                        String(p.title || "").toLowerCase().includes(searchPageQuery.toLowerCase())
                      )
                      .map((p) => {
                        const isSelected = selectedPages.includes(p.path);
                        const isDirect = p.source === "direct_register";
                        
                        // Hierarchical tree calculations
                        const segments = p.path.split("/").filter(Boolean);
                        const depth = segments.length;
                        const lastSegment = segments[segments.length - 1] || "/";
                        
                        // Build hierarchical indentation label
                        const displayLabel = depth <= 1 
                          ? p.path 
                          : `└─ /${lastSegment}`;

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedPages(selectedPages.filter((path) => path !== p.path));
                              } else {
                                setSelectedPages([...selectedPages, p.path]);
                              }
                            }}
                            style={{ paddingLeft: depth > 1 ? `${(depth - 1) * 1.25 + 0.75}rem` : '0.75rem' }}
                            className={`flex justify-between items-center pr-3 py-2 cursor-pointer transition-all hover:bg-white/5 ${
                              isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 w-3.5 h-3.5"
                              />
                              <span className={`font-bold ${isSelected ? "text-emerald-400" : "text-white"} ${depth > 1 ? "text-white/60 font-semibold" : ""}`}>
                                {displayLabel}
                              </span>
                              {p.title && (
                                <span className="text-[10px] text-white/40">
                                  ({p.title})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 font-bold">
                              {isDirect ? (
                                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                                  Виявлено
                                </span>
                              ) : (
                                <span className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded uppercase">
                                  Трафік
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    {discoveredPages.length === 0 && (
                      <div className="p-4 text-center text-[10px] text-white/30 italic">
                        Сторінок не знайдено. Перевірте інтеграцію синхронізації або додайте сторінки вручну.
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected tags overview */}
                {selectedPages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                    <span className="text-[9px] uppercase font-bold text-white/40 block w-full mb-1">Обрані сторінки:</span>
                    {selectedPages.map((path) => (
                      <span
                        key={path}
                        onClick={() => setSelectedPages(selectedPages.filter((p) => p !== path))}
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all text-[10px]"
                      >
                        {path} <span className="text-white/40">×</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Manual pages input */}
                <div className="space-y-1 pt-1">
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Додати інші сторінки вручну (через кому)</label>
                  <input
                    type="text"
                    value={manualPageInput}
                    onChange={(e) => setManualPageInput(e.target.value)}
                    placeholder="rozbir, marathon_landing, page_vsl"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs placeholder-white/30"
                  />
                  <p className="text-[9px] text-white/30">Використовуйте цей рядок для мануального зв'язку, якщо сторінка ще не синхронізована</p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  disabled={!startDate}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer disabled:opacity-50"
                >
                  Далі
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Кампанії трафіку */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 leading-relaxed">
                  💡 <strong>Опція: Додати пізніше.</strong> Ви можете пропустити цей крок або обрати кампанії пізніше, якщо вони ще не створені в Facebook Ads Manager. Воронка все одно буде успішно створена та рахуватиме замовлення.
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-white/50 block">Рекламні Кампанії UTM</label>
                  
                  {/* Search input for campaigns */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/40">
                      <Search className="w-3.5 h-3.5" />
                    </span>
                    <input
                      type="text"
                      value={searchCampaignQuery}
                      onChange={(e) => setSearchCampaignQuery(e.target.value)}
                      placeholder="Пошук рекламних кампаній..."
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-white/30"
                    />
                  </div>

                  {/* Scrolled list of campaigns */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-black/35">
                    <div className="max-h-40 overflow-y-auto divide-y divide-white/5 custom-scrollbar text-xs">
                      {Array.from(new Set(campaignsList.map((c: any) => String(c.campaign_name || '').trim()).filter(Boolean)))
                        .filter((campName) =>
                          campName.toLowerCase().includes(searchCampaignQuery.toLowerCase())
                        )
                        .map((campName) => {
                          const isSelected = selectedCampaigns.includes(campName);
                          const stats = campaignsList.find((c) => c.campaign_name === campName);
                          const spendUAH = stats ? Number(stats.spend || 0) : 0;
                          const leadsCount = stats ? Number(stats.leads_count || 0) : 0;

                          return (
                            <div
                              key={campName}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedCampaigns(selectedCampaigns.filter((c) => c !== campName));
                                } else {
                                  setSelectedCampaigns([...selectedCampaigns, campName]);
                                }
                              }}
                              className={`flex justify-between items-center px-3 py-2 cursor-pointer transition-all hover:bg-white/5 ${
                                isSelected ? "bg-emerald-500/5 hover:bg-emerald-500/10" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 w-3.5 h-3.5"
                                />
                                <span className={`font-bold ${isSelected ? "text-emerald-400" : "text-white"}`}>
                                  {campName}
                                </span>
                              </div>
                              {spendUAH > 0 && (
                                <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded font-black text-white/50">
                                  Витрати: {Math.round(spendUAH).toLocaleString("uk-UA")} ₴ ({leadsCount} лід.)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      {Array.from(new Set(campaignsList.map((c: any) => String(c.campaign_name || '').trim()).filter(Boolean))).length === 0 && (
                        <div className="p-4 text-center text-[10px] text-white/30 italic">
                          Кампаній не знайдено для цього проекту.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected campaigns list */}
                  {selectedCampaigns.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white/[0.02] border border-white/5 rounded-xl">
                      <span className="text-[9px] uppercase font-bold text-white/40 block w-full mb-1">Обрані кампанії:</span>
                      {selectedCampaigns.map((camp) => (
                        <span
                          key={camp}
                          onClick={() => setSelectedCampaigns(selectedCampaigns.filter((c) => c !== camp))}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all text-[10px]"
                        >
                          {camp} <span className="text-white/40">×</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Manual input fallback */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[10px] uppercase font-bold text-white/50 block">Додати інші UTM-мітки кампаній вручну (через кому)</label>
                    <input
                      type="text"
                      value={manualCampaignInput}
                      onChange={(e) => setManualCampaignInput(e.target.value)}
                      placeholder="utm_campaign_july, webinar_cold_audience"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white text-xs placeholder-white/30"
                    />
                    <p className="text-[9px] text-white/30">Сюди потраплять рекламні витрати, що містять ці мітки в UTM</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  Назад
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(4)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-black font-extrabold cursor-pointer"
                >
                  Далі
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Конструктор етапів */}
          {wizardStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-white/50 block">Активні етапи шляху клієнта</label>
                <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  {[
                    { key: "bot", label: "Підписка в бот" },
                    { key: "registration", label: "Реєстрація на подію" },
                    { key: "webinar", label: "Перегляд вебінару" },
                    { key: "quiz", label: "Анкета діагностики" },
                    { key: "payment", label: "Оплата (Заявка)" }
                  ].map((stage) => (
                    <label key={stage.key} className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={(selectedStages as any)[stage.key]}
                        onChange={(e) => setSelectedStages({
                          ...selectedStages,
                          [stage.key]: e.target.checked
                        })}
                        className="rounded border-white/10 bg-white/5 text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                      />
                      <span>{stage.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-white/50">Нотатки / Опис</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Додаткова інформація..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Збереження..." : "Створити воронку"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Funnels Grid */}
      <div className="grid grid-cols-1 gap-6">
        {funnels.map((funnel) => {
          const stats = getFunnelStats(funnel);
          const isExpanded = expandedFunnelId === funnel.id;
          
          // Parse metadata
          const parsedType = funnel.description?.startsWith("[Type:")
            ? funnel.description.split("]")[0].replace("[Type: ", "")
            : "Інше";
          const cleanDescription = funnel.description?.includes("]")
            ? funnel.description.substring(funnel.description.indexOf("]") + 1).trim()
            : funnel.description;

          return (
            <div key={funnel.id} className="bg-neutral-900 border border-white/5 p-6 rounded-2xl space-y-4 text-xs text-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-base text-white">{funnel.name}</h4>
                    <span className="text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded font-black text-white/50">{parsedType}</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Старт: {new Date(funnel.start_date).toLocaleDateString("uk-UA")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setExpandedFunnelId(isExpanded ? null : funnel.id)}
                    className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-bold text-white hover:bg-white/15 cursor-pointer transition-all"
                  >
                    {isExpanded ? "Сховати" : "Деталі"}
                  </button>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    stats.roi >= 100 ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"
                  }`}>
                    ROI: {Math.round(stats.roi)}%
                  </span>
                </div>
              </div>

              {cleanDescription && (
                <p className="text-xs text-white/60 line-clamp-2 italic bg-white/[0.01] p-2 rounded border border-white/5">
                  {cleanDescription}
                </p>
              )}

              {/* Linear Funnel Pipeline Conveyor */}
              <div className="flex flex-wrap md:flex-nowrap items-stretch border border-white/5 rounded-xl overflow-hidden text-xs">
                <div className="flex-1 bg-white/5 p-3 text-center border-r border-white/5">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Бюджет</span>
                  <span className="text-sm font-black text-white">{stats.spend.toLocaleString("uk-UA")} ₴</span>
                  {stats.manualSpend > 0 && <span className="text-[8px] text-white/30 block mt-0.5">(ручн: {stats.manualSpend} ₴)</span>}
                </div>
                <div className="flex-1 bg-white/5 p-3 text-center border-r border-white/5">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Ліди (CPL)</span>
                  <span className="text-sm font-black text-emerald-400 block mt-0.5">{stats.leadsCount}</span>
                  <span className="text-[9px] font-bold text-white/50 block">CPL: {stats.leadsCount > 0 ? Math.round(stats.spend / stats.leadsCount) : 0} ₴</span>
                </div>
                <div className="flex-1 bg-white/5 p-3 text-center border-r border-white/5">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Заявки</span>
                  <span className="text-sm font-black text-amber-400 block mt-1">{stats.salesCount}</span>
                </div>
                <div className="flex-1 bg-white/5 p-3 text-center border-r border-white/5">
                  <span className="text-[9px] uppercase font-bold text-white/40 block">Продажі (CR)</span>
                  <span className="text-sm font-black text-white block mt-0.5">{stats.salesCount}</span>
                  <span className="text-[9px] text-white/50 block font-semibold">CR: {stats.cr.toFixed(1)}%</span>
                </div>
                <div className="flex-1 bg-emerald-500/10 p-3 text-center flex flex-col justify-between">
                  <span className="text-[9px] uppercase font-bold text-emerald-400 block">Виручка</span>
                  <div className="mt-auto">
                    <span className="text-sm font-black text-emerald-400 block">{stats.revenue.toLocaleString("uk-UA")} ₴</span>
                    {stats.manualIncome > 0 && <span className="text-[8px] text-emerald-400/60 block mt-0.5">(ручн: {stats.manualIncome} ₴)</span>}
                  </div>
                </div>
              </div>

              {/* Detailed view block (UTM campaigns list) */}
              {isExpanded && (
                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3 text-xs animate-in fade-in duration-200">
                  <h5 className="font-bold text-[10px] text-white/50 uppercase tracking-wider">Аналітика по кампаніям</h5>
                  <div className="space-y-1">
                    <div className="flex justify-between py-1 border-b border-white/5 text-[10px] text-white/40">
                      <span>Кампанія</span>
                      <span>К-сть лідів</span>
                    </div>
                    {funnel.campaign_ids.map((cid) => {
                      const count = leadsList.filter((l: any) => l.utm_campaign === cid).length;
                      return (
                        <div key={cid} className="flex justify-between py-1 border-b border-white/5">
                          <span className="text-white/70">{cid}</span>
                          <span className="font-bold">{count}</span>
                        </div>
                      );
                    })}
                    {funnel.campaign_ids.length === 0 && (
                      <p className="text-[10px] text-white/30 italic">Кампанії не налаштовано</p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata tags footer */}
              <div className="text-[10px] text-white/30 flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <span className="bg-white/5 px-2 py-0.5 rounded">Лендінги: {funnel.landing_slugs.join(", ") || "Всі"}</span>
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
