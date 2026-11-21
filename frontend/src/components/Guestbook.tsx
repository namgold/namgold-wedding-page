"use client";
import { useCallback, useEffect, useState } from "react";
import type { Copy } from "@/content/types";
import { api, type PublicMessage } from "@/lib/api";
import { fmtStamp } from "@/lib/date";
import { WishForm } from "./WishForm";

type Page = { messages: PublicMessage[]; hasMore: boolean };

export function Guestbook({ t }: { t: Copy }) {
  const [items, setItems] = useState<PublicMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  // before = id of the oldest item shown; undefined reloads from the newest.
  const load = useCallback(async (before?: number) => {
    const res = await api<Page>(`/api/messages?limit=20${before ? `&before=${before}` : ""}`);
    if (!res.ok) return setStatus("error");
    setItems((cur) => (before ? [...cur, ...res.data.messages] : res.data.messages));
    setHasMore(res.data.hasMore);
    setStatus("ok");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="relative z-10 px-6 pb-8 pt-10 md:px-10 md:pb-10 md:pt-12">
      <h2 className="h-title">{t.guestbook.heading}</h2>
      <WishForm t={t} onSent={() => load()} />

      {status === "loading" && <p className="mt-6 text-center text-sm">{t.guestbook.loading}</p>}
      {status === "error" && (
        <div className="mt-6 text-center text-sm">
          <p>{t.guestbook.loadError}</p>
          <button type="button" className="btn btn-ghost mt-2" onClick={() => { setStatus("loading"); load(); }}>{t.guestbook.retry}</button>
        </div>
      )}
      {status === "ok" && items.length === 0 && <p className="mt-6 text-center text-sm">{t.guestbook.empty}</p>}

      {items.length > 0 && (
        <ul className="mx-auto mt-8 max-h-[640px] w-full max-w-full space-y-3 overflow-y-auto pr-2 md:max-w-[600px]">
          {items.map((m) => (
            <li key={m.id} className="card-surface !bg-rose/[.02] p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="break-words font-semibold">{m.name}</span>
                <span className="shrink-0 text-xs opacity-70">{fmtStamp(m.createdAt)}</span>
              </div>
              <p className="mt-2 break-words whitespace-pre-wrap leading-relaxed">{m.message}</p>
            </li>
          ))}
          {hasMore && (
            <li className="text-center">
              <button type="button" className="btn btn-ghost" onClick={() => load(items[items.length - 1].id)}>{t.guestbook.loadMore}</button>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
