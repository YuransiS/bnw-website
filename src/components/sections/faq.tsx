"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Скільки мого часу знадобиться для запуску?",
    a: "Мінімум. Ви фокусуєтесь на генеруванні контенту (за нашими ТЗ) та роботі з учнями. Усю технічну частину, налаштування реклами, ботів, створення сайтів та продажі ми забираємо на себе.",
  },
  {
    q: "Я зовсім не розбираюся в технічці і воронках. Це проблема?",
    a: "Це перевага. Ви не повинні в цьому розбиратись, для цього є ми. Ми побудуємо систему \"під ключ\", підключимо всі сервіси і платіжки. Ви побачите тільки фінальні цифри і прибуток на рахунку.",
  },
  {
    q: "А якщо ми зіллємо бюджет на рекламу?",
    a: "Ми працюємо за моделлю партнерства (в тому числі за відсоток). Нам фінансово невигідно зливати ваш бюджет, бо ми заробляємо з результату. Кожна кампанія запускається з мінімальних тестових бюджетів, і масштабується лише тоді, коли ми бачимо позитивний ROI (окупність).",
  },
  {
    q: "Як зрозуміти, чи підходимо ми один одному?",
    a: "Ми не беремо в роботу всіх підряд. Залишайте заявку на безкоштовний розбір вашого проєкту. Ми проаналізуємо вашу воронку, покажемо \"дірки\", де ви втрачаєте гроші. Якщо побачимо потенціал для масштабування — запропонуємо формат співпраці.",
  },
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 md:py-32 bg-surface1 border-t border-hairline relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-16 md:mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6">
              Відповіді на популярні запитання
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="border border-hairline bg-void overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-6 md:p-8 text-left hover:bg-surface2 transition-colors focus:outline-none"
                  >
                    <span className="text-lg md:text-xl font-medium pr-8">{faq.q}</span>
                    <div className={cn("transition-transform duration-300", isOpen ? "rotate-45" : "")}>
                      <Plus className="w-6 h-6 text-text-secondary" />
                    </div>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="p-6 md:p-8 pt-0 text-text-secondary border-t border-hairline bg-void">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
