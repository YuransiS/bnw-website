import Link from "next/link";
import { Button } from "@/components/ui/button";

export const Footer = () => {
  return (
    <footer className="border-t border-hairline bg-surface1">
      <div className="container mx-auto px-6 py-20 lg:py-32 flex flex-col items-center text-center">
        <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.02em] leading-[1.1] mb-6 max-w-2xl text-balance">
          Досить тягнути весь запуск на собі.
        </h2>
        <p className="text-text-secondary text-lg mb-10 max-w-xl text-balance">
          Записуйтесь на аудит проєкту. Ми покажемо, як оцифрувати ваш хаос і побудувати системний прибуток.
        </p>
        <Button variant="primary" className="mb-24 uppercase tracking-widest px-8 py-4">
          Записатись на розбір
        </Button>

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 text-sm font-mono text-text-secondary border-t border-hairline pt-10 text-left">
          <div>
            <h3 className="text-text-primary mb-4 font-bold tracking-widest uppercase">Контакти</h3>
            <ul className="space-y-2">
              <li>Black&White Prod</li>
              <li>info@bwprod.com</li>
              <li>
                <a href="#" className="hover:text-text-primary transition-colors">Telegram Bot</a>
              </li>
              <li>
                <a href="#" className="hover:text-text-primary transition-colors">Instagram</a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-text-primary mb-4 font-bold tracking-widest uppercase">Правова інформація</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="hover:text-text-primary transition-colors">Політика конфіденційності</Link>
              </li>
              <li>
                <Link href="#" className="hover:text-text-primary transition-colors">Договір публічної оферти</Link>
              </li>
            </ul>
          </div>
          <div className="flex flex-col justify-end md:text-right">
            <p>© 2026 Black&White Prod.<br/>Всі права захищені.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
