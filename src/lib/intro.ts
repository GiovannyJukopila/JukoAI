"use client";

import { useSyncExternalStore } from "react";
import { INTRO_DONE_EVENT } from "./intro-script";

declare global {
  interface Window { __jukoHeroReady?: boolean }
}

// done = the intro already played, was skipped, or never started
const isDone = () => !document.documentElement.classList.contains("intro-on");

export function finishIntro() {
  const c = document.documentElement.classList;
  c.remove("intro-on");
  c.add("intro-done");
  window.dispatchEvent(new Event(INTRO_DONE_EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(INTRO_DONE_EVENT, cb);
  return () => window.removeEventListener(INTRO_DONE_EVENT, cb);
}

/** Runs cb once the first-visit intro is over (right away when there is none); played says if it ran. */
export function afterIntro(cb: (played: boolean) => void) {
  if (isDone()) { cb(false); return () => {}; }
  const on = () => cb(true);
  window.addEventListener(INTRO_DONE_EVENT, on, { once: true });
  return () => window.removeEventListener(INTRO_DONE_EVENT, on);
}

/** Whether the page may play its entrance animations (the first-visit intro is over). */
export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribe, isDone, () => false);
}
