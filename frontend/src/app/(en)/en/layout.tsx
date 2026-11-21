import type { Metadata } from "next";
import { en } from "@/content/en";
import { fontVars } from "../../fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={en.htmlLang} className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
