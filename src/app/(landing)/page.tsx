import React from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { SystemFocus } from "@/components/system-focus";
import { Metrics } from "@/components/metrics";
import { Roadmap } from "@/components/roadmap";
import { TrustQuote } from "@/components/trust-quote";
import { Cases } from "@/components/cases";
import { Pains } from "@/components/pains";
import { Comparison } from "@/components/comparison";
import { SystemScheme } from "@/components/system-scheme";
import { About } from "@/components/about";
import { DositTiahnuti } from "@/components/dosit-tiahnuti";
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

        {/* 2. Блок «Ми створюємо систему...» */}
        <SystemFocus />

        {/* 3. Блок цифр-метрик + CTA */}
        <Metrics />

        {/* 4. Блок «Як ми працюємо» */}
        <Roadmap />

        {/* 5. Блок-цитата доверия */}
        <TrustQuote />

        {/* 6. Блок «Результати наших клієнтів» — кейсы */}
        <Cases />

        {/* 7. «Чому більшість не можуть рости» — боли */}
        <Pains />

        {/* 8. «Ми не просто запускаємо рекламу» — система сравнения */}
        <Comparison />

        {/* 9. Схема «Експерт → B&W → результат» */}
        <SystemScheme />

        {/* 10. Блок основателей */}
        <About />

        {/* 11. Фінальний CTA «Готові побудувати систему?» */}
        <FinalCTA />

        {/* FAQ */}
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
