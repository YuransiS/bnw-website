"use client";

import { motion } from "framer-motion";
import { Menu } from "lucide-react";

export function HeaderV2() {
  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 glass-card rounded-full px-6 py-4 flex items-center justify-between"
    >
      <div className="font-black text-xl tracking-tighter">B&W<span className="text-gray-400">.</span></div>
      
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
        <a href="#expertise" className="text-white/70 hover:text-white transition-colors">Експертиза</a>
        <a href="#work" className="text-white/70 hover:text-white transition-colors">Кейси</a>
        <a href="#process" className="text-white/70 hover:text-white transition-colors">Команда</a>
      </nav>

      <button className="hidden md:block px-6 py-2 rounded-full bg-white text-black font-semibold text-sm hover:scale-105 transition-transform">
        Записатись на розбір
      </button>

      <button className="md:hidden">
        <Menu className="w-6 h-6 text-white" />
      </button>
    </motion.header>
  );
}
