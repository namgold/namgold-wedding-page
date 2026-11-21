"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { wedding } from "@/content/data";
import type { Copy } from "@/content/types";

const photos = Array.from({ length: wedding.albumCount }, (_, i) => `/images/album/p${i + 1}.svg`);
const AUTO_MS = 1400; // advance interval while the carousel is on screen
const PAUSE_MS = 6000; // pause after the guest touches it

function cardStyle(rel: number, ratio: number): React.CSSProperties {
  const base = { aspectRatio: String(ratio), transitionDuration: "1100ms" };
  if (rel === 0) return { ...base, transform: "translateX(0%) translateZ(0px) rotateY(0deg) scale(1)", opacity: 1, zIndex: 100 };
  if (Math.abs(rel) === 1) {
    return { ...base, transform: `translateX(${rel * 60}%) translateZ(-150px) rotateY(${rel * -45}deg) scale(0.85)`, opacity: 0.75, zIndex: 99 };
  }
  return { ...base, transform: `translateX(${Math.sign(rel) * 90}%) translateZ(-300px) scale(0.7)`, opacity: 0, zIndex: 98, pointerEvents: "none" };
}

export function Album({ t }: { t: Copy }) {
  const n = photos.length;
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [still, setStill] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const next = useCallback(() => setCur((i) => (i + 1) % n), [n]);
  const prev = useCallback(() => setCur((i) => (i - 1 + n) % n), [n]);
  const hold = useCallback(() => {
    setPaused(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPaused(false), PAUSE_MS);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setStill(mq.matches);
    const on = (e: MediaQueryListEvent) => setStill(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (n <= 1 || still || !inView || paused || open !== null) return;
    const id = setInterval(next, AUTO_MS);
    return () => clearInterval(id);
  }, [n, still, inView, paused, open, next]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % n));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + n) % n));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, n]);

  const rel = (i: number) => {
    const d = i - cur;
    return d > n / 2 ? d - n : d < -n / 2 ? d + n : d;
  };

  return (
    <div className="relative z-10 flex flex-col items-center overflow-visible px-6 pb-10 pt-10 md:px-10 md:pb-12 md:pt-14">
      <h2 className="h-title">{t.album.heading}</h2>
      <div
        ref={root}
        className="relative z-10 mt-6 w-full max-w-[390px] md:max-w-[560px]"
        onMouseEnter={() => { if (timer.current) clearTimeout(timer.current); setPaused(true); }}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="relative h-[340px] touch-pan-y md:h-[520px]"
          onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={(e) => {
            const s = touch.current;
            touch.current = null;
            if (!s) return;
            const dx = e.changedTouches[0].clientX - s.x;
            const dy = Math.abs(e.changedTouches[0].clientY - s.y);
            if (Math.abs(dx) > 50 && Math.abs(dx) > dy) { dx < 0 ? next() : prev(); hold(); }
          }}
        >
          {n > 1 && (
            <>
              <button type="button" aria-label={t.album.prev} onClick={() => { hold(); prev(); }} className="absolute left-0 top-1/2 z-[200] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-rose/15 transition-colors hover:bg-rose/25 md:flex">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button type="button" aria-label={t.album.next} onClick={() => { hold(); next(); }} className="absolute right-0 top-1/2 z-[200] hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-rose/15 transition-colors hover:bg-rose/25 md:flex">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </>
          )}
          <div className="relative flex h-full w-full items-center justify-center" style={{ perspective: "1000px" }}>
            {photos.map((src, i) => {
              const r = rel(i);
              return (
                <div
                  key={src}
                  className={`absolute h-[92%] cursor-pointer overflow-hidden rounded-2xl shadow-xl transition-all ease-in-out ${r === 0 ? "ring-2 ring-white/30" : ""}`}
                  style={cardStyle(r, ratios[i] ?? 1)}
                  onClick={() => { hold(); if (r === 0) setOpen(i); else setCur(i); }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${t.album.alt} ${i + 1}`}
                    className="h-full w-full object-cover"
                    onLoad={(e) => {
                      const im = e.currentTarget;
                      if (im.naturalWidth && im.naturalHeight) setRatios((c) => (c[i] ? c : { ...c, [i]: im.naturalWidth / im.naturalHeight }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${t.album.alt} ${i + 1}`}
              aria-current={i === cur}
              onClick={() => { hold(); setCur(i); }}
              className={`h-2 rounded-full bg-current transition-all duration-300 ${i === cur ? "w-6 opacity-70" : "w-2 opacity-25 hover:opacity-40"}`}
            />
          ))}
        </div>
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={t.album.heading} className="fixed inset-0 z-50 flex flex-col items-center bg-black/85 px-2 pb-4 pt-10 sm:px-4 sm:pb-6 sm:pt-12" onClick={() => setOpen(null)}>
          <span className="absolute left-2 top-2 z-10 rounded-full bg-black/40 px-2 py-1 text-sm text-white shadow-md sm:left-4 sm:top-4 sm:px-3 sm:text-lg">{open + 1} / {n}</span>
          <button type="button" aria-label={t.album.close} onClick={() => setOpen(null)} className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-xl text-white hover:bg-white/20 sm:right-4 sm:top-4 sm:text-2xl">✕</button>
          <div className="relative flex min-h-0 w-full max-w-5xl flex-1 items-center justify-center px-8 sm:px-12">
            <button type="button" aria-label={t.album.prev} onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + n) % n); }} className="absolute left-0 z-10 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-white hover:bg-white/20 sm:left-2 sm:h-12 sm:w-12 sm:text-4xl">‹</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photos[open]} alt={`${t.album.alt} ${open + 1}`} className="max-h-full max-w-full select-none rounded-xl object-contain shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} draggable={false} />
            <button type="button" aria-label={t.album.next} onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % n); }} className="absolute right-0 z-10 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-white hover:bg-white/20 sm:right-2 sm:h-12 sm:w-12 sm:text-4xl">›</button>
          </div>
          <div className="mt-3 flex max-w-[90vw] shrink-0 gap-2 overflow-x-auto rounded-lg bg-black/30 px-2 py-2 backdrop-blur-sm sm:mt-4 sm:max-w-[80vw] sm:gap-3 sm:px-4 sm:py-3" onClick={(e) => e.stopPropagation()}>
            {photos.map((src, i) => (
              <button
                key={src}
                type="button"
                aria-label={`${t.album.alt} ${i + 1}`}
                aria-current={i === open}
                onClick={() => setOpen(i)}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-md transition-all duration-200 sm:h-16 sm:w-16 sm:rounded-lg ${i === open ? "scale-105 shadow-lg outline outline-2 outline-offset-2 outline-rose" : "opacity-60 hover:opacity-100"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
