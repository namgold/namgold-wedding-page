"use client";
import { useEffect, useState } from "react";
import type { Copy } from "@/content/types";
import { wishTemplates } from "@/content/wishes";
import { api } from "@/lib/api";
import { useGuestName } from "@/lib/useGuestName";
import { useCaptcha } from "./Turnstile";

export function errorText(t: Copy, code: string) {
  return (t.errors as Record<string, string>)[code] ?? t.errors.generic;
}

const SHOWN = 6;

/** `n` random templates, none of which are in `not`, so a reload always shows new ones. */
function pickWishes(all: string[], n: number, not: string[] = []) {
  const pool = all.filter((w) => !not.includes(w));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

export function WishForm({ t, onSent }: { t: Copy; onSent: () => void }) {
  const templates = wishTemplates[t.lang];
  // First render is the first few (same on server and client); the shuffle runs after mount, under the cover.
  const [shown, setShown] = useState(() => templates.slice(0, SHOWN));
  useEffect(() => setShown(pickWishes(templates, SHOWN)), [templates]);
  const [name, setName] = useGuestName();
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const captcha = useCaptcha();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setSent(false);
    const res = await api("/api/messages", {
      method: "POST",
      body: JSON.stringify({ name, message, website, turnstileToken: captcha.token }),
    });
    captcha.reset();
    setBusy(false);
    if (res.ok) {
      setSent(true);
      setMessage("");
      onSent();
    } else {
      setError(res.error);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-6 w-full max-w-full md:max-w-[600px]">
      <div className="card-surface relative !bg-blush/85 p-6">
        <div className="mb-4">
          <input className="field" aria-label={t.guestbook.form.name} placeholder={`${t.guestbook.form.name}*`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="name" />
        </div>
        <textarea className="field resize-none" rows={4} aria-label={t.guestbook.form.message} placeholder={`${t.guestbook.form.message}*`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} required />
        <span className="mt-1 block text-right text-xs opacity-70">{[...message].length}/500</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {shown.map((w) => (
            <button key={w} type="button" aria-pressed={message === w} onClick={() => setMessage(w)} className={`whitespace-pre-line rounded-2xl border border-rose/60 px-3 py-1 text-left text-xs leading-snug transition-colors hover:bg-rose/10 ${message === w ? "bg-rose/15" : ""}`}>{w}</button>
          ))}
        </div>
        <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        {captcha.widget}
        {sent && (
          <p role="status" className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(157,109,99,.6)", backgroundColor: "#fdf0ee" }}>{t.guestbook.form.thanks}</p>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-wine">{errorText(t, error)}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" className="btn btn-ghost !px-3" onClick={() => setShown(pickWishes(templates, SHOWN, shown))}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
          </button>
          <button type="submit" className="btn text-sm uppercase" disabled={busy || !captcha.ready}>{busy ? t.guestbook.form.sending : t.guestbook.send}</button>
        </div>
      </div>
    </form>
  );
}
