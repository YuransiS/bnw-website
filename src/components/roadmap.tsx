"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const roadmap = [
  {
    title: "Аналіз та декомпозиція проєкту",
    text: "Зустріч-знайомство, повний аудит ваших активів, виявлення «дірок» у поточній моделі та декомпозиція цілі до конкретних кроків. Ми знаходимо найкоротший шлях до результату."
  },
  {
    title: "Стратегія та підготовка",
    text: "Упаковка сенсів та вашої експертності. Проєктування автоворонок, які працюють на холодний трафік. Ми робимо так, щоб ваш контент і продукт продавали за вас."
  },
  {
    title: "Технічна реалізація",
    text: "Збираємо лендінги, налаштовуємо чат-боти та підключаємо платіжні системи. Створюємо всю інфраструктуру, яка працює системно і без вашої участі."
  },
  {
    title: "Запуск та трафік",
    text: "Керуємо рекламними кампаніями та заливаємо цільовий трафік. Постійно контролюємо окупність (ROI) та оптимізуємо бюджет для максимальної ефективності."
  },
  {
    title: "Робота з продажами",
    text: "Впроваджуємо відділ продажів або покращуємо ефективність вашого. Контролюємо закриття кожної заявки, скрипти та супровід клієнтів до оплати."
  },
  {
    title: "Масштабування та супровід",
    text: "Аналіз усіх показників у наскрізній аналітиці. Системне збільшення рекламного бюджету та масштабування результатів у 2, 5, 10 разів."
  }
];

export function Roadmap() {
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
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">
            Дорожня карта нашої співпраці
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Повний цикл продюсування. Від першого зідзвону до системного масштабування прибутку.
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



      </div>
    </section>
  );
}
