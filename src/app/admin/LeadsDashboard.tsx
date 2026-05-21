"use client";

import React, { useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  TrendingUp,
  Users,
  Briefcase,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  MousePointerClick,
  Info,
} from "lucide-react";

interface Lead {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  telegram: string | null;
  instagram: string | null;
  button_id: string;
  visitor_id: string;
  status: "new" | "in_progress" | "completed" | "rejected";
}

interface PageView {
  visitor_id: string;
}

interface ButtonClick {
  button_id: string;
}

interface LeadsDashboardProps {
  initialLeads: Lead[];
  initialPageViews: PageView[];
  initialClicks: ButtonClick[];
}

// Helper to map technical button IDs to human-readable labels
const BUTTON_LABELS: Record<string, string> = {
  header_cta: "Кнопка в шапці (Header CTA)",
  hero_cta: "Перший екран (Hero CTA)",
  metrics_cta: "Блок метрик (Metrics CTA)",
  mid_banner_cta: "Середина лендингу (Banner CTA)",
  final_cta: "Фінальний екран (Final CTA)",
  cases_cta: "Розділ кейсів (Cases CTA)",
};

export default function LeadsDashboard({
  initialLeads,
  initialPageViews,
  initialClicks,
}: LeadsDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // 1. Math / Calculations
  const metrics = useMemo(() => {
    const uniqueVisitors = new Set(initialPageViews.map((v) => v.visitor_id)).size;
    const totalLeads = leads.length;
    const conversionRate = uniqueVisitors > 0 ? (totalLeads / uniqueVisitors) * 100 : 0;

    return {
      uniqueVisitors,
      totalLeads,
      conversionRate,
    };
  }, [leads, initialPageViews]);

  // 2. Button Performance Calculations
  const buttonPerformance = useMemo(() => {
    const data: Record<string, { clicks: number; leads: number; label: string }> = {};

    // Group button clicks
    initialClicks.forEach((c) => {
      if (!data[c.button_id]) {
        data[c.button_id] = {
          clicks: 0,
          leads: 0,
          label: BUTTON_LABELS[c.button_id] || c.button_id,
        };
      }
      data[c.button_id].clicks += 1;
    });

    // Group leads (using button_id)
    leads.forEach((l) => {
      if (!data[l.button_id]) {
        data[l.button_id] = {
          clicks: 0,
          leads: 0,
          label: BUTTON_LABELS[l.button_id] || l.button_id,
        };
      }
      data[l.button_id].leads += 1;
    });

    // Compute CR and format array
    return Object.entries(data).map(([buttonId, stats]) => {
      const cr = stats.clicks > 0 ? (stats.leads / stats.clicks) * 100 : 0;
      return {
        id: buttonId,
        ...stats,
        cr,
      };
    }).sort((a, b) => b.cr - a.cr);
  }, [leads, initialClicks]);

  // 3. Update Lead Status Handler
  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    setUpdatingId(leadId);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      // Update local state instantly
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
    } catch (err) {
      alert("Не вдалося оновити статус: " + (err as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  // 4. Filtering and Searching leads list
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesSearch =
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.telegram && l.telegram.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.instagram && l.instagram.toLowerCase().includes(searchQuery.toLowerCase())) ||
        l.button_id.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [leads, statusFilter, searchQuery]);

  return (
    <div className="space-y-10">
      {/* Dashboard Top Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white">
            Панель аналітики
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Конверсії, CTA-кнопки та керування лідами в реальному часі
          </p>
        </div>
      </div>

      {/* 1. Main Aggregate Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-emerald-500 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
            Конверсія сайту (CR)
          </p>
          <p className="text-3xl font-black text-white mt-4">
            {metrics.conversionRate.toFixed(2)}%
          </p>
          <p className="text-xs text-white/30 mt-2 font-medium">
            Співвідношення унікальних лідів до відвідувачів
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-emerald-400 bg-emerald-400/10 p-3 rounded-xl border border-emerald-400/20">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
            Унікальні візити
          </p>
          <p className="text-3xl font-black text-white mt-4">
            {metrics.uniqueVisitors}
          </p>
          <p className="text-xs text-white/30 mt-2 font-medium">
            Унікальні visitor_id зафіксовані системою
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0C0C0F] border border-white/5 p-6 rounded-2xl relative overflow-hidden">
          <div className="absolute top-4 right-4 text-white bg-white/5 p-3 rounded-xl border border-white/10">
            <Briefcase className="w-5 h-5" />
          </div>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
            Загальна кількість лідів
          </p>
          <p className="text-3xl font-black text-white mt-4">
            {metrics.totalLeads}
          </p>
          <p className="text-xs text-white/30 mt-2 font-medium">
            Всього відправлених заявок на діагностику
          </p>
        </div>
      </div>

      {/* 2. CTA Buttons Conversion breakdown */}
      <div className="bg-[#0C0C0F] border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-black uppercase tracking-tight text-white mb-6 flex items-center gap-2">
          <MousePointerClick className="w-5 h-5 text-emerald-500" />
          Ефективність CTA-кнопок
        </h2>

        {buttonPerformance.length === 0 ? (
          <div className="text-center py-6 text-white/30 text-sm flex items-center justify-center gap-2">
            <Info className="w-4 h-4" /> Немає зафіксованих кліків по кнопках
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buttonPerformance.map((btn) => (
              <div
                key={btn.id}
                className="p-5 rounded-xl bg-white/[0.01] border border-white/5 hover:border-emerald-500/20 transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-white/90 truncate pr-2" title={btn.label}>
                    {btn.label}
                  </p>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    CR: {btn.cr.toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
                  <div>Кліки: <span className="font-bold text-white">{btn.clicks}</span></div>
                  <div>Ліди: <span className="font-bold text-white">{btn.leads}</span></div>
                </div>

                {/* Micro progress bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(btn.cr, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Interactive Leads List Section */}
      <div className="bg-[#0C0C0F] border border-white/5 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h2 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-500" />
            База заявок (ліди)
          </h2>

          {/* Controls: Search and Filters */}
          <div className="w-full lg:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-grow md:flex-grow-0">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/30">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук лідів..."
                className="w-full md:w-64 pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:border-emerald-500 text-white placeholder:text-white/20 text-xs"
              />
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap gap-1 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
              {[
                { id: "all", label: "Всі" },
                { id: "new", label: "Нові" },
                { id: "in_progress", label: "В роботі" },
                { id: "completed", label: "Завершені" },
                { id: "rejected", label: "Відхилені" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setStatusFilter(btn.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === btn.id
                      ? "bg-white text-black font-extrabold"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto border border-white/5 rounded-xl">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-white/[0.02] text-white/40 uppercase tracking-widest font-black border-b border-white/5">
                <th className="p-4">Клієнт</th>
                <th className="p-4">Контакти</th>
                <th className="p-4">Джерело (CTA)</th>
                <th className="p-4">Створено</th>
                <th className="p-4 text-center">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-white/30 text-sm font-medium">
                    Заявки не знайдені
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/[0.01] transition-all">
                    {/* Client Name & ID */}
                    <td className="p-4">
                      <div className="font-extrabold text-sm text-white">{lead.name}</div>
                      <div className="text-[10px] text-white/30 truncate max-w-[120px] mt-1" title={lead.visitor_id}>
                        id: {lead.visitor_id}
                      </div>
                    </td>

                    {/* Phones & Socials */}
                    <td className="p-4 space-y-1">
                      <div className="font-semibold">{lead.phone}</div>
                      <div className="flex gap-2">
                        {lead.telegram && (
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            tg: {lead.telegram}
                          </span>
                        )}
                        {lead.instagram && (
                          <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                            ig: {lead.instagram}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CTA Button Source */}
                    <td className="p-4 font-semibold text-white/60">
                      {BUTTON_LABELS[lead.button_id] || lead.button_id}
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-white/50">
                      {new Date(lead.created_at).toLocaleString("uk-UA", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Interactive Status Selector */}
                    <td className="p-4 text-center">
                      <div className="inline-block relative">
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={(e) =>
                            handleStatusChange(lead.id, e.target.value as Lead["status"])
                          }
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-xs font-bold text-center focus:outline-none cursor-pointer disabled:opacity-50 transition-all ${
                            lead.status === "new"
                              ? "bg-neutral-800 border-neutral-700 text-neutral-300"
                              : lead.status === "in_progress"
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                              : lead.status === "completed"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-red-500/10 border-red-500/30 text-red-400"
                          }`}
                        >
                          <option value="new">Новий</option>
                          <option value="in_progress">В роботі</option>
                          <option value="completed">Завершено</option>
                          <option value="rejected">Отказ</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-white/40">
                          {lead.status === "new" && <Clock className="w-3.5 h-3.5" />}
                          {lead.status === "in_progress" && <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />}
                          {lead.status === "completed" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                          {lead.status === "rejected" && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                      </div>
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
}
