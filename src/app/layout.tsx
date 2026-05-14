import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Black&White Prod | Системні запуски",
  description: "Ми будуємо прибуткову систему навколо вашого контенту. Перетворюємо хаос у прогнозований дохід.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} scroll-smooth antialiased bg-black text-white`}
    >
      <body className="flex flex-col min-h-screen overflow-x-hidden selection:bg-white selection:text-black">
        {children}
      </body>
    </html>
  );
}
