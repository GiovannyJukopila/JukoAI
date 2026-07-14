"use client";
/**
 * Goals (Fase 7): tres horizontes (corto ≤1 mes, mediano 1–6, largo 6+) en
 * columnas. Progreso efectivo derivado: tareas vinculadas > milestones > manual.
 * Deep-link ?goal=ID (desde notificaciones) hace scroll + flash del card.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { apiGet, apiSend } from "../_lib";
import { useLang, type Messages } from "../_i18n";

type Milestone = { text: string; done: boolean };
type Goal = {
  id: number; title: string; description: string | null; owner: string | null;
  createdBy: string; horizon: string; progress: number; milestones: Milestone[] | null;
  targetDate: string | null; tasksTotal: number; tasksDone: number; effectiveProgress: number;
};

const HORIZONS = ["corto", "mediano", "largo"] as const;

function Avatar({ user, size = 22 }: { user: string; size?: number }) {
  return (
    <span className="grid flex-none place-items-center rounded-full bg-gradient-to-br from-[var(--peri)] to-[var(--violet)] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }} title={user}>
      {user.slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function GoalsPage() {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  const search = useSearchParams();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [users, setUsers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const highlightId = Number(search.get("goal")) || null;

  const load = useCallback(async () => {
    try { setGoals((await apiGet<{ goals: Goal[] }>("/api/prospect/goals")).goals); } catch { /* transient */ }
  }, []);
  useEffect(() => {
    load();
    apiGet<{ users: string[] }>("/api/prospect/users").then((d) => setUsers(d.users)).catch(() => {});
  }, [load]);

  // Deep-link: scroll al goal referenciado cuando cargue.
  useEffect(() => {
    if (!goals || !highlightId) return;
    const el = document.getElementById(`goal-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [goals, highlightId, reduceMotion]);

  const byHorizon = useMemo(() => {
    const m: Record<string, Goal[]> = { corto: [], mediano: [], largo: [] };
    for (const g of goals ?? []) (m[g.horizon] ??= []).push(g);
    return m;
  }, [goals]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.goals.title}</h1>
          <p className="text-sm text-[var(--ink-mute)]">{t.goals.subtitle}</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="cursor-pointer rounded-xl bg-[var(--violet)] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--violet)]/25 transition-opacity hover:opacity-90">
          + {t.goals.newGoal}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {HORIZONS.map((h, hi) => (
          <motion.section key={h}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut", delay: hi * 0.08 }}
            className="space-y-3"
            aria-label={t.goals.hLabels[h]}
          >
            <div className="flex items-baseline gap-2 border-b border-white/10 pb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--ink-soft)]">{t.goals.hLabels[h]}</h2>
              <span className="text-[10px] text-[var(--ink-mute)]">{t.goals.hHints[h]}</span>
              <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--ink-mute)]">{byHorizon[h].length}</span>
            </div>
            {byHorizon[h].length === 0 && goals && (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center">
                <p className="text-xs text-[var(--ink-mute)]">{t.goals.empty}</p>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {byHorizon[h].map((g) => (
                <GoalCard key={g.id} goal={g} users={users} t={t} reduceMotion={!!reduceMotion} highlighted={g.id === highlightId} onChanged={load} />
              ))}
            </AnimatePresence>
          </motion.section>
        ))}
      </div>

      <AnimatePresence>
        {creating && (
          <CreateGoalModal users={users} t={t} reduceMotion={!!reduceMotion}
            onClose={() => setCreating(false)}
            onCreated={() => { setCreating(false); load(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({ goal, users, t, reduceMotion, highlighted, onChanged }: {
  goal: Goal; users: string[]; t: Messages; reduceMotion: boolean; highlighted: boolean; onChanged: () => void;
}) {
  const [newMilestone, setNewMilestone] = useState("");
  const source = goal.tasksTotal > 0 ? "tasks" : (goal.milestones?.length ?? 0) > 0 ? "milestones" : "manual";

  async function patch(fields: Record<string, unknown>) {
    await apiSend(`/api/prospect/goals/${goal.id}`, "PATCH", fields);
    onChanged();
  }
  async function toggleMilestone(i: number) {
    const ms = [...(goal.milestones ?? [])];
    ms[i] = { ...ms[i], done: !ms[i].done };
    await patch({ milestones: ms });
  }
  async function addMilestone() {
    const text = newMilestone.trim();
    if (!text) return;
    setNewMilestone("");
    await patch({ milestones: [...(goal.milestones ?? []), { text, done: false }] });
  }
  async function remove() {
    if (!confirm(t.goals.confirmDelete)) return;
    await apiSend(`/api/prospect/goals/${goal.id}`, "DELETE");
    onChanged();
  }

  return (
    <motion.article
      id={`goal-${goal.id}`}
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={highlighted
        ? { opacity: 1, y: 0, boxShadow: ["0 0 0 2px rgba(122,110,228,0.8)", "0 0 0 2px rgba(122,110,228,0)"] }
        : { opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
      transition={highlighted ? { duration: 2.2, ease: "easeOut" } : { duration: 0.22, ease: "easeOut" }}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex items-start gap-2">
        <input
          defaultValue={goal.title}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== goal.title) patch({ title: v }); }}
          className="w-full rounded-md border border-transparent bg-transparent text-sm font-semibold text-white focus:border-[var(--peri)]/40 focus:bg-white/[0.03] focus:outline-none"
        />
        {goal.owner && <Avatar user={goal.owner} />}
        <button onClick={remove} title={t.goals.del}
          className="cursor-pointer rounded-md p-1 text-[var(--ink-mute)] transition-colors hover:bg-rose-500/10 hover:text-rose-300">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
        </button>
      </div>

      {goal.description && <p className="text-xs leading-relaxed text-[var(--ink-soft)]">{goal.description}</p>}

      {/* Barra de progreso animada (7.2) */}
      <div>
        <div className="mb-1 flex items-baseline justify-between text-[11px]">
          <span className="font-semibold tabular-nums text-white">{goal.effectiveProgress}%</span>
          <span className="text-[var(--ink-mute)]">{t.goals.progressFrom[source]}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <motion.div
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${goal.effectiveProgress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`h-full rounded-full ${goal.effectiveProgress >= 100 ? "bg-emerald-400" : "bg-gradient-to-r from-[var(--peri)] to-[var(--violet)]"}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--ink-mute)]">
        {goal.targetDate && (
          <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">
            {t.goals.targetFor(new Date(goal.targetDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }))}
          </span>
        )}
        {goal.tasksTotal > 0 && (
          <Link href="/prospect/tareas" className="rounded border border-[var(--peri)]/25 bg-[var(--peri)]/10 px-1.5 py-0.5 text-[var(--peri)] hover:bg-[var(--peri)]/20">
            {t.goals.linkedTasks(goal.tasksDone, goal.tasksTotal)}
          </Link>
        )}
        <select value={goal.horizon} onChange={(e) => patch({ horizon: e.target.value })}
          className="ml-auto cursor-pointer rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] text-[var(--ink-soft)]">
          {HORIZONS.map((h) => <option key={h} value={h} className="bg-[#111]">{t.goals.hLabels[h]}</option>)}
        </select>
      </div>

      {/* Milestones (checklist) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--ink-mute)]">{t.goals.milestones}</span>
        {(goal.milestones ?? []).map((m, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2 text-xs text-[var(--ink-soft)] hover:text-white">
            <input type="checkbox" checked={m.done} onChange={() => toggleMilestone(i)}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--violet)]" />
            <span className={m.done ? "line-through opacity-60" : ""}>{m.text}</span>
          </label>
        ))}
        <input
          value={newMilestone}
          onChange={(e) => setNewMilestone(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addMilestone(); }}
          placeholder={t.goals.addMilestone}
          className="w-full rounded-md border border-white/5 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none"
        />
      </div>
    </motion.article>
  );
}

function CreateGoalModal({ users, t, reduceMotion, onClose, onCreated }: {
  users: string[]; t: Messages; reduceMotion: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [horizon, setHorizon] = useState("corto");
  const [targetDate, setTargetDate] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function create() {
    if (!title.trim()) { setErr(t.goals.titleRequired); return; }
    setBusy(true);
    try {
      await apiSend("/api/prospect/goals", "POST", {
        title: title.trim(),
        description: description.trim() || null,
        owner: owner || null,
        horizon,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose} role="dialog" aria-modal="true" aria-label={t.goals.newGoal}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg space-y-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b1e]/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <h2 className="text-base font-semibold text-white">{t.goals.newGoal}</h2>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.goals.fTitle}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t.goals.fDesc}
          className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none" />
        <div className="grid grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.goals.fOwner}
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white">
              <option value="" className="bg-[#111]">—</option>
              {users.map((u) => <option key={u} value={u} className="bg-[#111]">{u}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.goals.fHorizon}
            <select value={horizon} onChange={(e) => setHorizon(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white">
              {HORIZONS.map((h) => <option key={h} value={h} className="bg-[#111]">{t.goals.hLabels[h]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.goals.fTarget}
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white [color-scheme:dark]" />
          </label>
        </div>
        {err && <p className="text-xs text-amber-300">⚠ {err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[var(--ink-soft)] hover:text-white">✕</button>
          <button onClick={create} disabled={busy}
            className="cursor-pointer rounded-lg bg-[var(--violet)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
            {t.goals.create}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
