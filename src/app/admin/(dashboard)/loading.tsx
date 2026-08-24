"use client";

import React from "react";
import { useParabolicProgress } from "@/components/ui/ParabolicProgressBar";

export default function DashboardLoading() {
  const { progress } = useParabolicProgress(true, { maxStallPercent: 95, durationMs: 2800 });

  return (
    <div className="w-full min-h-[65vh] flex flex-col items-center justify-center relative">
      {/* Top horizontal parabolic progress bar */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-white/5 z-50 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 transition-all duration-75 ease-out rounded-r-full" 
          style={{
            width: `${progress}%`,
            boxShadow: "0 0 14px rgba(16, 185, 129, 0.7)"
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-6 text-center max-w-sm px-6 w-full">
        {/* Modern Centered Progress Card */}
        <div className="w-full bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
                Завантаження дашборду
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Non-linear Parabolic Progress Track */}
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 rounded-full transition-all duration-75 ease-out relative"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.4)",
              }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-white/50 blur-[0.5px]" />
            </div>
          </div>

          <p className="text-[9px] text-white/40 uppercase tracking-widest font-bold leading-normal">
            Синхронізація аналітики та метрик з базою даних...
          </p>
        </div>
      </div>
    </div>
  );
}
