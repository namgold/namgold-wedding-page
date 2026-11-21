import type { Copy } from "@/content/types";

/**
 * VI | EN switch: a pill with a sliding thumb on the current language, like an on/off switch with text.
 * A real link to the other language (works without JS, hreflang intact); with JS the click swaps the language in place.
 */
export function LangToggle({ t, href, onSwitch }: { t: Copy; href: string; onSwitch: () => void }) {
  const isEn = t.lang === "en";
  const seg = "relative z-10 flex flex-1 items-center justify-center transition-colors duration-300 motion-reduce:transition-none";
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // let "open in new tab" work
        e.preventDefault();
        onSwitch();
      }}
      hrefLang={isEn ? "vi" : "en"}
      className="in-col-left absolute top-4 z-40 flex h-11 w-28 rounded-full border border-rose/40 bg-blush/80 p-0.5 text-base font-semibold backdrop-blur"
    >
      <span
        aria-hidden
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-rose shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none ${isEn ? "translate-x-full" : ""}`}
      />
      <span lang="vi" aria-current={isEn ? undefined : "true"} className={`${seg} ${isEn ? "text-rose" : "text-blush"}`}>VI</span>
      <span lang="en" aria-current={isEn ? "true" : undefined} className={`${seg} ${isEn ? "text-blush" : "text-rose"}`}>EN</span>
    </a>
  );
}
