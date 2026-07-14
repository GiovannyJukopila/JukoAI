"use client";
import { useState } from "react";

export function UserMenu({ user, label = "Salir", compact = false }: { user: string; label?: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/prospect/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/prospect/login";
  }

  // Compact: icon-only button used inside the sidebar footer.
  if (compact) {
    return (
      <button
        onClick={logout}
        disabled={busy}
        title={label}
        aria-label={label}
        className="grid h-7 w-7 flex-none cursor-pointer place-items-center rounded-lg border border-white/12 text-[var(--ink-soft)] transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-[var(--ink-soft)] sm:inline">{user}</span>
      <button
        onClick={logout}
        disabled={busy}
        className="cursor-pointer rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white transition-colors hover:bg-white/5 disabled:opacity-50"
      >
        {busy ? `${label}…` : label}
      </button>
    </div>
  );
}
