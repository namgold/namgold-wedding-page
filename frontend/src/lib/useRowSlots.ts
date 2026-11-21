import { useRef } from "react";

/**
 * Recycles the row elements of a virtualized list. A row that leaves the window frees its slot and a row that enters
 * takes a free one; use the slot as the React key and React rewrites the element in place instead of creating and
 * discarding ~15 DOM nodes per row scrolled past (that garbage showed up as thousands of detached nodes).
 * Idempotent, so it is safe to call during render. Returns the slot for a row index in `indexes`.
 */
export function useRowSlots(indexes: number[]): (index: number) => number {
  const slots = useRef(new Map<number, number>());
  const live = new Set(indexes);
  for (const idx of slots.current.keys()) if (!live.has(idx)) slots.current.delete(idx);
  const taken = new Set(slots.current.values());
  for (const idx of indexes) {
    if (slots.current.has(idx)) continue;
    let slot = 0;
    while (taken.has(slot)) slot++;
    taken.add(slot);
    slots.current.set(idx, slot);
  }
  return (index) => slots.current.get(index)!;
}
