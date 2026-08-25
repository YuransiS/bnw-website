"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface RollingCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
  highlightOnChange?: boolean;
}

/**
 * Format number with thousand separators
 */
function formatNumberWithSeparators(num: number, decimals: number = 0): string {
  const parts = num.toFixed(decimals).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(".");
}

/**
 * High-performance Rolling Number Counter with banking-style ticker physics.
 * Rolls rapidly and decelerates asymptotically to the exact target value.
 */
export function RollingCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  durationMs = 900,
  className = "",
  highlightOnChange = true,
}: RollingCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [trend, setTrend] = useState<"up" | "down" | null>(null);
  const prevValueRef = useRef(value);
  const animFrameRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip animation on first initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    if (prevValueRef.current === value) return;

    const startVal = prevValueRef.current;
    const endVal = value;
    const diff = endVal - startVal;
    prevValueRef.current = value;

    if (diff > 0) {
      setTrend("up");
    } else if (diff < 0) {
      setTrend("down");
    }

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // Decelerating cubic ease-out curve: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        setTimeout(() => {
          setTrend(null);
        }, 600);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, durationMs]);

  const formattedText = formatNumberWithSeparators(displayValue, decimals);

  return (
    <motion.span
      className={`inline-flex items-center tabular-nums transition-colors duration-300 ${
        highlightOnChange && trend === "up"
          ? "text-emerald-400 font-extrabold animate-pulse"
          : highlightOnChange && trend === "down"
          ? "text-rose-400 font-extrabold animate-pulse"
          : ""
      } ${className}`}
      animate={
        trend === "up"
          ? { scale: [1, 1.05, 1], y: [0, -2, 0] }
          : trend === "down"
          ? { scale: [1, 1.03, 1], y: [0, 2, 0] }
          : { scale: 1, y: 0 }
      }
      transition={{ duration: 0.4 }}
    >
      {prefix}
      {formattedText}
      {suffix}
    </motion.span>
  );
}
