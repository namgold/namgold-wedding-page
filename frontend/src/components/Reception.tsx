"use client";
import { useState } from "react";
import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";
import { googleCalendarUrl, monthGrid, partsOf, prefersIcs } from "@/lib/date";
import { withReception } from "@/lib/fill";
import { pagePath } from "@/lib/routes";
import { DateLine } from "./DateLine";
import { RsvpDialog } from "./RsvpDialog";

const LINE = "color-mix(in srgb, #9d6d63 27%, transparent)";
const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

export function Reception({ t, place }: { t: Copy; place: Place }) {
  const p = partsOf(place.receptionIso);
  const grid = monthGrid(p.y, p.m);
  const weeks = Array.from({ length: Math.ceil(grid.length / 7) }, (_, w) => grid.slice(w * 7, w * 7 + 7));
  const eventWeek = Math.floor(grid.indexOf(p.d) / 7);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const time = `${p.hh}:${p.mm}`;

  const addToCalendar = () => {
    if (prefersIcs()) {
      window.location.assign(`${pagePath(t.lang, place.slug)}/calendar.ics`);
      return;
    }
    const title = withReception(t.eventTitle, t, place);
    window.open(googleCalendarUrl(title, place.receptionIso, place.receptionDurationMin, place.venueAddress), "_blank", "noopener");
  };

  return (
    <>
      <h2 className="h-title mb-6 mt-10 px-4 md:mb-8 md:mt-12">{withReception(t.reception.heading, t, place)}</h2>
      <div className="flex flex-col items-center gap-4 px-6 text-center md:gap-5">
        <h3 className="flex flex-col items-center text-[16px] font-normal uppercase md:text-[20px]">{withReception(t.reception.startsAt, t, place)}:</h3>
        <div className="text-[26px] font-bold md:text-[38px]">{time}</div>
        <DateLine t={t} iso={place.receptionIso} />
        <div className="px-2 text-center text-[15px] uppercase tracking-wide md:text-[20px]">({place.lunar[t.lang]})</div>
        <div className="mx-auto mt-6 w-[296px] max-w-full md:w-[560px]">
          <div className="w-full overflow-hidden rounded-lg border" style={{ borderColor: LINE }}>
            <div className="border-b py-2.5 text-center text-[13px] font-semibold tracking-wide md:text-[22px]" style={{ borderColor: LINE }}>
              {t.monthsLong[p.m - 1]} / {p.y}
            </div>
            <div className="grid grid-cols-7 border-b-2 border-rose">
              {t.weekdaysShort.map((d, i) => (
                <div key={d} className={`py-1.5 text-center text-[10px] md:text-[17px] ${i === p.weekday ? "font-bold" : "font-medium opacity-60"}`}>{d}</div>
              ))}
            </div>
            <div className="flex flex-col gap-y-0.5 px-1 py-2">
              {weeks.map((week, w) => (
                <div key={w} className={`grid grid-cols-7 rounded-lg border ${w === eventWeek ? "border-rose" : "border-transparent"}`}>
                  {week.map((d, i) => (
                    <div key={i} className="flex h-[28px] items-center justify-center md:h-[50px]">
                      {d === p.d ? (
                        <button type="button" onClick={addToCalendar} aria-label={t.reception.addToCalendar} className="relative flex h-[24px] w-[26px] cursor-pointer items-center justify-center transition-transform active:scale-95 md:h-[44px] md:w-[48px]">
                          <svg viewBox="2 3 20 18.5" className="absolute inset-0 h-full w-full translate-y-[2px] fill-rose drop-shadow-sm" aria-hidden><path d={HEART} /></svg>
                          <span className="relative z-10 text-[11px] font-bold text-white md:text-[19px]">{d}</span>
                        </button>
                      ) : d ? (
                        <span className="text-[12px] md:text-[21px]">{d}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button type="button" onClick={addToCalendar} className="mt-4 inline-flex items-center justify-center text-sm tracking-wider underline decoration-1 underline-offset-4 transition-opacity hover:opacity-70">
          {t.reception.addToCalendar}
        </button>
      </div>

      <div className="relative z-10 my-8 flex w-full flex-col items-center justify-center md:my-10">
        <button type="button" className="btn uppercase" onClick={() => setRsvpOpen(true)} aria-haspopup="dialog">{t.reception.rsvp}</button>
      </div>
      {rsvpOpen && <RsvpDialog t={t} place={place.slug} onClose={() => setRsvpOpen(false)} />}
    </>
  );
}
