"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cards = [
  {
    id: "01_PROBLEM",
    title: "Людина-оркестр",
    description:
      "Ви робите все вручну: від щоденних прогрівів у сторіз до переписок у діректі. Жодної системи немає, а продажі тримаються виключно на вашому кортизолі та постійній залученості.",
    className: "md:col-span-2",
  },
  {
    id: "02_PROBLEM",
    title: "Продукт топ, а продажів мало",
    description:
      "Люди хвалять контент, охоплення є, але коли доходить до оплат — тиша. У вас немає системної воронки, яка б стабільно конвертувала лояльність у гроші.",
    className: "md:col-span-1",
  },
  {
    id: "03_PROBLEM",
    title: "Стеля в доходах",
    description:
      "Ви працюєте 24/7, але дохід не виправдовує зусиль або взагалі стоїть на місці. Будь-яка спроба масштабуватися та залити гроші у трафік закінчується тупим зливом бюджету.",
    className: "md:col-span-1",
  },
  {
    id: "04_PROBLEM",
    title: "Вічний виконавець",
    description:
      "Ви хотіли стати підприємцем і заробляти, а натомість купили собі ще одну роботу формату 24/7 без вихідних.",
    className: "md:col-span-2",
  },
];

export const PainPoints = () => {
  return (
    <section id="problems" className="py-24 md:py-32 bg-void relative">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6">
            Впізнаєте себе?
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl font-mono">
            [Якщо хоч один пункт про вас — ви втрачаєте гроші просто зараз]
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-1 auto-rows-fr bg-hairline border border-hairline">
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
              className={cn(
                "bg-surface1 p-8 md:p-12 flex flex-col justify-between group hover:bg-surface2 transition-colors",
                card.className
              )}
            >
              <div className="font-mono text-xs text-text-secondary mb-8 group-hover:text-white transition-colors">
                [{card.id}]
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-4 text-text-primary tracking-tight">
                  {card.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-text-secondary text-lg border-b border-hairline inline-block pb-2">
            Ми знаємо, як це виправити. Ви створюєте сенси — <span className="text-text-primary">ми будуємо систему.</span>
          </p>
        </div>
      </div>
    </section>
  );
};
