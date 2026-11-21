import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";

/** Replaces {reception} in a copy string with this place's reception name (capitalised when it starts the string). */
export function withReception(s: string, t: Copy, place: Place): string {
  const name = place.receptionName?.[t.lang] ?? t.reception.name;
  const at = s.indexOf("{reception}");
  const value = at === 0 ? name.charAt(0).toUpperCase() + name.slice(1) : name;
  return s.replace("{reception}", value);
}
