"use client";

import type { ReactNode } from "react";
import { useWhatsApp } from "@/lib/region";

/** A WhatsApp link to the number of the visitor's region. */
export function WhatsAppLink({ className, children }: { className?: string; children: ReactNode }) {
  const wa = useWhatsApp();
  return (
    <a href={wa.url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
