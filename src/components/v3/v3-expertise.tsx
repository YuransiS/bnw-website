"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const expertiseList = [
  {
    title: "Команда під ключ",
    subtitle: "(Продюсування)",
    text: "Замість пошуку підрядників ви отримуєте готову команду повного циклу. Від технарів до сейлзів — ми закриваємо всі процеси і повністю витягуємо вас із мікроменеджменту та рутини. Ви залишаєтеся зіркою та мозком продукту, а ми прописуємо стратегію, пакуємо сенси і контролюємо кожен етап запуску."
  },
  {
    title: "Автоматизовані воронки та лендінги",
    subtitle: "",
    text: "Виводимо продажі з ручних переписок. Проєктуємо сайти, збираємо чат-ботів та вибудовуємо архітектуру повідомлень, які гріють і конвертують трафік у гроші 24/7 без вашої участі."
  },
  {
    title: "Маркетинг, трафік та відділ продажів",
    subtitle: "",
    text: "Беремо на себе залучення та закриття лідів. Пишемо сценарії для прогрівів, керуємо рекламними кампаніями та контролюємо окупність трафіку. Наш відділ продажів обробляє заявки та дотискає клієнтів за скриптами, остаточно виводячи вас із переписок."
  }
];

export function V3Expertise() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header fade in
      gsap.fromTo(
        ".exp-header",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: ".exp-header",
            start: "top 80%",
          }
        }
      );

      // Stacked cards effect
      cardsRef.current.forEach((card, index) => {
        if (!card) return;
        gsap.to(card, {
          scale: 1 - (cardsRef.current.length - 1 - index) * 0.05,
          y: (cardsRef.current.length - 1 - index) * -20,
          opacity: 0.5,
          scrollTrigger: {
            trigger: card,
            start: "top 20%", // When card hits the sticky top
            endTrigger: ".expertise-end",
            end: "bottom top",
            scrub: true,
            pin: true,
            pinSpacing: false
          }
        });
      });
      
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} id="expertise" className="relative py-32 bg-neutral-950 text-white">
      <div className="container mx-auto px-6 max-w-5xl">
        
        <div className="exp-header text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
            Як ми забираємо ваш хаос
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">
            3 інструменти, якими ми будуємо вашу автономність.
          </p>
        </div>

        <div className="relative pb-32">
          {expertiseList.map((item, idx) => (
            <div
              key={idx}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="relative w-full min-h-[50vh] flex flex-col justify-center p-10 md:p-16 mb-8 rounded-[40px] bg-neutral-900 border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] origin-top will-change-transform"
              style={{ zIndex: idx }}
            >
              <div className="flex flex-col md:flex-row gap-12 items-start md:items-center">
                <div className="flex-1">
                  <div className="text-sm font-bold tracking-widest text-white/40 uppercase mb-4">
                    Інструмент 0{idx + 1}
                  </div>
                  <h3 className="text-3xl md:text-5xl font-black mb-2">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <span className="text-xl md:text-2xl text-white/50 font-bold block mb-6">
                      {item.subtitle}
                    </span>
                  )}
                  <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mt-6">
                    {item.text}
                  </p>
                </div>
                
                {/* Decorative right side - could be an abstract 3D shape or graphic */}
                <div className="hidden lg:flex w-1/3 justify-center items-center opacity-20">
                  <div className="w-48 h-48 rounded-full border border-white/20 flex items-center justify-center">
                     <div className="w-32 h-32 rounded-full border border-white/40 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/10" />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="expertise-end" />
        </div>

        <div className="exp-header mt-12 flex flex-col items-center text-center">
          <p className="text-xl font-medium text-white/60 mb-8">
            Це не теорія. Дивіться цифри реальних запусків ↓
          </p>
          <button className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-colors duration-300 shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            Хочу таку систему
          </button>
        </div>

      </div>
    </section>
  );
}
