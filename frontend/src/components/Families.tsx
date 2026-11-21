import { wedding } from "@/content/data";
import type { Copy } from "@/content/types";
import { FitText } from "./FitText";

function Side({ parents, address, t }: { parents: readonly string[]; address: string; t: Copy }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span>{t.families.parents}</span>
      {parents.map((n) => (
        <div key={n} className="block w-full px-1 font-semibold"><FitText max={23} min={13}>{n}</FitText></div>
      ))}
      <div className="mx-auto mt-1 flex w-[90%] flex-col whitespace-pre-line text-[14px] tracking-normal md:text-[16px] [overflow-wrap:anywhere] md:w-[80%]">{address}</div>
    </div>
  );
}

export function Families({ t }: { t: Copy }) {
  return (
    <>
      <h2 className="h-title mb-6 mt-10 px-4 md:mb-8 md:mt-[228px]">{t.families.heading}</h2>
      <div className="mb-6 md:mb-8">
        <div className="relative grid grid-cols-2 gap-2 px-3 text-center md:gap-3">
          <Side parents={wedding.groomParents} address={wedding.groomAddress} t={t} />
          <Side parents={wedding.brideParents} address={wedding.brideAddress} t={t} />
        </div>
      </div>
    </>
  );
}
