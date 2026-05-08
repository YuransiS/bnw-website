"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const faqs = [
  {
    q: "Скільки мого часу знадобиться для запуску?",
    a: "Мінімум. Ви фокусуєтесь на генеруванні контенту (за нашими ТЗ) та роботі з учнями. Усю технічну частину, налаштування реклами, ботів, створення сайтів та продажі ми забираємо на себе."
  },
  {
    q: "Я зовсім не розбираюся в технічці і воронках. Це проблема?",
    a: "Це перевага. Ви не повинні в цьому розбиратись, для цього є ми. Ми побудуємо систему «під ключ», підключимо всі сервіси і платіжки. Ви побачите тільки фінальні цифри і прибуток на рахунку."
  },
  {
    q: "А якщо ми зіллємо бюджет на рекламу?",
    a: "Ми працюємо за моделлю партнерства (в тому числі за відсоток). Нам фінансово невигідно зливати ваш бюджет, бо ми заробляємо з результату. Кожна кампанія запускається з мінімальних тестових бюджетів, і масштабується лише тоді, коли ми бачимо позитивний ROI (окупність)."
  },
  {
    q: "Як зрозуміти, чи підходимо ми один одному?",
    a: "Ми не беремо в роботу всіх підряд. Залишайте заявку на безкоштовний розбір вашого проєкту. Ми проаналізуємо вашу воронку, покажемо «дірки», де ви втрачаєте гроші. Якщо побачимо потенціал для масштабування — запропонуємо формат співпраці."
  }
];

export function V3Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative py-32 bg-black text-white">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
            Відповіді на популярні запитання
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx} 
                className={clsx(
                  "border border-white/10 rounded-2xl overflow-hidden transition-colors duration-300",
                  isOpen ? "bg-white/[0.05]" : "bg-transparent hover:bg-white/[0.02]"
                )}
              >
                <button
                  className="w-full text-left px-6 py-6 md:px-8 md:py-8 flex justify-between items-center focus:outline-none"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className="text-lg md:text-xl font-bold pr-8">{faq.q}</span>
                  <ChevronDown className={clsx("w-6 h-6 shrink-0 transition-transform duration-300", isOpen && "rotate-180")} />
                </button>
                <div 
                  className={clsx(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <p className="px-6 pb-6 md:px-8 md:pb-8 text-white/60 leading-relaxed text-lg">
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
