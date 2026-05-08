"use client";

import { motion } from "framer-motion";

const cases = [
  { 
    title: "Масштабування до $38k", 
    category: "Продюсування",
    before: "Відсутність системи, низький чек, ручні продажі",
    after: "$38,000 чистого прибутку, повна автоматизація",
    color: "from-white/40 to-white/10" 
  },
  { 
    title: "+80,000 підписників", 
    category: "Трафік та контент",
    before: "Повільний ріст, вигоряння від щоденного сторітелінгу",
    after: "+80k цільової аудиторії за рік, стабільне охоплення",
    color: "from-gray-400/40 to-gray-800/10" 
  },
  { 
    title: "$25,000 за 1 тиждень", 
    category: "Запуск воронки",
    before: "Хаотичні запуски з непередбачуваним результатом",
    after: "$25,000 продажів за 7 днів через одну воронку",
    color: "from-white/20 to-gray-600/10" 
  },
];

export function CaseStudiesV2() {
  return (
    <section className="relative py-32 z-10">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Не продаємо ідеї. <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white">Показуємо цифри.</span></h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cases.map((project, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative aspect-[4/5] rounded-[40px] overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-[#11111A]" />
              {/* Fake abstract image for the project */}
              <div className={`absolute inset-0 opacity-40 bg-gradient-to-br ${project.color} mix-blend-screen group-hover:scale-110 transition-transform duration-700`} />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#050511] via-transparent to-transparent opacity-80" />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end">
                <span className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">
                  {project.category}
                </span>
                <h3 className="text-2xl font-bold text-white mb-6">
                  {project.title}
                </h3>
                
                <div className="space-y-4 pt-4 border-t border-white/10 group-hover:border-white/20 transition-colors">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Точка А (До)</span>
                    <p className="text-sm text-white/70 line-clamp-2">{project.before}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">Точка Б (Після)</span>
                    <p className="text-sm text-white font-bold">{project.after}</p>
                  </div>
                </div>
              </div>

              {/* Glass border overlay */}
              <div className="absolute inset-0 rounded-[40px] border-[2px] border-white/5 group-hover:border-white/20 transition-colors pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
