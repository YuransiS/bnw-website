import type { Metadata } from "next";
import "./v2.css";

export const metadata: Metadata = {
  title: "B&W Prod | Version 2",
  description: "Dynamic Adobe Illustrator inspired version of the landing page.",
};

export default function V2Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-v2-bg text-white min-h-screen font-sans selection:bg-v2-accent2/30 selection:text-white v2-scrollbar">
      {children}
    </div>
  );
}
