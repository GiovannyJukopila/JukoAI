"use client";

// Any "get a quote" button opens the quote quiz through this window event, optionally with the
// needs it should start with already ticked (the "What does your business need?" rows do that).
const OPEN = "juko:quote-open";

// links from outside the site (the email signatures) open the quiz with one of these hashes
export const QUOTE_HASHES = ["#cotizar", "#quote"];

export function openQuote(needs: string[] = []) {
  window.dispatchEvent(new CustomEvent<string[]>(OPEN, { detail: needs }));
}

export function onQuoteOpen(cb: (needs: string[]) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<string[]>).detail ?? []);
  window.addEventListener(OPEN, handler);
  return () => window.removeEventListener(OPEN, handler);
}
