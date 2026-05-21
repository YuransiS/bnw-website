"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const expertiseList = [
  {
    title: "Стратегія та Контент",
    subtitle: "Фундамент вашого росту",
    text: "Проводимо глибокий аналіз поточної моделі, упаковуємо бренд та продукт. Створюємо сценарії для прогрівів, готуємо рекламні креативи та працюємо з вашою медійністю. Ми знімаємо головний біль «що знімати, щоб купували».",
    image: "/assets/exp-strategy.png"
  },
  {
    title: "Технічна інфраструктура",
    subtitle: "Система, що працює 24/7",
    text: "Збираємо лендінги та проєктуємо складні автоворонки. Налаштовуємо чат-боти, підключаємо платіжні системи та вибудовуємо архітектуру повідомлень, яка гріє та конвертує холодний трафік без вашої участі.",
    image: "/assets/exp-tech.png"
  },
  {
    title: "Трафік та Продажі",
    subtitle: "Твердий результат у цифрах",
    text: "Заливаємо цільовий трафік та керуємо рекламними кампаніями. Наш відділ продажів обробляє заявки за скриптами та супроводжує лідів до оплати. Ми контролюємо кожен показник (ROI, ROMI) та системно масштабуємо прибуток.",
    image: "/assets/exp-traffic.png"
  }
];

export function Expertise() {
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

      // Stacked cards scaling effect
      cardsRef.current.forEach((card, index) => {
        if (!card || index === cardsRef.current.length - 1) return;
        
        // As the NEXT card comes into view, scale this one down
        const nextCard = cardsRef.current[index + 1];
        
        gsap.to(card, {
          scale: 0.9,
          opacity: 0.3,
          ease: "none",
          scrollTrigger: {
            trigger: nextCard,
            start: "top 80%", // When next card starts coming up
            end: "top 20%",   // When next card hits the sticky point
            scrub: true,
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
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">
            Який спектр робіт ми закриваємо?
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Працюємо з гібридною та холодною моделлю запусків, забираючи на себе всі стратегічні, маркетингові і технічні моменти.
          </p>
        </div>

        <div className="relative flex flex-col gap-12">
          {expertiseList.map((item, idx) => (
            <div
              key={idx}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="sticky top-32 w-full min-h-[60vh] flex flex-col justify-center p-10 md:p-16 rounded-[40px] bg-neutral-900 border border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] origin-top will-change-transform group overflow-hidden hover:border-emerald-500/30 transition-all duration-500"
              style={{ zIndex: idx + 1 }}
            >
              {/* Glass Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              <div className="flex flex-col md:flex-row gap-12 items-start md:items-center relative z-10">
                <div className="flex-1">
                  <div className="text-sm font-bold tracking-widest text-white/40 uppercase mb-4">
                    Напрямок 0{idx + 1}
                  </div>
                  <h3 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-tighter">
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
                
                <div className="hidden lg:flex w-1/3 justify-center items-center">
                  <div className="relative w-64 h-64 rounded-full overflow-hidden border border-white/5 shadow-2xl">
                    {/* Emerald Glow Aura */}
                    <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 scale-110 group-hover:scale-100 relative z-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-[5vh]" /> {/* Depth spacer for sticky stack */}

      </div>
    </section>
  );
}
