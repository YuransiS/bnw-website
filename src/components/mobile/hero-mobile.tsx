"use client";

import React from "react";
import { motion } from "framer-motion";
import { useModal } from "@/providers/modal-provider";

export function HeroMobile() {
  const { openModal } = useModal();

  return (
    <section className="relative min-h-[100dvh] w-full flex flex-col justify-end overflow-hidden bg-black text-white pt-24 pb-8 px-6">
      {/* Premium Background Image - Full Screen Depth */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep masking for cinematic blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent z-10" />

        <img
          src="https://mfyrftpdhprjyouyjecd.supabase.co/storage/v1/object/public/assets/hero-bg-mobile.png"
          alt="B&W Premium Background Mobile"
          className="w-full h-full object-cover opacity-85"
          loading="eager"
          decoding="async"
        />
      </div>

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
              систему
            </span>
          </span>
          <span className="block mb-2">
            яка приносить прибуток{" "}
            <span className="text-emerald-500 whitespace-nowrap">
              $10k–$30k+/місяць
            </span>
          </span>
          <span className="block text-white/90">
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
