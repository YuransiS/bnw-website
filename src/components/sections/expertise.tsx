"use client";

import { motion } from "framer-motion";
import { Users, Workflow, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const expertise = [
  {
    icon: Users,
    title: "Команда під ключ (Продюсування)",
    description:
      "Замість пошуку підрядників ви отримуєте готову команду повного циклу. Від технарів до сейлзів — ми закриваємо всі процеси і повністю витягуємо вас із мікроменеджменту та рутини. Ви залишаєтеся зіркою та мозком продукту, а ми прописуємо стратегію, пакуємо сенси і контролюємо кожен етап запуску.",
  },
  {
    icon: Workflow,
    title: "Автоматизовані воронки та лендінги",
    description:
      "Виводимо продажі з ручних переписок. Проєктуємо сайти, збираємо чат-ботів та вибудовуємо архітектуру повідомлень, які гріють і конвертують трафік у гроші 24/7 без вашої участі.",
  },
  {
    icon: TrendingUp,
    title: "Маркетинг, трафік та відділ продажів",
    description:
      "Беремо на себе залучення та закриття лідів. Пишемо сценарії для прогрівів, керуємо рекламними кампаніями та контролюємо окупність трафіку. Наш відділ продажів обробляє заявки та дотискає клієнтів за скриптами, остаточно виводячи вас із переписок.",
  },
];

export const Expertise = () => {
  return (
    <section id="expertise" className="py-24 md:py-32 bg-surface1 border-y border-hairline relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 opacity-10 mix-blend-luminosity pointer-events-none">
        <img src="/expertise-bg.png" alt="" className="w-full h-full object-cover" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6 text-balance">
              Як ми забираємо ваш хаос
            </h2>
            <p className="text-xl text-text-secondary font-mono">
              [3 інструменти, якими ми будуємо вашу автономність]
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {expertise.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
              className="border border-hairline p-8 md:p-10 relative overflow-hidden group hover:bg-surface2 transition-colors duration-500"
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
              
              <div className="mb-8 p-4 border border-hairline inline-block bg-void/50 group-hover:border-text-secondary transition-colors">
                <item.icon className="w-8 h-8 text-text-primary" strokeWidth={1.5} />
              </div>
              
              <h3 className="text-2xl font-semibold mb-4 tracking-tight">
                {item.title}
              </h3>
              
              <p className="text-text-secondary leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 pt-10 border-t border-hairline flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-lg text-text-secondary">
            Це не теорія. Дивіться цифри реальних запусків ↓
          </p>
          <Button variant="secondary" className="uppercase tracking-widest text-xs px-6 py-3 w-full md:w-auto">
            Хочу таку систему
          </Button>
        </div>
      </div>
    </section>
  );
};
