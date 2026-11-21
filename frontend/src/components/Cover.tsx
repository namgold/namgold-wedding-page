import { wedding } from "@/content/data";
import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";
import { partsOf } from "@/lib/date";
import { FitText } from "./FitText";
import { Petals } from "./Petals";

/** Envelope-style opening card shown before the invitation. Opening it also starts the music. */
export function Cover({ t, place, onOpen }: { t: Copy; place: Place; onOpen: () => void }) {
  const p = partsOf(place.ceremonyIso ?? place.receptionIso);
  const date = `${p.d}/${p.m}/${p.y}`;
  return (
    <section
      aria-label={t.cover.invite}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(to bottom right, #6b2d3a, #4a1f28, #2e1219)" }}
    >
      <Petals />
      <div className="pop-in relative w-[310px] sm:w-[340px] md:w-[520px] lg:w-[600px]">
        <div
          aria-hidden
          className="seal absolute left-1/2 top-[50px] z-30 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "radial-gradient(circle at 30% 30%, #9D6D63, rgb(127, 79, 69))", boxShadow: "inset 0 2px 4px rgba(255,255,255,.3)" }}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-blush">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </div>
        <div className="relative rounded-lg" style={{ boxShadow: "0 25px 60px -12px rgba(0,0,0,.45), 0 8px 24px rgba(0,0,0,.2), 0 0 40px rgba(196,137,127,.15)" }}>
          <div className="absolute inset-0 overflow-hidden rounded-lg" style={{ background: "rgba(255,250,247,.95)", border: "1px solid rgba(196,137,127,.15)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/floral/asset_1.webp" alt="" aria-hidden className="pointer-events-none absolute -top-[50px] left-[calc(-30%+60px)] w-[360px] opacity-40 md:-top-[65px] md:left-[calc(-30%+75px)] md:w-[450px] lg:-top-[80px] lg:left-[calc(-30%+90px)] lg:w-[520px]" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/floral/asset_3.webp" alt="" aria-hidden className="pointer-events-none absolute -bottom-[40px] -right-[35px] w-[130px] rotate-[150deg] opacity-30 md:-bottom-[50px] md:-right-[45px] md:w-[180px]" />
          </div>
          <div className="relative z-10 px-6 pb-14 pt-28 text-center md:pb-8 md:pt-24">
            <h1 className="mb-2 flex flex-col items-center font-display leading-tight text-rose">
              <span className="block w-full text-center"><FitText max={36} min={18}>{wedding.groom}</FitText></span>
              <span className="block w-full text-center font-cursive text-xl leading-none sm:text-2xl">&amp;</span>
              <span className="block w-full text-center"><FitText max={36} min={18}>{wedding.bride}</FitText></span>
            </h1>
            <div className="mb-2 flex items-center justify-center gap-3" aria-hidden>
              <div className="h-px w-10" style={{ background: "linear-gradient(to right, transparent, #C4897F)" }} />
              <span className="text-sm text-cd opacity-70">❦</span>
              <div className="h-px w-10" style={{ background: "linear-gradient(to left, transparent, #C4897F)" }} />
            </div>
            <p className="mb-5 flex flex-col items-center text-[18px]" style={{ color: "rgba(157,109,99,.7)" }}>{date}</p>
            <p className="mb-6 text-[18px] font-light" style={{ color: "rgba(157,109,99,.7)" }}>{t.cover.invite}</p>
            <button
              type="button"
              onClick={onOpen}
              className="relative mx-auto flex w-fit cursor-pointer items-center justify-center overflow-hidden rounded-full bg-rose px-8 py-2.5 text-lg font-semibold text-blush shadow-lg"
            >
              {t.cover.open}
              <span aria-hidden className="shine pointer-events-none absolute top-0 h-full w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)" }} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
