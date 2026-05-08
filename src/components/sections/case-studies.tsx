"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const cases = [
  {
    id: 1,
    client: "E-commerce Brand",
    before: "$5k / міс",
    after: "$38k / міс",
    solution: "Зібрали воронку, запустили трафік, поставили відділ продажів",
  },
  {
    id: 2,
    client: "Освітній проєкт",
    before: "10k підписників",
    after: "90k підписників",
    solution: "Контент-стратегія, reels-воронка, таргетована реклама",
  },
  {
    id: 3,
    client: "B2B SaaS",
    before: "Стихійні продажі",
    after: "Системний MRR $15k",
    solution: "Автоматизація лідогенерації, впровадження CRM, скрипти",
  },
];

export const CaseStudies = () => {
  const [hoveredCase, setHoveredCase] = useState<number | null>(null);

  return (
    <section id="cases" className="py-24 md:py-32 bg-void relative">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6">
            Не продаємо ідеї. Показуємо цифри.
          </h2>
          <p className="text-xl text-text-secondary font-mono">
            [Як ми масштабуємо проєкти, поки експерти займаються контентом]
          </p>
        </div>

        <div className="flex flex-col border-t border-hairline">
          {cases.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: idx * 0.1 }}
              onMouseEnter={() => setHoveredCase(c.id)}
              onMouseLeave={() => setHoveredCase(null)}
              className="group relative flex flex-col md:flex-row md:items-center justify-between p-8 border-b border-hairline hover:bg-surface1 transition-colors cursor-default"
            >
              <div className="flex-1 mb-6 md:mb-0">
                <h3 className="text-xl font-bold mb-2">{c.client}</h3>
                <p className="text-sm text-text-secondary font-mono max-w-sm">
                  {c.solution}
                </p>
              </div>

              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-widest mb-1">До</div>
                  <div className="font-mono text-lg text-text-secondary line-through opacity-70">
                    {c.before}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-primary uppercase tracking-widest mb-1">Після</div>
                  <div className="font-mono text-3xl font-bold text-white group-hover:text-text-primary transition-colors">
                    {c.after}
                  </div>
                </div>
              </div>

              {/* Hover Image Placeholder Effect */}
              {hoveredCase === c.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-64 h-40 bg-surface2 border border-hairline pointer-events-none z-10"
                >
                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs font-mono">
                    [GRAPHIC_PROOF_{c.id}.WEBP]
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
