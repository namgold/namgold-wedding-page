"use client";
import { useEffect, useState, type RefObject } from "react";
import { wedding } from "@/content/data";
import type { Copy } from "@/content/types";
import { fadePause, fadePlay, useFocusFade } from "@/lib/focusFade";

const BARS = [
  { h: "60%", a: "animate-dance-1" },
  { h: "100%", a: "animate-dance-2" },
  { h: "40%", a: "animate-dance-3" },
  { h: "80%", a: "animate-dance-4" },
];

/** Spinning-disc button. The <audio> element lives in Invitation so the cover's "open" click can start it. */
export function Music({ t, audioRef }: { t: Copy; audioRef: RefObject<HTMLAudioElement | null> }) {
  const [on, setOn] = useState(false);
  useFocusFade(audioRef);
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const sync = () => setOn(!a.paused);
    sync();
    a.addEventListener("play", sync);
    a.addEventListener("pause", sync);
    return () => { a.removeEventListener("play", sync); a.removeEventListener("pause", sync); };
  }, [audioRef]);
  if (!wedding.musicSrc) return null;
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (on) {
      setOn(false); // the disc stops now; the audio fades out over 1 s, then pauses
      fadePause(a);
    } else {
      setOn(true);
      fadePlay(a).catch(() => setOn(false));
    }
  };
  return (
    <div className="in-col-right fixed bottom-14 z-40">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        aria-label={on ? t.music.off : t.music.on}
        className="relative h-12 w-12 cursor-pointer rounded-full shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose active:scale-95"
      >
        <span
          className={`absolute inset-0 rounded-full ${on ? "animate-spin-cd" : ""}`}
          style={{ background: "linear-gradient(to right bottom, rgba(196,137,127,.8), rgb(196,137,127), rgba(196,137,127,.867))" }}
        >
          <span className="absolute inset-1 rounded-full border border-white/20" />
          <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 via-transparent to-transparent" />
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-4 items-end gap-0.5" aria-hidden>
            {BARS.map((b) => (
              <span key={b.a} className={`w-1 rounded-full bg-white ${on ? b.a : ""}`} style={{ height: b.h }} />
            ))}
          </span>
        </span>
      </button>
    </div>
  );
}
