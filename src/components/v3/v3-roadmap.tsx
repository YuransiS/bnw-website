"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const roadmap = [
  {
    title: "Аналіз та стратегія",
    text: "Вивертаємо вашу поточну модель навиворіт. Знаходимо \"дірки\", де ви втрачаєте гроші, аналізуємо активи та складаємо покрокову стратегію запуску. Жодної інтуїції — лише цифри та факти."
  },
  {
    title: "Пакування бренду та продукту",
    text: "Докручуємо продуктову лінійку та сенси. Робимо так, щоб ваш контент і продукт викликали бажання купити ще до прямого продажу. Створюємо позиціювання, яке дозволяє продавати на високі чеки."
  },
  {
    title: "Побудова воронок продажів",
    text: "Переносимо продажі з ручних переписок у системне русло. Збираємо лендінги, налаштовуємо чат-ботів, підключаємо платіжки та вибудовуємо архітектуру, яка гріє трафік 24/7."
  },
  {
    title: "Контент-маркетинг та трафік",
    text: "Пишемо сценарії для прогрівів та заливаємо цільовий трафік. Керуємо рекламними кампаніями та оптимізуємо бюджет, щоб кожен вкладений долар давав максимальну окупність (ROI)."
  },
  {
    title: "Відділ продажів",
    text: "Ви більше не працюєте сейлзом у власному проєкті. Наші фахівці впроваджують скрипти, обробляють заявки та екологічно дотискають лідів до оплати."
  },
  {
    title: "Аналітика та масштабування",
    text: "Зводимо всі дані в наскрізну аналітику. Відрізаємо неефективні зв'язки, заливаємо більше грошей у те, що працює, і системно масштабуємо ваш прибуток."
  }
];

export function V3Roadmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Progress line animation
      gsap.to(lineRef.current, {
        height: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: ".roadmap-list",
          start: "top 50%",
          end: "bottom 50%",
          scrub: true,
        }
      });

      // Item animations
      itemsRef.current.forEach((item, idx) => {
        if (!item) return;
        const dot = item.querySelector('.roadmap-dot');
        const content = item.querySelector('.roadmap-content');
        
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: "top 60%",
            end: "bottom 40%",
            toggleActions: "play reverse play reverse"
          }
        });

        tl.to(dot, {
          backgroundColor: "#ffffff",
          boxShadow: "0 0 20px rgba(255,255,255,0.8)",
          scale: 1.5,
          duration: 0.3
        })
        .to(content, {
          opacity: 1,
          x: 0,
          duration: 0.5,
          ease: "power3.out"
        }, "<");

        // Initial state for content
        gsap.set(content, { opacity: 0.3, x: idx % 2 === 0 ? 20 : -20 });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative py-32 bg-black text-white">
      <div className="container mx-auto px-6 max-w-5xl">
        
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
            Прозорий шлях до результату
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Повний цикл продюсування. Від першого зідзвону до масштабування прибутку за 6 етапів.
          </p>
        </div>

        <div className="roadmap-list relative max-w-4xl mx-auto">
          {/* Background Line */}
          <div className="absolute left-[40px] md:left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2" />
          
          {/* Animated Fill Line */}
          <div ref={lineRef} className="absolute left-[40px] md:left-1/2 top-0 w-1 bg-white -translate-x-1/2 rounded-full h-0 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />

          {roadmap.map((step, idx) => {
            const isEven = idx % 2 === 0;
            return (
              <div
                key={idx}
                ref={(el) => { itemsRef.current[idx] = el; }}
                className={`relative flex items-center mb-16 last:mb-0 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              >
                {/* Dot */}
                <div className="absolute left-[40px] md:left-1/2 w-4 h-4 rounded-full bg-neutral-800 border-2 border-white/20 -translate-x-1/2 z-10 roadmap-dot transition-colors duration-300" />
                
                {/* Content */}
                <div className={`w-full pl-[80px] md:pl-0 md:w-1/2 ${isEven ? 'md:pr-16 md:text-right' : 'md:pl-16 text-left'} roadmap-content`}>
                  <div className="text-sm font-bold text-white/30 uppercase tracking-widest mb-2">
                    Крок 0{idx + 1}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">{step.title}</h3>
                  <p className="text-white/60 leading-relaxed text-lg">
                    {step.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-32 text-center max-w-3xl mx-auto p-10 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
          <p className="text-xl md:text-2xl font-medium text-white/80 mb-8">
            Ви створюєте контент та ведете учнів. Ці 6 етапів ми забираємо на себе. 
            <br className="hidden md:block"/>
            <span className="font-bold text-white">Готові подивитися на свій проєкт збоку?</span>
          </p>
          <button className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            Записатись на розбір
          </button>
        </div>

      </div>
    </section>
  );
}
