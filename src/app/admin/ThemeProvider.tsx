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
      <div className={`admin-layout-root min-h-screen bg-[#060608] text-white flex flex-col md:flex-row font-sans transition-all duration-200 ${theme === "light" ? "theme-light" : ""}`}>
        {/* Style block injecting global theme overrides */}
        <style jsx global>{`
          /* Light Theme Overrides */
          .theme-light .admin-layout-root,
          .theme-light {
            background-color: #f3f4f6 !important;
            color: #171717 !important;
          }
          .theme-light .bg-\\[\\#060608\\] {
            background-color: #f3f4f6 !important;
          }
          .theme-light .bg-\\[\\#0C0C0F\\] {
            background-color: #ffffff !important;
            color: #171717 !important;
          }
          .theme-light .border-white\\/5 {
            border-color: #e5e5e5 !important;
          }
          .theme-light .border-white\\/10 {
            border-color: #d4d4d4 !important;
          }
          .theme-light .text-white {
            color: #171717 !important;
          }
          .theme-light .text-white\\/80 {
            color: #262626 !important;
          }
          .theme-light .text-white\\/70 {
            color: #404040 !important;
          }
          .theme-light .text-white\\/60 {
            color: #525252 !important;
          }
          .theme-light .text-white\\/50 {
            color: #737373 !important;
          }
          .theme-light .text-white\\/45 {
            color: #737373 !important;
          }
          .theme-light .text-white\\/40 {
            color: #737373 !important;
          }
          .theme-light .text-white\\/30 {
            color: #a3a3a3 !important;
          }
          .theme-light .text-white\\/20 {
            color: #e5e5e5 !important;
          }
          .theme-light .bg-white\\/5 {
            background-color: #f5f5f6 !important;
            border-color: #e5e5e5 !important;
          }
          .theme-light .bg-white\\/\\[0\\.02\\] {
            background-color: #f9fafb !important;
          }
          .theme-light .bg-white\\/\\[0\\.01\\] {
            background-color: #f9fafb !important;
          }
          .theme-light .bg-\\[\\#050507\\] {
            background-color: #f3f4f6 !important;
          }
          .theme-light select option {
            background-color: #ffffff !important;
            color: #171717 !important;
          }
          
          /* Specific element overrides for inputs & cards */
          .theme-light input,
          .theme-light select,
          .theme-light textarea {
            background-color: #ffffff !important;
            color: #171717 !important;
            border-color: #d4d4d4 !important;
          }
          .theme-light input::placeholder,
          .theme-light textarea::placeholder {
            color: #a3a3a3 !important;
          }
          .theme-light .bg-neutral-900 {
            background-color: #ffffff !important;
            color: #171717 !important;
            border-color: #d4d4d4 !important;
          }
          .theme-light .text-emerald-400 {
            color: #059669 !important; /* darker green for contrast in light theme */
          }
          .theme-light .text-yellow-400 {
            color: #d97706 !important;
          }
          .theme-light .text-purple-400 {
            color: #7c3aed !important;
          }
          .theme-light .text-red-400 {
            color: #dc2626 !important;
          }
          .theme-light .bg-emerald-500\\/10 {
            background-color: #d1fae5 !important;
            color: #065f46 !important;
          }
          .theme-light .bg-purple-500\\/10 {
            background-color: #f3e8ff !important;
            color: #5b21b6 !important;
          }
          .theme-light .bg-blue-500\\/10 {
            background-color: #dbeafe !important;
            color: #1e40af !important;
          }
          .theme-light .bg-red-500\\/10 {
            background-color: #fee2e2 !important;
            color: #991b1b !important;
          }
          
          /* Custom active state for links in sidebar */
          .theme-light .bg-white.text-black {
            background-color: #171717 !important;
            color: #ffffff !important;
            border-color: #171717 !important;
          }
        `}</style>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
