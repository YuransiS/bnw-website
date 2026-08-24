"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface ParabolicProgressOptions {
  /** Target percentage to approach before completion (e.g. 94%) */
  maxStallPercent?: number;
  /** Estimated duration in ms to reach 75-80% */
  durationMs?: number;
}

/**
 * Hook calculating non-linear progress along a decelerating parabolic curve:
 * p(t) = max * (1 - (1 - t/T)^2)
 * When active: climbs fast initially, then decelerates asymptotically.
 * When finished: immediately springs to 100% and resets after a brief delay.
 */
export function useParabolicProgress(
  isLoading: boolean,
  options: ParabolicProgressOptions = {}
) {
  const { maxStallPercent = 94, durationMs = 3000 } = options;
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setIsVisible(true);
      startTimeRef.current = performance.now();

      const updateProgress = (now: number) => {
        if (!startTimeRef.current) return;
        const elapsed = now - startTimeRef.current;

        // Normalized time bounded to asymptote
        const t = Math.min(elapsed / durationMs, 1);
        
        // Decelerating parabolic ease-out: 1 - (1 - t)^2
        const parabolicFactor = 1 - Math.pow(1 - t, 2);
        
        // Asymptotic crawl if loading takes longer than durationMs
        let currentProgress = parabolicFactor * maxStallPercent;
        if (elapsed > durationMs) {
          const overtimeSec = (elapsed - durationMs) / 1000;
          // Slowly crawl from maxStallPercent towards 98%
          const extraCrawl = (98 - maxStallPercent) * (1 - Math.exp(-overtimeSec / 3));
          currentProgress = maxStallPercent + extraCrawl;
        }

        setProgress(Math.min(currentProgress, 98.5));

        animFrameRef.current = requestAnimationFrame(updateProgress);
      };

      animFrameRef.current = requestAnimationFrame(updateProgress);

      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      // If we were loading, snap to 100% then fade out
      if (isVisible) {
        setProgress(100);
        const timer = setTimeout(() => {
          setIsVisible(false);
          setProgress(0);
          startTimeRef.current = null;
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, maxStallPercent, durationMs, isVisible]);

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

  if (!isVisible && progress === 0) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`w-full overflow-hidden bg-white/[0.04] ${height} ${className}`}
        >
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 relative transition-all duration-75 ease-out rounded-r-full"
            style={{
              width: `${progress}%`,
              boxShadow: showGlow ? "0 0 12px rgba(16, 185, 129, 0.6)" : "none",
            }}
          >
            {/* Shimmer pulse effect at the leading edge */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/40 blur-[1px]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Card / Viewport Loading Overlay with non-linear Parabolic Progress Bar & Percentage
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

  if (!isVisible && !isLoading) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-[4px] z-50 flex items-center justify-center p-4 rounded-2xl"
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

            {/* Parabolic Progress Track */}
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
