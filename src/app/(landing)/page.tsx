import React from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { TrustQuote } from "@/components/trust-quote";
import { Cases } from "@/components/cases";
import { Pains } from "@/components/pains";
import { Comparison } from "@/components/comparison";
import { SystemScheme } from "@/components/system-scheme";
import { Roadmap } from "@/components/roadmap";
import { About } from "@/components/about";
import { FinalCTA } from "@/components/final-cta";
import { FAQ } from "@/components/faq";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* 1. Первый экран / Оффер */}
        <Hero />

        {/* 2. Блок-цитата доверия */}
        <TrustQuote />

        {/* 3. Блок «Результати наших клієнтів» — кейсы */}
        <Cases />

        {/* 4. «Чому більшість не можуть рости» — боли */}
        <Pains />

        {/* 5. «Ми не просто запускаємо рекламу» — система сравнения */}
        <Comparison />

        {/* 6. Схема «Експерт → B&W → результат» — візуалізація взаємодії */}
        <SystemScheme />

        {/* 7. Блок «Як ми працюємо» — дорожня карта */}
        <Roadmap />

        {/* 8. Блок основателей */}
        <About />

        {/* 9. Фінальний CTA «Готові побудувати систему?» */}
        <FinalCTA />

        {/* FAQ */}
        <FAQ />
      </main>
      <Footer />
    </>
  );
}

