"use client";

import { useSyncExternalStore } from "react";
import { LIGHT_QUERY, THEME_KEY } from "./theme-script";

/** What the visitor picked; "system" follows the browser or device setting. */
export type ThemePref = "system" | "light" | "dark";
export type Theme = "light" | "dark";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "system") return pref;
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

function applyTheme(pref: ThemePref) {
  const theme = resolveTheme(pref);
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  const swap = () => {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  };
  // a soft cross-fade between themes where the browser supports view transitions
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "startViewTransition" in document) document.startViewTransition(swap);
  else swap();
}

const prefListeners = new Set<() => void>();

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {}
  applyTheme(pref);
  prefListeners.forEach((l) => l());
}

/** Re-applies the theme when the device setting changes while the visitor follows the system. */
export function followSystemTheme() {
  const mq = window.matchMedia(LIGHT_QUERY);
  const onChange = () => { if (readPref() === "system") applyTheme("system"); };
  // another tab changed the preference
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    applyTheme(readPref());
    prefListeners.forEach((l) => l());
  };
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribePref(cb: () => void) {
  prefListeners.add(cb);
  return () => { prefListeners.delete(cb); };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribePref, readPref, () => "system");
}

function subscribeTheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

const readTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** The theme on screen right now, for canvases and shaders that can't read CSS variables. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "dark");
}
