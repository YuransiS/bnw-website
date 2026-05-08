"use client";

import { motion } from "framer-motion";

export function TeamV2() {
  return (
    <section id="team" className="relative py-32 z-10">
      <div className="container mx-auto px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Хто це буде <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-white">робити?</span></h2>
          <p className="text-xl text-white/60">Засновники Black & White Prod</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-20">
          {/* Viktor */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-[40px] p-8 text-center relative overflow-hidden group"
          >
            <div className="absolute inset-[-50%] bg-gradient-to-br from-white/10 to-transparent rotate-45 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative w-48 h-48 mx-auto mb-8 rounded-full border border-white/20 bg-[#11111A] flex items-end justify-center overflow-hidden">
              <svg className="w-24 h-24 text-white/10 absolute top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <h3 className="text-3xl font-bold mb-2 text-white">Віктор</h3>
            <p className="text-lg text-white/60">Продукт-маркетолог, стратег. Запустив понад 30 успішних освітніх проєктів. Знає, як упакувати сенси так, щоб клієнти ставали в чергу.</p>
          </motion.div>

          {/* Dima */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-[40px] p-8 text-center relative overflow-hidden group"
          >
            <div className="absolute inset-[-50%] bg-gradient-to-br from-white/10 to-transparent -rotate-45 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            <div className="relative w-48 h-48 mx-auto mb-8 rounded-full border border-white/20 bg-[#11111A] flex items-end justify-center overflow-hidden">
              <svg className="w-24 h-24 text-white/10 absolute top-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <h3 className="text-3xl font-bold mb-2 text-white">Діма</h3>
            <p className="text-lg text-white/60">Продюсер, системний архітектор. Спеціаліст із автоматизації та побудови відділів продажу. Перетворює хаотичні запуски в прогнозований бізнес.</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-2xl font-medium text-white/80 max-w-3xl mx-auto">
            Вам не потрібні <span className="text-white italic">"просто підрядники"</span>. <br/>
            Вам потрібні <span className="text-white underline underline-offset-8">партнери, які зацікавлені у вашому прибутку</span>.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
