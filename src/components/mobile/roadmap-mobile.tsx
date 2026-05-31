"use client";

import React from "react";

const roadmap = [
  {
    title: "Аналіз та декомпозиція проєкту",
    text: "Зустріч-знайомство, повний аудит ваших активів, виявлення «дірок» у поточній моделі та декомпозиція цілі до конкретних кроків. Ми знаходимо найкоротший шлях до результату."
  },
  {
    title: "Стратегія та підготовка",
    text: "Упаковка сенсів та вашої експертності. Проєктування автоворонок, які працюють на холодний трафік. Ми робимо так, щоб ваш контент і продукт продавали за вас."
  },
  {
    title: "Технічна реалізація",
    text: "Збираємо лендінги, налаштовуємо чат-боти та підключаємо платіжні системи. Створюємо всю інфраструктуру, яка працює системно і без вашої участі."
  },
  {
    title: "Запуск та трафік",
    text: "Керуємо рекламними кампаніями та заливаємо цільовий трафік. Постійно контролюємо окупність (ROI) та оцифровуємо рекламу для максимальної ефективності."
  },
  {
    title: "Робота з продажами",
    text: "Впроваджуємо відділ продажів або покращуємо ефективність вашого. Контролюємо закриття кожної заявки, скрипти та супровід клієнтів до оплати."
  },
  {
    title: "Масштабування та супровід",
    text: "Аналіз усіх показників у наскрізній аналітиці. Системне збільшення рекламного бюджету та масштабування результатів у 2, 5, 10 разів."
  }
];

export function RoadmapMobile() {
  return (
    <section id="roadmap-mob" className="relative py-16 bg-black text-white">
      <div className="container mx-auto px-5">
        
        <div className="mb-12">
          <span className="text-emerald-500 text-xs font-bold uppercase tracking-[0.15em] mb-2 block">
            Як ми працюємо
          </span>
          <h2 className="text-3xl font-black tracking-tight mb-4 uppercase leading-tight">
            Дорожня карта співпраці
          </h2>
          <p className="text-sm text-white/50 font-medium">
            Повний цикл продюсування. Від першого зідзвону до системного масштабування прибутку.
          </p>
        </div>

        <div className="relative max-w-xl mx-auto space-y-10 pl-6 border-l border-white/10">
          {roadmap.map((step, idx) => (
            <div key={idx} className="relative">
              {/* Dot indicator aligned with the left border */}
              <div className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full bg-neutral-900 border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
              
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  Крок 0{idx + 1}
                </div>
                <h3 className="text-xl font-extrabold text-white">{step.title}</h3>
                <p className="text-white/60 leading-relaxed text-sm pt-1">
                  {step.text}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
