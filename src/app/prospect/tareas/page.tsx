"use client";
/**
 * Kanban de tareas (Fase 6): drag & drop multi-columna con @dnd-kit,
 * cards premium (prioridad, due date, avatar, comentarios) y modal de detalle
 * con edición inline + hilo de comentarios estilo chat.
 * Deep-link: /prospect/tareas?task=ID&comment=CID abre la tarea y resalta
 * el comentario (integración con el centro de notificaciones, 6.5).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  DndContext, DragOverlay, PointerSensor, closestCorners,
  useSensor, useSensors, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { apiGet, apiSend } from "../_lib";
import { useLang, type Messages } from "../_i18n";

type Task = {
  id: number; title: string; description: string | null; assignedTo: string | null;
  createdBy: string; column: string; sortOrder: number; priority: string;
  dueDate: string | null; labels: string[] | null; goalId: number | null; commentsCount: number;
  createdAt: string; updatedAt: string;
};
type GoalOption = { id: number; title: string };
type Comment = { id: number; author: string; body: string; createdAt: string };
type TaskDetail = Task & { comments: Comment[] };

const COLUMNS = ["backlog", "en_progreso", "en_revision", "hecho"] as const;
const PRIORITY_STYLE: Record<string, { dot: string; chip: string }> = {
  baja: { dot: "bg-sky-400", chip: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
  media: { dot: "bg-white/40", chip: "border-white/15 bg-white/5 text-[var(--ink-soft)]" },
  alta: { dot: "bg-amber-400", chip: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
  urgente: { dot: "bg-rose-400", chip: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
};

function Avatar({ user, size = 24 }: { user: string; size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full bg-gradient-to-br from-[var(--peri)] to-[var(--violet)] font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      title={user}
    >
      {user.slice(0, 1).toUpperCase()}
    </span>
  );
}

function dueBadge(task: Task, t: Messages): { label: string; cls: string } | null {
  if (!task.dueDate) return null;
  const d = new Date(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((dd.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (task.column !== "hecho" && days < 0) return { label: `${t.tasks.overdue} · ${label}`, cls: "border-rose-500/40 bg-rose-500/15 text-rose-300" };
  if (days === 0) return { label: `${t.tasks.dueToday} · ${label}`, cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" };
  return { label, cls: "border-white/10 bg-white/5 text-[var(--ink-mute)]" };
}

export default function TasksPage() {
  const { t } = useLang();
  const reduceMotion = useReducedMotion();
  const search = useSearchParams();
  const [tasksById, setTasksById] = useState<Map<number, Task>>(new Map());
  const [board, setBoard] = useState<Record<string, number[]>>({ backlog: [], en_progreso: [], en_revision: [], hecho: [] });
  const [users, setUsers] = useState<string[]>([]);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [me, setMe] = useState<string>("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [openTask, setOpenTask] = useState<number | null>(null);
  const [createIn, setCreateIn] = useState<string | null>(null); // columna del modal de creación
  const draggingRef = useRef(false);

  const load = useCallback(async () => {
    if (draggingRef.current) return; // no pisar el estado mientras se arrastra
    try {
      const d = await apiGet<{ tasks: Task[] }>("/api/prospect/tasks");
      const map = new Map(d.tasks.map((x) => [x.id, x]));
      const next: Record<string, number[]> = { backlog: [], en_progreso: [], en_revision: [], hecho: [] };
      for (const task of d.tasks) (next[task.column] ??= []).push(task.id);
      setTasksById(map);
      setBoard(next);
    } catch { /* transient */ }
  }, []);

  useEffect(() => {
    load();
    apiGet<{ users: string[]; me: string | null }>("/api/prospect/users").then((d) => { setUsers(d.users); setMe(d.me ?? ""); }).catch(() => {});
    apiGet<{ goals: GoalOption[] }>("/api/prospect/goals").then((d) => setGoals(d.goals)).catch(() => {});
    const id = setInterval(load, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  // Deep-link ?task=ID (desde notificaciones).
  useEffect(() => {
    const id = Number(search.get("task"));
    if (Number.isInteger(id) && id > 0) setOpenTask(id);
  }, [search]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const findColumn = useCallback(
    (id: number | string): string | null => {
      if (typeof id === "string" && id.startsWith("col-")) return id.slice(4);
      const num = Number(id);
      for (const c of COLUMNS) if (board[c]?.includes(num)) return c;
      return null;
    },
    [board],
  );

  function onDragStart(e: DragStartEvent) {
    draggingRef.current = true;
    setActiveId(Number(e.active.id));
  }

  // Mover entre columnas en caliente (feedback visual inmediato).
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(active.id);
    const to = findColumn(over.id);
    if (!from || !to || from === to) return;
    setBoard((b) => {
      const activeNum = Number(active.id);
      const fromIds = b[from].filter((x) => x !== activeNum);
      const toIds = [...b[to]];
      const overIdx = toIds.indexOf(Number(over.id));
      toIds.splice(overIdx >= 0 ? overIdx : toIds.length, 0, activeNum);
      return { ...b, [from]: fromIds, [to]: toIds };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    draggingRef.current = false;
    if (!over) return;
    const activeNum = Number(active.id);
    const column = findColumn(active.id);
    if (!column) return;

    let orderedIds = board[column];
    const overNum = Number(over.id);
    if (!Number.isNaN(overNum) && overNum !== activeNum && board[column].includes(overNum)) {
      const oldIdx = board[column].indexOf(activeNum);
      const newIdx = board[column].indexOf(overNum);
      orderedIds = arrayMove(board[column], oldIdx, newIdx);
      setBoard((b) => ({ ...b, [column]: orderedIds }));
    }
    // Persistir columna + orden final; el servidor emite la notificación de movimiento.
    try {
      await apiSend(`/api/prospect/tasks/${activeNum}`, "PATCH", { column, orderedIds });
    } finally {
      load();
    }
  }

  const activeTask = activeId != null ? tasksById.get(activeId) : null;
  const total = tasksById.size;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.tasks.title}</h1>
          <p className="text-sm text-[var(--ink-mute)]">{t.tasks.subtitle}</p>
        </div>
        <button onClick={() => setCreateIn("backlog")}
          className="cursor-pointer rounded-xl bg-[var(--violet)] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[var(--violet)]/25 transition-opacity hover:opacity-90">
          + {t.tasks.newTask}
        </button>
      </div>

      {total === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-[var(--peri)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="6" height="14" rx="1.5" /><rect x="11" y="5" width="6" height="9" rx="1.5" /><path d="M19 5h2v14h-2" /></svg>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">{t.tasks.empty}</p>
          <p className="mt-1 text-xs text-[var(--ink-mute)]">{t.tasks.emptySub}</p>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column key={col} id={col} label={t.tasks.colLabels[col] ?? col} count={board[col]?.length ?? 0} onAdd={() => setCreateIn(col)}>
              <SortableContext items={board[col] ?? []} strategy={verticalListSortingStrategy}>
                <div className="min-h-[60px] space-y-2">
                  {(board[col] ?? []).map((id) => {
                    const task = tasksById.get(id);
                    return task ? <TaskCard key={id} task={task} t={t} onOpen={() => setOpenTask(id)} /> : null;
                  })}
                </div>
              </SortableContext>
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
          {activeTask && (
            <div className="rotate-3 scale-105">
              <TaskCardBody task={activeTask} t={t} overlay />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>
        {createIn && (
          <CreateTaskModal column={createIn} users={users} t={t} reduceMotion={!!reduceMotion}
            onClose={() => setCreateIn(null)}
            onCreated={() => { setCreateIn(null); load(); }} />
        )}
        {openTask != null && (
          <TaskModal key={openTask} taskId={openTask} users={users} goals={goals} me={me} t={t} reduceMotion={!!reduceMotion}
            highlightComment={Number(search.get("comment")) || null}
            onClose={() => { setOpenTask(null); window.history.replaceState(null, "", "/prospect/tareas"); }}
            onChanged={load} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Columna droppable ── */
function Column({ id, label, count, onAdd, children }: { id: string; label: string; count: number; onAdd: () => void; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${id}` });
  return (
    <div ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-2xl border p-3 transition-colors ${isOver ? "border-[var(--peri)]/50 bg-[var(--peri)]/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-soft)]">{label}</span>
        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--ink-mute)]">{count}</span>
        <button onClick={onAdd} aria-label={`+ ${label}`}
          className="ml-auto grid h-6 w-6 cursor-pointer place-items-center rounded-md text-[var(--ink-mute)] transition-colors hover:bg-white/10 hover:text-white">+</button>
      </div>
      {children}
    </div>
  );
}

/* ── Card (sortable wrapper + cuerpo reutilizable para el overlay) ── */
function TaskCard({ task, t, onOpen }: { task: Task; t: Messages; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onOpen}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}>
      <TaskCardBody task={task} t={t} />
    </div>
  );
}

function TaskCardBody({ task, t, overlay = false }: { task: Task; t: Messages; overlay?: boolean }) {
  const due = dueBadge(task, t);
  const pr = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.media;
  return (
    <div className={`rounded-xl border border-white/10 bg-[#12101f] p-3 transition-shadow hover:border-white/20 ${overlay ? "shadow-2xl shadow-black/60" : ""}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${pr.dot}`} title={t.tasks.pLabels[task.priority] ?? task.priority} />
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-white">{task.title}</p>
        {task.assignedTo && <Avatar user={task.assignedTo} size={22} />}
      </div>
      {(task.labels?.length || due || task.commentsCount > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {due && <span className={`rounded border px-1.5 py-0.5 text-[9px] font-medium ${due.cls}`}>{due.label}</span>}
          {task.labels?.slice(0, 3).map((l) => (
            <span key={l} className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] text-[var(--ink-soft)]">{l}</span>
          ))}
          {task.commentsCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--ink-mute)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {task.commentsCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modal de creación ── */
function CreateTaskModal({ column, users, t, reduceMotion, onClose, onCreated }: {
  column: string; users: string[]; t: Messages; reduceMotion: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("media");
  const [dueDate, setDueDate] = useState("");
  const [labels, setLabels] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) { setErr(t.tasks.titleRequired); return; }
    setBusy(true);
    try {
      await apiSend("/api/prospect/tasks", "POST", {
        title: title.trim(),
        description: description.trim() || null,
        assignedTo: assignedTo || null,
        column,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        labels: labels.trim() ? labels.split(",").map((s) => s.trim()).filter(Boolean) : null,
      });
      onCreated();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} reduceMotion={reduceMotion} label={t.tasks.newTask}>
      <div className="space-y-3 p-5">
        <h2 className="text-base font-semibold text-white">{t.tasks.newTask} · <span className="text-[var(--ink-mute)]">{t.tasks.colLabels[column] ?? column}</span></h2>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.tasks.fTitle}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t.tasks.fDesc}
          className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none" />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.tasks.fAssignee}
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white">
              <option value="" className="bg-[#111]">{t.tasks.unassigned}</option>
              {users.map((u) => <option key={u} value={u} className="bg-[#111]">{u}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.tasks.fPriority}
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white">
              {Object.entries(t.tasks.pLabels).map(([v, l]) => <option key={v} value={v} className="bg-[#111]">{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.tasks.fDue}
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white [color-scheme:dark]" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.tasks.fLabels}
            <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="diseño, urgente-cliente" className="rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm text-white placeholder:text-[var(--ink-mute)]" />
          </label>
        </div>
        {err && <p className="text-xs text-amber-300">⚠ {err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="cursor-pointer rounded-lg px-3 py-2 text-xs text-[var(--ink-soft)] hover:text-white">✕</button>
          <button onClick={create} disabled={busy}
            className="cursor-pointer rounded-lg bg-[var(--violet)] px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50">
            {t.tasks.create}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Modal de detalle (6.4): edición inline + hilo de comentarios ── */
function TaskModal({ taskId, users, goals, me, t, reduceMotion, highlightComment, onClose, onChanged }: {
  taskId: number; users: string[]; goals: GoalOption[]; me: string; t: Messages; reduceMotion: boolean;
  highlightComment: number | null; onClose: () => void; onChanged: () => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try { setTask((await apiGet<{ task: TaskDetail }>(`/api/prospect/tasks/${taskId}`)).task); } catch { onClose(); }
  }, [taskId, onClose]);
  useEffect(() => { load(); }, [load]);

  // Scroll + highlight del comentario referenciado en la notificación (3.4/6.5).
  useEffect(() => {
    if (!task || !highlightComment) return;
    const el = document.getElementById(`comment-${highlightComment}`);
    if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }, [task, highlightComment, reduceMotion]);

  async function patch(field: string, value: unknown) {
    await apiSend(`/api/prospect/tasks/${taskId}`, "PATCH", { [field]: value });
    load();
    onChanged();
  }

  async function send() {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await apiSend(`/api/prospect/tasks/${taskId}/comments`, "POST", { body: comment.trim() });
      setComment("");
      await load();
      onChanged();
      requestAnimationFrame(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" }));
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (!confirm(t.tasks.confirmDelete)) return;
    await apiSend(`/api/prospect/tasks/${taskId}`, "DELETE");
    onChanged();
    onClose();
  }

  if (!task) return null;

  return (
    <ModalShell onClose={onClose} reduceMotion={reduceMotion} label={task.title} wide>
      <div className="flex max-h-[85vh] flex-col">
        {/* Cabecera editable */}
        <div className="space-y-3 border-b border-white/5 p-5">
          <div className="flex items-start gap-3">
            <input
              defaultValue={task.title}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) patch("title", v); }}
              className="w-full rounded-lg border border-transparent bg-transparent text-lg font-semibold text-white focus:border-[var(--peri)]/40 focus:bg-white/[0.03] focus:outline-none"
            />
            <button onClick={remove} title={t.tasks.del}
              className="cursor-pointer rounded-lg border border-white/10 p-2 text-[var(--ink-mute)] transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </button>
            <button onClick={onClose} className="cursor-pointer rounded-lg p-2 text-[var(--ink-mute)] hover:text-white">✕</button>
          </div>
          <p className="text-[11px] text-[var(--ink-mute)]">{t.tasks.createdBy(task.createdBy)} · {new Date(task.createdAt).toLocaleDateString()}</p>
          <textarea
            defaultValue={task.description ?? ""}
            placeholder={t.tasks.fDesc}
            rows={2}
            onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== task.description) patch("description", v); }}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-[var(--ink-soft)] placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
              {t.tasks.fAssignee}
              <select value={task.assignedTo ?? ""} onChange={(e) => patch("assignedTo", e.target.value || null)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
                <option value="" className="bg-[#111]">{t.tasks.unassigned}</option>
                {users.map((u) => <option key={u} value={u} className="bg-[#111]">{u}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
              {t.tasks.fPriority}
              <select value={task.priority} onChange={(e) => patch("priority", e.target.value)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
                {Object.entries(t.tasks.pLabels).map(([v, l]) => <option key={v} value={v} className="bg-[#111]">{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
              {t.tasks.fDue}
              <input type="date" value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => patch("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white [color-scheme:dark]" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
              {t.tasks.fGoal}
              <select value={task.goalId ?? ""} onChange={(e) => patch("goalId", e.target.value ? Number(e.target.value) : null)}
                className="max-w-[180px] rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
                <option value="" className="bg-[#111]">{t.tasks.noGoal}</option>
                {goals.map((g) => <option key={g.id} value={g.id} className="bg-[#111]">{g.title}</option>)}
              </select>
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-[var(--ink-mute)]">
              {t.tasks.fLabels}
              <input defaultValue={(task.labels ?? []).join(", ")}
                onBlur={(e) => patch("labels", e.target.value.trim() ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null)}
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white" />
            </label>
          </div>
        </div>

        {/* Hilo de comentarios estilo chat */}
        <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--ink-mute)]">{t.tasks.comments}</span>
          {task.comments.length === 0 && <p className="py-4 text-center text-xs text-[var(--ink-mute)]">{t.tasks.noComments}</p>}
          {task.comments.map((c) => {
            const own = c.author === me;
            const highlighted = c.id === highlightComment;
            return (
              <motion.div
                key={c.id}
                id={`comment-${c.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={highlighted
                  ? { opacity: 1, y: 0, backgroundColor: ["rgba(122,110,228,0.25)", "rgba(122,110,228,0)"] }
                  : { opacity: 1, y: 0 }}
                transition={highlighted ? { duration: 2, ease: "easeOut" } : { duration: 0.18 }}
                className={`flex gap-2.5 rounded-xl p-1 ${own ? "flex-row-reverse" : ""}`}
              >
                <Avatar user={c.author} size={26} />
                <div className={`max-w-[75%] rounded-2xl border px-3 py-2 ${own ? "rounded-tr-sm border-[var(--peri)]/25 bg-[var(--peri)]/10" : "rounded-tl-sm border-white/10 bg-white/[0.04]"}`}>
                  <div className="mb-0.5 flex items-baseline gap-2 text-[10px] text-[var(--ink-mute)]">
                    <b className="text-[var(--ink-soft)]">{c.author}</b>
                    {new Date(c.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-white">{c.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Input de comentario */}
        <div className="flex gap-2 border-t border-white/5 p-4">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t.tasks.commentPlaceholder}
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-[var(--ink-mute)] focus:border-[var(--peri)]/40 focus:outline-none"
          />
          <button onClick={send} disabled={sending || !comment.trim()}
            className="cursor-pointer rounded-xl bg-[var(--violet)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40">
            {t.tasks.send}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Shell de modal con animación y scrim ── */
function ModalShell({ children, onClose, reduceMotion, label, wide = false }: {
  children: React.ReactNode; onClose: () => void; reduceMotion: boolean; label: string; wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label={label}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b1e]/95 shadow-2xl shadow-black/60 backdrop-blur-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
