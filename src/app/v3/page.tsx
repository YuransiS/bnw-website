import React from "react";
import { V3Header } from "@/components/v3/v3-header";
import { V3Hero } from "@/components/v3/v3-hero";
import { V3Pains } from "@/components/v3/v3-pains";
import { V3Expertise } from "@/components/v3/v3-expertise";
import { V3Cases } from "@/components/v3/v3-cases";
import { V3Roadmap } from "@/components/v3/v3-roadmap";
import { V3About } from "@/components/v3/v3-about";
import { V3Faq } from "@/components/v3/v3-faq";
import { V3Footer } from "@/components/v3/v3-footer";

export default function V3Page() {
  return (
    <div className="bg-black text-white font-sans selection:bg-white selection:text-black">
      <V3Header />
      <main>
        <V3Hero />
        <V3Pains />
        <V3Expertise />
        <V3Cases />
        <V3Roadmap />
        <V3About />
        <V3Faq />
      </main>
      <V3Footer />
    </div>
  );
}
