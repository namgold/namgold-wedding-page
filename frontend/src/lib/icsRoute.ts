import { notFound } from "next/navigation";
import type { Copy } from "@/content/types";
import { placeBySlug, places } from "@/content/places";
import { buildIcs } from "@/lib/date";
import { withReception } from "@/lib/fill";

export const placeParams = () => places.map((p) => ({ place: p.slug }));

/** Static /<slug>/calendar.ics (and /en/<slug>/calendar.ics): a real URL so iOS Safari opens its "Add to Calendar" sheet. */
export async function icsResponse(t: Copy, params: Promise<{ place: string }>): Promise<Response> {
  const place = placeBySlug((await params).place);
  if (!place) notFound();
  const ics = buildIcs(withReception(t.eventTitle, t, place), place.receptionIso, place.receptionDurationMin, place.venueAddress);
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
}
