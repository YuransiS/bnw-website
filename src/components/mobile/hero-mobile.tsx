"use client";

import React from "react";
import { motion } from "framer-motion";
import { useModal } from "@/providers/modal-provider";

export function HeroMobile() {
  const { openModal } = useModal();

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col justify-end overflow-hidden bg-black text-white pt-24 pb-8 px-6">
      {/* Layer 1: Ambient Background Glows */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[320px] h-[320px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute top-[25%] left-1/4 w-[160px] h-[160px] bg-emerald-600/5 rounded-full blur-[50px] pointer-events-none z-0" />

      {/* Layer 2: Founders portrait collage with atmospheric depth & overlap */}
      <div className="absolute inset-0 top-[6%] h-[48vh] pointer-events-none z-10 overflow-visible">
        {/* Glowing aura directly behind the portraits to separate them from background */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-400/8 rounded-full blur-3xl pointer-events-none z-0" />

        {/* Victor Portrait (Left vertical, rotated left, z-10) */}
        <motion.div
          initial={{ opacity: 0, x: -40, y: 30, rotate: -8, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: -4, scale: 1 }}
          transition={{ type: "spring", stiffness: 45, damping: 15, delay: 0.2 }}
          className="absolute left-[-15%] top-[10%] w-[320px] h-[420px] z-10 overflow-visible"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)"
          }}
        >
          <img
            src="/assets/victor.webp"
            alt="Віктор"
            className="w-full h-full object-contain grayscale opacity-90 contrast-[1.08] brightness-[0.95]"
            loading="eager"
            decoding="async"
          />
        </motion.div>

        {/* Dmytro Portrait (Right vertical, overlapping Victor, z-20) */}
        <motion.div
          initial={{ opacity: 0, x: 40, y: 40, rotate: 8, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 3, scale: 1 }}
          transition={{ type: "spring", stiffness: 45, damping: 15, delay: 0.3 }}
          className="absolute right-[-10%] top-[16%] w-[300px] h-[400px] z-20 overflow-visible"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 88%)"
          }}
        >
          <img
            src="/assets/dmytro.webp"
            alt="Дмитро"
            className="w-full h-full object-contain grayscale opacity-95 contrast-[1.08] brightness-[0.98]"
            loading="eager"
            decoding="async"
          />
        </motion.div>
      </div>

      {/* Deep gradient overlay behind the text to ensure excellent contrast and readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-transparent z-15 pointer-events-none h-[65%] top-[35%]" />

      {/* Layer 3: Reverted and clean text content, no card outline or rounded boxes */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 50, damping: 15, delay: 0.4 }}
        className="relative z-20 w-full flex flex-col mt-auto"
      >
        {/* Heading: beautifully separated blocks for clear semantic structure */}
        <h1 className="text-[32px] font-black tracking-tighter leading-[1.18] mb-4 text-white" style={{ textShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
          <span className="block mb-2">
            Створюємо під ключ{" "}
            <span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.35)] uppercase">
              систему для експерта
            </span>
          </span>
          <span className="block mb-2">
            яка приносить прибуток{" "}
            <span className="text-emerald-500 whitespace-nowrap">
              $10k–$30k+/місяць
            </span>
          </span>
          <span className="block text-white/90 text-[21px] font-bold tracking-tight mt-3.5 leading-snug">
            через системний маркетинг та продюсування
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/60 text-sm leading-relaxed font-medium mb-7 max-w-xl">
          Беремо на себе стратегію, трафік, воронки, продажі та операційне управління, щоб ви фокусувались на продукті та контенті.
        </p>

        {/* CTA Button Block */}
        <div className="w-full flex flex-col items-center pt-2">
          <button
            onClick={() => openModal("hero_cta")}
            className="w-full py-4.5 rounded-full bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-neutral-200 active:scale-[0.97] transition-all duration-200 shadow-[0_10px_30px_rgba(255,255,255,0.15)] cursor-pointer flex items-center justify-center gap-2"
          >
            Розібрати мій проект
          </button>
          <span className="text-[10px] text-white/35 mt-2.5 font-medium italic block text-center">
            Безкоштовно знайдемо ваші точки росту
          </span>
        </div>
      </motion.div>
    </section>
  );
}
