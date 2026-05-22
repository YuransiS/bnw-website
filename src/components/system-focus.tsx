"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function SystemFocus() {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        elementRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: elementRef.current,
            start: "top 85%",
          }
        }
      );
    }, elementRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="relative py-24 md:py-32 bg-black text-white overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div
          ref={elementRef}
          className="text-center max-w-4xl mx-auto p-8 md:p-16 rounded-[32px] bg-gradient-to-b from-neutral-900/60 to-black/40 border border-white/10 shadow-2xl backdrop-blur-xl"
        >
          <p className="text-xl md:text-3xl lg:text-4xl font-bold text-white/90 leading-snug md:leading-relaxed">
            Ми створюємо систему, де експерт зосереджується лише на{" "}
            <span className="text-white">створенні контенту і роботі з учнями</span>{" "}
            <span className="text-emerald-500 font-extrabold block md:inline mt-2 md:mt-0 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              — все інше на нас.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
