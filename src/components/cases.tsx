"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useModal } from "@/providers/modal-provider";

gsap.registerPlugin(ScrollTrigger);

const casesData = [
  {
    name: "Віка",
    niche: "Експерт по візуалу",
    point_a: "Останні запуски на 2–3к$, вигоріла аудиторія, мало заявок, продажі в переписці з низькою конверсією, тягнула все на собі",
    point_b: "1 987 000 грн ($45 000) продажів за останні 3 місяці",
    avatar: "/assets/expert-victoria.jpg",
    instagram: "https://www.instagram.com/victoria_meshcheriakova/"
  },
  {
    name: "Світа",
    niche: "Експерт з тейпування",
    point_a: "Останні запуски на 2–3к$, заявки є, але продажі в переписці з низькою конверсією, кожен запуск = вигорання",
    point_b: "1 473 000 грн ($33 355) за 3 місяці",
    avatar: "/assets/expert-svitlana.jpg",
    instagram: "https://www.instagram.com/svitlana_tape/"
  },
  {
    name: "Софія",
    niche: "Фінансовий експерт",
    point_a: "Запуски до 5к$, відсутність флагману, воронки не давали заявок, нерозуміння як масштабуватися",
    point_b: "Перший запуск з нами на 930 000 грн ($21 137) за 2 місяці",
    avatar: "/assets/expert-sofi.jpg",
    instagram: "https://www.instagram.com/sofi.finsight/"
  },
  {
    name: "Валерія",
    niche: "AI-креатор",
    point_a: "Продажів на 1000$/місяць з міні-продукту, відсутність флагману, нерозуміння як масштабуватися",
    point_b: "630 946 грн ($14 265), солдаут нового продукту",
    avatar: "/assets/expert-pix.jpg",
    instagram: "https://www.instagram.com/pix_ai_ua/"
  },
  {
    name: "Влада",
    niche: "Бізнес-коуч",
    point_a: "Запуски на 5000$ за 2 місяці, все робить сама, воронки не конвертують заявок",
    point_b: "964 019 грн ($21 730) за 3 місяці (Фактична каса: 803 969 грн + Доплати: 160 050 грн)",
    avatar: "/assets/vlada.jpg",
    instagram: "https://www.instagram.com/vladyslava.tsarenko/"
  },
  {
    name: "Стас",
    niche: "Міжнародний товарний бізнес (Etsy & Shopify)",
    point_a: "Запуски на 7000–10 000$, вигорів робити все сам, продажі та контент без системи, вперся в стелю результатів",
    point_b: "140 000$ за 9 місяців",
    avatar: "/assets/expert-stas.jpg",
    instagram: "https://www.instagram.com/stanislav.gunya/",
    casePost: "https://www.instagram.com/p/DNP8hmGM7L_/?utm_source=ig_web_button_share_sheet&igsh=MzRlODBiNWFlZA=="
  }
];

export function Cases() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { openModal } = useModal();

  // GSAP анімація появи карток
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".case-card-anim",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 80%",
          }
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Логіка Drag-to-Scroll для ПК (емуляція тач-скролу мишкою)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let isDragging = false; // Потрібно, щоб відрізнити клік від перетягування

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      isDragging = false;
      // Тимчасово вимикаємо плавний скрол і прив'язку, щоб перетягування не смикалось
      container.style.scrollBehavior = "auto";
      container.style.scrollSnapType = "none";
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    };

    const handleMouseLeave = () => {
      if (!isDown) return;
      isDown = false;
      container.style.scrollBehavior = "smooth";
      container.style.scrollSnapType = "x mandatory";
    };

    const handleMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      container.style.scrollBehavior = "smooth";
      container.style.scrollSnapType = "x mandatory";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5; // Коефіцієнт швидкості прокрутки

      if (Math.abs(x - startX) > 5) {
        isDragging = true;
      }

      e.preventDefault();
      container.scrollLeft = scrollLeft - walk;
    };

    // Запобігає спрацьовуванню посилань, якщо відбувався drag
    const handleLinkClick = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("mouseleave", handleMouseLeave);
    container.addEventListener("mouseup", handleMouseUp);
    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleLinkClick, true); // Використовуємо фазу capture

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.removeEventListener("mouseup", handleMouseUp);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleLinkClick, true);
    };
  }, []);

  return (
    <section ref={containerRef} id="cases" className="relative pt-24 pb-8 md:py-32 bg-black text-white overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-emerald-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-white/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-7xl relative z-10 mb-16">
        <div className="max-w-3xl">
          <span className="text-emerald-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-3 block">
            Соціальний доказ
          </span>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-6">
            Результати наших клієнтів
          </h2>
          <p className="text-lg md:text-xl text-white/50 font-medium leading-relaxed">
            Подивіться, як системний підхід, воронки та робота з трафіком трансформують хаотичні запуски в стабільний прогнозований прибуток.
          </p>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block w-full overflow-hidden px-6 md:px-[calc((100vw-1280px)/2)] mb-12">
        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pr-12 cursor-grab active:cursor-grabbing select-none"
        >
          {casesData.map((item, idx) => (
            <div
              key={idx}
              className="case-card-anim flex-shrink-0 w-[390px] min-h-[490px] snap-start bg-neutral-900/40 border border-white/5 rounded-[32px] p-8 flex flex-col justify-between hover:bg-neutral-900/80 hover:border-emerald-500/20 transition-all duration-500 backdrop-blur-xl group relative"
            >
              <div>
                {/* Header: Clickable Avatar to Instagram */}
                <div className="flex items-center gap-4 mb-6">
                  <a
                    href={item.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 hover:border-emerald-500 transition-colors duration-300 group/avatar block"
                    title="Перейти в Instagram"
                  >
                    <img
                      src={item.avatar}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity duration-300">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                      </svg>
                    </div>
                  </a>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-extrabold text-2xl">{item.name}</h3>
                      <a href={item.instagram} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-emerald-500 transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-sm text-white/40 font-semibold uppercase tracking-wider mt-0.5">{item.niche}</p>
                  </div>
                </div>

                {/* Point A and Actions */}
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1.5">Точка А (До нас)</p>
                    <p className="text-base font-medium leading-relaxed text-white/70">{item.point_a}</p>
                  </div>
                </div>
              </div>

              {/* Point B (Result) */}
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col justify-end">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-2">Точка Б (Результат)</p>
                <p className="text-2xl lg:text-[26px] font-black text-white group-hover:text-emerald-400 transition-colors duration-300 leading-snug">
                  {item.point_b}
                </p>

                {item.casePost && (
                  <a
                    href={item.casePost}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-sm font-bold text-emerald-500 flex items-center gap-1.5 hover:text-emerald-400 transition-colors self-start"
                  >
                    Деталі кейсу в Instagram <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Last Card: Custom CTA */}
          <div className="case-card-anim flex-shrink-0 w-[390px] min-h-[490px] snap-start bg-neutral-900/20 border border-white/5 border-dashed rounded-[32px] p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="relative z-10 space-y-6">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                <ExternalLink className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">
                Стати нашим <br /> наступним кейсом
              </h3>
              <p className="text-base text-white/50 max-w-[280px] mx-auto font-medium">
                Давайте оцифруємо ваші процеси та побудуємо прибуткову систему разом.
              </p>
              <button 
                onClick={() => openModal("cases_cta")}
                className="px-8 py-4 rounded-full bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer"
              >
                Розібрати мій проект
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="block md:hidden w-full overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-6 px-6 snap-x snap-mandatory scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {casesData.map((item, idx) => (
            <div
              key={idx}
              className="case-card-anim flex-shrink-0 w-[88vw] max-w-[330px] min-h-[410px] snap-center bg-neutral-900/40 border border-white/5 rounded-3xl p-6 flex flex-col justify-between backdrop-blur-md"
            >
              <div>
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  <a
                    href={item.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/10"
                  >
                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                  </a>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-xl">{item.name}</h3>
                      <a href={item.instagram} target="_blank" rel="noopener noreferrer" className="text-white/40">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-0.5">{item.niche}</p>
                  </div>
                </div>

                {/* Point A */}
                <div className="space-y-1.5 mb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/30 block">Точка А (До)</span>
                  <p className="text-sm font-medium text-white/70 leading-relaxed">
                    {item.point_a}
                  </p>
                </div>
              </div>

              {/* Point B (Result) */}
              <div className="pt-4 border-t border-white/5 flex flex-col justify-end">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1 block">Результат (Точка Б)</span>
                <p className="text-xl font-black text-white leading-snug">
                  {item.point_b}
                </p>

                {item.casePost && (
                  <a
                    href={item.casePost}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-xs font-bold text-emerald-500 flex items-center gap-1.5 hover:underline self-start"
                  >
                    Деталі в Instagram <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Last Card CTA */}
          <div className="flex-shrink-0 w-[88vw] max-w-[330px] min-h-[410px] snap-center bg-neutral-900/20 border border-white/5 border-dashed rounded-3xl p-6 text-center flex flex-col justify-center items-center space-y-4">
            <h3 className="text-2xl font-black uppercase text-white">Стати нашим кейсом</h3>
            <p className="text-sm text-white/50 max-w-[240px] mx-auto font-medium">
              Давайте розберемо ваш проект та побудуємо прибуткову систему.
            </p>
            <button 
              onClick={() => openModal("cases_cta")}
              className="w-full py-4 rounded-full bg-white text-black font-bold text-sm shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
            >
              Розібрати мій проект
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}