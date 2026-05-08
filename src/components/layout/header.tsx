"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export const Header = () => {
  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-black/50 backdrop-blur-xl border-b border-hairline">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tighter text-text-primary">
          Black&White<span className="text-text-secondary">Prod</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-mono text-text-secondary">
          <Link href="#problems" className="hover:text-text-primary transition-colors">
            [ПРОБЛЕМИ]
          </Link>
          <Link href="#expertise" className="hover:text-text-primary transition-colors">
            [ЕКСПЕРТИЗА]
          </Link>
          <Link href="#cases" className="hover:text-text-primary transition-colors">
            [КЕЙСИ]
          </Link>
          <Link href="#team" className="hover:text-text-primary transition-colors">
            [КОМАНДА]
          </Link>
        </nav>

        <Button variant="secondary" className="hidden sm:flex text-xs uppercase tracking-widest px-4 py-2">
          Записатись на розбір
        </Button>
      </div>
    </header>
  );
};
