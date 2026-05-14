"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const cases = [
  {
    title: "Кейс 1",
    niche: "Експерт по візуалу",
    point_a: "Хороший контент, але немає системних продажів та мало прибутку",
    action: "Повний перезапуск: новий продукт, нові воронки, потужні лендінги та продажі",
    point_b: "Конверсія зросла в 4 рази. Зробили $25 000 за 6 тижднів",
    avatar: "/assets/expert-victoria.jpg"
  },
  {
    title: "Кейс 2",
    niche: "AI-креатор",
    point_a: "Гарна аудиторія, відсутність основного продукту, продажі на 20к за 3 місяці",
    action: "Проведення глибиних інтервью, упаковка основного продукту, будування повноцінних воронок продажів",
    point_b: "$10 000 за 2 тижні, повний солд аут на двох тарифах, новий потужний продукт",
    avatar: "/assets/expert-pix.jpg"
  },
  {
    title: "Кейс 3",
    niche: "Експерт з тейпування",
    point_a: "Гарна аудиторія, відсутність основного продукту, продажі на 20к за 3 місяці",
    action: "Проведення глибиних інтервью, упаковка основного продукту, будування повноцінних воронок продажів",
    point_b: "$10 000 за 2 тижні, повний солд аут на двох тарифах, новий потужний продукт",
    avatar: "/assets/expert-svitlana.jpg"
  },
  {
    title: "Кейс 4",
    niche: "Фінансовий експерт",
    point_a: "Хаотичний контент, немає стабільної воронки, дохід $2000-$3000 на місяць",
    action: "Створення флагманського продукту, впровадження автоматизованої воронки в Reels",
    point_b: "Вихід на $15 000 чистого прибутку, окупність трафіку х5",
    avatar: "/assets/expert-sofi.jpg"
  },
  {
    title: "Кейс 5",
    niche: "Бізнес-коуч",
    point_a: "Продажі лише через рекомендації. Немає розуміння, як залучати холодний трафік",
    action: "Упаковка блогу, створення лід-магніту та автоматизованої воронки у Direct",
    point_b: "$12 000 з першого запуску на холодну аудиторію. Окупність реклами х4",
    avatar: "/assets/expert-vova.jpg"
  }
];

export function Cases() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const scrollWidth = scrollRef.current!.scrollWidth - window.innerWidth + 100;

      gsap.to(scrollRef.current, {
        x: () => -scrollWidth,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: `+=${scrollWidth}`,
          scrub: 1,
          pin: true,
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} id="cases" className="relative h-screen bg-black text-white flex flex-col justify-center overflow-hidden">
      <div className="container mx-auto px-6 max-w-7xl relative z-10 mb-12">
        <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 uppercase">
          Експертність
        </h2>
        <p className="text-xl text-white/50 max-w-2xl font-medium">
          Наш досвід: ми допомагаємо експертам та бізнесам масштабуватися через воронки продажів та системний підхід.
        </p>
      </div>

      <div ref={scrollRef} className="flex gap-8 px-6 md:px-[calc((100vw-1280px)/2)]">
        {cases.map((item, index) => (
          <div key={index} className="flex-shrink-0 w-[350px] md:w-[450px] aspect-[4/5] bg-zinc-900/50 border border-white/5 p-8 rounded-3xl flex flex-col justify-between group hover:bg-zinc-800/50 transition-colors duration-500 backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <img src={item.avatar} alt={item.niche} className="w-16 h-16 rounded-full object-cover border-2 border-white/10" />
                <div>
                  <h3 className="font-bold text-lg leading-tight">{item.title}</h3>
                  <p className="text-sm text-white/40">{item.niche}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Точка А</p>
                  <p className="text-sm font-medium leading-relaxed">{item.point_a}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Що зробили</p>
                  <p className="text-sm font-medium leading-relaxed">{item.action}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-blue-500 mb-1 font-bold">Точка Б (Результат)</p>
              <p className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">{item.point_b}</p>
            </div>
          </div>
        ))}

        <div className="flex-shrink-0 w-[350px] md:w-[450px] aspect-[4/5] bg-white/5 border border-white/10 p-8 rounded-3xl flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-500">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </div>
            <h3 className="text-3xl md:text-4xl font-black mb-8 uppercase tracking-tighter leading-tight">Стати нашим <br/> наступним кейсом</h3>
            <button className="px-10 py-5 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              Зв'язатися з нами
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
