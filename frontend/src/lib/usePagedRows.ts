import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "./api";

export type Page<T, M> = { items: T[]; total: number; meta: M };

/**
 * Data for a virtualized list that knows its length up front: `total` rows exist, the rows are loaded a page at a
 * time (offset/limit) and only when `ensure` says some of them are on screen. rows is keyed by row index.
 * A new `fetchPage` (the caller's sort or filter changed) starts over from the first page.
 * `meta` is whatever else the first page / a reload brought along (the admin's counts).
 */
export function usePagedRows<T, M = null>(fetchPage: (offset: number, limit: number) => Promise<ApiResult<Page<T, M>>>, pageSize: number) {
  const [rows, setRows] = useState<Map<number, T>>(new Map());
  const [total, setTotal] = useState<number | null>(null); // null until the first page of a query arrives
  const [meta, setMeta] = useState<M | null>(null);
  const [failed, setFailed] = useState(false);
  const gen = useRef(0); // bumped on every restart or reload: responses from an older one are dropped
  const requested = useRef(new Set<number>()); // pages loaded or in flight for the current query
  const failedPages = useRef(new Set<number>()); // pages whose last fetch failed (-1: a reload); `failed` = any left
  const ready = useRef(false); // false from a restart until the first page arrives (the old row range is meaningless)
  const get = useCallback((page: number) => fetchPage(page * pageSize, pageSize), [fetchPage, pageSize]);

  // Load the first page. clear: drop the rows now (a new sort or filter); otherwise keep showing them until the new
  // first page arrives (a restart after the list changed from outside), so the page below does not jump.
  const start = useCallback((clear: boolean) => {
    const g = ++gen.current;
    requested.current = new Set([0]);
    ready.current = false; // until the first page is in, the old row range is meaningless: ensure fetches nothing
    if (clear) { setRows(new Map()); setTotal(null); }
    failedPages.current.clear();
    setFailed(false);
    get(0).then((r) => {
      if (g !== gen.current) return;
      if (!r.ok) { failedPages.current.add(0); setFailed(true); return; }
      ready.current = true;
      setTotal(r.data.total);
      setMeta(r.data.meta);
      setRows(new Map(r.data.items.map((m, i) => [i, m])));
    });
  }, [get]);
  useEffect(() => start(true), [start]);

  /** Start over from the first page, e.g. after the list was changed from outside. */
  const restart = useCallback(() => start(false), [start]);

  // Refetch the pages that are loaded and swap them in at once, so the list never blanks and the scroll position stays.
  const reload = useCallback(async () => {
    const g = ++gen.current;
    const pages = [...requested.current];
    const results = await Promise.all(pages.map(get));
    if (g !== gen.current) return;
    const first = results[0];
    if (!first || !first.ok) { failedPages.current.add(-1); setFailed(true); return; }
    failedPages.current.clear();
    setFailed(false);
    ready.current = true;
    setTotal(first.data.total);
    setMeta(first.data.meta);
    const next = new Map<number, T>();
    results.forEach((r, k) => { if (r.ok) r.data.items.forEach((m, i) => next.set(pages[k] * pageSize + i, m)); });
    requested.current = new Set(pages.filter((_, k) => results[k].ok));
    setRows(next);
  }, [get, pageSize]);

  /** Call with the first and last row index that are rendered: fetches the pages under them that are not loaded yet. */
  const ensure = useCallback((first: number, last: number) => {
    if (!ready.current || last < 0) return;
    const g = gen.current;
    const fp = Math.floor(first / pageSize), lp = Math.floor(last / pageSize);
    // A failed page that is out of view is not requested, so it loads again when scrolled back to; stop reporting it.
    const stale = [...failedPages.current].filter((p) => p !== -1 && (p < fp || p > lp));
    if (stale.length) { stale.forEach((p) => failedPages.current.delete(p)); setFailed(failedPages.current.size > 0); }
    for (let p = fp; p <= lp; p++) {
      if (requested.current.has(p)) continue;
      requested.current.add(p);
      get(p).then((r) => {
        if (g !== gen.current) return;
        if (!r.ok) { requested.current.delete(p); failedPages.current.add(p); setFailed(true); return; } // calling ensure again retries it
        failedPages.current.delete(p);
        setFailed(failedPages.current.size > 0);
        setRows((cur) => { const next = new Map(cur); r.data.items.forEach((m, i) => next.set(p * pageSize + i, m)); return next; });
      });
    }
    // total is a dependency on purpose: callers run ensure from an effect, and a finished (re)start must re-run it
  }, [get, pageSize, total]);

  return { rows, total, meta, failed, restart, reload, ensure };
}
