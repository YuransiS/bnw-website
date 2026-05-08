import { DynamicBackground } from "@/components/v2/dynamic-background";
import { HeaderV2 } from "@/components/v2/header-v2";
import { HeroV2 } from "@/components/v2/hero-v2";
import { PainPointsV2 } from "@/components/v2/pain-points-v2";
import { ExpertiseV2 } from "@/components/v2/expertise-v2";
import { CaseStudiesV2 } from "@/components/v2/case-studies-v2";
import { TeamV2 } from "@/components/v2/team-v2";
import { RoadmapV2 } from "@/components/v2/roadmap-v2";
import { FooterV2 } from "@/components/v2/footer-v2";

export default function V2Page() {
  return (
    <main className="relative min-h-screen overflow-hidden selection:bg-white/20">
      <DynamicBackground />
      <HeaderV2 />
      <HeroV2 />
      <PainPointsV2 />
      <ExpertiseV2 />
      <CaseStudiesV2 />
      <RoadmapV2 />
      <TeamV2 />
      <FooterV2 />
    </main>
  );
}
