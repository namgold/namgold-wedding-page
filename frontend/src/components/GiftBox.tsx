"use client";
import { useEffect, useRef, useState } from "react";
import { wedding } from "@/content/data";
import type { Copy } from "@/content/types";

const SPARKLES = [
  { top: "8%", left: "14%", size: 22, d: "0s" },
  { top: "18%", right: "10%", size: 16, d: ".6s" },
  { top: "32%", left: "5%", size: 14, d: "1.2s" },
  { top: "26%", right: "5%", size: 14, d: "1.7s" },
];
// Small gifts around the box: image, position, size, tilt, and the hover "fly up" timing.
const DECOR = [
  { f: "double_dragon_blue", left: -20, top: 10, w: 34, rot: -22, fx: -6, t: 1.6, d: 0, z: 1 },
  { f: "baroque_gold", left: 168, top: 2, w: 38, rot: 20, fx: 6, t: 1.8, d: 0.15, z: 1 },
  { f: "jasmine_white", left: -16, top: 120, w: 26, rot: -18, fx: -4, t: 1.4, d: 0.3, z: 1 },
  { f: "dragon_phoenix_v2", left: 182, top: 114, w: 24, rot: 14, fx: 5, t: 1.7, d: 0.45, z: 1 },
  { f: "porcelain_v2_red", left: -8, top: 172, w: 44, rot: 8, fx: -3, t: 1.9, d: 0.1, z: 3 },
  { f: "lien_hoa_v2_green", left: 26, top: 182, w: 26, rot: -10, fx: 4, t: 1.3, d: 0.35, z: 3 },
  { f: "baroque_v2_darkred", left: 118, top: 176, w: 40, rot: -14, fx: 6, t: 1.7, d: 0.2, z: 3 },
];
// Confetti: size, shape, colour, flight vector and timing.
const CONFETTI = [
  { w: 11, h: 5.5, c: "#ec4899", r: "2px", x: -55, y: -130, rot: 540, t: 1, d: 0.05 },
  { w: 10, h: 10, c: "#9d6d63", r: "50%", x: 46, y: -150, rot: -460, t: 1.1, d: 0.12 },
  { w: 11, h: 5.5, c: "#22c55e", r: "2px", x: -12, y: -160, rot: 620, t: 0.95, d: 0.2 },
  { w: 9, h: 9, c: "#3b82f6", r: "50%", x: 28, y: -115, rot: -340, t: 1.15, d: 0.3 },
  { w: 12, h: 6, c: "#a855f7", r: "2px", x: -34, y: -105, rot: 320, t: 1.05, d: 0.35 },
  { w: 10, h: 5, c: "#9d6d63", r: "2px", x: 8, y: -170, rot: 420, t: 0.9, d: 0.5 },
  { w: 9, h: 9, c: "#f97316", r: "50%", x: -46, y: -78, rot: -200, t: 1.1, d: 0.55 },
];

export function GiftBox({ t }: { t: Copy }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`relative ${open ? "z-50" : "z-10"} flex flex-col items-center justify-center px-6 pb-10 pt-8 md:pb-14 md:pt-12`}>
      <h2 className="h-title mb-4">{t.gift.heading}</h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${t.gift.heading}: ${t.gift.tap}`}
        className="igb group relative cursor-pointer border-none bg-transparent outline-none"
        style={{ width: 260, height: 280 }}
      >
        <span className="relative flex h-full w-full items-end justify-center pb-[26px]">
          {SPARKLES.map((s, i) => (
            <span key={i} aria-hidden className="igb-sparkle pointer-events-none absolute z-20" style={{ top: s.top, left: s.left, right: s.right, fontSize: s.size, "--d": s.d } as React.CSSProperties}>✦</span>
          ))}
          <span aria-hidden className="pointer-events-none absolute z-0" style={{ bottom: 187, left: "50%" }}>
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className="igb-confetti pointer-events-none"
                style={{
                  width: c.w, height: c.h, marginLeft: -c.w / 2, marginTop: -c.h / 2, backgroundColor: c.c, borderRadius: c.r,
                  "--cx": `${c.x}px`, "--cy": `${c.y}px`, "--cr": `${c.rot}deg`, "--t": `${c.t}s`, "--d": `${c.d}s`,
                } as React.CSSProperties}
              />
            ))}
          </span>
          <span className="igb-bob relative block" style={{ width: 200, height: 220 }}>
            <span aria-hidden className="igb-shadow pointer-events-none absolute" style={{ left: "50%", bottom: -8, width: 144, height: 12, marginLeft: -72, borderRadius: "50%", backgroundColor: "rgba(0,0,0,.45)", filter: "blur(4px)" }} />
            {DECOR.filter((d) => d.z === 1).map((d) => <Decor key={d.f} d={d} />)}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/giftbox/box.webp" alt="" className="igb-box pointer-events-none absolute" style={{ left: "50%", bottom: 0, width: 170, maxHeight: 220, objectFit: "contain", marginLeft: -85, zIndex: 2, filter: "drop-shadow(0 10px 18px rgba(0,0,0,.25))" }} />
            {DECOR.filter((d) => d.z === 3).map((d) => <Decor key={d.f} d={d} />)}
          </span>
        </span>
        <span className="igb-hint absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium">{t.gift.tap}</span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={t.gift.heading} className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-blush text-center sm:max-w-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-rose px-6 pb-4 pt-6">
              <button type="button" aria-label={t.gift.close} onClick={() => setOpen(false)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <h3 className="font-title text-[24px] font-bold uppercase tracking-[1px] text-white" style={{ textShadow: "1px 1px 2px rgba(0,0,0,.2)" }}>{t.gift.heading}</h3>
            </div>
            <div className="p-4 sm:p-6">
              {wedding.showBankQr && <p className="mb-3 text-base">{t.gift.qrNote}</p>}
              <div className="flex flex-col items-center gap-4 sm:gap-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center">
                {wedding.gifts.map((g) => (
                  <div key={g.role} className="flex max-w-60 flex-1 flex-col items-center sm:max-w-none">
                    <h4 className="mb-2 flex min-h-4 items-start justify-center text-center text-base font-medium">{g.role === "groom" ? t.gift.groom : t.gift.bride}</h4>
                    {wedding.showBankQr && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.qr} alt={`QR ${g.bank} ${g.holder}`} className="h-40 w-40 rounded-xl bg-white object-contain p-1 shadow-lg sm:h-44 sm:w-44" style={{ border: "2px solid rgba(157,109,99,.125)" }} />
                    )}
                    <div className="mt-2 space-y-1 text-center">
                      <p className="flex items-center justify-center gap-1.5 text-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.icon} alt="" width={20} height={20} className="h-5 w-5" />
                        {g.bank}
                      </p>
                      <CopyNumber number={g.number} t={t} />
                      <p className="text-sm font-semibold">{g.holder}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Decor({ d }: { d: (typeof DECOR)[number] }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/images/giftbox/${d.f}.webp`}
      alt=""
      className="igb-decor pointer-events-none absolute"
      style={{
        left: d.left, top: d.top, width: d.w, zIndex: d.z, transform: `rotate(${d.rot}deg)`,
        filter: "drop-shadow(0 2px 3px rgba(0,0,0,.25))", willChange: "transform, opacity",
        "--fx": `${d.fx}px`, "--t": `${d.t}s`, "--d": `${d.d}s`,
      } as React.CSSProperties}
    />
  );
}

// One tappable line (icon + number): copies the number. Pressed and just-copied states give feedback; the icon becomes a check for 2 s.
function CopyNumber({ number, t }: { number: string; t: Copy }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(number);
    } catch {
      // No Clipboard API (some in-app browsers, non-secure pages): select a hidden field and use the old command.
      const el = document.createElement("textarea");
      el.value = number;
      el.setAttribute("readonly", "");
      el.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } finally {
        el.remove();
      }
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${t.gift.copy}: ${number}`}
      className={`mx-auto flex cursor-pointer select-none items-center gap-2 rounded-lg border-none px-3 py-1.5 font-mono text-sm transition duration-150 active:scale-95 active:bg-rose/25 ${copied ? "bg-rose/15" : "bg-transparent hover:bg-rose/10"}`}
    >
      {copied ? (
        <svg className="h-4 w-4 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="9" y="9" width="11" height="11" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 15V6a2 2 0 012-2h9" /></svg>
      )}
      {number}
      <span role="status" className="sr-only">{copied ? t.gift.copied : ""}</span>
    </button>
  );
}
