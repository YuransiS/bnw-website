"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export function V3Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      
      tl.from(".hero-elem", {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.2
      });

      // Floating animation for the background elements
      gsap.to(".bg-orb", {
        y: "random(-20, 20)",
        x: "random(-20, 20)",
        rotation: "random(-15, 15)",
        duration: "random(4, 8)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.5
      });
    }, containerRef);
    
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center pt-32 pb-20 overflow-hidden bg-black text-white">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] bg-orb pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neutral-800/30 rounded-full blur-[150px] bg-orb pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10 max-w-5xl">
        <div className="flex flex-col items-center text-center">
          
          <div className="hero-elem inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8">
            <span className="text-xs md:text-sm font-medium tracking-wide text-white/80 uppercase">
              Для експертів, які втомилися тягнути весь запуск на собі
            </span>
          </div>

          <h1 className="hero-elem text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-8" style={{ textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
            Будуємо <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">прибуткову</span> <br className="hidden md:block"/>
            систему навколо вашого контенту
          </h1>

          <p className="hero-elem text-lg md:text-xl text-white/60 max-w-2xl mb-12 font-medium leading-relaxed">
            Перетворюємо хаос у прогнозований дохід. Самі розробляємо стратегію, будуємо воронки та налаштовуємо продажі, поки ви фокусуєтесь на продукті.
          </p>

          <div className="hero-elem flex flex-col items-center mb-16">
            <button className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.25)]">
              Отримати розбір проєкту
            </button>
            <span className="text-sm text-white/40 mt-4 max-w-xs text-center">
              Безкоштовно. Знайдемо точки зростання вашого продукту.
            </span>
          </div>

          <div className="hero-elem grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl border-t border-white/10 pt-10">
            {[
              { label: "Керуємо бюджетами", value: "до $10 000/міс" },
              { label: "Кейс з продажу", value: "$25 000 за 1 тиждень" },
              { label: "Органічний ріст", value: "+80 000 підписників" }
            ].map((fact, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
                <span className="text-2xl md:text-3xl font-black text-white mb-2">{fact.value}</span>
                <span className="text-sm text-white/50">{fact.label}</span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
