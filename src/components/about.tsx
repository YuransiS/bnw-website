"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const team = [
  {
    name: "Віктор",
    role: "Системи та аналітика",
    desc: "Співзасновник. Відповідає за «тверде»: цифри, метрики, архітектуру запусків та окупність. Керував запусками з обертом до $100 000. Будує продуктові лінійки та інфраструктуру, де все піддається оцифруванню, логіці та суворій аналітиці.",
    theme: "dark",
    image: "/assets/viktor.jpg"
  },
  {
    name: "Дмитро",
    role: "Сенси та продажі",
    desc: "Співзасновник. Відповідає за «м'яке»: прогріви, дожими, продажі та розпаковку експертності. Особисто закривав угоди на $25 000 за тиждень та згенерував +80 000 підписників органікою. Знає, як конвертувати лояльність аудиторії в реальні гроші.",
    theme: "light",
    image: "/assets/dmytro.webp"
  }
];

const principles = [
  { title: "Цифри замість інтуїції", text: "Ми не масштабуємо те, що «здається класним». Кожне рішення у проєкті спирається на наскрізну аналітику, конверсії та вартість цільової дії." },
  { title: "Гра вдовгу (Win-Win)", text: "Ми не робимо одноразові «випалені» запуски, щоб зірвати куш і зникнути. Наша ціль — побудувати вам інфраструктуру, яка стабільно приноситиме гроші роками." },
  { title: "Партнерство в контенті", text: "Ми знімаємо з вас проблему «що сьогодні знімати, щоб купили». Ми готуємо сценарні плани, допомагаємо з упаковкою смислів та підказуємо робочі формати. Вам не потрібно вигадувати прогріви з нуля." }
];

export function About() {
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
          <p className="text-xl text-white/50 max-w-3xl mx-auto font-medium">
            Ми не вчимо вас робити запуски. Ми робимо їх за вас: руками збираємо воронки, ллємо трафік та будуємо систему.
          </p>
        </div>

        <div className="mb-24">
          <p className="text-center text-lg md:text-xl font-bold text-white/80 mb-16 max-w-3xl mx-auto leading-relaxed">
            Ми як чорне та біле — абсолютні протилежності, які закривають 100% циклу. Тверда системність Віктора та емоційні продажі Дмитра стали фундаментом для B&W Prod.
          </p>

          <div className="flex flex-col gap-12 mb-16">
            {/* Victor Card */}
            <div className="flex flex-col md:flex-row rounded-[40px] overflow-hidden bg-neutral-900 border border-white/5 text-white transition-all duration-500 hover:border-emerald-500/20 group">
              <div className="w-full md:w-5/12 min-h-[350px] md:h-[450px] relative overflow-hidden bg-neutral-950">
                <img
                  src="/assets/victor.png"
                  alt="Віктор"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-700"
                />
              </div>
              <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-neutral-900">
                <div className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-emerald-400">
                  Co-Founder / 01
                </div>
                <h3 className="text-4xl md:text-5xl font-black mb-2 uppercase tracking-tighter leading-tight">
                  Віктор
                </h3>
                <h4 className="text-lg md:text-xl font-bold mb-6 uppercase tracking-widest text-emerald-400/70">
                  Системи та аналітика
                </h4>
                <p className="text-base md:text-lg leading-relaxed text-white/60 group-hover:text-white/80 transition-colors duration-300">
                  Співзасновник. Відповідає за «тверде»: цифри, метрики, архітектуру запусків та окупність. Керував запусками з обертом до $100 000. Будує продуктові лінійки та інфраструктуру, де все піддається оцифруванню, логіці та суворій аналітиці.
                </p>
              </div>
            </div>

            {/* Dmytro Card */}
            <div className="flex flex-col md:flex-row-reverse rounded-[40px] overflow-hidden bg-white text-black transition-all duration-500 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] group">
              <div className="w-full md:w-5/12 min-h-[350px] md:h-[450px] relative overflow-hidden bg-neutral-100">
                <img
                  src="/assets/dmytro.webp"
                  alt="Дмитро"
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-all duration-700"
                />
              </div>
              <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-white">
                <div className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-neutral-400">
                  Co-Founder / 02
                </div>
                <h3 className="text-4xl md:text-5xl font-black mb-2 uppercase tracking-tighter leading-tight">
                  Дмитро
                </h3>
                <h4 className="text-lg md:text-xl font-bold mb-6 uppercase tracking-widest text-neutral-500">
                  Сенси та продажі
                </h4>
                <p className="text-base md:text-lg leading-relaxed text-black/60 group-hover:text-black/80 transition-colors duration-300">
                  Співзасновник. Відповідає за «м&apos;яке»: прогріви, дожими, продажі та розпаковку експертності. Особисто закривав угоди на $25 000 за тиждень та згенерував +80 000 підписників органікою. Знає, як конвертувати лояльність аудиторії в реальні гроші.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 p-10 md:p-14 rounded-[40px] bg-neutral-900/50 border border-white/10 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <h3 className="text-2xl md:text-3xl font-black mb-6 uppercase tracking-tighter">Команда реалізації</h3>
            <p className="text-white/60 text-lg md:text-xl max-w-4xl leading-relaxed">
              За нами стоїть штат профільних спеціалістів — від техліда і дизайнера до таргетолога та відділу продажів. Ми розробляємо стратегію, а наша команда своїми руками верстає сайти, збирає ботів та супроводжує лідів до оплати. Ви отримуєте повноцінний production-відділ під ключ.
            </p>
          </div>
        </div>

        <div className="principles-container">
          <h3 className="text-3xl font-black mb-12 text-center">Принципи нашої роботи</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {principles.map((p, idx) => (
              <div key={idx} className="principle-card p-8 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-colors duration-300">
                <div className="w-12 h-12 mb-6 rounded-full bg-white/10 flex items-center justify-center text-xl font-black">
                  0{idx + 1}
                </div>
                <h4 className="text-xl font-bold mb-4">{p.title}</h4>
                <p className="text-white/60 leading-relaxed">{p.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
