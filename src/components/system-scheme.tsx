"use client";

import React from "react";
import { SystemSchemeDesktop } from "./desktop/system-scheme-desktop";

export function SystemScheme() {
  return (
    <div className="hidden md:block">
      {/* Render only on desktop, completely disabled on mobile */}
      <SystemSchemeDesktop />
    </div>
  );
}
