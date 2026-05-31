"use client";

import React from "react";
import { RoadmapDesktop } from "./desktop/roadmap-desktop";
import { RoadmapMobile } from "./mobile/roadmap-mobile";

export function Roadmap() {
  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        <RoadmapDesktop />
      </div>

      {/* Mobile view */}
      <div className="block md:hidden">
        <RoadmapMobile />
      </div>
    </>
  );
}
