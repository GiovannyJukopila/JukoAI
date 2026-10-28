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

/** Whether the page may play its entrance animations (the first-visit intro is over). */
export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribe, isDone, () => false);
}
