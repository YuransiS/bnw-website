"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    num: "01",
    title: "Аналіз та стратегія",
    desc: "Вивертаємо вашу поточну модель навиворіт. Знаходимо \"дірки\", де ви втрачаєте гроші, аналізуємо активи та складаємо покрокову стратегію запуску. Жодної інтуїції — лише цифри та факти."
  },
  {
    num: "02",
    title: "Пакування бренду та продукту",
    desc: "Докручуємо продуктову лінійку та сенси. Робимо так, щоб ваш контент і продукт викликали бажання купити ще до прямого продажу. Створюємо позиціювання, яке дозволяє продавати на високі чеки."
  },
  {
    num: "03",
    title: "Побудова воронок продажів",
    desc: "Переносимо продажі з ручних переписок у системне русло. Збираємо лендінги, налаштовуємо чат-ботів, підключаємо платіжки та вибудовуємо архітектуру, яка гріє трафік 24/7."
  },
  {
    num: "04",
    title: "Запуск контент-маркетингу та трафіку",
    desc: "Пишемо сценарії для прогрівів та заливаємо цільовий трафік. Керуємо рекламними кампаніями та оптимізуємо бюджет, щоб кожен вкладений долар давав максимальну окупність (ROI)."
  },
  {
    num: "05",
    title: "Відділ продажів",
    desc: "Ви більше не працюєте сейлзом у власному проєкті. Наші фахівці впроваджують скрипти, обробляють заявки та екологічно дотискають лідів до оплати."
  },
  {
    num: "06",
    title: "Контроль показників та масштабування",
    desc: "Зводимо всі дані в наскрізну аналітику. Відрізаємо неефективні зв'язки, заливаємо більше грошей у те, що працює, і системно масштабуємо ваш прибуток."
  }
];

export const Roadmap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="py-24 md:py-32 bg-surface1 border-t border-hairline relative">
      <div className="container mx-auto px-6">
        <div className="mb-16 md:mb-24">
          <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6">
            Прозорий шлях до результату
          </h2>
          <p className="text-xl text-text-secondary font-mono">
            [Повний цикл продюсування. Від першого зідзвону до масштабування прибутку за 6 етапів]
          </p>
        </div>

        <div ref={containerRef} className="relative max-w-4xl mx-auto">
          {/* Track background */}
          <div className="absolute left-[27px] md:left-1/2 top-0 bottom-0 w-px bg-hairline md:-translate-x-1/2" />
          
          {/* Active track */}
          <motion.div 
            className="absolute left-[27px] md:left-1/2 top-0 w-[2px] bg-white md:-translate-x-1/2 origin-top"
            style={{ height: lineHeight }}
          />

          <div className="space-y-12 md:space-y-24">
            {steps.map((step, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <div key={idx} className="relative flex flex-col md:flex-row items-start md:items-center w-full">
                  
                  {/* Left Side (Empty on mobile or odd) */}
                  <div className={`hidden md:block w-1/2 pr-12 text-right ${!isEven ? "md:opacity-0" : ""}`}>
                    {isEven && (
                      <div className="bg-void border border-hairline p-8 inline-block w-full max-w-md">
                        <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                        <p className="text-sm text-text-secondary">{step.desc}</p>
                      </div>
                    )}
                  </div>

                  {/* Center Dot */}
                  <div className="absolute left-0 md:left-1/2 w-14 h-14 bg-surface1 border border-hairline rounded-none flex items-center justify-center z-10 md:-translate-x-1/2 font-mono text-sm group transition-colors hover:bg-white hover:text-black">
                    {step.num}
                  </div>

                  {/* Right Side */}
                  <div className={`w-full pl-20 md:w-1/2 md:pl-12 ${isEven ? "md:opacity-0 hidden md:block" : ""}`}>
                    {(!isEven || true) && (
                      <div className={`bg-void border border-hairline p-8 w-full max-w-md ${isEven ? 'md:hidden' : ''}`}>
                        <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">{step.desc}</p>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-24 text-center">
          <p className="text-text-secondary text-lg border-b border-hairline inline-block pb-2">
            Ви створюєте контент та ведете учнів. Ці 6 етапів <span className="text-text-primary">ми забираємо на себе.</span> Готові подивитися на свій проєкт збоку?
          </p>
        </div>
      </div>
    </section>
  );
};
