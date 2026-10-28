"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ramp } from "./ramp";

/* A window that opens up to full size as it scrolls into view, like a reel taking the screen. */
export function ScrollScale({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 30%"] });
  const scale = useTransform(scrollYProgress, ramp(0, 1, 0.88, 1));
  const y = useTransform(scrollYProgress, ramp(0, 1, 60, 0));
  const opacity = useTransform(scrollYProgress, ramp(0, 0.5, 0.4, 1));

  return (
    <div ref={ref} className={className}>
      <motion.div style={reduce ? undefined : { scale, y, opacity, transformOrigin: "50% 0%" }}>{children}</motion.div>
    </div>
  );
}
