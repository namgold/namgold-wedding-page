"use client";
import { useEffect, useRef, type ReactNode } from "react";

const SRC = {
  1: "/images/floral/asset_1.webp",
  2: "/images/floral/asset_2.webp",
  3: "/images/floral/asset_3.webp",
} as const;

/**
 * The page column. Sets --s (window.scrollY, unitless) on itself; the decorations below use it for a slow
 * parallax: translateY(--s * factor). Reduced motion keeps them still.
 */
export function Page({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      ref.current?.style.setProperty("--s", String(Math.round(window.scrollY)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div className="page-frame flex w-full justify-center overflow-x-clip bg-blush">
      <div
        ref={ref}
        className="relative isolate w-full max-w-(--col) overflow-hidden bg-blush text-rose md:mx-auto"
      >
        {children}
      </div>
    </div>
  );
}

/** One decorative image. `tf` is a transform where {y} becomes the parallax offset. */
function Decor({ img, cls, f = 0, tf = "translateY({y})" }: { img: 1 | 2 | 3; cls: string; f?: number; tf?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -z-10 ${cls}`}
      style={{ transform: tf.replace("{y}", `calc(var(--s, 0) * ${f}px)`), willChange: "transform" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={SRC[img]} alt="" className="h-auto w-full" decoding="async" />
    </div>
  );
}

/**
 * The two flowers behind the hero (they live inside the hero so they stack with it). Their layer is taller than the
 * hero because the rotated flower reaches about 1900px down (plus parallax); `.floral-layer` clips to this box.
 */
export function HeroFloral() {
  return (
    <div aria-hidden className="floral-layer pointer-events-none absolute inset-x-0 top-0 -z-10 h-[2400px]">
      <Decor img={1} f={0.1} cls="top-[-20px] left-[-70px] w-[440px] md:top-[-210px] md:left-[-100px] md:w-[560px] lg:top-[-20px] lg:left-[0px] lg:w-[670px]" />
      <Decor img={2} f={0.13} tf="translateY({y}) rotate(162deg)" cls="top-[10px] left-[calc(80%-300px)] w-[600px] opacity-[0.15] md:top-[20px] md:left-[calc(80%-400px)] md:w-[800px] lg:top-[30px] lg:left-[calc(80%-480px)] lg:w-[960px]" />
    </div>
  );
}

/**
 * The flowers behind the rest of the page. Offsets are px from the top of the column, as in the original design
 * (the layer is exactly the column box, so they resolve as before).
 */
export function PageFloral() {
  return (
    <div aria-hidden className="floral-layer pointer-events-none absolute inset-0 -z-10">
      <div aria-hidden className="hero-flower pointer-events-none absolute -z-10 scale-x-[-1] scale-y-[-1] rotate-[20deg]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SRC[1]} alt="" className="h-auto w-full opacity-70" decoding="async" />
      </div>
      <Decor img={2} f={0.08} tf="rotate(162deg) translateY({y})" cls="top-[1160px] left-[calc(50%-310px)] w-[620px] opacity-[0.15] md:top-[770px] md:left-[calc(30%-410px)] md:w-[820px] lg:top-[920px] lg:left-[calc(30%-495px)] lg:w-[990px]" />
      <Decor img={2} f={0.11} tf="rotate(142deg) translateY({y})" cls="top-[1945px] left-[calc(50%-320px)] w-[640px] opacity-[0.15] md:top-[2163px] md:left-[calc(50%-420px)] md:w-[840px] lg:top-[2590px] lg:left-[calc(50%-505px)] lg:w-[1010px]" />
      <Decor img={3} f={-0.04} tf="rotate(-26deg) translateY({y})" cls="top-[1180px] -right-[180px] w-[260px] scale-x-[-1] md:top-[1320px] md:-right-[160px] md:w-[350px] lg:top-[1460px] lg:-right-[200px] lg:w-[420px]" />
      <Decor img={3} f={0.05} cls="top-[1830px] left-[-70px] w-[170px] rotate-180 md:top-[2010px] md:left-[-130px] md:w-[320px] lg:top-[2190px] lg:left-[-160px] lg:w-[420px]" />
      <Decor img={2} f={0.06} cls="top-[3570px] left-0 right-0 mx-auto w-[640px] opacity-[0.15] md:top-[7384px] md:w-[855px] lg:top-[8580px] lg:w-[1035px]" />
      <Decor img={3} f={-0.04} tf="rotate(-28deg) translateY({y})" cls="top-[2211px] -right-[140px] w-[195px] scale-x-[-1] rotate-180 md:top-[2430px] md:-right-[260px] md:w-[365px] lg:top-[2650px] lg:-right-[350px] lg:w-[490px]" />
      <Decor img={3} f={0.03} tf="rotate(176deg) translateY({y})" cls="top-[4060px] left-[-20%] w-[260px] md:top-[3880px] md:w-[350px] lg:top-[4080px] lg:w-[420px]" />
      <Decor img={2} f={0.09} tf="rotate(159deg) translateY({y})" cls="bottom-[100px] -right-[340px] w-[510px] opacity-[0.18] md:w-[660px]" />
    </div>
  );
}
