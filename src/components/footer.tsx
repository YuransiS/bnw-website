"use client";

import React from "react";
import { Send, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative bg-black text-white pt-20 pb-12 overflow-hidden border-t border-white/10">
      <div className="container mx-auto px-6 max-w-6xl relative z-10">



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
                <a href="mailto:diman658t58@gmail.com" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                  Пошта
                </a>
              </li>
              <li>
                <a href="https://t.me/pan_producer" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                  <Send className="w-5 h-5" />
                  Telegram
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/victor.petryk/" className="flex items-center gap-3 text-white/70 hover:text-white transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
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
        </div>

      </div>
    </footer>
  );
}
