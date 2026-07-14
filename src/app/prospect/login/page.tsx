"use client";
import { useState } from "react";
import { useLang } from "../_i18n";

export default function LoginPage() {
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/prospect/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError(res.status === 401 ? t.login.badCreds : t.login.netError);
        setBusy(false);
        return;
      }
      const from = new URLSearchParams(window.location.search).get("from");
      window.location.href = from && from.startsWith("/prospect") ? from : "/prospect/leads";
    } catch {
      setError(t.login.netError);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pa-card w-full max-w-sm p-7 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="pa-brand__mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M4 7l8-4 8 4M4 7v10l8 4 8-4V7" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="text-lg font-semibold">
              Juko<span className="text-[var(--peri)]">Prospect</span>
            </div>
            <div className="text-[0.64rem] uppercase tracking-[0.16em] text-[var(--ink-mute)]">Panel interno</div>
          </div>
        </div>
        <p className="mb-5 text-sm text-[var(--ink-mute)]">{t.login.subtitle}</p>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-mute)]">{t.login.user}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-[var(--peri)]/40 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--ink-mute)]">{t.login.password}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white focus:border-[var(--peri)]/40 focus:outline-none"
            />
          </label>

          {error && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[var(--violet)] to-[var(--peri)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(119,82,254,.7)] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {busy ? t.login.entering : t.login.enter}
          </button>
        </form>
      </div>
    </div>
  );
}
