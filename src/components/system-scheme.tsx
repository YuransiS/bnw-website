"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { 
  UserCheck, 
  ChevronDown,
  TrendingUp, 
  Flame, 
  Workflow, 
  MessageSquare, 
  BarChart3, 
  LineChart 
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const outputs = [
  { label: "Трафік", desc: "Цільові ліди 24/7", icon: Flame },
  { label: "Воронки", desc: "Автоматичний підігрів", icon: Workflow },
  { label: "Контент", desc: "Упаковка смислів", icon: MessageSquare },
  { label: "Продажі", desc: "Системне закриття", icon: LineChart },
  { label: "Аналітика", desc: "Наскрізні показники", icon: BarChart3 },
  { label: "Масштабування", desc: "Кратний ріст прибутку", icon: TrendingUp }
];

export function SystemScheme() {
  const containerRef = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const pathsGroupRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Heading anim
      gsap.fromTo(
        ".scheme-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: ".scheme-header",
            start: "top 85%",
          }
        }
      );

      // Node entrance anims
      gsap.fromTo(
        ".scheme-node",
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          stagger: 0.15,
          duration: 1,
          ease: "back.out(1.5)",
          scrollTrigger: {
            trigger: ".scheme-nodes-container",
            start: "top 80%",
          }
        }
      );

      // SVG path line animation (draw-in effect)
      if (path1Ref.current) {
        const length = path1Ref.current.getTotalLength();
        gsap.fromTo(
          path1Ref.current,
          { strokeDasharray: length, strokeDashoffset: length },
          {
            strokeDashoffset: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: ".scheme-nodes-container",
              start: "top 70%",
            }
          }
        );
      }

      if (pathsGroupRef.current) {
        const paths = pathsGroupRef.current.querySelectorAll("path");
        paths.forEach((path) => {
          const length = path.getTotalLength();
          gsap.fromTo(
            path,
            { strokeDasharray: length, strokeDashoffset: length },
            {
              strokeDashoffset: 0,
              duration: 1.2,
              ease: "power2.out",
              scrollTrigger: {
                trigger: ".scheme-nodes-container",
                start: "top 65%",
              },
              delay: 0.3
            }
          );
        });
      }

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative py-24 md:py-32 bg-black text-white overflow-hidden hidden md:block">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[130px] pointer-events-none" />

      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        
        {/* Header */}
        <div className="scheme-header text-center mb-20">
          <span className="text-emerald-500 text-xs md:text-sm font-bold uppercase tracking-[0.2em] mb-3 block">
            Візуалізація взаємодії
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase mb-6">
            Схема «Експерт → B&W → результат»
          </h2>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Співпраця будується за принципом єдиного хабу управління. Ви даєте експертизу, ми трансформуємо її в 6 прибуткових напрямків.
          </p>
        </div>

        {/* Desktop Horizontal View */}
        <div className="hidden md:block relative scheme-nodes-container min-h-[600px]">
          
          {/* SVG Connector Lines Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ minHeight: '600px' }}>
            {/* Connection from Expert (x:15%, y:50%) to B&W (x:50%, y:50%) */}
            <path 
              ref={path1Ref}
              d="M 180,300 L 460,300" 
              stroke="#10b981" 
              strokeWidth="2" 
              fill="none"
              strokeDasharray="5,5"
              className="opacity-40"
            />
            
            {/* Connections from B&W (x:50%, y:50%) to 6 outputs (x:85%) */}
            <g ref={pathsGroupRef} className="opacity-40">
              {/* Output 1: y: 70 */}
              <path d="M 600,300 C 680,300 700,70 780,70" stroke="#10b981" strokeWidth="2" fill="none" />
              {/* Output 2: y: 160 */}
              <path d="M 600,300 C 680,300 700,160 780,160" stroke="#10b981" strokeWidth="2" fill="none" />
              {/* Output 3: y: 250 */}
              <path d="M 600,300 C 680,300 700,250 780,250" stroke="#10b981" strokeWidth="2" fill="none" />
              {/* Output 4: y: 340 */}
              <path d="M 600,300 C 680,300 700,340 780,340" stroke="#10b981" strokeWidth="2" fill="none" />
              {/* Output 5: y: 430 */}
              <path d="M 600,300 C 680,300 700,430 780,430" stroke="#10b981" strokeWidth="2" fill="none" />
              {/* Output 6: y: 520 */}
              <path d="M 600,300 C 680,300 700,520 780,520" stroke="#10b981" strokeWidth="2" fill="none" />
            </g>
          </svg>

          {/* Node 1: Expert (Left) */}
          <div className="absolute left-[20px] top-[220px] w-[160px] h-[160px] rounded-full bg-neutral-900 border border-white/10 flex flex-col justify-center items-center text-center scheme-node shadow-2xl z-10 group hover:border-white/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <UserCheck className="w-6 h-6 text-white/70" />
            </div>
            <span className="font-extrabold text-sm uppercase tracking-wider text-white">Експерт</span>
            <span className="text-[10px] text-white/40 mt-1">Вхідний вузол</span>
          </div>

          {/* Node 2: B&W Hub (Center) */}
          <div className="absolute left-[440px] top-[200px] w-[200px] h-[200px] rounded-full bg-neutral-900 border-2 border-emerald-500/30 flex flex-col justify-center items-center text-center scheme-node shadow-[0_0_50px_rgba(16,185,129,0.15)] z-10 group hover:border-emerald-500 transition-all duration-500">
            <div className="absolute inset-0 w-full h-full rounded-full bg-emerald-500/5 animate-pulse" />
            <div className="text-2xl font-black tracking-tighter text-white z-10">
              B&W <span className="text-emerald-500">Prod</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mt-2 z-10">Центральний хаб</span>
            <span className="text-[9px] text-white/40 max-w-[130px] mt-1 z-10 leading-tight">Управління та оцифрування</span>
          </div>

          {/* Nodes 3: 6 Outcome Nodes (Right) */}
          <div className="absolute right-[10px] top-[20px] bottom-[20px] flex flex-col justify-between w-[280px]">
            {outputs.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="scheme-node flex items-center gap-4 bg-neutral-900/80 border border-white/5 rounded-2xl p-4 shadow-xl hover:border-emerald-500/20 transition-all duration-300 group"
                  style={{ height: '76px' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                    <Icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
                      {item.label}
                    </h4>
                    <p className="text-xs text-white/40 font-medium">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Mobile Vertical View [МОБ: спростить] */}
        <div className="block md:hidden space-y-8 scheme-nodes-container">
          {/* Top Node: Expert */}
          <div className="scheme-node mx-auto w-36 h-36 rounded-full bg-neutral-900 border border-white/10 flex flex-col justify-center items-center text-center shadow-lg">
            <UserCheck className="w-6 h-6 text-white/50 mb-1" />
            <span className="font-black text-sm uppercase tracking-wider text-white">Експерт</span>
            <span className="text-[9px] text-white/40 mt-0.5">Вхідний вузол</span>
          </div>

          {/* Arrow 1 */}
          <div className="flex justify-center text-emerald-500 animate-bounce">
            <ChevronDown className="w-6 h-6" />
          </div>

          {/* Middle Node: B&W Hub */}
          <div className="scheme-node mx-auto w-44 h-44 rounded-full bg-neutral-900 border-2 border-emerald-500/20 flex flex-col justify-center items-center text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="text-xl font-black tracking-tighter text-white">
              B&W <span className="text-emerald-500">Prod</span>
            </div>
            <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest mt-1.5">Центральний хаб</span>
          </div>

          {/* Arrow 2 */}
          <div className="flex justify-center text-emerald-500 animate-bounce">
            <ChevronDown className="w-6 h-6" />
          </div>

          {/* Bottom Nodes list */}
          <div className="grid grid-cols-1 gap-4">
            {outputs.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div 
                  key={idx}
                  className="scheme-node flex items-center gap-4 bg-neutral-900/50 border border-white/5 rounded-2xl p-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white uppercase tracking-wide">
                      {item.label}
                    </h4>
                    <p className="text-xs text-white/40 font-medium">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
