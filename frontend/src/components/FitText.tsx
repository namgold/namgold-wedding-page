"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** One-line text that shrinks (never grows past `max`) until it fits its parent's width. */
export function FitText({ children, max, min = 12, className = "", style }: {
  children: ReactNode;
  max: number;
  min?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState(max);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const fit = () => {
      const prev = el.style.fontSize;
      el.style.fontSize = `${max}px`; // measure at full size
      const need = el.getBoundingClientRect().width;
      const avail = box.clientWidth;
      el.style.fontSize = prev;
      setSize(need > avail && need > 0 ? Math.max(min, Math.floor((max * avail) / need * 10) / 10) : max);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [children, max, min]);

  return (
    <span ref={ref} className={`inline-block whitespace-nowrap ${className}`} style={{ ...style, fontSize: size }}>
      {children}
    </span>
  );
}
