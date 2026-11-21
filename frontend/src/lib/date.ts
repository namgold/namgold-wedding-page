import { wedding } from "@/content/data";

export type Parts = { y: number; m: number; d: number; weekday: number; hh: string; mm: string };

/** Calendar parts of an instant in the wedding timezone. weekday: 0 = Monday ... 6 = Sunday. */
export function partsOf(iso: string): Parts {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: wedding.tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    weekday: order.indexOf(p.weekday),
    hh: p.hour,
    mm: p.minute,
  };
}

/** Monday-first month grid: leading nulls, then 1..daysInMonth. */
export function monthGrid(y: number, m: number): (number | null)[] {
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function buildIcs(title: string, startIso: string, durationMin: number, location: string): string {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMin * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//namgold wedding//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}@linhhy.namgold.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** "10:58:41 30/7/2026" in the wedding timezone, from unix seconds. */
export function fmtStamp(sec: number): string {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: wedding.tz, year: "numeric", month: "numeric", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(sec * 1000)).map((x) => [x.type, x.value]));
  return `${p.hour}:${p.minute}:${p.second} ${p.day}/${p.month}/${p.year}`;
}
