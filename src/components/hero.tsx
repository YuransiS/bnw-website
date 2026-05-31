"use client";

import React from "react";
import { HeroDesktop } from "./desktop/hero-desktop";
import { HeroMobile } from "./mobile/hero-mobile";

export function Hero() {
  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        <HeroDesktop />
      </div>

      {/* Mobile view */}
      <div className="block md:hidden">
        <HeroMobile />
      </div>
    </>
  );
}
