"use client";

import { useEffect, useRef } from "react";

export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const r = ring.current;
    const d = dot.current;
    if (!r || !d) return;

    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, running = false;

    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      r.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      // settle: once the ring catches the pointer, stop burning frames until the next move
      if (Math.abs(x - cx) < 0.1 && Math.abs(y - cy) < 0.1) { running = false; return; }
      raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!running) { running = true; raf = requestAnimationFrame(loop); } };

    const onMove = (e: MouseEvent) => {
      x = e.clientX; y = e.clientY;
      d.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%)`;
      kick();
    };
    const onOver = (e: MouseEvent) => {
      if ((e.target as Element)?.closest('a, button, [data-cursor="hover"]')) r.classList.add("is-hover");
    };
    const onOut = (e: MouseEvent) => {
      if ((e.target as Element)?.closest('a, button, [data-cursor="hover"]')) r.classList.remove("is-hover");
    };
    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor" aria-hidden="true" />
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
