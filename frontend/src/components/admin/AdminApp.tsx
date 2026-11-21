"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Msg = { id: number; name: string; message: string; enabled: boolean; createdAt: number };
type Rsvp = {
  id: number; name: string; side: "groom" | "bride"; place: string; attending: boolean; guests: number;
  dietary: string; message: string; createdAt: number; superseded: boolean;
};
type Counts = { responses: number; attending: number; guests: number; declined: number };
type Summary = Counts & { byPlace?: Record<string, Counts> };

const when = (sec: number) => new Date(sec * 1000).toLocaleString();

export function AdminApp() {
  const [auth, setAuth] = useState<"loading" | "ok" | "forbidden" | "unconfigured" | "error">("loading");
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"messages" | "rsvps">("messages");

  useEffect(() => {
    api<{ email: string }>("/api/admin/me").then((r) => {
      if (r.ok) { setEmail(r.data.email); setAuth("ok"); }
      else if (r.status === 503) setAuth("unconfigured");
      else if (r.status === 403) setAuth("forbidden");
      else setAuth("error");
    });
  }, []);

  if (auth !== "ok") {
    const text = {
      loading: "Loading…",
      forbidden: "Access denied. Sign in through Cloudflare Access with an allowed account.",
      unconfigured: "The admin API is not configured yet. Set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD in .env and restart the api service.",
      error: "Could not reach the API.",
    }[auth];
    return <main className="mx-auto max-w-xl p-6"><p role="status">{text}</p></main>;
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl">Wedding admin</h1>
        <p className="text-sm opacity-70">{email}</p>
      </header>
      <nav className="mt-4 flex gap-2" aria-label="Sections">
        {(["messages", "rsvps"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={`btn ${tab === k ? "" : "btn-ghost"}`}>
            {k === "messages" ? "Wishes" : "RSVPs"}
          </button>
        ))}
      </nav>
      {tab === "messages" ? <Messages /> : <Rsvps />}
    </main>
  );
}

function Messages() {
  const [items, setItems] = useState<Msg[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ messages: Msg[] }>("/api/admin/messages");
    if (r.ok) { setItems(r.data.messages); setError(""); } else setError("Could not load wishes.");
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (m: Msg) => {
    setError("");
    const r = await api(`/api/admin/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !m.enabled }) });
    if (r.ok) setItems((cur) => cur && cur.map((x) => (x.id === m.id ? { ...x, enabled: !m.enabled } : x)));
    else setError("Could not update. Try again.");
  };

  if (!items) return <p className="mt-4">{error || "Loading…"}</p>;
  const hidden = items.filter((m) => !m.enabled).length;
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm">{items.length} wishes, {hidden} hidden</p>
        <button type="button" className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>
      {error && <p role="alert" className="mt-2 font-semibold text-wine">{error}</p>}
      {items.length === 0 && <p className="mt-4 opacity-75">No wishes yet.</p>}
      <ul className="mt-3 space-y-3">
        {items.map((m) => (
          <li key={m.id} className={`card-surface p-4 ${m.enabled ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold break-words">{m.name}</p>
                <p className="text-xs opacity-70">{when(m.createdAt)}</p>
              </div>
              <button type="button" className="btn btn-ghost !px-4 !py-1" onClick={() => toggle(m)}>{m.enabled ? "Hide" : "Show"}</button>
            </div>
            <p className="mt-2 break-words whitespace-pre-wrap">{m.message}</p>
            {!m.enabled && <p className="mt-2 text-xs font-semibold uppercase tracking-wider">Hidden from the public page</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Rsvps() {
  const [data, setData] = useState<{ rsvps: Rsvp[]; summary: Summary } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await api<{ rsvps: Rsvp[]; summary: Summary }>("/api/admin/rsvps");
    if (r.ok) { setData(r.data); setError(""); } else setError("Could not load RSVPs.");
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p className="mt-4">{error || "Loading…"}</p>;
  const { summary: s, rsvps } = data;
  const stat = (label: string, n: number) => (
    <div className="card-surface p-3 text-center">
      <div className="font-serif text-2xl tabular-nums">{n}</div>
      <div className="text-xs uppercase tracking-wider">{label}</div>
    </div>
  );
  return (
    <section className="mt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Responses", s.responses)}
        {stat("Attending", s.attending)}
        {stat("Guests", s.guests)}
        {stat("Declined", s.declined)}
      </div>
      {s.byPlace && Object.keys(s.byPlace).length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {Object.entries(s.byPlace).map(([place, c]) => (
            <li key={place}><span className="font-semibold">{place || "(no place)"}</span>: {c.attending} attending ({c.guests} guests), {c.declined} declined</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs opacity-70">The latest response per name, side and place counts; older ones are greyed out.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-ghost" onClick={load}>Refresh</button>
        <a className="btn btn-ghost" href="/api/admin/rsvps.csv" download>Download CSV</a>
      </div>
      {error && <p role="alert" className="mt-2 font-semibold text-wine">{error}</p>}
      {rsvps.length === 0 && <p className="mt-4 opacity-75">No RSVPs yet.</p>}
      <ul className="mt-3 space-y-3">
        {rsvps.map((r) => (
          <li key={r.id} className={`card-surface p-4 ${r.superseded ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold break-words">{r.name} <span className="text-xs font-normal uppercase tracking-wider">({r.side}{r.place && ` · ${r.place}`})</span></p>
              <p className="text-xs opacity-70">{when(r.createdAt)}</p>
            </div>
            <p className="mt-1">{r.attending ? `Attending · ${r.guests} guest${r.guests === 1 ? "" : "s"}` : "Can't attend"}{r.superseded && " · replaced by a newer response"}</p>
            {r.dietary && <p className="text-sm break-words">Diet: {r.dietary}</p>}
            {r.message && <p className="mt-1 break-words whitespace-pre-wrap">{r.message}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
