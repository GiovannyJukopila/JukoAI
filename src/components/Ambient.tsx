"use client";

import { motion, useReducedMotion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { Particles } from "./Particles";

export function Ambient() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // palette subtly shifts as you scroll through the sections
  const hue = useTransform(scrollYProgress, [0, 0.5, 1], [0, 18, 30]);
  const filter = useMotionTemplate`hue-rotate(${hue}deg)`;

  const yTop = useTransform(scrollYProgress, [0, 1], ["0%", "34%"]);
  const yBr = useTransform(scrollYProgress, [0, 1], ["0%", "-22%"]);

  return (
    <div className="ambient" aria-hidden="true">
      <motion.div className="ambient__color" style={reduce ? undefined : { filter }}>
        <motion.div className="glow glow--top" style={reduce ? undefined : { y: yTop }} />
        <motion.div className="glow glow--br" style={reduce ? undefined : { y: yBr }} />
        <div className="blob blob--1" />
        <div className="blob blob--2" />
      </motion.div>
      <Particles />
      <div className="vignette" />
      <div className="grain" />
    </div>
  );
}
