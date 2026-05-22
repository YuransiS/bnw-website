"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const newPains = [
  {
    title: "Усе тримається на експерті",
    text: "Втомились бути виконавцем, хочете стати підприємцем, але розумієте, що без вас зараз бізнес зупиняється."
  },
  {
    title: "Підрядники не дають результат",
    text: "Таргет, контент і продажі не працюють як система, ви не розумієте, як вийти на новий рівень. Будь-які спроби залити більше трафіку не дають кратного росту прибутку."
  },
  {
    title: "Хаос у маркетингу",
    text: "Немає чіткої стратегії та аналітики, результати складно спрогнозувати та повторити."
  },
  {
    title: "Немає команди",
    text: "Щоб масштабуватись — потрібно будувати систему, де кожен вкладений 1$ буде приносити 5–10–15$."
  }
];

export function Pains() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        ".pains-header",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: ".pains-header",
            start: "top 80%",
          }
        }
      );

      // Card isometric entrance animations
      cardsRef.current.forEach((card, idx) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
            },
            delay: idx * 0.1
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} id="pains" className="relative py-24 md:py-32 bg-black text-white overflow-hidden">
      {/* Background Aura Orbs */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-white/[0.01] rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-0 w-96 h-96 bg-emerald-500/[0.02] rounded-full blur-[130px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        
        {/* Section Header */}
        <div className="pains-header text-center mb-20">
          <span className="text-emerald-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-3 block">
            Ваш поточний стан
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            Чому більшість експертів <br className="hidden md:block"/> не можуть системно рости?
          </h2>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Якщо ви впізнали себе хоча б в одному з цих пунктів — ви продовжуєте втрачати прибуток через хаотичні дії.
          </p>
        </div>

        {/* 2x2 Grid Desktop, 1 Column Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {newPains.map((pain, idx) => (
            <div
              key={idx}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="group relative p-8 md:p-12 rounded-[32px] bg-neutral-900/95 md:bg-neutral-900/40 border border-white/5 backdrop-blur-none md:backdrop-blur-xl hover:bg-neutral-900/80 hover:border-emerald-500/20 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-500 flex flex-col justify-between"
            >
              {/* Radial gradient shine hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-750 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] rounded-[32px] pointer-events-none" />
              
              <div className="space-y-6 relative z-10">
                {/* Accent count dot */}
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg font-black text-white group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors duration-300">
                  0{idx + 1}
                </div>
                
                <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors duration-300">
                  {pain.title}
                </h3>
                
                <p className="text-base md:text-lg text-white/60 leading-relaxed font-medium">
                  {pain.text}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
