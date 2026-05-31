"use client";

import React from "react";
import { AboutDesktop } from "./desktop/about-desktop";
import { AboutMobile } from "./mobile/about-mobile";

export function About() {
  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        <AboutDesktop />
      </div>

      {/* Mobile view */}
      <div className="block md:hidden">
        <AboutMobile />
      </div>
    </>
  );
}
