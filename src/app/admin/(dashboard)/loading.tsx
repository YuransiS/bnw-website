"use strict";

import React from "react";
import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="w-full min-h-[60vh] flex flex-col items-center justify-center relative">
      {/* Horizontal Progress Bar sliding at the top of content */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
        <div 
          className="h-full bg-emerald-500 rounded-full" 
          style={{
            width: "30%",
            animation: "loadingBar 1.8s infinite linear"
          }}
        />
      </div>

      {/* Styled Inline Keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(300%); }
        }
      `}} />

      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
        <div className="relative flex items-center justify-center">
          {/* Neon/Emerald Glow Ring behind the spinner */}
          <div className="absolute w-16 h-16 rounded-full bg-emerald-500/10 blur-xl animate-pulse" />
          <Loader2 className="w-9 h-9 text-emerald-450 animate-spin relative z-10" />
        </div>
        
        <div className="space-y-1.5 z-10">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/80">
            Завантаження дашборду
          </p>
          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold leading-normal animate-pulse">
            Синхронізація аналітики та метрик з базою даних...
          </p>
        </div>
      </div>
    </div>
  );
}
