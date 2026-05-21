"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useModal } from "@/providers/modal-provider";

gsap.registerPlugin(ScrollTrigger);

const metricsData = [
  { label: "Досвіду", value: "5+ років" },
  { label: "Виручка", value: "$15k–$50k" },
  { label: "Оборот", value: "$100k+" },
  { label: "ROAS", value: "300%+" }
];

export function Metrics() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { openModal } = useModal();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".metric-card",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.1,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative py-20 bg-black text-white overflow-hidden border-t border-b border-white/5">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="flex flex-col items-center gap-12">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            {metricsData.map((fact, idx) => (
              <div
                key={idx}
                className="metric-card flex flex-col items-center text-center p-6 rounded-2xl bg-neutral-900/40 border border-white/5 backdrop-blur-md hover:bg-neutral-900/80 hover:border-emerald-500/20 transition-all duration-300"
              >
                <span className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                  {fact.value}
                </span>
                <span className="text-[10px] md:text-xs text-white/40 uppercase tracking-widest font-bold">
                  {fact.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA Button Block */}
          <div className="metric-card w-full flex flex-col items-center">
            <button 
              onClick={() => openModal("metrics_cta")}
              className="w-full md:w-auto px-10 py-5 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.25)] cursor-pointer"
            >
              Розібрати мій проект
            </button>
            <span className="text-xs text-white/40 mt-3 font-medium italic">
              Безкоштовно знайдемо ваші точки росту
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
