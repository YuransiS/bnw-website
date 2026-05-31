"use client";

import React from "react";
import { CasesDesktop } from "./desktop/cases-desktop";
import { CasesMobile } from "./mobile/cases-mobile";

export function Cases() {
  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        <CasesDesktop />
      </div>

      {/* Mobile view */}
      <div className="block md:hidden">
        <CasesMobile />
      </div>
    </>
  );
}