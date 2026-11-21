"use client";
import { useState } from "react";
import type { Copy } from "@/content/types";
import { api } from "@/lib/api";
import { useCaptcha } from "./Turnstile";

export function errorText(t: Copy, code: string) {
  return (t.errors as Record<string, string>)[code] ?? t.errors.generic;
}

export function WishForm({ t, onSent }: { t: Copy; onSent: () => void }) {
  const [name, setName] = useState("");
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
      <div className="card-surface relative p-6">
        <div className="mb-4">
          <input className="field" aria-label={t.guestbook.form.name} placeholder={`${t.guestbook.form.name}*`} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="name" />
        </div>
        <textarea className="field resize-none" rows={4} aria-label={t.guestbook.form.message} placeholder={`${t.guestbook.form.message}*`} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} required />
        <span className="mt-1 block text-right text-xs opacity-70">{[...message].length}/500</span>
        <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        {captcha.widget}
        {sent && (
          <p role="status" className="mt-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(157,109,99,.6)", backgroundColor: "#fdf0ee" }}>{t.guestbook.form.thanks}</p>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-wine">{errorText(t, error)}</p>}
        <div className="mt-4 flex items-center justify-end">
          <button type="submit" className="btn text-sm uppercase" disabled={busy || !captcha.ready}>{busy ? t.guestbook.form.sending : t.guestbook.send}</button>
        </div>
      </div>
    </form>
  );
}
