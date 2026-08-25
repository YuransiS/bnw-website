"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ParabolicProgressOptions {
  /** Target percentage to approach before completion (e.g. 92%) */
  maxStallPercent?: number;
  /** Estimated duration in ms to reach ~80% */
  durationMs?: number;
}

/**
 * Robust non-linear progress along a decelerating curve.
 * Climbs smoothly and dynamically, never freezes, and snaps to 100% on finish.
 */
export function useParabolicProgress(
  isLoading: boolean,
  options: ParabolicProgressOptions = {}
) {
  const { maxStallPercent = 92, durationMs = 2400 } = options;
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      setProgress(8); // Immediate initial positive feedback
      startTimeRef.current = performance.now();

      const update = (now: number) => {
        if (!startTimeRef.current) return;
        const elapsed = now - startTimeRef.current;

        // Normalized time bounded to 1
        const t = Math.min(elapsed / durationMs, 1);
        
        // Decelerating ease-out curve: 1 - (1 - t)^2.5
        const factor = 1 - Math.pow(1 - t, 2.5);
        
        let current = 8 + factor * (maxStallPercent - 8);
        if (elapsed > durationMs) {
          const overtimeSec = (elapsed - durationMs) / 1000;
          // Asymptotic crawl towards 98%
          const extraCrawl = (98 - maxStallPercent) * (1 - Math.exp(-overtimeSec / 2.5));
          current = maxStallPercent + extraCrawl;
        }

        setProgress(Math.min(current, 98.5));
        animFrameRef.current = requestAnimationFrame(update);
      };

      animFrameRef.current = requestAnimationFrame(update);

      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }

      // If active, snap to 100% then cleanly close
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
        startTimeRef.current = null;
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [isLoading, maxStallPercent, durationMs]);

  return { progress, isVisible };
}

/**
 * Top-of-page or inline horizontal parabolic progress bar
 */
export function ParabolicProgressBar({
  isLoading,
  className = "",
  showGlow = true,
  height = "h-[2.5px]",
}: {
  isLoading: boolean;
  className?: string;
  showGlow?: boolean;
  height?: string;
}) {
  const { progress, isVisible } = useParabolicProgress(isLoading);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`w-full overflow-hidden bg-white/[0.04] ${height} ${className}`}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 relative rounded-r-full"
            style={{
              width: `${progress}%`,
              boxShadow: showGlow ? "0 0 12px rgba(16, 185, 129, 0.6)" : "none",
            }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/40 blur-[1px]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Card / Viewport Loading Overlay with non-linear Progress Bar & Percentage
 */
export function ParabolicLoadingOverlay({
  isLoading,
  title = "Оновлення даних...",
  subtitle = "Синхронізація аналітики та метрик з базою даних...",
  cardClass = "bg-[#111116] border-white/10 text-white",
}: {
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  cardClass?: string;
}) {
  const { progress, isVisible } = useParabolicProgress(isLoading);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-[4px] z-50 flex items-center justify-center p-4 rounded-2xl"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className={`flex flex-col items-center gap-4 p-6 rounded-2xl shadow-2xl border max-w-sm w-full ${cardClass}`}
          >
            {/* Progress Header */}
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-white/90">
                  {title}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Progress Track */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 rounded-full relative"
                style={{
                  width: `${progress}%`,
                  boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
                }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-r from-transparent to-white/50 blur-[0.5px]" />
              </div>
            </div>

            {/* Micro Details */}
            {subtitle && (
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold text-center leading-normal">
                {subtitle}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Shimmering pulsing skeleton block for KPI metrics and UI placeholders
 */
export function SkeletonPulse({ className = "h-6 w-24" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.08] border border-white/5 ${className}`}
    />
  );
}

/**
 * Clean SaaS Skeleton card for KPI dashboards
 */
export function SkeletonMetricCard({ cardClass = "bg-[#111116] border-white/5" }: { cardClass?: string }) {
  return (
    <div className={`${cardClass} p-4 rounded-xl shadow-md border space-y-2.5 animate-pulse`}>
      <div className="h-3 w-28 bg-white/10 rounded-md" />
      <div className="h-7 w-32 bg-white/15 rounded-lg" />
      <div className="h-2.5 w-40 bg-white/5 rounded-md" />
    </div>
  );
}
