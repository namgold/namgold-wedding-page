import { wedding } from "@/content/data";
import type { Copy } from "@/content/types";
import { HeroFloral } from "./Floral";

/** Top of the page: short names (right) and two tilted polaroid portraits. */
export function Hero({ t }: { t: Copy }) {
  const person = (role: string, name: string, cls = "") => (
    <div className={`flex flex-col items-center ${cls}`}>
      <div className="text-[13px] capitalize tracking-widest text-rose-deep md:text-[16px]">{role}</div>
      <div className="font-display text-[29px] leading-tight whitespace-nowrap md:text-[36px]">{name}</div>
    </div>
  );
  return (
    <header className="relative z-10 flex min-h-[910px] flex-col items-center justify-start overflow-visible px-6 pb-4 pt-[190px] text-center md:min-h-[900px] md:px-8 md:pb-8 md:pt-[300px]">
      <HeroFloral />
      <div className="hero-names">
        {person(t.hero.groom, wedding.groomShort)}
        {person(t.hero.bride, wedding.brideShort, "mt-1")}
      </div>
      <div className="relative z-10 mx-auto h-[460px] w-[300px] translate-x-[20px] translate-y-[80px] md:h-[720px] md:w-[480px] md:translate-x-0 md:translate-y-0">
        <div className="absolute left-[45px] top-[30px] z-10 md:left-[90px] md:top-[50px]">
          <div className="w-[155px] shrink-0 rotate-[13deg] md:w-[235px]">
            <div className="relative aspect-[2/3] overflow-hidden border-[5px] border-petal">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wedding.heroPhotos.groom} alt={wedding.groomShort} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
        <div className="absolute left-0 top-[230px] z-20 md:top-[360px]">
          <div className="w-[155px] shrink-0 rotate-[-13deg] md:w-[235px]">
            <div className="relative aspect-[2/3] overflow-hidden border-[5px] border-lilac">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wedding.heroPhotos.bride} alt={wedding.brideShort} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
