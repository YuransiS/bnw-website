"use client";

import React from "react";
import { useModal } from "@/providers/modal-provider";

export function FinalCTA() {
  const { openModal } = useModal();
  return (
    <section className="relative py-28 bg-neutral-950 text-white overflow-hidden border-t border-white/5">
      {/* Dynamic background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-4xl relative z-10 text-center">
        
        <div className="mb-12">
          <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-emerald-400">
            Готові побудувати систему?
          </h2>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => openModal("final_cta")}
            className="px-12 py-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xl md:text-2xl transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(16,185,129,0.3)] whitespace-nowrap cursor-pointer"
          >
            Розібрати мій проект
          </button>
        </div>
      </div>
    </section>
  );
}
