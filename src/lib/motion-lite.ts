"use client";

import { useSyncExternalStore } from "react";

// Touch devices (phones and tablets): their GPUs pay far more for full-screen filters, blurs and
// retina-sized canvases, so the ambient effects there take a lighter path. Keep in sync with the
// `(pointer:coarse)` blocks in globals.css and theme-light.css.
export const LITE_QUERY = "(pointer: coarse)";

export const isLiteMotion = () => window.matchMedia(LITE_QUERY).matches;

function subscribe(cb: () => void) {
  const mq = window.matchMedia(LITE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Whether to take the lighter motion path (a touch device). */
export function useLiteMotion(): boolean {
  return useSyncExternalStore(subscribe, isLiteMotion, () => false);
}
