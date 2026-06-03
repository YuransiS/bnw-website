"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, X, Check, ShieldCheck } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export function Comparison() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".comparison-header",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: ".comparison-header",
            start: "top 80%",
          }
        }
      );

      gsap.fromTo(
        ".col-left-anim",
        { 
          x: window.innerWidth < 768 ? 0 : -50, 
          y: window.innerWidth < 768 ? 30 : 0, 
          opacity: 0 
        },
        {
          x: 0,
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".col-left-anim",
            start: "top 80%",
          }
        }
      );

      gsap.fromTo(
        ".col-right-anim",
        { 
          x: window.innerWidth < 768 ? 0 : 50, 
          y: window.innerWidth < 768 ? 30 : 0, 
          opacity: 0 
        },
        {
          x: 0,
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".col-right-anim",
            start: "top 80%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative py-24 md:py-32 bg-black text-white overflow-hidden">
      {/* Glow Atmosphere */}
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />
      
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        
        {/* Header */}
        <div className="comparison-header text-center mb-20">
          <span className="text-emerald-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-3 block">
            Філософія підходу
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase mb-6">
            Ми не просто запускаємо рекламу — <br className="hidden md:block"/>
            ми будуємо систему росту проекту
          </h2>
        </div>

        {/* Desktop 2 Columns, Mobile 1 Column */}
        <div className="flex flex-col lg:flex-row gap-12 items-stretch">
          
          {/* Column Left: Fragmented (Majority) */}
          <div className="col-left-anim flex-1 flex flex-col justify-between p-8 md:p-12 rounded-[32px] bg-neutral-950 border border-white/5 relative overflow-hidden">
            {/* Visual background separation effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white/50">
                  Більшість працюють так:
                </h3>
              </div>

              <p className="text-sm md:text-base text-white/40 leading-relaxed font-medium">
                Ви купуєте окремі послуги в різних спеціалістів, які не зв'язані між собою спільною фінансовою метою та стратегією.
              </p>

              {/* Scattered Chaotic boxes */}
              <div className="space-y-4 pt-4">
                <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:border-white/20 transition-all duration-300 transform -rotate-1 hover:rotate-0 flex items-center justify-between">
                  <span className="font-bold text-sm text-white/60">Таргетолог → окремо</span>
                  <span className="text-[10px] uppercase bg-white/5 text-white/40 px-2 py-0.5 rounded font-mono">Немає зв'язку</span>
                </div>
                <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:border-white/20 transition-all duration-300 transform rotate-1 hover:rotate-0 flex items-center justify-between">
                  <span className="font-bold text-sm text-white/60">Контент → окремо</span>
                  <span className="text-[10px] uppercase bg-white/5 text-white/40 px-2 py-0.5 rounded font-mono">Немає зв'язку</span>
                </div>
                <div className="p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:border-white/20 transition-all duration-300 transform -rotate-1 flex items-center justify-between">
                  <span className="font-bold text-sm text-white/60">Продажі → окремо</span>
                  <span className="text-[10px] uppercase bg-white/5 text-white/40 px-2 py-0.5 rounded font-mono">Немає зв'язку</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 text-xs text-white/30 font-semibold italic text-center relative z-10">
              * Результат: кожен підрядник каже «моя хата скраю», окупності немає, експерт тоне в операційці.
            </div>
          </div>

          {/* Column Right: B&W Unified System */}
          <div className="col-right-anim flex-1 flex flex-col justify-between p-8 md:p-12 rounded-[32px] bg-gradient-to-b from-neutral-900/90 to-black border-2 border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden group">
            {/* Elegant glowing neon borders */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/[0.02] to-transparent opacity-100 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
                  Black & White Prod:
                </h3>
              </div>

              <p className="text-sm md:text-base text-white/80 leading-relaxed font-medium">
                Ми об'єднуємо всі елементи в єдиний злагоджений механізм, де кожен крок оцифрований та спрямований на окупність рекламного бюджету.
              </p>

              {/* Single Solid glowing emerald unit */}
              <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="font-extrabold text-sm md:text-base text-white uppercase tracking-wide">
                    Об'єднуємо в єдину систему:
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-2 text-xs md:text-sm font-bold text-white/70">
                  <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Маркетинг</li>
                  <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Контент</li>
                  <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Воронки</li>
                  <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Продажі</li>
                  <li className="flex items-center gap-1.5 lg:col-span-2"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Операційне управління</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-emerald-500/10 text-xs text-emerald-400 font-extrabold uppercase tracking-widest text-center relative z-10">
              ✓ Результат: Повна прозорість, високий ROAS та стабільний прибуток.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
