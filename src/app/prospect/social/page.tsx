"use client";
/**
 * Social Studio (Fase 4) — tipo Blotato: cuentas conectadas por OAuth,
 * compositor con preview por plataforma y calendario semanal con drag para
 * reprogramar. Publicación real: LinkedIn e Instagram (docs/SOCIAL_APIS.md);
 * YouTube/TikTok esperan audit; X pendiente de aprobación (API de pago).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { apiGet, apiSend } from "../_lib";
import { useLang, type Messages } from "../_i18n";
import { StatCard } from "../_components/viz";

/* ── Tipos ── */
type Account = {
  id: number; platform: string; accountName: string; handle: string | null;
  avatarUrl: string | null; status: string; lastError: string | null;
  connectedAt: string | null; tokenExpiresAt: string | null;
};
type Post = {
  id: number; platform: string; content: string; media: string[] | null;
  status: string; scheduledFor: string | null; publishedAt: string | null;
  errorMessage: string | null; retries: number; createdBy: string | null;
};
type Stats = { borrador: number; programado: number; publicado: number; fallido: number };

type Platform = "linkedin" | "instagram" | "youtube" | "tiktok" | "x";
const PLATFORMS: Platform[] = ["linkedin", "instagram", "youtube", "tiktok", "x"];
/** Estado de integración según docs/SOCIAL_APIS.md. */
const INTEGRATION: Record<Platform, "oauth" | "audit" | "paid"> = {
  linkedin: "oauth", instagram: "oauth", youtube: "audit", tiktok: "audit", x: "paid",
};
const CHAR_LIMIT: Record<Platform, number> = { linkedin: 3000, instagram: 2200, youtube: 5000, tiktok: 2200, x: 280 };
const BRAND: Record<Platform, { label: string; color: string }> = {
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  instagram: { label: "Instagram", color: "#e1306c" },
  youtube: { label: "YouTube", color: "#ff0000" },
  tiktok: { label: "TikTok", color: "#00f2ea" },
  x: { label: "X", color: "#e7e9ea" },
};

function PlatformLogo({ p, size = 18 }: { p: Platform; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true as const };
  switch (p) {
    case "linkedin":
      return <svg {...common}><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" /></svg>;
    case "instagram":
      return <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" /></svg>;
    case "youtube":
      return <svg {...common}><path d="M23 12s0-3.85-.49-5.55a2.9 2.9 0 0 0-2.05-2.05C18.76 3.9 12 3.9 12 3.9s-6.76 0-8.46.5A2.9 2.9 0 0 0 1.5 6.45C1 8.15 1 12 1 12s0 3.85.5 5.55a2.9 2.9 0 0 0 2.04 2.05c1.7.5 8.46.5 8.46.5s6.76 0 8.46-.5a2.9 2.9 0 0 0 2.05-2.05C23 15.85 23 12 23 12zM9.8 15.6V8.4l6.3 3.6-6.3 3.6z" /></svg>;
    case "tiktok":
      return <svg {...common}><path d="M16.7 2h-3.2v13.4a2.84 2.84 0 1 1-2.84-2.84c.27 0 .54.04.79.11V9.4a6.1 6.1 0 0 0-.79-.05A6.13 6.13 0 1 0 16.8 15.5V8.13A7.83 7.83 0 0 0 21 9.35V6.16A4.85 4.85 0 0 1 16.7 2z" /></svg>;
    case "x":
      return <svg {...common}><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23z" /></svg>;
  }
}

const STATUS_STYLE: Record<string, string> = {
  borrador: "border-white/15 bg-white/5 text-[var(--ink-soft)]",
  programado: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  publicado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  fallido: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

/* ═══════════════════════════ Página ═══════════════════════════ */

type Tab = "accounts" | "composer" | "calendar";

export default function SocialStudioPage() {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>("accounts");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [flash, setFlash] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const loadAccounts = useCallback(async () => {
    try { setAccounts((await apiGet<{ accounts: Account[] }>("/api/prospect/social/accounts")).accounts); } catch { /* transient */ }
  }, []);
  const loadPosts = useCallback(async () => {
    try {
      const d = await apiGet<{ posts: Post[]; stats: Stats }>("/api/prospect/social/posts");
      setPosts(d.posts); setStats(d.stats);
    } catch { /* transient */ }
  }, []);

  useEffect(() => { loadAccounts(); loadPosts(); }, [loadAccounts, loadPosts]);

  // Cola: despachar programados vencidos mientras la sección esté abierta.
  useEffect(() => {
    const tick = () => apiSend("/api/prospect/social/dispatch", "POST").then(() => loadPosts()).catch(() => {});
    const id = setInterval(tick, 60_000);
    tick();
    return () => clearInterval(id);
  }, [loadPosts]);

  // Feedback del OAuth (?connected= / ?error=).
  useEffect(() => {
    const connected = search.get("connected");
    const error = search.get("error");
    if (connected) setFlash({ kind: "ok", text: t.social.connectedOk(BRAND[connected as Platform]?.label ?? connected) });
    else if (error) setFlash({ kind: "error", text: `${t.social.connError}: ${decodeURIComponent(error)}` });
    if (connected || error) {
      window.history.replaceState(null, "", "/prospect/social");
      const id = setTimeout(() => setFlash(null), 6000);
      return () => clearTimeout(id);
    }
  }, [search, t]);

  const connectedPlatforms = useMemo(
    () => new Set((accounts ?? []).filter((a) => a.status === "connected").map((a) => a.platform)),
    [accounts],
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "accounts", label: t.social.tabAccounts },
    { key: "composer", label: t.social.tabComposer },
    { key: "calendar", label: t.social.tabCalendar },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">{t.social.title}</h1>
        <p className="text-sm text-[var(--ink-mute)]">{t.social.subtitle}</p>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border px-4 py-2.5 text-sm ${flash.kind === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}
            role="status"
          >
            {flash.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.social.kDrafts} value={stats?.borrador ?? "—"} />
        <StatCard label={t.social.kScheduled} value={stats?.programado ?? "—"} accent="#38bdf8" />
        <StatCard label={t.social.kPublished} value={stats?.publicado ?? "—"} accent="#34d399" />
        <StatCard label={t.social.kFailed} value={stats?.fallido ?? "—"} accent={stats?.fallido ? "#fb7185" : undefined} />
      </div>

      {/* Tabs con subrayado animado */}
      <div className="flex gap-1 border-b border-white/10" role="tablist">
        {tabs.map((x) => (
          <button key={x.key} role="tab" aria-selected={tab === x.key} onClick={() => setTab(x.key)}
            className={`relative cursor-pointer px-4 py-2.5 text-sm font-medium transition-colors ${tab === x.key ? "text-white" : "text-[var(--ink-mute)] hover:text-[var(--ink-soft)]"}`}>
            {x.label}
            {tab === x.key && (
              <motion.span layoutId="social-tab" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[var(--peri)] to-[var(--violet)]" transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }} />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {tab === "accounts" && <AccountsTab accounts={accounts} onDisconnect={async (id) => { await apiSend(`/api/prospect/social/accounts/${id}`, "DELETE"); loadAccounts(); }} t={t} />}
          {tab === "composer" && <ComposerTab connected={connectedPlatforms} t={t} onSaved={() => { loadPosts(); setTab("calendar"); }} />}
          {tab === "calendar" && <CalendarTab posts={posts} reload={loadPosts} t={t} reduceMotion={!!reduceMotion} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════ Tab 1: Cuentas conectadas (4.2) ═══════════════ */

function AccountsTab({ accounts, onDisconnect, t }: { accounts: Account[] | null; onDisconnect: (id: number) => void; t: Messages }) {
  const byPlatform = new Map((accounts ?? []).map((a) => [a.platform, a]));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PLATFORMS.map((p, i) => {
        const acc = byPlatform.get(p);
        const connected = acc?.status === "connected";
        const kind = INTEGRATION[p];
        return (
          <motion.div key={p}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: "easeOut", delay: i * 0.05 }}
            whileHover={{ y: -2 }}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]" style={{ color: BRAND[p].color }}>
                <PlatformLogo p={p} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{BRAND[p].label}</div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : acc?.status === "error" ? "bg-rose-400" : "bg-white/25"}`} />
                  <span className="text-[var(--ink-mute)]">
                    {connected ? t.social.stConnected : acc?.status === "error" ? t.social.stError : t.social.stDisconnected}
                  </span>
                </div>
              </div>
              {connected && (acc?.avatarUrl
                ? <img src={acc.avatarUrl} alt="" className="h-9 w-9 rounded-full border border-white/15 object-cover" />
                : <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[var(--peri)] to-[var(--violet)] text-xs font-bold text-white">{acc!.accountName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>

            {connected && (
              <div className="text-xs text-[var(--ink-soft)]">
                <div className="truncate font-medium text-white">{acc!.handle ?? acc!.accountName}</div>
                {acc!.tokenExpiresAt && <div className="mt-0.5 text-[var(--ink-mute)]">{t.social.tokenExpires(new Date(acc!.tokenExpiresAt).toLocaleDateString())}</div>}
              </div>
            )}
            {acc?.status === "error" && acc.lastError && <p className="text-xs text-rose-300">{acc.lastError}</p>}

            <div className="mt-auto">
              {connected ? (
                <button onClick={() => onDisconnect(acc!.id)}
                  className="w-full cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition-colors hover:bg-white/5 hover:text-white">
                  {t.social.disconnect}
                </button>
              ) : kind === "oauth" ? (
                <a href={`/api/prospect/social/connect/${p}`}
                  className="block w-full cursor-pointer rounded-lg bg-[var(--violet)] px-3 py-2 text-center text-xs font-medium text-white transition-opacity hover:opacity-90">
                  {t.social.connect}
                </a>
              ) : (
                <div className="rounded-lg border border-dashed border-white/15 px-3 py-2 text-center text-[11px] text-[var(--ink-mute)]">
                  {kind === "audit" ? t.social.needsAudit : t.social.pendingPaid}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════ Tab 2: Compositor (4.4) ═══════════════ */

function ComposerTab({ connected, t, onSaved }: { connected: Set<string>; t: Messages; onSaved: () => void }) {
  const [selected, setSelected] = useState<Platform[]>([]);
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [mediaInput, setMediaInput] = useState("");
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState<null | "draft" | "schedule" | "now">(null);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (p: Platform) => setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const igInvalid = selected.includes("instagram") && media.length === 0;

  async function save(mode: "draft" | "schedule" | "now") {
    setMsg(null);
    if (!selected.length) { setMsg(t.social.pickPlatform); return; }
    if (igInvalid) { setMsg(t.social.igNeedsMedia); return; }
    setBusy(mode);
    try {
      const { posts } = await apiSend<{ posts: { id: number }[] }>("/api/prospect/social/posts", "POST", {
        platforms: selected,
        content,
        media: media.length ? media : null,
        scheduledFor: mode === "schedule" && when ? new Date(when).toISOString() : null,
      });
      if (mode === "now") {
        await Promise.all(posts.map((p) => apiSend(`/api/prospect/social/posts/${p.id}`, "POST").catch(() => {})));
      }
      setContent(""); setMedia([]); setWhen(""); setSelected([]);
      onSaved();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {/* Selector multi-plataforma */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-[var(--ink-mute)]">{t.social.composerPlatforms}</span>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              // Sin conexión igual se permite seleccionar: el post queda como borrador.
              const active = selected.includes(p);
              return (
                <button key={p} onClick={() => toggle(p)}
                  aria-pressed={active}
                  title={connected.has(p) ? BRAND[p].label : `${BRAND[p].label}: ${t.social.stDisconnected}`}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    active ? "border-[var(--peri)]/60 bg-[var(--peri)]/15 text-white" : "border-white/10 text-[var(--ink-soft)] hover:bg-white/5"
                  } ${!connected.has(p) ? "opacity-60" : ""}`}
                >
                  <span style={{ color: active ? BRAND[p].color : undefined }}><PlatformLogo p={p} size={13} /></span>
                  {BRAND[p].label}
                  {!connected.has(p) && <span className="text-[9px] text-[var(--ink-mute)]">({t.social.stBorrador.toLowerCase()})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-medium text-[var(--ink-mute)]">{t.social.composerContent}</span>
            <span className="flex gap-2 text-[10px] tabular-nums text-[var(--ink-mute)]">
              {selected.map((p) => (
                <span key={p} className={content.length > CHAR_LIMIT[p] ? "text-rose-300" : ""}>
                  {BRAND[p].label}: {content.length}/{CHAR_LIMIT[p]}
                </span>
              ))}
            </span>
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={7}
            placeholder={t.social.composerPlaceholder}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none" />
        </div>

        {/* Media */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-[var(--ink-mute)]">{t.social.composerMedia}</span>
          <div className="flex gap-2">
            <input value={mediaInput} onChange={(e) => setMediaInput(e.target.value)} placeholder="https://…"
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none" />
            <button onClick={() => { if (mediaInput.trim()) { setMedia((m) => [...m, mediaInput.trim()]); setMediaInput(""); } }}
              className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/5">{t.social.composerMediaAdd}</button>
          </div>
          {media.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {media.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[var(--ink-soft)]">
                  <span className="max-w-[180px] truncate">{m.replace(/^https?:\/\//, "")}</span>
                  <button onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))} className="cursor-pointer text-[var(--ink-mute)] hover:text-white">✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.social.composerSchedule}
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white [color-scheme:dark]" />
          </label>
          <div className="ml-auto flex gap-2">
            <button disabled={!!busy || !content.trim()} onClick={() => save("draft")}
              className="cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white hover:bg-white/5 disabled:opacity-40">
              {t.social.saveDraft}
            </button>
            <button disabled={!!busy || !content.trim() || !when} onClick={() => save("schedule")}
              className="cursor-pointer rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-40">
              {t.social.scheduleBtn}
            </button>
            <button disabled={!!busy || !content.trim()} onClick={() => save("now")}
              className="cursor-pointer rounded-lg bg-[var(--violet)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40">
              {busy === "now" ? t.social.publishing : t.social.publishNow}
            </button>
          </div>
        </div>
        {msg && <p className="text-sm text-amber-300">⚠ {msg}</p>}
      </div>

      {/* Preview por plataforma */}
      <div className="space-y-3">
        <span className="block text-xs font-medium text-[var(--ink-mute)]">{t.social.preview}</span>
        <AnimatePresence mode="popLayout">
          {(selected.length ? selected : (["linkedin"] as Platform[])).map((p) => (
            <motion.div key={p} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}>
              <PostPreview platform={p} content={content} media={media} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Mock visual del post en cada red. */
function PostPreview({ platform, content, media }: { platform: Platform; content: string; media: string[] }) {
  const img = media.find((m) => !/\.(mp4|mov)(\?|$)/i.test(m));
  const text = content || "…";
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b1e]/80">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10" style={{ color: BRAND[platform].color }}>
          <PlatformLogo p={platform} size={13} />
        </span>
        <div className="text-xs">
          <div className="font-semibold text-white">Juko AI</div>
          <div className="text-[10px] text-[var(--ink-mute)]">{BRAND[platform].label} · {new Date().toLocaleDateString()}</div>
        </div>
      </div>
      {platform === "instagram" ? (
        <>
          <div className="aspect-square w-full bg-white/[0.04]">
            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-[var(--ink-mute)]">1080 × 1080</div>}
          </div>
          <p className="line-clamp-3 px-3 py-2.5 text-xs text-[var(--ink-soft)]"><b className="text-white">jukoai</b> {text}</p>
        </>
      ) : (
        <>
          <p className={`whitespace-pre-wrap px-3 pb-2 text-[13px] leading-relaxed text-[var(--ink-soft)] ${platform === "x" ? "" : "line-clamp-5"}`}>{text.slice(0, CHAR_LIMIT[platform])}</p>
          {img && <img src={img} alt="" className="max-h-52 w-full border-t border-white/5 object-cover" />}
        </>
      )}
      <div className="flex gap-4 border-t border-white/5 px-3 py-2 text-[10px] text-[var(--ink-mute)]">
        <span>♡</span><span>💬</span><span>↗</span>
      </div>
    </div>
  );
}

/* ═══════════════ Tab 3: Calendario semanal (4.6) ═══════════════ */

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - day);
  return x;
}
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function CalendarTab({ posts, reload, t, reduceMotion }: { posts: Post[]; reload: () => void; t: Messages; reduceMotion: boolean }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [dragging, setDragging] = useState<Post | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const byDay = useMemo(() => {
    const m = new Map<string, Post[]>();
    for (const p of posts) {
      if (!p.scheduledFor && p.status !== "publicado") continue;
      const iso = p.scheduledFor ?? p.publishedAt;
      if (!iso) continue;
      const k = dayKey(new Date(iso));
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [posts]);

  // Solo borradores creados en Social Studio (createdBy) — los drafts históricos
  // del pipeline de outreach (Phase 2) no pertenecen a esta cola.
  const drafts = useMemo(() => posts.filter((p) => !p.scheduledFor && p.status === "borrador" && p.createdBy), [posts]);

  async function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const post = e.active.data.current?.post as Post | undefined;
    const day = e.over?.id as string | undefined;
    if (!post || !day || !day.startsWith("day-")) return;
    const target = day.slice(4);
    const prev = post.scheduledFor ? new Date(post.scheduledFor) : new Date();
    if (dayKey(prev) === target && post.scheduledFor) return;
    const next = new Date(`${target}T00:00:00`);
    next.setHours(prev.getHours(), prev.getMinutes());
    await apiSend(`/api/prospect/social/posts/${post.id}`, "PATCH", { scheduledFor: next.toISOString() });
    reload();
  }

  const hasAny = posts.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}
          className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--ink-soft)] hover:bg-white/5">{t.social.weekPrev}</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="cursor-pointer rounded-lg border border-[var(--peri)]/40 bg-[var(--peri)]/10 px-3 py-1.5 text-xs text-[var(--peri)] hover:bg-[var(--peri)]/20">{t.social.todayBtn}</button>
        <button onClick={() => setWeekStart((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}
          className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[var(--ink-soft)] hover:bg-white/5">{t.social.weekNext}</button>
        <span className="ml-auto text-xs text-[var(--ink-mute)]">{t.social.dragHint}</span>
      </div>

      {!hasAny && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">{t.social.noPosts}</p>
          <p className="mt-1 text-xs text-[var(--ink-mute)]">{t.social.noPostsSub}</p>
        </div>
      )}

      {hasAny && (
        <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setDragging(e.active.data.current?.post ?? null)} onDragEnd={onDragEnd}>
          <div className="grid gap-2 overflow-x-auto md:grid-cols-7">
            {days.map((d) => {
              const k = dayKey(d);
              const isToday = k === dayKey(new Date());
              return (
                <DayColumn key={k} id={`day-${k}`} isToday={isToday} label={d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })}>
                  {(byDay.get(k) ?? []).map((p) => <PostCard key={p.id} post={p} reload={reload} t={t} />)}
                </DayColumn>
              );
            })}
          </div>
          {drafts.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--ink-mute)]">{t.social.unscheduled}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {drafts.map((p) => <PostCard key={p.id} post={p} reload={reload} t={t} />)}
              </div>
            </div>
          )}
          <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
            {dragging && <div className="w-44 rotate-2 opacity-90"><PostCard post={dragging} reload={() => {}} t={t} overlay /></div>}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function DayColumn({ id, label, isToday, children }: { id: string; label: string; isToday: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef}
      className={`min-h-[140px] min-w-[130px] rounded-xl border p-2 transition-colors ${
        isOver ? "border-[var(--peri)]/60 bg-[var(--peri)]/[0.07]" : isToday ? "border-[var(--peri)]/30 bg-white/[0.03]" : "border-white/10 bg-white/[0.02]"
      }`}>
      <div className={`mb-2 text-[10px] font-medium uppercase tracking-wider ${isToday ? "text-[var(--peri)]" : "text-[var(--ink-mute)]"}`}>{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PostCard({ post, reload, t, overlay = false }: { post: Post; reload: () => void; t: Messages; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `post-${post.id}`,
    data: { post },
    disabled: overlay || post.status === "publicado",
  });
  const statusLabel: Record<string, string> = {
    borrador: t.social.stBorrador, programado: t.social.stProgramado, publicado: t.social.stPublicado, fallido: t.social.stFallido,
  };
  const p = post.platform as Platform;
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      className={`group rounded-lg border p-2 text-left transition-shadow ${STATUS_STYLE[post.status] ?? STATUS_STYLE.borrador} ${
        post.status !== "publicado" && !overlay ? "cursor-grab active:cursor-grabbing" : ""
      } ${isDragging ? "opacity-30" : ""} ${overlay ? "shadow-2xl shadow-black/60" : ""}`}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: BRAND[p]?.color }}><PlatformLogo p={p ?? "linkedin"} size={11} /></span>
        <span className="text-[9px] font-medium uppercase tracking-wide">{statusLabel[post.status] ?? post.status}</span>
        {post.scheduledFor && (
          <span className="ml-auto text-[9px] tabular-nums opacity-70">
            {new Date(post.scheduledFor).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug">{post.content}</p>
      {post.errorMessage && <p className="mt-1 line-clamp-1 text-[9px] text-rose-300">{post.errorMessage}</p>}
      {!overlay && (
        <div className="mt-1.5 hidden gap-1 group-hover:flex">
          {post.status !== "publicado" && (
            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => apiSend(`/api/prospect/social/posts/${post.id}`, "POST").then(reload).catch(reload)}
              className="cursor-pointer rounded border border-white/15 px-1.5 py-0.5 text-[9px] hover:bg-white/10">
              {post.status === "fallido" ? t.social.retry : t.social.publishNow}
            </button>
          )}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { if (confirm(t.social.confirmDelete)) apiSend(`/api/prospect/social/posts/${post.id}`, "DELETE").then(reload); }}
            className="cursor-pointer rounded border border-white/15 px-1.5 py-0.5 text-[9px] hover:bg-rose-500/20">
            {t.social.del}
          </button>
        </div>
      )}
    </div>
  );
}
