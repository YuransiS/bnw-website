"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const steps = [
  { num: "01", title: "Аналіз та стратегія", desc: "Вивертаємо вашу поточну модель навиворіт. Знаходимо 'дірки', де ви втрачаєте гроші, аналізуємо активи та складаємо покрокову стратегію запуску. Жодної інтуїції — лише цифри та факти." },
  { num: "02", title: "Пакування бренду та продукту", desc: "Докручуємо продуктову лінійку та сенси. Робимо так, щоб ваш контент і продукт викликали бажання купити ще до прямого продажу. Створюємо позиціювання, яке дозволяє продавати на високі чеки." },
  { num: "03", title: "Побудова воронок продажів", desc: "Переносимо продажі з ручних переписок у системне русло. Збираємо лендінги, налаштовуємо чат-ботів, підключаємо платіжки та вибудовуємо архітектуру, яка гріє трафік 24/7." },
  { num: "04", title: "Запуск контент-маркетингу та трафіку", desc: "Пишемо сценарії для прогрівів та заливаємо цільовий трафік. Керуємо рекламними кампаніями та оптимізуємо бюджет, щоб кожен вкладений долар давав максимальну окупність (ROI)." },
  { num: "05", title: "Відділ продажів", desc: "Ви більше не працюєте сейлзом у власному проєкті. Наші фахівці впроваджують скрипти, обробляють заявки та екологічно дотискають лідів до оплати." },
  { num: "06", title: "Контроль показників та масштабування", desc: "Зводимо всі дані в наскрізну аналітику. Відрізаємо неефективні зв'язки, заливаємо більше грошей у те, що працює, і системно масштабуємо ваш прибуток." },
];

export function RoadmapV2() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  const pathLength = useTransform(scrollYProgress, [0, 0.8], [0, 1]);

  return (
    <section ref={containerRef} className="relative py-32 z-10">
      <div className="container mx-auto px-6 lg:px-12 relative">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Прозорий шлях до <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white">результату</span></h2>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Animated SVG Path for Desktop */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[2px] hidden md:block z-0">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 2 1000">
              <line x1="1" y1="0" x2="1" y2="1000" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="8 8" />
              <motion.line 
                x1="1" y1="0" x2="1" y2="1000" 
                stroke="url(#gradient)" 
                strokeWidth="4" 
                style={{ pathLength }} 
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="50%" stopColor="#888888" />
                  <stop offset="100%" stopColor="#333333" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`flex flex-col md:flex-row items-center gap-8 mb-20 relative ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className={`md:w-1/2 flex ${i % 2 !== 0 ? 'md:justify-start' : 'md:justify-end'} w-full`}>
                  <div className="glass-card p-8 rounded-[32px] max-w-sm relative group w-full">
                    <div className="absolute -inset-0.5 bg-gradient-to-br from-white to-gray-500 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
                    <div className="relative glass-card p-8 rounded-[32px] h-full w-full bg-[#020202]/90">
                      <span className="text-5xl font-black text-white/5 absolute -top-6 -right-2">{step.num}</span>
                      <h3 className="text-2xl font-bold mb-4 text-white relative z-10">{step.title}</h3>
                      <p className="text-white/60 font-light relative z-10">{step.desc}</p>
                    </div>
                  </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#020202] border-4 border-gray-500 z-10 hidden md:block">
                  <motion.div 
                    className="w-full h-full rounded-full bg-white" 
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                  />
                </div>
                
                <div className="md:w-1/2" />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 text-center"
          >
            <p className="text-xl text-white/60 mb-8 italic max-w-2xl mx-auto">
              Ви створюєте контент та ведете учнів. Ці 6 етапів ми забираємо на себе. <br/>
              Готові подивитися на свій проєкт збоку?
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
