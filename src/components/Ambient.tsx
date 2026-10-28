"use client";

import { motion, useReducedMotion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { Particles } from "./Particles";
import { useLiteMotion } from "@/lib/motion-lite";

export function Ambient() {
  // on touch devices the backdrop stays put: a filter re-run over the whole screen on every
  // scroll frame is what makes phones stutter
  const reduce = useReducedMotion();
  const lite = useLiteMotion();
  const still = reduce || lite;
  const { scrollYProgress } = useScroll();

  // palette subtly shifts as you scroll through the sections
  const hue = useTransform(scrollYProgress, [0, 0.5, 1], [0, 18, 30]);
  const filter = useMotionTemplate`hue-rotate(${hue}deg)`;

  const yTop = useTransform(scrollYProgress, [0, 1], ["0%", "34%"]);
  const yBr = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);

  return (
    <div className="ambient" aria-hidden="true">
      <motion.div className="ambient__color" style={still ? undefined : { filter }}>
        <motion.div className="glow glow--top" style={still ? undefined : { y: yTop }} />
        <motion.div className="glow glow--br" style={still ? undefined : { y: yBr }} />
        <div className="blob blob--1" />
        <div className="blob blob--2" />
      </motion.div>
      <Particles />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}
