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
    theme: "dark"
  },
  {
    name: "Дмитро",
    role: "Сенси та продажі",
    desc: "Співзасновник. Відповідає за «м'яке»: прогріви, дожими, продажі та розпаковку експертності. Особисто закривав угоди на $25 000 за тиждень та згенерував +80 000 підписників органікою. Знає, як конвертувати лояльність аудиторії в реальні гроші.",
    theme: "light"
  }
];

const principles = [
  { title: "Цифри замість інтуїції", text: "Ми не масштабуємо те, що «здається класним». Кожне рішення у проєкті спирається на наскрізну аналітику, конверсії та вартість цільової дії." },
  { title: "Гра вдовгу (Win-Win)", text: "Ми не робимо одноразові «випалені» запуски, щоб зірвати куш і зникнути. Наша ціль — побудувати вам інфраструктуру, яка стабільно приноситиме гроші роками." },
  { title: "Партнерство в контенті", text: "Ми знімаємо з вас проблему «що сьогодні знімати, щоб купили». Ми готуємо сценарні плани, допомагаємо з упаковкою смислів та підказуємо робочі формати. Вам не потрібно вигадувати прогріви з нуля." }
];

export function V3About() {
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
      <div className="container mx-auto px-6 max-w-6xl">
        
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
            Практики, а не теоретики
          </h2>
          <p className="text-xl text-white/50 max-w-3xl mx-auto font-medium">
            Ми не вчимо вас робити запуски. Ми робимо їх за вас: руками збираємо воронки, ллємо трафік та будуємо систему.
          </p>
        </div>

        <div className="mb-24">
          <p className="text-center text-lg md:text-xl font-bold text-white/80 mb-12 max-w-2xl mx-auto">
            Ми як чорне та біле — абсолютні протилежності, які закривають 100% циклу. Тверда системність Віктора та емоційні продажі Дмитра стали фундаментом для B&W Prod.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-[40px] overflow-hidden shadow-2xl border border-white/10">
            {team.map((member, idx) => (
              <div 
                key={idx} 
                className={`p-12 md:p-16 flex flex-col justify-center ${
                  member.theme === 'dark' 
                    ? 'bg-black text-white' 
                    : 'bg-white text-black'
                }`}
              >
                <h3 className="text-4xl font-black mb-2">{member.name}</h3>
                <h4 className={`text-xl font-bold mb-8 uppercase tracking-widest ${
                  member.theme === 'dark' ? 'text-white/40' : 'text-black/40'
                }`}>
                  {member.role}
                </h4>
                <p className={`text-lg leading-relaxed ${
                  member.theme === 'dark' ? 'text-white/70' : 'text-black/70'
                }`}>
                  {member.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-8 md:p-12 rounded-3xl bg-neutral-900 border border-white/5 text-center">
            <h3 className="text-2xl font-bold mb-4">Команда реалізації (Бек-офіс)</h3>
            <p className="text-white/60 text-lg max-w-4xl mx-auto">
              За нами стоїть штат профільних спеціалістів — від техліда і дизайнера до таргетолога та відділу продажів. Ми розробляємо стратегію, а наша команда своїми руками верстає сайти, збирає ботів та дотискає лідів. Ви отримуєте повноцінний production-відділ під ключ.
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
