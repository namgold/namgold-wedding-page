"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { api, type ApiResult } from "@/lib/api";
import { usePagedRows, type Page } from "@/lib/usePagedRows";
import { useRowSlots } from "@/lib/useRowSlots";

type Msg = { id: number; name: string; message: string; enabled: boolean; createdAt: number };
type Rsvp = {
  id: number; name: string; side: "groom" | "bride"; place: string; attending: boolean; guests: number;
  dietary: string; message: string; createdAt: number; superseded: boolean;
};
type Counts = { responses: number; attending: number; guests: number; declined: number };
type MsgCounts = { all: number; shown: number; hidden: number };
type Summary = Counts & { byPlace?: Record<string, Counts> };

type Dir = "asc" | "desc";
type Option<T extends string> = { value: T; label: string };

const selectCls = "rounded-[10px] border border-rose bg-transparent px-3 py-1.5 text-rose";

function SortSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Option<T>[]; onChange: (v: T) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">
      {label}
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className={selectCls}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/** Direction toggle. labels = [what "asc" means, what "desc" means], shown as the current state. */
function DirButton({ dir, labels, onToggle }: { dir: Dir; labels: [string, string]; onToggle: () => void }) {
  return (
    <button type="button" className="btn btn-ghost !px-4 !py-1.5 text-sm" aria-label="Direction" onClick={onToggle}>
      {dir === "asc" ? `↑ ${labels[0]}` : `↓ ${labels[1]}`}
    </button>
  );
}

const when = (sec: number) => new Date(sec * 1000).toLocaleString();

/** Modal that asks the owner to confirm a permanent delete. Native <dialog>: focus trap and Esc come for free. */
function ConfirmDelete({ what, onConfirm, onCancel }: { what: string; onConfirm: () => Promise<void>; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { ref.current?.showModal(); }, []);
  const confirm = async () => { setBusy(true); await onConfirm(); setBusy(false); };
  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-delete-title"
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
      onClick={(e) => { if (e.target === ref.current && !busy) onCancel(); }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg bg-white p-5 text-inherit shadow-xl backdrop:bg-black/50"
    >
      <h2 id="confirm-delete-title" className="font-serif text-xl">Delete permanently?</h2>
      <p className="mt-2 break-words">{what}</p>
      <p className="mt-2 text-sm">This cannot be undone.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" autoFocus disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="btn" disabled={busy} onClick={confirm}>{busy ? "Deleting…" : "Delete"}</button>
      </div>
    </dialog>
  );
}

export function AdminApp() {
  const [auth, setAuth] = useState<"loading" | "ok" | "forbidden" | "unconfigured" | "error">("loading");
  const [email, setEmail] = useState("");
  const [tab, setTab] = useState<"messages" | "rsvps">("messages");
  const [deleteOn, setDeleteOn] = useState(false); // off on every page load, so deleting is always a deliberate choice

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
    <main className="mx-auto flex h-dvh max-w-3xl flex-col overflow-hidden p-4 sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl">Wedding admin</h1>
        <p className="text-sm opacity-70">{email}</p>
      </header>
      <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="Sections">
        {(["messages", "rsvps"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => setTab(k)} className={`btn ${tab === k ? "" : "btn-ghost"}`}>
            {k === "messages" ? "Wishes" : "RSVPs"}
          </button>
        ))}
        <button
          type="button" role="switch" aria-checked={deleteOn} aria-label="Delete"
          onClick={() => setDeleteOn((v) => !v)}
          className="ml-auto flex items-center gap-2 text-sm font-semibold"
        >
          Delete
          <span className={`relative h-8 w-[4.5rem] rounded-full border transition-colors ${deleteOn ? "border-red-700 bg-red-600" : "border-rose bg-rose/10"}`}>
            <span className={`absolute top-1/2 -translate-y-1/2 text-xs font-bold uppercase ${deleteOn ? "left-3 text-white" : "right-3 text-rose-deep"}`}>{deleteOn ? "On" : "Off"}</span>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full shadow transition-all ${deleteOn ? "left-[2.75rem] bg-white" : "left-0.5 bg-rose"}`} />
          </span>
        </button>
      </nav>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "messages" ? <Messages deleteOn={deleteOn} /> : <Rsvps deleteOn={deleteOn} />}
      </div>
    </main>
  );
}

type MsgSort = "date" | "name" | "status";
type MsgStatus = "all" | "hidden" | "shown";
const MSG_SORTS: Option<MsgSort>[] = [{ value: "date", label: "Date" }, { value: "name", label: "Name" }, { value: "status", label: "Status" }];
const MSG_STATUSES: Option<MsgStatus>[] = [{ value: "all", label: "All" }, { value: "hidden", label: "Hidden" }, { value: "shown", label: "Shown" }];
const MSG_DIR_LABELS: Record<MsgSort, [string, string]> = { date: ["Oldest first", "Newest first"], name: ["A → Z", "Z → A"], status: ["Hidden first", "Shown first"] };

const PAGE = 30; // wishes fetched per request
const estimateRow = () => 140;

function Messages({ deleteOn }: { deleteOn: boolean }) {
  // Infinite scroll with virtualization: `total` rows exist, only the ones near the viewport are rendered, and
  // the pages (PAGE rows each) under them are fetched on demand (usePagedRows).
  const [error, setError] = useState(""); // a hide/show/delete that failed
  const [toDelete, setToDelete] = useState<Msg | null>(null);
  const [sort, setSort] = useState<MsgSort>("date");
  const [dir, setDir] = useState<Dir>("desc"); // newest first
  const [status, setStatus] = useState<MsgStatus>("all");
  const scrollRef = useRef<HTMLDivElement>(null); // the list scrolls inside this box; the rest of the page stays put

  const fetchPage = useCallback(async (offset: number, limit: number): Promise<ApiResult<Page<Msg, MsgCounts>>> => {
    const r = await api<{ messages: Msg[]; total: number; counts: MsgCounts }>(`/api/admin/messages?${new URLSearchParams({ sort, dir, status, offset: String(offset), limit: String(limit) })}`);
    return r.ok ? { ok: true, data: { items: r.data.messages, total: r.data.total, meta: r.data.counts } } : r;
  }, [sort, dir, status]);
  const { rows, total, meta: counts, failed, reload, ensure } = usePagedRows(fetchPage, PAGE);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [fetchPage]); // new sort or filter: back to the top

  // Stable functions: a new one on every render makes the virtualizer rebuild all its measurements each scroll frame.
  const getItemKey = useCallback((i: number) => rows.get(i)?.id ?? `row-${i}`, [rows]); // a wish keeps its measured height when the list reorders
  const v = useVirtualizer({
    getScrollElement: () => scrollRef.current,
    count: total ?? 0,
    estimateSize: estimateRow,
    overscan: 6,
    paddingStart: 12, // breathing room above the first card; the last row's own pb-3 is the room below the last
    getItemKey,
  });
  const items = v.getVirtualItems();
  const slotOf = useRowSlots(items.map((it) => it.index));
  const firstIdx = items[0]?.index ?? 0;
  const lastIdx = items[items.length - 1]?.index ?? -1;
  useEffect(() => ensure(firstIdx, lastIdx), [ensure, firstIdx, lastIdx]);
  const shownError = error || (failed ? "Could not load wishes." : "");

  const toggle = async (m: Msg) => {
    setError("");
    const r = await api(`/api/admin/messages/${m.id}`, { method: "PATCH", body: JSON.stringify({ enabled: !m.enabled }) });
    if (r.ok) await reload(); // the filter, the order and the counts all depend on the status
    else setError("Could not update. Try again.");
  };

  const remove = async () => {
    if (!toDelete) return;
    const r = await api(`/api/admin/messages/${toDelete.id}`, { method: "DELETE" });
    // 404 means it is already gone, so reload drops it from the list as well
    if (r.ok || r.status === 404) await reload();
    else setError("Could not delete. Try again.");
    setToDelete(null);
  };

  if (!counts) return <p className="mt-4">{shownError || "Loading…"}</p>;
  return (
    <section className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between">
        <p className="text-sm">{counts.all} wishes, {counts.hidden} hidden{status !== "all" && total !== null && ` · ${total} shown below`}</p>
        <button type="button" className="btn btn-ghost" onClick={reload}>Refresh</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SortSelect label="Sorting" value={sort} options={MSG_SORTS} onChange={setSort} />
        <DirButton dir={dir} labels={MSG_DIR_LABELS[sort]} onToggle={() => setDir((d) => (d === "asc" ? "desc" : "asc"))} />
        <SortSelect label="Status" value={status} options={MSG_STATUSES} onChange={setStatus} />
      </div>
      {shownError && <p role="alert" className="mt-2 font-semibold text-wine">{shownError}</p>}
      {total === 0 && <p className="mt-4 opacity-75">{counts.all === 0 ? "No wishes yet." : "No wishes match this filter."}</p>}
      <div ref={scrollRef} className="mt-3 min-h-0 flex-1 overflow-y-auto">
      <ul className="relative" style={{ height: v.getTotalSize() }}>
        {items.map((it) => {
          const m = rows.get(it.index);
          return (
            <li
              key={slotOf(it.index)} data-index={it.index}
              ref={(el) => v.measureElement(el)} // new function each render on purpose: a recycled element must be re-measured for its new row
              aria-setsize={total ?? 0} aria-posinset={it.index + 1}
              className="absolute top-0 left-0 w-full pb-3"
              style={{ transform: `translateY(${it.start}px)` }}
            >
              {m ? (
                <div className={`card-surface p-4 ${m.enabled ? "" : "opacity-60"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold break-words">{m.name}</p>
                      <p className="text-xs opacity-70">{when(m.createdAt)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-ghost !px-4 !py-1" onClick={() => toggle(m)}>{m.enabled ? "Hide" : "Show"}</button>
                      {deleteOn && <button type="button" className="btn btn-ghost !px-4 !py-1" onClick={() => setToDelete(m)}>Delete</button>}
                    </div>
                  </div>
                  <p className="mt-2 break-words whitespace-pre-wrap">{m.message}</p>
                  {!m.enabled && <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-red-600">Hidden from the public page</p>}
                </div>
              ) : (
                <div className="card-surface p-4" aria-busy="true"><p className="text-sm opacity-60">Loading…</p></div>
              )}
            </li>
          );
        })}
      </ul>
      </div>
      {toDelete && <ConfirmDelete what={`Wish from ${toDelete.name}: “${toDelete.message.length > 120 ? toDelete.message.slice(0, 120) + "…" : toDelete.message}”`} onConfirm={remove} onCancel={() => setToDelete(null)} />}
    </section>
  );
}

type RsvpSort = "date" | "name";
const RSVP_SORTS: Option<RsvpSort>[] = [{ value: "date", label: "Date" }, { value: "name", label: "Name" }];
const RSVP_DIR_LABELS: Record<RsvpSort, [string, string]> = { date: ["Oldest first", "Newest first"], name: ["A → Z", "Z → A"] };

function Rsvps({ deleteOn }: { deleteOn: boolean }) {
  const [data, setData] = useState<{ rsvps: Rsvp[]; summary: Summary } | null>(null);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<Rsvp | null>(null);
  const [sort, setSort] = useState<RsvpSort>("date");
  const [dir, setDir] = useState<Dir>("desc"); // newest first
  const latest = useRef(0);

  const load = useCallback(async () => {
    const mine = ++latest.current;
    const r = await api<{ rsvps: Rsvp[]; summary: Summary }>(`/api/admin/rsvps?${new URLSearchParams({ sort, dir })}`);
    if (mine !== latest.current) return;
    if (r.ok) { setData(r.data); setError(""); } else setError("Could not load RSVPs.");
  }, [sort, dir]);
  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!toDelete) return;
    const r = await api(`/api/admin/rsvps/${toDelete.id}`, { method: "DELETE" });
    if (r.ok || r.status === 404) await load(); // reload: totals and "replaced" marks depend on the other rows
    else setError("Could not delete. Try again.");
    setToDelete(null);
  };

  if (!data) return <p className="mt-4">{error || "Loading…"}</p>;
  const { summary: s, rsvps } = data;
  const stat = (label: string, n: number) => (
    <div className="card-surface p-3 text-center">
      <div className="font-serif text-2xl tabular-nums">{n}</div>
      <div className="text-xs uppercase tracking-wider">{label}</div>
    </div>
  );
  return (
    <section className="mt-4 flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-4 gap-2">
        {stat("Responses", s.responses)}
        {stat("Attending", s.attending)}
        {stat("Guests", s.guests)}
        {stat("Declined", s.declined)}
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-ghost" onClick={load}>Refresh</button>
        <a className="btn btn-ghost" href="/api/admin/rsvps.csv" download>Download CSV</a>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <SortSelect label="Sorting" value={sort} options={RSVP_SORTS} onChange={setSort} />
        <DirButton dir={dir} labels={RSVP_DIR_LABELS[sort]} onToggle={() => setDir((d) => (d === "asc" ? "desc" : "asc"))} />
      </div>
      {error && <p role="alert" className="mt-2 font-semibold text-wine">{error}</p>}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto py-3">
      {s.byPlace && Object.keys(s.byPlace).length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {Object.entries(s.byPlace).map(([place, c]) => (
            <li key={place}><span className="font-semibold">{place || "(no place)"}</span>: {c.attending} attending ({c.guests} guests), {c.declined} declined</li>
          ))}
        </ul>
      )}
      <p className="mb-3 text-xs opacity-70">The latest response per name, side and place counts; older ones are greyed out.</p>
      {rsvps.length === 0 && <p className="mt-4 opacity-75">No RSVPs yet.</p>}
      <ul className="space-y-3">
        {rsvps.map((r) => (
          <li key={r.id} className={`card-surface p-4 ${r.superseded ? "opacity-50" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold break-words">{r.name} <span className="text-xs font-normal uppercase tracking-wider">({r.side}{r.place && ` · ${r.place}`})</span></p>
              <p className="text-xs opacity-70">{when(r.createdAt)}</p>
            </div>
            <p className="mt-1">{r.attending ? `Attending · ${r.guests} guest${r.guests === 1 ? "" : "s"}` : "Can't attend"}{r.superseded && " · replaced by a newer response"}</p>
            {r.dietary && <p className="text-sm break-words">Diet: {r.dietary}</p>}
            {r.message && <p className="mt-1 break-words whitespace-pre-wrap">{r.message}</p>}
            {deleteOn && (
              <div className="mt-2 flex justify-end">
                <button type="button" className="btn btn-ghost !px-4 !py-1" onClick={() => setToDelete(r)}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
      </div>
      {toDelete && <ConfirmDelete what={`RSVP from ${toDelete.name} (${toDelete.attending ? `attending, ${toDelete.guests} guest${toDelete.guests === 1 ? "" : "s"}` : "can't attend"})`} onConfirm={remove} onCancel={() => setToDelete(null)} />}
    </section>
  );
}
