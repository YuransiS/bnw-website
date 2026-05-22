"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { useModal } from "@/providers/modal-provider";

export function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const { openModal } = useModal();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power4.out" }
      );
    }, headerRef);

    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 w-full z-50 py-4 px-6 md:px-12 flex justify-between items-center backdrop-blur-none md:backdrop-blur-xl border-b border-white/5 bg-black/90 md:bg-black/40"
    >
      <div className="text-xl md:text-2xl font-black tracking-tighter text-white">
        B&W <span className="text-white/50">Prod</span>
      </div>
      
      <nav className="hidden lg:flex gap-8 items-center text-sm font-medium text-white/70">
        <a href="#pains" className="hover:text-white transition-colors duration-300">Проблеми</a>
        <a href="#expertise" className="hover:text-white transition-colors duration-300">Експертиза</a>
        <a href="#cases" className="hover:text-white transition-colors duration-300">Кейси</a>
        <a href="#about" className="hover:text-white transition-colors duration-300">Команда</a>
      </nav>

      <button 
        onClick={() => openModal("header_cta")}
        className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-colors duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] whitespace-nowrap cursor-pointer"
      >
        Розібрати мій проект
      </button>
    </header>
  );
}
