import React from "react";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { Pains } from "@/components/pains";
import { Expertise } from "@/components/expertise";
import { Cases } from "@/components/cases";
import { Roadmap } from "@/components/roadmap";
import { About } from "@/components/about";
import { FAQ } from "@/components/faq";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Cases />
        <Pains />
        <Expertise />
        <Roadmap />
        <About />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
