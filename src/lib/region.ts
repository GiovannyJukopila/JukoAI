"use client";

import { useSyncExternalStore } from "react";
import { WHATSAPP } from "./content";
import { REGION_COOKIE, regionFromTimeZone, type Region } from "./region-data";

// 1) the country the host's network saw (the proxy keeps it in a cookie), 2) the device time zone
function detect(): Region {
  const m = document.cookie.match(new RegExp(`(?:^|; )${REGION_COOKIE}=(latam|intl)`));
  if (m) return m[1] as Region;
  try {
    return regionFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "intl";
  }
}

let region: Region | null = null;
const read = () => (region ??= detect());
const subscribe = () => () => {};

/** The visitor's region; "intl" on the server and until the browser knows better. */
export function useRegion(): Region {
  return useSyncExternalStore(subscribe, read, () => "intl");
}

/** The WhatsApp number for the visitor: Latin America or the rest of the world. */
export function useWhatsApp() {
  return WHATSAPP[useRegion()];
}
