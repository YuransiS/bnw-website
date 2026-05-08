"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const pains = [
  {
    title: "Людина-оркестр",
    text: "Ви робите все вручну: від щоденних прогрівів у сторіз до переписок у діректі. Жодної системи немає, а продажі тримаються виключно на вашому кортизолі та постійній залученості."
  },
  {
    title: "Продукт топ, а продажів мало",
    text: "Люди хвалять контент, охоплення є, але коли доходить до оплат — тиша. У вас немає системної воронки, яка б стабільно конвертувала лояльність у гроші."
  },
  {
    title: "Стеля в доходах",
    text: "Ви працюєте 24/7, але дохід не виправдовує зусиль або взагалі стоїть на місці. Будь-яка спроба масштабуватися та залити гроші у трафік закінчується тупим зливом бюджету."
  },
  {
    title: "Вічний виконавець",
    text: "Ви хотіли стати підприємцем і заробляти, а натомість купили собі ще одну роботу формату 24/7 без вихідних."
  }
];

export function V3Pains() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(
        ".pains-header",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          scrollTrigger: {
            trigger: ".pains-header",
            start: "top 80%",
          }
        }
      );

      // Cards isometric 3D entrance
      cardsRef.current.forEach((card, i) => {
        if (!card) return;
        gsap.fromTo(
          card,
          { 
            y: 100, 
            opacity: 0, 
            rotationX: 45, 
            rotationY: -10, 
            z: -100 
          },
          {
            y: 0,
            opacity: 1,
            rotationX: 0,
            rotationY: 0,
            z: 0,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 85%",
            },
            delay: i * 0.1
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} id="pains" className="relative py-32 bg-black text-white overflow-hidden" style={{ perspective: "1000px" }}>
      <div className="container mx-auto px-6 max-w-6xl relative z-10">
        
        <div className="pains-header text-center mb-20">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
            Впізнаєте себе?
          </h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Якщо хоч один пункт про вас — ви втрачаєте гроші просто зараз.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {pains.map((pain, idx) => (
            <div
              key={idx}
              ref={(el) => { cardsRef.current[idx] = el; }}
              className="group relative p-8 md:p-12 rounded-3xl bg-neutral-900/40 border border-white/5 backdrop-blur-xl transform-gpu transition-all duration-500 hover:bg-neutral-800/60 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(255,255,255,0.05)]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Subtle gradient glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none" />
              
              <div className="relative z-10 transform-gpu transition-transform duration-500 group-hover:translate-z-10">
                <div className="w-12 h-12 mb-6 rounded-full bg-white/10 flex items-center justify-center text-xl font-black text-white">
                  0{idx + 1}
                </div>
                <h3 className="text-2xl font-bold mb-4">{pain.title}</h3>
                <p className="text-white/60 leading-relaxed text-lg">
                  {pain.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="pains-header text-center max-w-3xl mx-auto p-8 rounded-2xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10">
          <p className="text-xl md:text-2xl font-bold text-white/90">
            Ми знаємо, як це виправити. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">
              Ви створюєте сенси — ми будуємо систему.
            </span>
          </p>
        </div>

      </div>
    </section>
  );
}
