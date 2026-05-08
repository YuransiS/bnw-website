"use client";

import { motion, Variants } from "framer-motion";
import { Clock, DollarSign, TrendingDown, Briefcase, AlertCircle, Zap } from "lucide-react";

const points = [
  {
    icon: <Clock className="w-8 h-8 text-white" />,
    title: "Людина-оркестр",
    desc: "Ви робите все вручну: від щоденних прогрівів до переписок у діректі. Жодної системи немає, а продажі тримаються виключно на вашому кортизолі.",
    color: "from-white/20 to-transparent",
  },
  {
    icon: <TrendingDown className="w-8 h-8 text-gray-300" />,
    title: "Продукт топ, а продажів мало",
    desc: "Люди хвалять контент, охоплення є, але коли доходить до оплат — тиша. У вас немає системної воронки, яка б конвертувала лояльність у гроші.",
    color: "from-gray-400/20 to-transparent",
  },
  {
    icon: <DollarSign className="w-8 h-8 text-gray-500" />,
    title: "Стеля в доходах",
    desc: "Ви працюєте 24/7, але дохід не виправдовує зусиль або взагалі стоїть на місці. Будь-яка спроба масштабуватися закінчується тупим зливом бюджету.",
    color: "from-gray-600/20 to-transparent",
  },
  {
    icon: <Briefcase className="w-8 h-8 text-gray-400" />,
    title: "Хаос у команді",
    desc: "Ви постійно шукаєте підрядників, які 'не зливають' дедлайни та дають результат. Замість того, щоб бути мозком проєкту, ви стаєте менеджером, який гасить пожежі.",
    color: "from-gray-500/20 to-transparent",
  },
  {
    icon: <AlertCircle className="w-8 h-8 text-gray-200" />,
    title: "Нерегулярний прибуток",
    desc: "Один місяць — 'густо', інший — 'пусто'. Ви не знаєте, скільки лідів прийде завтра і чи вистачить їх, щоб покрити витрати та заробити.",
    color: "from-white/10 to-transparent",
  },
  {
    icon: <Zap className="w-8 h-8 text-white" />,
    title: "Вигоряння",
    desc: "Ви хотіли створити бізнес, який дає свободу, а натомість купили собі ще одну роботу формату 24/7 без вихідних.",
    color: "from-gray-300/20 to-transparent",
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 50, rotateX: 20 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

export function PainPointsV2() {
  return (
    <section id="pain-points" className="relative py-32 z-10">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 italic">Впізнаєте себе?</h2>
          <p className="text-xl text-white/60">Якщо хоч один пункт про вас — ви втрачаєте гроші просто зараз.</p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 perspective-[2000px]"
        >
          {points.map((point, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="isometric-card glass-card rounded-[32px] p-8 relative overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${point.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl backdrop-blur-md group-hover:scale-110 transition-transform duration-500">
                  {point.icon}
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/70 transition-all">
                  {point.title}
                </h3>
                <p className="text-white/60 leading-relaxed font-light">
                  {point.desc}
                </p>
              </div>

              {/* Decorative 3D sphere */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full bg-white/5 blur-2xl group-hover:bg-white/10 transition-colors duration-500" />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <p className="text-2xl font-medium text-white/80">
            Ми знаємо, як це виправити. <span className="text-white">Ви створюєте сенси — ми будуємо систему.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
