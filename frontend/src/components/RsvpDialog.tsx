"use client";
import { useEffect, useRef, useState } from "react";
import type { Copy } from "@/content/types";
import { api } from "@/lib/api";
import { useGuestName } from "@/lib/useGuestName";
import { useCaptcha } from "./Turnstile";
import { errorText } from "./WishForm";

export function RsvpDialog({ t, place, onClose }: { t: Copy; place: string; onClose: () => void }) {
  const [name, setName] = useGuestName();
  const [side, setSide] = useState<"" | "groom" | "bride">("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [guests, setGuests] = useState(1);
  const [dietary, setDietary] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<boolean | null>(null); // value = attending
  const captcha = useCaptcha();
  const first = useRef<HTMLInputElement>(null);

  // The parent re-renders every second (countdown): keep onClose in a ref so this effect runs once
  // and focus is not pulled back to the first field.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || attending === null || side === "") return;
    setBusy(true);
    setError("");
    const res = await api("/api/rsvp", {
      method: "POST",
      body: JSON.stringify({ name, side, place, attending, guests: attending ? guests : 0, dietary, message, website, turnstileToken: captcha.token }),
    });
    captcha.reset();
    setBusy(false);
    if (res.ok) setDone(attending);
    else setError(res.error);
  };

  const radio = "flex items-center gap-2";
  return (
    <div role="dialog" aria-modal="true" aria-label={t.rsvp.heading} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="floral-bg max-h-[92dvh] w-full max-w-sm overflow-y-auto rounded-xl p-5 text-left" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-center font-serif text-xl">{t.rsvp.heading}</h3>

        {done !== null ? (
          <div className="mt-4 text-center" role="status">
            <p>{done ? t.rsvp.thanksYes : t.rsvp.thanksNo}</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" className="btn btn-ghost" onClick={() => setDone(null)}>{t.rsvp.again}</button>
              <button type="button" className="btn" onClick={onClose}>{t.rsvp.close}</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="relative mt-3 space-y-4">
            <p className="text-sm">{t.rsvp.intro}</p>
            <label className="block">
              <span className="mb-1 block text-sm">{t.rsvp.name}</span>
              <input ref={first} className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="name" />
            </label>
            <fieldset>
              <legend className="mb-1 text-sm">{t.rsvp.side}</legend>
              <div className="flex gap-5">
                <label className={radio}><input type="radio" name="side" required checked={side === "groom"} onChange={() => setSide("groom")} />{t.rsvp.groomSide}</label>
                <label className={radio}><input type="radio" name="side" required checked={side === "bride"} onChange={() => setSide("bride")} />{t.rsvp.brideSide}</label>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm">{t.rsvp.attending}</legend>
              <div className="space-y-1">
                <label className={radio}><input type="radio" name="attending" required checked={attending === true} onChange={() => setAttending(true)} />{t.rsvp.yes}</label>
                <label className={radio}><input type="radio" name="attending" required checked={attending === false} onChange={() => setAttending(false)} />{t.rsvp.no}</label>
              </div>
            </fieldset>
            {attending && (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm">{t.rsvp.guests}</span>
                  <select className="field" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">{t.rsvp.dietary}</span>
                  <input className="field" value={dietary} onChange={(e) => setDietary(e.target.value)} maxLength={200} placeholder={t.rsvp.dietaryHint} />
                </label>
              </>
            )}
            <label className="block">
              <span className="mb-1 block text-sm">{t.rsvp.message}</span>
              <textarea className="field min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} />
            </label>
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
            {captcha.widget}
            {error && <p role="alert" className="text-sm font-semibold text-wine">{errorText(t, error)}</p>}
            <div className="flex justify-center gap-3">
              <button type="submit" className="btn" disabled={busy || !captcha.ready}>{busy ? t.rsvp.sending : t.rsvp.submit}</button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>{t.rsvp.close}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
