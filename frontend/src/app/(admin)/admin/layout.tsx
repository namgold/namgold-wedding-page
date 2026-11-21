import type { Metadata } from "next";
import { fontVars } from "../../fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Wedding admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
