import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NoiseOverlay } from "@/components/ui/noise-overlay";
import { HeroSection } from "@/components/sections/hero";
import { PainPoints } from "@/components/sections/pain-points";
import { Expertise } from "@/components/sections/expertise";
import { CaseStudies } from "@/components/sections/case-studies";
import { Roadmap } from "@/components/sections/roadmap";
import { AboutUs } from "@/components/sections/about-us";
import { FAQ } from "@/components/sections/faq";

export default function Home() {
  return (
    <main className="relative bg-void min-h-screen">
      <NoiseOverlay />
      <Header />
      
      <HeroSection />
      <PainPoints />
      <Expertise />
      <CaseStudies />
      <Roadmap />
      <AboutUs />
      <FAQ />
      
      <Footer />
    </main>
  );
}
