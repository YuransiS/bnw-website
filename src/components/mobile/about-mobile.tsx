"use client";

import React from "react";

const principles = [
  { title: "Цифри замість інтуїції", text: "Ми не масштабуємо те, що «здається класним». Кожне рішення у проєкті спирається на наскрізну аналітику, конверсії та вартість цільової дії." },
  { title: "Гра вдовгу (Win-Win)", text: "Ми не робимо одноразові «випалені» запуски, щоб зірвати куш і зникнути. Наша ціль — побудувати вам інфраструктуру, яка стабільно приноситиме гроші роками." },
  { title: "Партнерство", text: "Ми зацікавлені у довгостроковій сумісній роботі, працюємо офіційно заключаючи договір. Найголовніший показник нашої компанії — це LTV наших клієнтів." }
];

export function AboutMobile() {
  return (
    <section id="about-mob" className="relative py-16 bg-neutral-950 text-white overflow-hidden">
      <div className="container mx-auto px-5 relative z-10">

        <div className="text-center mb-12">
          <h2 className="text-3xl font-black tracking-tight mb-4 uppercase leading-tight">
            Практики, а не теоретики
          </h2>
          <p className="text-sm text-white/50 font-medium">
            Ми не вчимо вас робити запуски. Ми робимо їх за вас: руками збираємо воронки, ллємо трафік та будуємо систему.
          </p>
        </div>

        <div className="space-y-8 mb-16">
          {/* Victor Card */}
          <div className="flex flex-col rounded-3xl overflow-hidden bg-neutral-900 border border-white/5 text-white">
            <div className="w-full min-h-[300px] relative bg-neutral-950">
              <img
                src="/assets/victor.webp"
                alt="Віктор"
                className="w-full h-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-6 flex flex-col justify-center bg-neutral-900">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2 text-emerald-400">
                Co-Founder / 01
              </div>
              <h3 className="text-2xl font-black mb-1 uppercase tracking-tight">
                Віктор
              </h3>

              <a
                href="https://www.instagram.com/victor.petryk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-emerald-500 text-black font-black text-sm active:scale-[0.98] transition-all duration-200 shadow-[0_5px_15px_rgba(16,185,129,0.2)] cursor-pointer w-full"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                Instagram Віктора
              </a>
            </div>
          </div>

          {/* Dmytro Card */}
          <div className="flex flex-col rounded-3xl overflow-hidden bg-white text-black">
            <div className="w-full min-h-[300px] relative bg-neutral-100">
              <img
                src="/assets/dmytro.webp"
                alt="Дмитро"
                className="w-full h-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-6 flex flex-col justify-center bg-white">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] mb-2 text-neutral-400">
                Co-Founder / 02
              </div>
              <h3 className="text-2xl font-black mb-1 uppercase tracking-tight">
                Дмитро
              </h3>

              <a
                href="https://www.instagram.com/dimaoleinikkk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-black text-white font-black text-sm active:scale-[0.98] transition-all duration-200 shadow-[0_5px_15px_rgba(0,0,0,0.1)] cursor-pointer w-full"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                Instagram Дмитра
              </a>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-black mb-6 text-center">Принципи нашої роботи</h3>
          <div className="grid grid-cols-1 gap-4">
            {principles.map((p, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 mb-4 rounded-full bg-white/10 flex items-center justify-center text-base font-black">
                  0{idx + 1}
                </div>
                <h4 className="text-lg font-bold mb-2">{p.title}</h4>
                <p className="text-white/60 leading-relaxed text-xs">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
