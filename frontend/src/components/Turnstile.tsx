"use client";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = { render(el: HTMLElement, opts: Record<string, unknown>): string; remove(id: string): void };
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let configPromise: Promise<string> | null = null;
function loadSiteKey(): Promise<string> {
  configPromise ??= fetch("/api/config")
    .then((r) => (r.ok ? r.json() : { turnstileSiteKey: "" }))
    .then((j: { turnstileSiteKey?: string }) => j.turnstileSiteKey ?? "")
    .catch(() => {
      configPromise = null;
      return "";
    });
  return configPromise;
}

function Widget({ siteKey, onToken }: { siteKey: string; onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;
  useEffect(() => {
    let id: string | undefined;
    let dead = false;
    loadScript()
      .then(() => {
        if (dead || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
        });
      })
      .catch(() => {});
    return () => {
      dead = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [siteKey]);
  return <div ref={ref} className="flex justify-center" />;
}

/**
 * Turnstile for a form. `widget` renders nothing when the server has no site key
 * (feature off). `ready` is false until the config loaded and, if a key is set, a token exists.
 * Tokens are single use: call `reset()` after every submit attempt.
 */
export function useCaptcha() {
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let live = true;
    loadSiteKey().then((k) => live && setSiteKey(k));
    return () => {
      live = false;
    };
  }, []);
  return {
    token,
    ready: siteKey !== null && (siteKey === "" || token !== ""),
    reset: () => {
      setToken("");
      setNonce((n) => n + 1);
    },
    widget: siteKey ? <Widget key={nonce} siteKey={siteKey} onToken={setToken} /> : null,
  };
}
