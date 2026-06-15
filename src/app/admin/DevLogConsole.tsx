"use client";

import React, { useEffect, useState, useRef } from "react";
import { subscribeToLogs, LogEntry, clearLogBuffer } from "@/utils/logger";
import { Terminal, Trash2, Minimize2, Maximize2, AlertTriangle, Play, Sparkles, Check, ChevronDown, ChevronRight } from "lucide-react";

export default function DevLogConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error" | "perf">("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((entry) => {
      setLogs((prev) => {
        // Prevent duplicate logs by ID
        if (prev.some((l) => l.id === entry.id)) return prev;
        const newLogs = [...prev, entry];
        // Limit to 200 logs on client
        if (newLogs.length > 200) {
          newLogs.shift();
        }
        return newLogs;
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isMinimized && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isMinimized]);

  const handleClear = () => {
    clearLogBuffer();
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "all") return true;
    return log.type === filter;
  });

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "error":
        return "text-red-400 border-red-500/20 bg-red-500/5";
      case "warn":
        return "text-yellow-400 border-yellow-500/20 bg-yellow-500/5";
      case "perf":
        return "text-indigo-400 border-indigo-500/20 bg-indigo-500/5";
      default:
        return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    }
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 left-6 z-[9999] bg-[#0C0C0F]/95 border border-red-500/30 hover:border-red-500/60 text-red-400 px-4 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 duration-200 font-sans cursor-pointer"
      >
        <Terminal className="w-4 h-4 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-wider">Dev Console ({logs.length})</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-[9999] w-[420px] max-w-[calc(100vw-3rem)] h-[450px] bg-[#0C0C0F]/95 border border-white/10 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(239,68,68,0.05)] backdrop-blur-xl flex flex-col overflow-hidden font-sans border-red-500/20">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-2 text-red-400">
          <Terminal className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-wider">CRM Developer Logs</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
            title="Очистити логи"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-all cursor-pointer"
            title="Згорнути"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex border-b border-white/5 bg-black/40 p-1.5 gap-1 shrink-0">
        {(["all", "info", "warn", "error", "perf"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              filter === type
                ? type === "error"
                  ? "bg-red-500/20 text-red-400"
                  : type === "warn"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : type === "perf"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : type === "info"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Logs Viewport */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar bg-black/20">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-white/20 italic text-xs gap-1.5">
            <Terminal className="w-6 h-6 opacity-30" />
            <span>Логи відсутні</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className={`border rounded-xl transition-all overflow-hidden ${getLogTypeColor(
                  log.type
                )}`}
              >
                {/* Log Header Row */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-2.5 flex items-start gap-2.5 cursor-pointer hover:bg-white/[0.02] select-none text-[11px]"
                >
                  <span className="text-[9px] font-mono opacity-40 shrink-0 pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString("uk-UA")}
                  </span>
                  <span className="font-extrabold uppercase text-[8px] tracking-wider bg-white/5 border border-white/10 px-1.5 py-0.5 rounded shrink-0">
                    {log.module}
                  </span>
                  <span className="font-medium leading-relaxed flex-1 break-all">
                    {log.message}
                  </span>
                  {log.details && (
                    <span className="shrink-0 pt-0.5 opacity-60">
                      {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </span>
                  )}
                </div>

                {/* Log Payload Details (JSON View) */}
                {isExpanded && log.details && (
                  <div className="px-3 pb-3 pt-1 border-t border-white/5 bg-black/40">
                    <pre className="p-2.5 rounded-lg bg-black/60 overflow-x-auto text-[10px] font-mono text-white/70 max-h-36 custom-scrollbar border border-white/5">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}
