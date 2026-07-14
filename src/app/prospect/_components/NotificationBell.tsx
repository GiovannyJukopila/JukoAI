"use client";
/**
 * Centro de notificaciones (Fase 3): campana en el topbar con badge animado,
 * panel dropdown agrupado por día, marcar leídas y deep-link a la entidad.
 * Actualización por polling ligero (30 s) + refresh al volver a la pestaña.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { apiGet, apiSend } from "../_lib";
import { useLang, type Messages } from "../_i18n";

export type NotificationRow = {
  id: number;
  userTo: string;
  actor: string | null;
  type: string;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: number | null;
  meta: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};
type Resp = { notifications: NotificationRow[]; unread: number };

const POLL_MS = 30_000;

/** Deep-link target for a notification (secciones de fases posteriores incluidas). */
function deepLink(n: NotificationRow): string | null {
  if (n.entityType === "task" && n.entityId != null) {
    const commentId = n.meta && typeof n.meta.commentId === "number" ? n.meta.commentId : null;
    return `/prospect/tareas?task=${n.entityId}${commentId ? `&comment=${commentId}` : ""}`;
  }
  if (n.entityType === "goal" && n.entityId != null) return `/prospect/goals?goal=${n.entityId}`;
  return null;
}

function timeAgo(iso: string, t: Messages): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return t.notif.justNow;
  if (s < 3600) return t.notif.minAgo(Math.floor(s / 60));
  if (s < 86400) return t.notif.hoursAgo(Math.floor(s / 3600));
  return t.notif.daysAgo(Math.floor(s / 86400));
}

/** "Hoy" / "Ayer" / "Anteriores" bucket for the list grouping. */
function dayBucket(iso: string, t: Messages): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return t.notif.today;
  if (diffDays === 1) return t.notif.yesterday;
  return t.notif.earlier;
}

const TYPE_DOT: Record<string, string> = {
  task_assigned: "bg-[var(--peri)]",
  task_comment: "bg-sky-400",
  task_moved: "bg-amber-400",
  goal_update: "bg-emerald-400",
  system: "bg-white/40",
};

export function NotificationBell() {
  const { t } = useLang();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Resp | null>(null);
  const [pulse, setPulse] = useState(0); // increments when unread grows → badge pulse
  const prevUnread = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await apiGet<Resp>("/api/prospect/notifications?limit=30");
      setData(d);
      if (d.unread > prevUnread.current) setPulse((p) => p + 1);
      prevUnread.current = d.unread;
    } catch { /* transient */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  const unread = data?.unread ?? 0;

  async function onItemClick(n: NotificationRow) {
    if (!n.read) {
      setData((d) => d && {
        notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
        unread: Math.max(0, d.unread - 1),
      });
      prevUnread.current = Math.max(0, prevUnread.current - 1);
      apiSend("/api/prospect/notifications/read", "POST", { id: n.id }).catch(() => {});
    }
    const href = deepLink(n);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  async function onMarkAll() {
    setData((d) => d && { notifications: d.notifications.map((x) => ({ ...x, read: true })), unread: 0 });
    prevUnread.current = 0;
    apiSend("/api/prospect/notifications/read", "POST", { all: true }).catch(() => {});
  }

  // Grouped by Hoy / Ayer / Anteriores, preserving recency order.
  const groups = useMemo(() => {
    const out: { label: string; items: NotificationRow[] }[] = [];
    for (const n of data?.notifications ?? []) {
      const label = dayBucket(n.createdAt, t);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(n);
      else out.push({ label, items: [n] });
    }
    return out;
  }, [data, t]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.notif.aria}
        aria-expanded={open}
        className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-[var(--ink-soft)] transition-colors hover:bg-white/[0.07] hover:text-white"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              key={`badge-${pulse}`}
              initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
              animate={reduceMotion ? { scale: 1, opacity: 1 } : { scale: [0.6, 1.25, 1], opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gradient-to-br from-[var(--peri)] to-[var(--violet)] px-1 text-[10px] font-bold text-white shadow-lg shadow-[var(--violet)]/40"
              aria-label={t.notif.unreadN(unread)}
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* transparent scrim: click-outside close */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              key="panel"
              initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b1e]/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
              role="dialog"
              aria-label={t.notif.title}
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                <span className="text-sm font-semibold text-white">{t.notif.title}</span>
                {unread > 0 && (
                  <button onClick={onMarkAll} className="cursor-pointer text-xs font-medium text-[var(--peri)] hover:underline">
                    {t.notif.markAll}
                  </button>
                )}
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {(!data || data.notifications.length === 0) && (
                  <div className="px-4 py-10 text-center">
                    <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-[var(--ink-mute)]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />
                      </svg>
                    </div>
                    <p className="text-sm text-[var(--ink-soft)]">{t.notif.empty}</p>
                    <p className="mt-1 text-xs text-[var(--ink-mute)]">{t.notif.emptySub}</p>
                  </div>
                )}

                {groups.map((g) => (
                  <div key={g.label}>
                    <div className="sticky top-0 bg-[#0d0b1e]/95 px-4 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-[var(--ink-mute)] backdrop-blur-xl">
                      {g.label}
                    </div>
                    {g.items.map((n, i) => (
                      <motion.button
                        key={n.id}
                        initial={reduceMotion ? false : { opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut", delay: Math.min(i * 0.03, 0.25) }}
                        onClick={() => onItemClick(n)}
                        className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04] ${n.read ? "opacity-65" : ""}`}
                      >
                        <span className="relative mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-full bg-gradient-to-br from-[var(--peri)]/80 to-[var(--violet)]/80 text-xs font-bold text-white">
                          {(n.actor ?? "•").slice(0, 1).toUpperCase()}
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d0b1e] ${TYPE_DOT[n.type] ?? TYPE_DOT.system}`} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-white">{n.title}</span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--ink-soft)]">{n.body}</span>}
                          <span className="mt-1 block text-[11px] text-[var(--ink-mute)]">{timeAgo(n.createdAt, t)}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[var(--peri)]" aria-hidden="true" />}
                      </motion.button>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
