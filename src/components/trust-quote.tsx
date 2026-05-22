"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function TrustQuote() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".quote-anim",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power3.out",
          stagger: 0.2,
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
    <section ref={containerRef} className="relative py-24 bg-black text-white overflow-hidden">
      {/* Background Aura */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-5xl relative z-10">
        <div className="relative border-l-4 border-emerald-500 pl-8 md:pl-16 py-4">
          {/* Big Quote Icon background */}
          <div className="absolute -left-4 -top-8 text-emerald-500/10 text-9xl font-serif select-none pointer-events-none quote-anim">
            “
          </div>

          <blockquote className="space-y-6">
            <p className="quote-anim text-2xl md:text-4xl font-extrabold tracking-tight leading-snug md:leading-normal text-white/95">
              «Нам довіряють тому, що ми беремо на себе{" "}
              <span className="text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                відповідальність за результат
              </span>
              : разом з вами ми затверджуємо план продажів та працюємо до досягнення максимального результату»
            </p>
            <footer className="quote-anim flex items-center gap-3 text-white/50 text-sm md:text-base font-medium uppercase tracking-wider">
              <span className="w-8 h-px bg-white/30 block" />
              Команда Black & White Prod
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
