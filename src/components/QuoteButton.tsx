"use client";

import type { ReactNode } from "react";
import { openQuote } from "@/lib/quote";

/** Any "get a quote" call to action: opens the quote quiz from wherever it sits, optionally with needs ticked. */
export function QuoteButton({ className, children, needs }: { className?: string; children: ReactNode; needs?: string[] }) {
  return (
    <button type="button" className={className} onClick={() => openQuote(needs)}>
      {children}
    </button>
  );
}
