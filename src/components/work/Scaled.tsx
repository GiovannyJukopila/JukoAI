"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Draws a screen at its real size (e.g. 390×844 for a phone, 1440×900 for a
 * desktop) and scales the whole thing with a single transform to whatever
 * width the frame has. Every measure inside the screen stays the product's
 * own, and the mockup is fluid at any breakpoint.
 */
export function Scaled({ w, h, children, className = "" }: { w: number; h: number; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);

  return (
    <div ref={ref} className={`scaled ${className}`} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true">
      <div className="scaled__stage" style={{ width: w, height: h, transform: `scale(${scale})`, opacity: scale ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}
