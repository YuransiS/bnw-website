"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext<{
  theme: "dark" | "light";
  toggleTheme: () => void;
}>({
  theme: "dark",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<"dark">("dark");

  const toggleTheme = () => {};

  return (
    <ThemeContext.Provider value={{ theme: "dark", toggleTheme }}>
      <div className="admin-layout-root w-full min-h-screen bg-crm-bg text-crm-text flex flex-col font-sans">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
