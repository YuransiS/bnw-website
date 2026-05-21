"use client";

import React from "react";
import { useModal } from "@/providers/modal-provider";

export function DositTiahnuti() {
  const { openModal } = useModal();
  return (
    <section className="relative py-24 bg-neutral-950 text-white overflow-hidden">
      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="flex flex-col items-center text-center p-12 md:p-24 rounded-[40px] bg-gradient-to-b from-neutral-900 to-black border border-white/5 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-500">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent opacity-50 pointer-events-none transition-all duration-700 group-hover:from-emerald-500/10" />
          
          <h2 className="relative text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight uppercase">
            Досить тягнути весь запуск <br className="hidden md:block" /> на собі
          </h2>
          
          <p className="relative text-xl md:text-2xl text-white/70 max-w-2xl mx-auto mb-10 font-bold leading-relaxed">
            Розберемо ваш проект та покажемо точки росту
          </p>
          
          <button 
            onClick={() => openModal("mid_banner_cta")}
            className="relative px-10 py-5 rounded-full bg-white text-black font-bold text-xl hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.25)] whitespace-nowrap cursor-pointer"
          >
            Розібрати мій проект
          </button>
        </div>
      </div>
    </section>
  );
}
