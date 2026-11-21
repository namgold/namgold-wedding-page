import { wedding } from "@/content/data";
import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";
import { partsOf } from "@/lib/date";
import { DateLine } from "./DateLine";
import { FitText } from "./FitText";

export function Announcement({ t, place }: { t: Copy; place: Place }) {
  // No ceremony at this place: show the couple only, the reception section carries the date.
  const iso = place.ceremonyIso;
  const ceremony = place.ceremonyName?.[t.lang] ?? t.announce.ceremony;
  const fill = (s: string) => s.replace("{ceremony}", ceremony);
  return (
    <>
      <div className="mx-auto mb-6 flex flex-col gap-1 whitespace-pre-line px-6 text-center text-[16px] uppercase md:mb-8 md:max-w-[560px] md:text-[20px]">
        <span>{t.announce.kicker + "\n" + fill(t.announce.sub)}</span>
      </div>
      <div className="relative flex w-full min-w-0 flex-col items-center gap-3 px-6 text-center md:gap-4">
        <h3 className="flex w-full items-center justify-center font-names leading-[55px] whitespace-nowrap md:leading-[80px]">
          <FitText max={64} min={24}>{wedding.groom}</FitText>
        </h3>
        <div className="text-[14px] uppercase tracking-[0.1em] md:text-[16px]">{t.announce.groomRole}</div>
        <div className="font-cursive text-[35px] md:text-[42px]">&amp;</div>
        <h3 className="flex w-full items-center justify-center font-names leading-[55px] whitespace-nowrap md:leading-[80px]">
          <FitText max={64} min={24}>{wedding.bride}</FitText>
        </h3>
        <div className="text-[14px] uppercase tracking-[0.1em] md:text-[16px]">{t.announce.brideRole}</div>
      </div>
      {iso && <Ceremony t={t} place={place} iso={iso} title={fill(t.announce.ceremonyAt)} />}
    </>
  );
}

function Ceremony({ t, place, iso, title }: { t: Copy; place: Place; iso: string; title: string }) {
  const p = partsOf(iso);
  return (
    <div className="mt-6 px-6 md:mt-8">
      <div className="relative flex flex-col items-center gap-4 text-center md:gap-5">
        <div className="flex flex-col items-center gap-2">
          <span className="whitespace-pre-line text-center text-[16px] font-normal uppercase md:text-[20px]">{`${title} ${t.announce.place}`}</span>
          <p className="mb-2 text-[16px] font-normal uppercase md:text-[18px]">{t.announce.at}</p>
        </div>
        <div className="text-[20px] md:text-[30px]">{p.hh}:{p.mm}</div>
        <DateLine t={t} iso={iso} />
        <div className="px-2 text-center text-[15px] uppercase tracking-wide md:text-[20px]">({place.lunar[t.lang]})</div>
      </div>
    </div>
  );
}
