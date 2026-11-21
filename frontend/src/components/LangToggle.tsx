import type { Copy } from "@/content/types";

export function LangToggle({ t, href }: { t: Copy; href: string }) {
  return (
    <a
      href={href}
      hrefLang={t.lang === "vi" ? "en" : "vi"}
      className="in-col-left absolute top-4 z-40 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-rose/40 bg-blush/80 px-4 text-base font-semibold backdrop-blur"
    >
      {t.otherLang.label}
    </a>
  );
}
