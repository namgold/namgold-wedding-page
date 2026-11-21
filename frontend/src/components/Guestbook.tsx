"use client";
import { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Copy } from "@/content/types";
import { api, type ApiResult, type PublicMessage } from "@/lib/api";
import { fmtStamp } from "@/lib/date";
import { usePagedRows, type Page } from "@/lib/usePagedRows";
import { useRowSlots } from "@/lib/useRowSlots";
import { WishForm } from "./WishForm";

const PAGE = 20;
const estimateRow = () => 110;

/** One wish; without `m` a placeholder with the same elements, so a row fills in place when its page arrives. */
function GuestCard({ m, loading }: { m?: PublicMessage; loading: string }) {
  return (
    <div className="card-surface !bg-rose/[.02] p-4 text-sm" aria-busy={!m}>
      <div className="flex items-start justify-between gap-3">
        <span className="break-words font-semibold">{m?.name}</span>
        <span className="shrink-0 text-xs opacity-70">{m && fmtStamp(m.createdAt)}</span>
      </div>
      <p className={`mt-2 break-words whitespace-pre-wrap leading-relaxed ${m ? "" : "opacity-60"}`}>{m ? m.message : loading}</p>
    </div>
  );
}

export function Guestbook({ t }: { t: Copy }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // The list knows its total up front, so the scroll bar is its full length from the start, and any part of it
  // can be loaded on its own (usePagedRows).
  const fetchPage = useCallback(async (offset: number, limit: number): Promise<ApiResult<Page<PublicMessage, null>>> => {
    const r = await api<{ messages: PublicMessage[]; total: number }>(`/api/messages?limit=${limit}&offset=${offset}`);
    return r.ok ? { ok: true, data: { items: r.data.messages, total: r.data.total, meta: null } } : r;
  }, []);
  const { rows, total, failed, restart, ensure } = usePagedRows(fetchPage, PAGE);

  // Virtualized: only the wishes near the viewport are in the DOM.
  const getItemKey = useCallback((i: number) => rows.get(i)?.id ?? `row-${i}`, [rows]);
  const v = useVirtualizer({ getScrollElement: () => scrollRef.current, count: total ?? 0, estimateSize: estimateRow, overscan: 5, getItemKey });
  const items = v.getVirtualItems();
  const slotOf = useRowSlots(items.map((it) => it.index));
  const firstIdx = items[0]?.index ?? 0;
  const lastIdx = items[items.length - 1]?.index ?? -1;
  useEffect(() => ensure(firstIdx, lastIdx), [ensure, firstIdx, lastIdx]);

  // A wish was just sent: start from the newest again so it shows at the top.
  const onSent = () => { restart(); scrollRef.current?.scrollTo(0, 0); };
  // Retry: a first page that never loaded starts over, a later page is fetched again.
  const retry = () => (total === null ? restart() : ensure(firstIdx, lastIdx));

  return (
    <section className="relative z-10 px-6 pb-8 pt-10 md:px-10 md:pb-10 md:pt-12">
      <h2 className="h-title">{t.guestbook.heading}</h2>
      <WishForm t={t} onSent={onSent} />

      {total === null && !failed && <p className="mt-6 text-center text-sm">{t.guestbook.loading}</p>}
      {failed && (
        <div className="mt-6 text-center text-sm">
          <p>{t.guestbook.loadError}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={retry}>{t.guestbook.retry}</button>
        </div>
      )}
      {total === 0 && <p className="mt-6 text-center text-sm">{t.guestbook.empty}</p>}

      {!!total && (
        <div ref={scrollRef} className="mx-auto mt-8 max-h-[640px] w-full max-w-full overflow-y-auto pr-2 md:max-w-[600px]">
          <ul className="relative w-full" style={{ height: v.getTotalSize() }}>
            {items.map((it) => {
              const m = rows.get(it.index);
              return (
                <li
                  key={slotOf(it.index)} data-index={it.index}
                  ref={(el) => v.measureElement(el)} // new function each render on purpose: a recycled element must be re-measured for its new row
                  aria-setsize={total} aria-posinset={it.index + 1}
                  className="absolute top-0 left-0 w-full pb-3"
                  style={{ transform: `translateY(${it.start}px)` }}
                >
                  <GuestCard m={m} loading={t.guestbook.loading} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
