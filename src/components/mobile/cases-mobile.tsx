"use client";

import React, { useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useModal } from "@/providers/modal-provider";
import { AnimatePresence, motion } from "framer-motion";

const casesData = [
  {
    name: "Вікторія",
    niche: "Експерт по візуалу",
    point_a: "Останні запуски на 2–3к$, вигоріла аудиторія, мало заявок, продажі в переписці з низькою конверсією, тягнула все на собі",
    point_b: "1 987 000 грн ($45 000) продажів за останні 3 місяці",
    avatar: "/assets/expert-victoria.jpg",
    instagram: "https://www.instagram.com/victoria_meshcheriakova/"
  },
  {
    name: "Світлана",
    niche: "Експерт з тейпування",
    point_a: "Останні запуски на 2–3к$, заявки є, але продажі в переписці з низькою конверсією, кожен запуск = вигорання",
    point_b: "1 473 000 грн ($33 355) за 3 місяці",
    avatar: "/assets/expert-svitlana.jpg",
    instagram: "https://www.instagram.com/svitlana_tape/"
  },
  {
    name: "Під NDA",
    niche: "ніша — інвестиції",
    point_a: "Запуски до 5к$, відсутність флагману, воронки не давали заявок, нерозуміння як масштабуватися",
    point_b: "Перший запуск з нами на 930 000 грн ($21 137) за 2 місяці",
    avatar: "/assets/nda-avatar.png",
    instagram: "#",
    isNda: true
  },
  {
    name: "Валерія",
    niche: "AI-креатор",
    point_a: "Продажів на 1000$/місяць з міні-продукту, відсутність флагману, нерозуміння как масштабуватися",
    point_b: "630 946 грн ($14 265), солдаут нового продукту",
    avatar: "/assets/expert-pix.jpg",
    instagram: "https://www.instagram.com/pix_ai_ua/"
  },
  {
    name: "Влада",
    niche: "Монетизація блогу",
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

export function CasesMobile() {
  const { openModal } = useModal();
  const [showNdaModal, setShowNdaModal] = useState(false);

  return (
    <section id="cases-mob" className="relative py-16 bg-black text-white overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-emerald-500/[0.02] rounded-full blur-[80px] pointer-events-none" />

      <div className="container mx-auto px-5 mb-8">
        <span className="text-emerald-500 text-xs font-bold uppercase tracking-[0.15em] mb-2 block">
          Соціальний доказ
        </span>
        <h2 className="text-3xl font-black tracking-tight uppercase mb-4 leading-tight">
          Результати наших клієнтів
        </h2>
        <p className="text-sm text-white/50 leading-relaxed font-medium">
          Подивіться, як системний підхід, воронки та робота з трафіком трансформують хаотичні запуски в стабільний прогнозований прибуток.
        </p>
      </div>

      <div className="w-full overflow-hidden">
        <div className="flex gap-4 overflow-x-auto pb-6 px-5 snap-x snap-mandatory scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {casesData.map((item, idx) => (
            <div
              key={idx}
              className="flex-shrink-0 w-[85vw] max-w-[310px] min-h-[390px] snap-center bg-neutral-900/95 border border-white/5 rounded-3xl p-6 flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                  {item.isNda ? (
                    <button
                      onClick={() => setShowNdaModal(true)}
                      className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 cursor-pointer"
                    >
                      <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </button>
                  ) : (
                    <a
                      href={item.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0"
                    >
                      <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </a>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                      {item.isNda ? (
                        <button
                          onClick={() => setShowNdaModal(true)}
                          className="text-white/40 hover:text-white transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </button>
                      ) : (
                        <a href={item.instagram} target="_blank" rel="noopener noreferrer" className="text-white/40">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mt-0.5">{item.niche}</p>
                  </div>
                </div>

                {/* Point A */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 block">Точка А (До)</span>
                  <p className="text-sm font-medium text-white/70 leading-relaxed">
                    {item.point_a}
                  </p>
                </div>
              </div>

              {/* Point B (Result) */}
              <div className="pt-4 border-t border-white/5 flex flex-col justify-end">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1 block">Результат (Точка Б)</span>
                <p className="text-lg font-black text-white leading-snug">
                  {item.point_b}
                </p>

                {item.casePost && (
                  <a
                    href={item.casePost}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-xs font-bold text-emerald-500 flex items-center gap-1 hover:underline self-start"
                  >
                    Деталі в Instagram <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Last Card CTA */}
          <div className="flex-shrink-0 w-[85vw] max-w-[310px] min-h-[390px] snap-center bg-neutral-900/20 border border-white/5 border-dashed rounded-3xl p-6 text-center flex flex-col justify-center items-center space-y-4">
            <h3 className="text-xl font-black uppercase text-white">Стати нашим кейсом</h3>
            <p className="text-xs text-white/50 max-w-[220px] mx-auto font-medium">
              Давайте розберемо ваш проект та побудуємо прибуткову систему.
            </p>
            <button
              onClick={() => openModal("cases_cta")}
              className="w-full py-3.5 rounded-full bg-white text-black font-bold text-xs shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
            >
              Розібрати мій проект
            </button>
          </div>
        </div>
      </div>

      {/* NDA Explanation Modal */}
      <AnimatePresence>
        {showNdaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNdaModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0C0C0F]/90 p-8 text-center text-white shadow-2xl backdrop-blur-xl"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="text-xl font-black uppercase mb-2 tracking-tight">Дані під NDA</h3>
              <p className="text-white/60 text-xs leading-relaxed mb-6 font-medium">
                Ми поважаємо конфіденційність наших партнерів. Згідно з угодою про нерозголошення (NDA), персональні дані експерта та посилання на профіль повністю приховані.
              </p>
              <button
                onClick={() => setShowNdaModal(false)}
                className="w-full py-3.5 rounded-full bg-white text-black font-bold text-xs shadow-[0_0_15px_rgba(255,255,255,0.15)] cursor-pointer"
              >
                Зрозуміло
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
