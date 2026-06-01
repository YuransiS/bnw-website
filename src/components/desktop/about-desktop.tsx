"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const principles = [
  { title: "Цифри замість інтуїції", text: "Ми не масштабуємо те, що «здається класним». Кожне рішення у проєкті спирається на наскрізну аналітику, конверсії та вартість цільової дії." },
  { title: "Гра вдовгу (Win-Win)", text: "Ми не робимо одноразові «випалені» запуски, щоб зірвати куш і зникнути. Наша ціль — побудувати вам інфраструктуру, яка стабільно приноситиме гроші роками." },
  { title: "Партнерство", text: "Ми зацікавлені у довгостроковій сумісній роботі, працюємо офіційно заключаючи договір. Найголовніший показник нашої компанії — це LTV наших клієнтів." }
];

export function AboutDesktop() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".principle-card",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.2,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".principles-container",
            start: "top 80%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} id="about" className="relative py-32 bg-neutral-950 text-white overflow-hidden">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">

        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">
            Практики, а не теоретики
          </h2>
          <p className="text-xl text-white/55 max-w-3xl mx-auto font-medium">
            Ми не вчимо вас робити запуски. Ми робимо їх за вас: руками збираємо воронки, ллємо трафік та будуємо систему.
          </p>
        </div>

        <div className="mb-24">
          <div className="flex flex-col gap-12 mb-16">
            {/* Victor Card */}
            <div className="flex flex-row rounded-[40px] overflow-hidden bg-neutral-900 border border-white/5 text-white transition-all duration-500 hover:border-emerald-500/20 group">
              <div className="w-5/12 h-[450px] relative overflow-hidden bg-neutral-950">
                <img
                  src="https://mfyrftpdhprjyouyjecd.supabase.co/storage/v1/object/public/assets/victor.webp"
                  alt="Віктор"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-700"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="w-7/12 p-12 flex flex-col justify-center bg-neutral-900">
                <div className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-emerald-400">
                  Co-Founder / 01
                </div>
                <h3 className="text-4xl md:text-5xl font-black mb-2 uppercase tracking-tighter leading-tight">
                  Віктор
                </h3>

                <a
                  href="https://www.instagram.com/victor.petryk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-emerald-500 text-black font-black hover:bg-emerald-400 hover:scale-[1.03] active:scale-95 transition-all duration-300 shadow-[0_10px_30px_rgba(16,185,129,0.25)] cursor-pointer w-fit"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                  Instagram Віктора
                </a>
              </div>
            </div>

            {/* Dmytro Card */}
            <div className="flex flex-row-reverse rounded-[40px] overflow-hidden bg-white text-black transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] group">
              <div className="w-5/12 h-[450px] relative overflow-hidden bg-neutral-100">
                <img
                  src="https://mfyrftpdhprjyouyjecd.supabase.co/storage/v1/object/public/assets/dmytro.webp"
                  alt="Дмитро"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-700"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="w-7/12 p-12 flex flex-col justify-center bg-white">
                <div className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-neutral-400">
                  Co-Founder / 02
                </div>
                <h3 className="text-4xl md:text-5xl font-black mb-2 uppercase tracking-tighter leading-tight">
                  Дмитро
                </h3>

                <a
                  href="https://www.instagram.com/dimaoleinikkk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full bg-black text-white font-black hover:bg-neutral-900 hover:scale-[1.03] active:scale-95 transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-neutral-800 cursor-pointer w-fit"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                  Instagram Дмитра
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="principles-container">
          <h3 className="text-3xl font-black mb-12 text-center">Принципи нашої роботи</h3>
          <div className="grid grid-cols-3 gap-6">
            {principles.map((p, idx) => (
              <div key={idx} className="principle-card p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors duration-300">
                <div className="w-12 h-12 mb-6 rounded-full bg-white/10 flex items-center justify-center text-xl font-black">
                  0{idx + 1}
                </div>
                <h4 className="text-xl font-bold mb-4">{p.title}</h4>
                <p className="text-white/60 leading-relaxed text-sm">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
