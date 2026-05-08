"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const cases = [
  {
    title: "Кейс 1",
    niche: "Експерт з маркетингу",
    point_a: "Відсутність системи, низький чек, вигоряння. Запуски на $5k ціною 24/7 залученості.",
    action: "Зібрали воронку, запустили трафік, поставили відділ продажів.",
    point_b: "Масштабування з $5k до $38k. Експерт вийшов з переписок.",
  },
  {
    title: "Кейс 2",
    niche: "Школа англійської",
    point_a: "Хороший контент, але мало продажів. Аудиторія не купувала.",
    action: "Зробили нове позиціювання, прописали скрипти для сейлзів, оптимізували лендінг.",
    point_b: "Конверсія зросла в 3 рази. Зробили $25 000 за 1 тиждень.",
  },
  {
    title: "Кейс 3",
    niche: "Лайфстайл блогер",
    point_a: "Охоплення падали, вигоряння від постійних сторіз, дохід стояв на місці.",
    action: "Запустили системний контент-маркетинг, підключили автоматизованих чат-ботів.",
    point_b: "+80 000 підписників органікою. Стабільний прогнозований дохід.",
  }
];

export function V3Cases() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Horizontal scroll
      const scrollWidth = scrollRef.current?.scrollWidth || 0;
      const windowWidth = window.innerWidth;
      
      gsap.to(scrollRef.current, {
        x: -(scrollWidth - windowWidth + 100), // padding
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${scrollWidth}`,
          scrub: 1,
          pin: true,
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="cases" className="relative h-screen bg-black text-white flex flex-col justify-center overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl relative z-10 mb-12">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
          Не продаємо ідеї. Показуємо цифри.
        </h2>
        <p className="text-xl text-white/50 font-medium">
          Як ми масштабуємо проєкти, поки експерти займаються контентом.
        </p>
      </div>

      <div className="flex pl-6 md:pl-20 items-center h-[60vh]">
        <div ref={scrollRef} className="flex gap-8 md:gap-12 flex-nowrap w-max pr-20">
          {cases.map((c, idx) => (
            <div key={idx} className="w-[85vw] md:w-[600px] shrink-0 p-8 md:p-12 rounded-[32px] bg-neutral-900 border border-white/10 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-10">
                  <span className="text-sm font-bold tracking-widest text-white/40 uppercase bg-white/5 px-4 py-1.5 rounded-full">
                    {c.niche}
                  </span>
                  <span className="text-4xl font-black text-white/10">0{idx + 1}</span>
                </div>
                
                <div className="mb-8">
                  <h4 className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-2">Точка А (До)</h4>
                  <p className="text-lg text-white/80 border-l-2 border-red-500/50 pl-4">
                    {c.point_a}
                  </p>
                </div>

                <div className="mb-8">
                  <h4 className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-2">Що ми зробили</h4>
                  <p className="text-lg text-white/80 border-l-2 border-white/20 pl-4">
                    {c.action}
                  </p>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <h4 className="text-sm text-neutral-500 font-bold uppercase tracking-wider mb-2">Точка Б (Після)</h4>
                <p className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-400 border-l-2 border-green-500/50 pl-4 leading-tight">
                  {c.point_b}
                </p>
              </div>
            </div>
          ))}
          
          <div className="w-[30vw] md:w-[400px] shrink-0 p-12 rounded-[32px] bg-gradient-to-br from-neutral-800 to-black border border-white/5 flex flex-col items-center justify-center text-center">
            <h3 className="text-3xl font-black mb-6">Хочете бути наступним кейсом?</h3>
            <button className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-colors duration-300">
              Отримати розбір
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
