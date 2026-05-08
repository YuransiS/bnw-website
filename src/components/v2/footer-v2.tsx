"use client";

import { motion } from "framer-motion";
import { Send, Camera } from "lucide-react";

export function FooterV2() {
  return (
    <footer className="bg-[#020202] pt-32 pb-16 px-6 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-black text-white mb-10 leading-tight">
            Готові делегувати рутину та кратно вирости у прибутку?
          </h2>
          
          <div className="flex flex-col items-center gap-6">
            <button className="px-12 py-6 rounded-full bg-white text-black font-black text-xl hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]">
              Записатись на розбір
            </button>
            <p className="text-white/40 text-sm italic">
              Розбір ні до чого не зобов'язує. Ми просто покажемо вам шлях.
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-16 border-t border-white/5">
          <div className="text-left">
            <div className="text-2xl font-black text-white mb-2">B&W PROD</div>
            <p className="text-white/30 text-sm">Ваша системна команда для масштабних запусків</p>
          </div>

          <div className="flex gap-6">
            <a href="#" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all">
              <Send size={20} />
            </a>
            <a href="#" className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white/30 transition-all">
              <Camera size={20} />
            </a>
          </div>

          <div className="text-right text-white/20 text-xs uppercase tracking-widest">
            © 2024 Black & White Prod. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
