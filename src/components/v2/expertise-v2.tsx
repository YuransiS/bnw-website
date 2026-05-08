"use client";

import { motion } from "framer-motion";
import { Camera, Edit3, MonitorPlay, Zap } from "lucide-react";

const services = [
  {
    title: "Команда під ключ",
    icon: <MonitorPlay className="w-6 h-6 text-white" />,
    desc: "Замість пошуку підрядників ви отримуєте готову команду повного циклу. Від технарів до сейлзів — ми закриваємо всі процеси і повністю витягуємо вас із мікроменеджменту та рутини. Ви залишаєтеся зіркою та мозком продукту, а ми прописуємо стратегію, пакуємо сенси і контролюємо кожен етап запуску.",
  },
  {
    title: "Автоматизовані воронки",
    icon: <Zap className="w-6 h-6 text-gray-300" />,
    desc: "Виводимо продажі з ручних переписок. Проєктуємо сайти, збираємо чат-ботів та вибудовуємо архітектуру повідомлень, які гріють і конвертують трафік у гроші 24/7 без вашої участі.",
  },
  {
    title: "Трафік та відділ продажів",
    icon: <Camera className="w-6 h-6 text-gray-400" />,
    desc: "Беремо на себе залучення та закриття лідів. Пишемо сценарії для прогрівів, керуємо рекламними кампаніями та контролюємо окупність трафіку. Наш відділ продажів обробляє заявки та дотискає клієнтів за скриптами.",
  },
];

export function ExpertiseV2() {
  return (
    <section className="relative py-32 z-10 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:w-1/2"
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Як ми забираємо <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white">
                ваш хаос
              </span>
            </h2>
            <p className="text-xl text-white/60 mb-8 font-light max-w-lg">
              3 інструменти, якими ми будуємо вашу автономність та витягуємо з рутини.
            </p>
            <button className="px-8 py-4 rounded-full glass-card text-white font-semibold text-lg hover:bg-white/10 transition-colors border-white/20">
              Хочу таку систему
            </button>
          </motion.div>

          <div className="lg:w-1/2 relative w-full aspect-square md:aspect-video lg:aspect-square flex justify-center items-center">
            {/* Z-layered floating squircles */}
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                whileInView={{ 
                  opacity: 1, 
                  scale: 1, 
                  rotate: i % 2 === 0 ? 5 : -5,
                  x: i % 2 === 0 ? 60 : -60,
                  y: i < 2 ? -60 : 60
                }}
                whileHover={{ scale: 1.05, zIndex: 50, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="absolute glass-card p-6 rounded-[32px] w-64 shadow-2xl backdrop-blur-xl border border-white/10 cursor-pointer"
                style={{ zIndex: i }}
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{service.title}</h3>
                <p className="text-sm text-white/60">{service.desc}</p>
              </motion.div>
            ))}
            
            {/* Center glowing orb */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-40 h-40 bg-white rounded-full blur-[60px] z-[-1]" 
            />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-24 text-center border-t border-white/10 pt-12"
        >
          <p className="text-xl text-white/60 mb-6">Це не теорія. Дивіться цифри реальних запусків ↓</p>
          <button className="px-10 py-5 rounded-full bg-white text-black font-black text-lg hover:scale-105 transition-transform shadow-[0_0_30px_-5px_rgba(255,255,255,0.4)]">
            Хочу таку систему
          </button>
        </motion.div>
      </div>
    </section>
  );
}
