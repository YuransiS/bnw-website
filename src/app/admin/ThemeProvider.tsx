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
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("crm-theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("crm-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={`admin-layout-root min-h-screen bg-crm-bg text-crm-text flex flex-col md:flex-row font-sans transition-all duration-200 ${theme === "light" ? "theme-light" : ""}`}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
