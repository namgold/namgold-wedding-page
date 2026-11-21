import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";
import { withReception } from "@/lib/fill";

export function Venue({ t, place }: { t: Copy; place: Place }) {
  const q = encodeURIComponent(`${place.venueName}, ${place.venueAddress}`);
  const directions = place.mapUrl ?? `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  return (
    <div className="pt-10 md:pt-12">
      <section className="relative flex flex-col gap-6 px-6 pb-12 md:gap-8 md:px-10 md:pb-16">
        <div className="relative text-center">
          <h3 className="h-title flex flex-col items-center !text-[20px] font-normal md:!text-[26px]">{withReception(t.venue.heldAt, t, place)}</h3>
          <div className="mx-auto mt-3 flex max-w-sm flex-col items-center gap-1 pb-3 text-center md:max-w-[500px]">
            <span className="font-title text-[24px] font-bold leading-tight md:text-[30px]">{place.venueName}</span>
            {place.hall && <span className="text-[17px] md:text-xl">{t.venue.hall} {place.hall[t.lang]}</span>}
            <span className="text-sm tracking-wide md:text-base">{t.venue.address}: {place.venueAddress}</span>
          </div>
        </div>
        <div className="relative flex w-full flex-col items-center gap-4 md:gap-5">
          <iframe
            title={`${withReception(t.venue.heldAt, t, place)} ${place.venueName}`}
            className="h-[374px] w-full max-w-[473px] overflow-hidden rounded-[15px] md:h-[532px] md:max-w-[784px]"
            src={place.mapEmbedUrl ?? `https://maps.google.com/maps?q=${q}&output=embed`}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a href={directions} target="_blank" rel="noopener noreferrer" className="btn uppercase">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            <span>{t.venue.directions}</span>
          </a>
        </div>
      </section>
    </div>
  );
}
