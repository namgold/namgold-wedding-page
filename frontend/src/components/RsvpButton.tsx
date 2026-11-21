"use client";
import { useState } from "react";
import type { Place } from "@/content/places";
import type { Copy } from "@/content/types";
import { RsvpDialog } from "./RsvpDialog";

export function RsvpButton({ t, place }: { t: Copy; place: Place }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="relative z-10 my-8 flex w-full flex-col items-center justify-center md:my-10">
        <button type="button" className="btn uppercase" onClick={() => setOpen(true)} aria-haspopup="dialog">{t.reception.rsvp}</button>
      </div>
      {open && <RsvpDialog t={t} place={place.slug} onClose={() => setOpen(false)} />}
    </>
  );
}
