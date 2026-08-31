"use client";

import React, { useState, useEffect } from "react";
import { Play, X, ExternalLink, Sparkles } from "lucide-react";

interface VideoTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
  badge?: string;
  description?: string;
}

export function VideoTutorialModal({
  isOpen,
  onClose,
  videoId,
  title,
  badge = "Відео-навчання",
  description = "Покроковий відеоогляд функціоналу та інструкція з користування цим розділом"
}: VideoTutorialModalProps) {
  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const youtubeEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  const youtubeDirectUrl = `https://youtu.be/${videoId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 animate-in fade-in duration-200">
      {/* Dark backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className="relative w-full max-w-4xl bg-[#0e0e13] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden z-10 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <Play className="w-4 h-4 text-red-400 fill-red-400/30 ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md">
                  {badge}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-white truncate mt-1 tracking-tight">
                {title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={youtubeDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              title="Відкрити на YouTube"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>YouTube</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all cursor-pointer"
              title="Закрити (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player (Responsive 16:9 Aspect Ratio) */}
        <div className="relative w-full aspect-video bg-black/90 flex items-center justify-center">
          <iframe
            src={youtubeEmbedUrl}
            title={title}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Footer / Description */}
        <div className="p-3.5 sm:p-4 bg-[#0a0a0e] border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="text-white/40 text-[11px] leading-relaxed flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{description}</span>
          </p>
          <a
            href={youtubeDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden flex items-center gap-1 text-[11px] text-red-400 font-bold hover:underline"
          >
            <span>Відкрити на YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

interface VideoTutorialButtonProps {
  videoId: string;
  title: string;
  badge?: string;
  description?: string;
  label?: string;
  variant?: "default" | "compact" | "pill" | "header";
  className?: string;
}

export function VideoTutorialButton({
  videoId,
  title,
  badge = "Відео-навчання",
  description,
  label = "Відеоінструкція",
  variant = "default",
  className = ""
}: VideoTutorialButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === "compact") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`p-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer shadow-sm group ${className}`}
          title={`${title} (Відеоогляд)`}
        >
          <Play className="w-3.5 h-3.5 fill-red-400/20 text-red-400 group-hover:scale-110 transition-transform" />
        </button>
        <VideoTutorialModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          videoId={videoId}
          title={title}
          badge={badge}
          description={description}
        />
      </>
    );
  }

  if (variant === "pill") {
    return (
      <>
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold transition-all cursor-pointer shadow-sm group ${className}`}
          title={`${title} (Відеоогляд)`}
        >
          <Play className="w-3 h-3 fill-red-400/30 text-red-400 group-hover:scale-110 transition-transform shrink-0" />
          <span>{label}</span>
        </button>
        <VideoTutorialModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          videoId={videoId}
          title={title}
          badge={badge}
          description={description}
        />
      </>
    );
  }

  // Default / Header variant
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-500/20 hover:from-red-500/20 hover:to-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] group ${className}`}
        title={`${title} (Переглянути навчальне відео)`}
      >
        <div className="w-5 h-5 rounded-lg bg-red-500/20 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
          <Play className="w-2.5 h-2.5 fill-red-400 text-red-400 ml-0.5" />
        </div>
        <span className="tracking-tight">{label}</span>
      </button>
      <VideoTutorialModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        videoId={videoId}
        title={title}
        badge={badge}
        description={description}
      />
    </>
  );
}
