import type { Metadata } from "next";
import { vi } from "@/content/vi";
import { fontVars } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: vi.meta.title,
  description: vi.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={vi.htmlLang} className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
