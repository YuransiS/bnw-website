"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 20 },
    },
  };

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen">
        <img src="/hero-bg.png" alt="" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void" />
        <div className="absolute inset-0 bg-void/50" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="inline-block mb-6">
            <span className="font-mono text-xs md:text-sm text-text-secondary border border-hairline px-3 py-1 rounded-sm bg-surface1/50 backdrop-blur-sm">
              [ДЛЯ ЕКСПЕРТІВ, ЯКІ ВТОМИЛИСЯ ТЯГНУТИ ВЕСЬ ЗАПУСК НА СОБІ]
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-[-0.02em] leading-[1.1] mb-8 text-balance"
          >
            Будуємо прибуткову систему навколо вашого контенту
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12 text-balance leading-relaxed"
          >
            Перетворюємо хаос у прогнозований дохід. Самі розробляємо стратегію, будуємо воронки та налаштовуємо продажі, поки ви фокусуєтесь на продукті.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 mb-20">
            <Button variant="primary" className="text-base uppercase tracking-widest px-8 py-5 w-full sm:w-auto">
              Отримати розбір проєкту
            </Button>
            <p className="text-xs font-mono text-text-secondary">
              *Безкоштовно. Знайдемо точки зростання вашого продукту
            </p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-hairline text-left"
          >
            <div className="p-4 border border-hairline bg-surface1/30 backdrop-blur-sm">
              <div className="font-mono text-text-secondary text-xs mb-2">[МАСШТАБ]</div>
              <div className="text-text-primary">Керуємо бюджетами до <span className="font-mono text-white">$10 000/міс</span></div>
            </div>
            <div className="p-4 border border-hairline bg-surface1/30 backdrop-blur-sm">
              <div className="font-mono text-text-secondary text-xs mb-2">[ШВИДКІСТЬ]</div>
              <div className="text-text-primary">Кейс з продажу: <span className="font-mono text-white">$25 000</span> за 1 тиждень</div>
            </div>
            <div className="p-4 border border-hairline bg-surface1/30 backdrop-blur-sm">
              <div className="font-mono text-text-secondary text-xs mb-2">[ОРГАНІКА]</div>
              <div className="text-text-primary">Органічний ріст: <span className="font-mono text-white">+80 000</span> підписників за рік</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
