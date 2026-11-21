import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";

const LINE = "color-mix(in srgb, #9d6d63 40%, transparent)";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Schedule({ t, place }: { t: Copy; place: Place }) {
  const n = place.schedule.length;
  return (
    <>
      {place.dressCode && (
        <div className="relative z-10 flex flex-col items-center gap-5 px-6 py-10 md:px-10 md:py-12">
          <div className="flex flex-col items-center gap-1">
            <h2 className="h-title">{t.dress.heading}</h2>
            <p className="text-center text-sm opacity-70 md:text-base">{place.dressCode.map((d) => d[t.lang]).join(" · ")}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6" role="img" aria-label={t.dress.swatchLabel}>
            {place.dressCode.map((d) => (
              <div
                key={d.color}
                className="h-10 w-10 rounded-full shadow-md md:h-12 md:w-12"
                style={{ backgroundColor: d.color, border: "1.5px solid rgba(157,109,99,.19)" }} // outline keeps light colours visible on the blush page
              />
            ))}
          </div>
        </div>
      )}

      <div className="relative z-10 mb-10 mt-10 flex flex-col gap-6 px-2 md:mb-12 md:mt-12 md:gap-8 md:px-4">
        <h2 className="h-title px-2 md:px-4">{t.schedule.heading}</h2>
        <ol className="relative mx-auto grid w-full max-w-[460px] grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-x-6 gap-y-8 md:gap-x-8 md:gap-y-10">
          {place.schedule.map((it, i) => {
            const line = n < 2 ? null : i === 0 ? "top-1/2 -bottom-8 md:-bottom-10" : i === n - 1 ? "-top-8 bottom-1/2 md:-top-10" : "-top-8 -bottom-8 md:-top-10 md:-bottom-10";
            return (
              <li key={it.time + i} className="contents">
                <span className="pt-0.5 text-right text-[16px] leading-snug tracking-wide tabular-nums md:text-[17px]">{it.time}</span>
                <span aria-hidden className="relative flex items-center justify-center self-stretch">
                  {line && <span className={`absolute left-1/2 w-px -translate-x-1/2 ${line}`} style={{ backgroundColor: LINE }} />}
                  <span className="relative block h-2.5 w-2.5 rounded-full bg-rose" style={{ boxShadow: "0 0 0 2px color-mix(in srgb, #9d6d63 13%, transparent)" }} />
                </span>
                <span className="pt-0.5 text-start text-[17px] font-medium leading-snug md:text-[19px]">{it.ceremony ? cap(place.ceremonyName?.[t.lang] ?? t.announce.ceremony) : it.label?.[t.lang]}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
