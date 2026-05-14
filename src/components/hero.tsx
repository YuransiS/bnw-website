"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      
      tl.from(".hero-elem", {
        y: 40,
        opacity: 0,
        stagger: 0.15,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.2
      });

      // Floating money animation
      gsap.fromTo(".floating-money", 
        { y: 0, opacity: 0.1 },
        {
          y: "random(-60, 60)",
          opacity: "random(0.1, 0.3)",
          rotation: "random(-15, 15)",
          duration: "random(3, 6)",
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: {
            each: 0.4,
            from: "random"
          }
        }
      );
    }, { scope: containerRef });
    
    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative h-screen flex items-center justify-center overflow-hidden bg-black text-white">
      {/* Background Atmosphere Orbs */}
      <div className="absolute top-1/3 left-0 w-96 h-96 bg-white/5 rounded-full blur-[130px] bg-orb pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px] bg-orb pointer-events-none z-0" />
      
      {/* Founders Background Image - Full Screen Depth */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Deep masking for cinematic blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20 z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent hidden lg:block z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black z-10 lg:hidden" />
        
        <img 
          src="/assets/hero.jpeg" 
          alt="B&W Founders" 
          className="w-full h-[60vh] md:h-full object-cover lg:w-1/2 lg:ml-auto grayscale opacity-40 lg:opacity-60 transition-opacity duration-1000 mt-20 md:mt-0"
          style={{ objectPosition: 'center 20%' }}
        />

        {/* Floating Dollars Animation Layer */}
        <div className="absolute inset-0 z-[5] overflow-hidden">
          {[
            { top: '20%', left: '10%', size: '3rem' },
            { top: '40%', left: '80%', size: '5rem' },
            { top: '70%', left: '30%', size: '4rem' },
            { top: '15%', left: '60%', size: '2.5rem' },
            { top: '50%', left: '15%', size: '6rem' },
          ].map((item, i) => (
            <div 
              key={i}
              className="absolute text-emerald-500 font-black select-none pointer-events-none floating-money inline-block"
              style={{ 
                top: item.top, 
                left: item.left, 
                fontSize: item.size,
                filter: 'blur(1px)'
              }}
            >
              $
            </div>
          ))}
        </div>
      </div>

      <div className="container mx-auto px-6 h-full flex flex-col justify-end lg:justify-center relative z-20 pb-8 lg:pb-0">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12">
          
          <div className="max-w-4xl space-y-6">
            <h1 className="hero-elem text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.95] mb-6" style={{ textShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
              СИСТЕМНИЙ <br/>
              <span className="text-emerald-500 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] uppercase">ПРИБУТОК</span> <br/>
              <span className="whitespace-nowrap">ВІД А ДО Я</span>
            </h1>

            <p className="hero-elem text-base md:text-lg text-white/60 max-w-xl mb-10 font-medium leading-relaxed">
              Беремо на себе весь процес — від аналізу до прибутку. Ви — створюєте контент і даєте експертність, ми — будуємо стратегію і кожен етап.
            </p>

            <div className="hero-elem grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-3 w-full max-w-4xl mb-10">
              {[
                { label: "Досвіду", value: "5+ років" },
                { label: "Виручка", value: "$15k–$50k" },
                { label: "Оборот", value: "$100k+" },
                { label: "ROAS", value: "300%+" }
              ].map((fact, idx) => (
                <div key={idx} className="flex flex-col p-3 rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-md hover:bg-white/[0.06] transition-colors duration-300">
                  <span className="text-base md:text-lg font-black text-white mb-0.5">{fact.value}</span>
                  <span className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-wider font-bold leading-tight">{fact.label}</span>
                </div>
              ))}
            </div>

            <div className="hero-elem w-full flex flex-col items-center lg:items-start">
              <button className="w-full md:w-auto px-10 py-5 rounded-full bg-white text-black font-bold text-lg hover:bg-neutral-200 hover:scale-[1.02] active:scale-95 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Отримати діагностику
              </button>
              <span className="text-xs text-white/40 mt-3 font-medium italic">
                Безкоштовно знайдемо ваші точки росту
              </span>
            </div>
          </div>

          <div className="hidden lg:block flex-1 h-[600px] relative">
            {/* Empty space for the founders image layer */}
          </div>

        </div>
      </div>
    </section>
  );
}
