"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, PlayCircle } from "lucide-react";
import { useRef } from "react";

export function HeroV2() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <motion.div 
        className="container mx-auto px-6 lg:px-12 flex flex-col items-center text-center z-10"
        style={{ y, opacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:w-1/2"
        >
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 rounded-full border border-white/10 text-white/60 text-sm font-medium mb-6 backdrop-blur-md"
          >
            Для експертів, які втомилися тягнути весь запуск на собі
          </motion.span>
          
          <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tight">
            Будуємо <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 via-white to-gray-400">прибуткову систему</span> <br/>
            навколо контенту
          </h1>
          
          <p className="text-xl text-white/60 mb-10 leading-relaxed max-w-lg font-light">
            Перетворюємо хаос у прогнозований дохід. Самі розробляємо стратегію, будуємо воронки та налаштовуємо продажі, поки ви фокусуєтесь на продукті.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12">
            <div className="relative group">
              <button className="px-10 py-5 rounded-full bg-white text-black font-black text-lg hover:scale-105 transition-transform shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]">
                Отримати розбір проєкту
              </button>
              <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-full text-center text-xs text-white/40 italic whitespace-nowrap">
                Безкоштовно. Знайдемо точки зростання вашого продукту
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 border-t border-white/10 text-left">
            <div className="flex flex-col">
              <span className="text-white font-bold">Керуємо бюджетами</span>
              <span className="text-white/60 text-sm">до $10 000/місяць</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold">Кейс з продажу</span>
              <span className="text-white/60 text-sm">$25 000 за 1 тиждень</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold">Органічний ріст</span>
              <span className="text-white/60 text-sm">+80 000 підписників</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating 3D Illustrator Elements */}
      <motion.div
        className="absolute right-[10%] top-[20%] w-64 h-64 z-0 hidden lg:block"
        animate={{
          y: [-20, 20, -20],
          rotateX: [0, 20, 0],
          rotateY: [0, 30, 0],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="w-full h-full rounded-[40px] glass-card backdrop-blur-3xl flex items-center justify-center relative overflow-hidden">
           <div className="absolute inset-[-50%] bg-gradient-to-br from-white/20 to-transparent rotate-45" />
           <div className="absolute inset-[-50%] bg-gradient-to-br from-gray-400/20 to-transparent -rotate-45" />
           <svg className="w-32 h-32 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
           </svg>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-[10%] bottom-[20%] w-48 h-48 z-0 hidden lg:block"
        animate={{
          y: [20, -20, 20],
          rotateX: [0, -20, 0],
          rotateY: [0, -30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="w-full h-full rounded-[30px] glass-card backdrop-blur-3xl flex items-center justify-center relative overflow-hidden">
           <div className="absolute inset-[-50%] bg-gradient-to-br from-gray-500/40 to-transparent -rotate-45" />
           <svg className="w-24 h-24 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
           </svg>
        </div>
      </motion.div>
    </section>
  );
}
