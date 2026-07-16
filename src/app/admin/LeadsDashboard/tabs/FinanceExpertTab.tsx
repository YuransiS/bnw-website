"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { DollarSign, Landmark, Percent, ListTodo, Award, HelpCircle } from "lucide-react";

interface FinanceExpertTabProps {
  projectId: string;
  projectRevenue: number;
  projectSpend: number;
  isLight: boolean;
}

export default function FinanceExpertTab({ projectId, projectRevenue, projectSpend, isLight }: FinanceExpertTabProps) {
  const [projectSettings, setProjectSettings] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadExpertData = async () => {
      setLoading(true);
      const supabase = createClient();
      try {
        // Fetch project settings (percentages)
        const { data: proj } = await supabase
          .from("projects")
          .select("id, name, expert_share_percentage, marketer_share_percentage")
          .eq("id", projectId)
          .single();
        
        if (proj) {
          setProjectSettings(proj);
        }

        // Fetch active project tasks
        const { data: taskList } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("due_date", { ascending: true });

        if (taskList) {
          setTasks(taskList);
        }
      } catch (err) {
        console.error("Failed to load expert finance data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadExpertData();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-white/50">
        <p className="text-xs animate-pulse">Завантаження кабінету партнера...</p>
      </div>
    );
  }

  const expertSharePct = projectSettings?.expert_share_percentage || 0;
  const marketerSharePct = projectSettings?.marketer_share_percentage || 0;

  const projectProfit = projectRevenue - projectSpend;
  
  // Calculate shares based on profit (or revenue if profit is negative/custom)
  const expertShareVal = projectProfit > 0 ? (projectProfit * (expertSharePct / 100)) : 0;
  const marketerShareVal = projectProfit > 0 ? (projectProfit * (marketerSharePct / 100)) : 0;

  return (
    <div className="space-y-8 text-white">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-450" />
          Кабінет Партнера / Експерта
        </h2>
        <p className={`text-xs mt-1 ${isLight ? "text-neutral-500" : "text-white/40"}`}>
          Розрахунок вашої частки прибутку в проекті {projectSettings?.name || ""} на сьогоднішній день
        </p>
      </div>

      {/* Financial calculations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 text-emerald-450" />
            Ваш відсоток частки
          </p>
          <p className="text-3xl font-black mt-2 text-white">
            {expertSharePct} %
          </p>
          <p className="text-[10px] text-white/30 mt-1">Закріплено фінансовою моделлю</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent">
          <p className="text-xs text-emerald-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-emerald-400" />
            Ваш поточний дохід
          </p>
          <p className="text-3xl font-black mt-2 text-emerald-400">
            {expertShareVal.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-emerald-400/50 mt-1">Розраховано від чистого прибутку</p>
        </div>

        <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
          <p className="text-xs text-white/40 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-white/40" />
            Чистий прибуток проекту
          </p>
          <p className="text-3xl font-black mt-2 text-white">
            {projectProfit.toLocaleString("uk-UA")} ₴
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            Виручка ({projectRevenue.toLocaleString("uk-UA")} ₴) - Трафік ({projectSpend.toLocaleString("uk-UA")} ₴)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: How it works explanation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h3 className="font-bold text-sm uppercase tracking-wider text-white/50 mb-4 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-emerald-450" />
              Принцип розподілу та нарахувань
            </h3>
            
            <div className="space-y-3 text-xs text-white/60">
              <p>
                1. <b>Розрахунок Бази:</b> Ваша частка розраховується за формулою: <code className="text-emerald-400 font-mono">Прибуток * Відсоток</code>.
              </p>
              <p>
                2. <b>Чистий Прибуток:</b> Отримано шляхом віднімання підтверджених витрат на рекламу та лід-генерацію від загальної суми оплат від клієнтів.
              </p>
              <p>
                3. <b>Прозорість:</b> Всі надходження оплат від фіскальних сервісів та витрати трафік-менеджерів імпортуються автоматично у режимі реального часу.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Milestone checklists */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-white/5 p-6 rounded-2xl">
            <h3 className="font-bold text-sm uppercase tracking-wider text-white/50 mb-4 flex items-center gap-1.5">
              <ListTodo className="w-4 h-4 text-emerald-450" />
              Дорожня карта та завдання
            </h3>

            <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
              {tasks.map((task) => (
                <div key={task.id} className="p-2.5 border border-white/5 bg-white/[0.005] rounded-xl flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={task.status === "completed"}
                    disabled
                    className="mt-1 h-3.5 w-3.5 rounded border-white/10 text-emerald-500 focus:ring-0 bg-transparent shrink-0"
                  />
                  <div className="min-w-0">
                    <p className={`text-xs font-black truncate ${task.status === "completed" ? "line-through text-white/35" : "text-white"}`}>
                      {task.title}
                    </p>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      Дедлайн: {task.due_date ? new Date(task.due_date).toLocaleDateString("uk-UA") : "Не вказано"}
                    </p>
                  </div>
                </div>
              ))}

              {tasks.length === 0 && (
                <p className="text-xs text-white/30 italic text-center py-4">Активних завдань по проекту немає</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
