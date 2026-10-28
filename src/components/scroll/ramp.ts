/*
 * Linear map of a scroll progress onto a value, clamped at both ends.
 * Passed to useTransform as a function on purpose: framer-motion hands array-based opacity
 * transforms of a targeted useScroll to a native ScrollTimeline, which ignores the offsets.
 */
export const ramp = (a: number, b: number, from: number, to: number) => (v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return from + (to - from) * t;
};
