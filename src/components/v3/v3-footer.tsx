"use client";

import React from "react";
import { Send, Mail } from "lucide-react";

export function V3Footer() {
  return (
    <footer className="relative bg-black text-white pt-32 pb-12 overflow-hidden border-t border-white/10">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        
        {/* Final CTA */}
        <div className="flex flex-col items-center text-center mb-32 p-12 md:p-24 rounded-[40px] bg-gradient-to-b from-neutral-900 to-black border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 pointer-events-none" />
          
          <h2 className="relative text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
            Досить тягнути весь запуск <br className="hidden md:block" /> на собі.
          </h2>
          <p className="relative text-xl text-white/60 max-w-2xl mx-auto mb-10 font-medium">
            Записуйтесь на аудит проєкту. Ми покажемо, як оцифрувати ваш хаос і побудувати системний прибуток.
          </p>
          <button className="relative px-10 py-5 rounded-full bg-white text-black font-bold text-xl hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.25)]">
            Записатись на розбір
          </button>
        </div>

        {/* Footer Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-2">
            <div className="text-3xl font-black tracking-tighter mb-4">
              B&W <span className="text-white/50">Prod</span>
            </div>
            <p className="text-white/50 max-w-xs">
              Перетворюємо хаос у прогнозований дохід.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">Контакти</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:hello@bwprod.com" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                  hello@bwprod.com
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                  <Send className="w-5 h-5" />
                  Telegram Bot
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  Instagram
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">Інформація</h4>
            <ul className="space-y-4">
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">Політика конфіденційності</a>
              </li>
              <li>
                <a href="#" className="text-white/70 hover:text-white transition-colors">Договір публічної оферти</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© 2026 Black&White Prod. Всі права захищені.</p>
          <p>Створено для експертів</p>
        </div>

      </div>
    </footer>
  );
}
