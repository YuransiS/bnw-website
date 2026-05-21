import type { Metadata } from "next";
import { ModalProvider } from "@/providers/modal-provider";

export const metadata: Metadata = {
  title: "Black&White Prod | Системні запуски",
  description: "Ми будуємо прибуткову систему навколо вашого контенту. Перетворюємо хаос у прогнозований дохід.",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModalProvider>
      {children}
    </ModalProvider>
  );
}
