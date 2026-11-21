import type { Copy } from "@/content/types";
import { partsOf } from "@/lib/date";
import { FitText } from "./FitText";

/** "CHỦ NHẬT | NGÀY 28 THÁNG 03 NĂM 2027": weekday and date on one line. The date wording is `t.dateText`. */
export function DateLine({ t, iso }: { t: Copy; iso: string }) {
  const p = partsOf(iso);
  const date = t.dateText
    .replace("{d}", String(p.d).padStart(2, "0"))
    .replace("{day}", String(p.d))
    .replace("{month}", t.monthsLong[p.m - 1])
    .replace("{m}", String(p.m).padStart(2, "0"))
    .replace("{y}", String(p.y));
  // One line, bold, as large as fits (up to 22px): FitText shrinks it on narrow phones. The wrapper bleeds 12px into the page padding for room.
  return (
    <div className="-mx-3 w-[calc(100%+1.5rem)] text-center font-bold uppercase">
      <FitText max={22} min={12}>
        {t.weekdaysLong[p.weekday]}
        <span aria-hidden className="mx-3 font-normal opacity-50">|</span>
        {date}
      </FitText>
    </div>
  );
}
