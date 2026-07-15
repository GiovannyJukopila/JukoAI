"use client";
/**
 * Tareas — Kanban premium "dark glassmorphism" (rediseño Fase 6+).
 *
 * Sistema visual de la sección (scoped, clases tk-*):
 *  - Acento: gradiente violeta→cian #8B5CF6 → #22D3EE, solo en estados
 *    activos/hover/CTA — nunca saturando.
 *  - Superficies: bg blanco 3–5% + backdrop-blur, bordes 1px blanco 8–12%;
 *    borde con gradiente translúcido en hover (técnica padding-box/border-box).
 *  - Iconos SVG inline estilo Lucide, stroke 1.5, un icono semántico por columna.
 *  - Micro-interacciones 150–250ms cubic-bezier(0.4,0,0.2,1); stagger de
 *    entrada, pulso al soltar, rotación 2.5° al arrastrar, placeholder punteado.
 *  - Jerarquía tipográfica estricta: 24px (título) / 14px (contenido) / 11px (meta).
 *  - Respeta prefers-reduced-motion en todas las animaciones.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
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

/* ── Sistema de color de la sección ─────────────────────────────────────── */
const EASE = [0.4, 0, 0.2, 1] as const;

/** Color semántico + icono Lucide-style (stroke 1.5) por columna. */
const COLUMN_META: Record<string, { color: string; icon: React.ReactNode }> = {
  backlog: {
    color: "#94A3B8", // gris azulado
    icon: ( // capas
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m12 2 8.5 4.5L12 11 3.5 6.5 12 2z" /><path d="m3.5 11.5 8.5 4.5 8.5-4.5" /><path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
      </svg>
    ),
  },
  en_progreso: {
    color: "#22D3EE", // cian
    icon: ( // rayo
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
      </svg>
    ),
  },
  en_revision: {
    color: "#F59E0B", // ámbar
    icon: ( // lupa con check
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="m8.5 11 1.8 1.8 3.2-3.6" /><path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  hecho: {
    color: "#34D399", // esmeralda
    icon: ( // check circular
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="m8.5 12.2 2.4 2.4 4.8-5.2" />
      </svg>
    ),
  },
};

/** Progreso visual de la card según su columna (barra fina con gradiente). */
const COLUMN_PROGRESS: Record<string, number> = { backlog: 8, en_progreso: 45, en_revision: 75, hecho: 100 };

const PRIORITY_META: Record<string, { color: string }> = {
  baja: { color: "#38BDF8" },
  media: { color: "#94A3B8" },
  alta: { color: "#F59E0B" },
  urgente: { color: "#FB7185" },
};

const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

function Avatar({ user, size = 24 }: { user: string; size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] font-bold text-white ring-1 ring-white/20"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      title={user}
    >
      {user.slice(0, 1).toUpperCase()}
    </span>
  );
}

function dueBadge(task: Task, t: Messages): { label: string; color: string } | null {
  if (!task.dueDate) return null;
  const d = new Date(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round((dd.getTime() - today.getTime()) / 86400000);
  const label = d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (task.column !== "hecho" && days < 0) return { label: `${t.tasks.overdue} · ${label}`, color: "#FB7185" };
  if (days === 0) return { label: `${t.tasks.dueToday} · ${label}`, color: "#F59E0B" };
  return { label, color: "#94A3B8" };
}

/* ═══════════════════════════ Página ═══════════════════════════ */

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
  const [droppedId, setDroppedId] = useState<number | null>(null); // pulso post-drop
  const [openTask, setOpenTask] = useState<number | null>(null);
  const [createIn, setCreateIn] = useState<string | null>(null);
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
    // Feedback de drop: pulso sutil en la card recién soltada.
    setDroppedId(activeNum);
    setTimeout(() => setDroppedId((v) => (v === activeNum ? null : v)), 500);
    try {
      await apiSend(`/api/prospect/tasks/${activeNum}`, "PATCH", { column, orderedIds });
    } finally {
      load();
    }
  }

  const activeTask = activeId != null ? tasksById.get(activeId) : null;
  const total = tasksById.size;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-white">{t.tasks.title}</h1>
          <p className="mt-1 text-sm text-[#9CA3AF]">{t.tasks.subtitle}</p>
        </div>
        <button onClick={() => setCreateIn("backlog")} className="tk-cta inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
          <PlusIcon /> {t.tasks.newTask}
        </button>
      </div>

      {/* ── Estado vacío global ── */}
      {total === 0 && (
        <div className="tk-glass rounded-2xl p-14 text-center">
          <svg width="120" height="72" viewBox="0 0 120 72" fill="none" aria-hidden="true" className="mx-auto mb-4 opacity-80">
            <rect x="8" y="18" width="30" height="40" rx="6" stroke="#94A3B8" strokeOpacity=".35" strokeWidth="1.5" />
            <rect x="45" y="10" width="30" height="48" rx="6" stroke="#8B5CF6" strokeOpacity=".6" strokeWidth="1.5" />
            <rect x="82" y="18" width="30" height="40" rx="6" stroke="#94A3B8" strokeOpacity=".35" strokeWidth="1.5" />
            <path d="M51 24h18M51 31h12" stroke="#8B5CF6" strokeOpacity=".5" strokeWidth="1.5" strokeLinecap="round" />
            <path d="m97 62 1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2 1.2-3z" fill="#22D3EE" fillOpacity=".7" />
          </svg>
          <p className="text-sm font-medium text-white">{t.tasks.empty}</p>
          <p className="mt-1 text-sm text-[#9CA3AF]">{t.tasks.emptySub}</p>
        </div>
      )}

      {/* ── Board ── */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column key={col} id={col} label={t.tasks.colLabels[col] ?? col} count={board[col]?.length ?? 0} onAdd={() => setCreateIn(col)} addLabel={t.tasks.newTask}>
              <SortableContext items={board[col] ?? []} strategy={verticalListSortingStrategy}>
                <div className="tk-scroll max-h-[calc(100dvh-330px)] min-h-[64px] space-y-2 overflow-y-auto pb-1 pr-0.5">
                  {(board[col] ?? []).map((id, i) => {
                    const task = tasksById.get(id);
                    return task ? (
                      <TaskCard key={id} task={task} index={i} t={t} reduceMotion={!!reduceMotion} justDropped={droppedId === id} onOpen={() => setOpenTask(id)} />
                    ) : null;
                  })}
                </div>
              </SortableContext>
            </Column>
          ))}
        </div>
        <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
          {activeTask && (
            <div className="rotate-[2.5deg]">
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

      {/* ── Estilos scoped de la sección (glass, CTA, scrollbars) ── */}
      <style jsx global>{`
        .tk-glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .tk-cta {
          background: linear-gradient(135deg, #8b5cf6, #22d3ee);
          transition: transform 150ms ease-out, box-shadow 150ms ease-out;
        }
        .tk-cta:hover {
          transform: scale(1.02);
          box-shadow: 0 0 24px rgba(139, 92, 246, 0.3), 0 0 48px rgba(34, 211, 238, 0.12);
        }
        .tk-cta:active { transform: scale(0.99); }
        .tk-card {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(rgba(18, 16, 31, 0.9), rgba(18, 16, 31, 0.9)) padding-box;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tk-card:hover {
          transform: translateY(-2px);
          border-color: transparent;
          background:
            linear-gradient(rgba(20, 18, 34, 0.96), rgba(20, 18, 34, 0.96)) padding-box,
            linear-gradient(135deg, rgba(139, 92, 246, 0.55), rgba(34, 211, 238, 0.45)) border-box;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 20px rgba(139, 92, 246, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.07);
        }
        .tk-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .tk-scroll::-webkit-scrollbar-track { background: transparent; }
        .tk-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); border-radius: 9999px; }
        .tk-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.45); }
        .tk-scroll { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.12) transparent; }
        @media (prefers-reduced-motion: reduce) {
          .tk-cta, .tk-card { transition: none; }
          .tk-cta:hover, .tk-card:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}

/* ── Columna droppable ── */
function Column({ id, label, count, onAdd, addLabel, children }: {
  id: string; label: string; count: number; onAdd: () => void; addLabel: string; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${id}` });
  const meta = COLUMN_META[id] ?? COLUMN_META.backlog;
  return (
    <div ref={setNodeRef}
      className={`tk-glass group/col relative flex flex-col gap-2.5 overflow-hidden rounded-2xl p-3 transition-colors duration-200 ${isOver ? "bg-white/[0.05]" : ""}`}
      style={isOver ? { borderColor: `${meta.color}55` } : undefined}
    >
      {/* Barra superior semántica de 2px */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${meta.color}cc, transparent 70%)` }} />

      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg" style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}>
          {meta.icon}
        </span>
        <span className="text-sm font-semibold tracking-wide text-white">{label}</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#9CA3AF]">{count}</span>
        {/* Botón + fantasma: se revela en hover de la columna (visible tenue en táctil) */}
        <button onClick={onAdd} aria-label={`${addLabel} · ${label}`}
          className="ml-auto grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-[#9CA3AF] opacity-40 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/10 hover:text-white group-hover/col:opacity-100">
          <PlusIcon />
        </button>
      </div>
      {children}
    </div>
  );
}

/* ── Card (sortable wrapper + cuerpo memoizado para el overlay) ── */
function TaskCard({ task, index, t, reduceMotion, justDropped, onOpen }: {
  task: Task; index: number; t: Messages; reduceMotion: boolean; justDropped: boolean; onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <motion.div
      ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={
        justDropped && !reduceMotion
          ? { opacity: 1, y: 0, scale: [1, 1.025, 1] } // pulso sutil al soltar
          : { opacity: 1, y: 0, scale: 1 }
      }
      transition={{ duration: justDropped ? 0.4 : 0.25, ease: EASE, delay: justDropped ? 0 : Math.min(index * 0.04, 0.35) }}
      onClick={onOpen}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "tk-placeholder" : ""}`}
    >
      {/* Placeholder punteado en la posición destino mientras se arrastra */}
      {isDragging ? (
        <div className="rounded-[14px] border-2 border-dashed border-[#8B5CF6]/35 bg-[#8B5CF6]/[0.05]" style={{ height: 76 }} aria-hidden="true" />
      ) : (
        <TaskCardBody task={task} t={t} />
      )}
    </motion.div>
  );
}

const TaskCardBody = memo(function TaskCardBody({ task, t, overlay = false }: { task: Task; t: Messages; overlay?: boolean }) {
  const due = dueBadge(task, t);
  const pr = PRIORITY_META[task.priority] ?? PRIORITY_META.media;
  const progress = COLUMN_PROGRESS[task.column] ?? 0;
  return (
    <div className={`tk-card rounded-[14px] p-3 ${overlay ? "shadow-2xl !shadow-black/60" : ""}`}
      style={overlay ? { boxShadow: "0 24px 48px rgba(0,0,0,.55), 0 0 32px rgba(139,92,246,.2)" } : undefined}>
      <div className="flex items-start gap-2.5">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-white">{task.title}</p>
        {task.assignedTo && <Avatar user={task.assignedTo} size={22} />}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {/* Prioridad tipo pill con color tenue */}
        <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
          style={{ backgroundColor: `${pr.color}14`, borderColor: `${pr.color}33`, color: pr.color }}>
          {t.tasks.pLabels[task.priority] ?? task.priority}
        </span>
        {due && (
          <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: `${due.color}14`, borderColor: `${due.color}33`, color: due.color }}>
            {due.label}
          </span>
        )}
        {task.labels?.slice(0, 2).map((l) => (
          <span key={l} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-[#9CA3AF]">{l}</span>
        ))}
        {task.commentsCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] tabular-nums text-[#9CA3AF]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {task.commentsCount}
          </span>
        )}
      </div>

      {/* Barra de progreso fina según columna */}
      <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: `${progress}%`,
            background: task.column === "hecho" ? "#34D399" : "linear-gradient(90deg, #8B5CF6, #22D3EE)",
          }}
        />
      </div>
    </div>
  );
});

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

  const meta = COLUMN_META[column] ?? COLUMN_META.backlog;
  return (
    <ModalShell onClose={onClose} reduceMotion={reduceMotion} label={t.tasks.newTask}>
      <div className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          {t.tasks.newTask}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium" style={{ color: meta.color }}>
            {meta.icon} {t.tasks.colLabels[column] ?? column}
          </span>
        </h2>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.tasks.fTitle}
          onKeyDown={(e) => { if (e.key === "Enter") create(); }}
          className="tk-input w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#9CA3AF]/60" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder={t.tasks.fDesc}
          className="tk-input w-full resize-y rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#9CA3AF]/60" />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
            {t.tasks.fAssignee}
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="tk-input rounded-lg px-2 py-2 text-sm text-white">
              <option value="" className="bg-[#111]">{t.tasks.unassigned}</option>
              {users.map((u) => <option key={u} value={u} className="bg-[#111]">{u}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
            {t.tasks.fPriority}
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="tk-input rounded-lg px-2 py-2 text-sm text-white">
              {Object.entries(t.tasks.pLabels).map(([v, l]) => <option key={v} value={v} className="bg-[#111]">{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
            {t.tasks.fDue}
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="tk-input rounded-lg px-2 py-2 text-sm text-white [color-scheme:dark]" />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
            {t.tasks.fLabels}
            <input value={labels} onChange={(e) => setLabels(e.target.value)} placeholder="diseño, cliente" className="tk-input rounded-lg px-2 py-2 text-sm text-white placeholder:text-[#9CA3AF]/60" />
          </label>
        </div>
        {err && <p role="alert" className="text-[11px] font-medium text-[#F59E0B]">⚠ {err}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#9CA3AF] transition-colors duration-150 hover:text-white">✕</button>
          <button onClick={create} disabled={busy}
            className="tk-cta cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {t.tasks.create}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Modal de detalle: edición inline + hilo de comentarios ── */
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

  // Scroll + highlight del comentario referenciado en la notificación.
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
        <div className="space-y-3 border-b border-white/[0.06] p-5">
          <div className="flex items-start gap-3">
            <input
              defaultValue={task.title}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) patch("title", v); }}
              className="w-full rounded-lg border border-transparent bg-transparent text-sm font-semibold text-white transition-colors duration-150 focus:border-[#8B5CF6]/40 focus:bg-white/[0.03] focus:outline-none"
              style={{ fontSize: 16 }}
            />
            <button onClick={remove} title={t.tasks.del}
              className="cursor-pointer rounded-lg border border-white/10 p-2 text-[#9CA3AF] transition-colors duration-150 hover:border-[#FB7185]/40 hover:bg-[#FB7185]/10 hover:text-[#FB7185]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
            </button>
            <button onClick={onClose} aria-label="Cerrar" className="cursor-pointer rounded-lg p-2 text-[#9CA3AF] transition-colors duration-150 hover:text-white">✕</button>
          </div>
          <p className="text-[11px] text-[#9CA3AF]">{t.tasks.createdBy(task.createdBy)} · {new Date(task.createdAt).toLocaleDateString()}</p>
          <textarea
            defaultValue={task.description ?? ""}
            placeholder={t.tasks.fDesc}
            rows={2}
            onBlur={(e) => { const v = e.target.value.trim() || null; if (v !== task.description) patch("description", v); }}
            className="tk-input w-full resize-y rounded-xl px-3 py-2 text-sm text-[#D1D5DB] placeholder:text-[#9CA3AF]/60"
          />
          <div className="flex flex-wrap gap-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
              {t.tasks.fAssignee}
              <select value={task.assignedTo ?? ""} onChange={(e) => patch("assignedTo", e.target.value || null)} className="tk-input rounded-lg px-2 py-1.5 text-sm text-white">
                <option value="" className="bg-[#111]">{t.tasks.unassigned}</option>
                {users.map((u) => <option key={u} value={u} className="bg-[#111]">{u}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
              {t.tasks.fPriority}
              <select value={task.priority} onChange={(e) => patch("priority", e.target.value)} className="tk-input rounded-lg px-2 py-1.5 text-sm text-white">
                {Object.entries(t.tasks.pLabels).map(([v, l]) => <option key={v} value={v} className="bg-[#111]">{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
              {t.tasks.fDue}
              <input type="date" value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                onChange={(e) => patch("dueDate", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="tk-input rounded-lg px-2 py-1.5 text-sm text-white [color-scheme:dark]" />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
              {t.tasks.fGoal}
              <select value={task.goalId ?? ""} onChange={(e) => patch("goalId", e.target.value ? Number(e.target.value) : null)}
                className="tk-input max-w-[180px] rounded-lg px-2 py-1.5 text-sm text-white">
                <option value="" className="bg-[#111]">{t.tasks.noGoal}</option>
                {goals.map((g) => <option key={g.id} value={g.id} className="bg-[#111]">{g.title}</option>)}
              </select>
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[11px] font-medium text-[#9CA3AF]">
              {t.tasks.fLabels}
              <input defaultValue={(task.labels ?? []).join(", ")}
                onBlur={(e) => patch("labels", e.target.value.trim() ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean) : null)}
                className="tk-input rounded-lg px-2 py-1.5 text-sm text-white" />
            </label>
          </div>
        </div>

        {/* Hilo de comentarios estilo chat */}
        <div ref={threadRef} className="tk-scroll flex-1 space-y-3 overflow-y-auto p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">{t.tasks.comments}</span>
          {task.comments.length === 0 && <p className="py-4 text-center text-[11px] text-[#9CA3AF]">{t.tasks.noComments}</p>}
          {task.comments.map((c) => {
            const own = c.author === me;
            const highlighted = c.id === highlightComment;
            return (
              <motion.div
                key={c.id}
                id={`comment-${c.id}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={highlighted
                  ? { opacity: 1, y: 0, backgroundColor: ["rgba(139,92,246,0.22)", "rgba(139,92,246,0)"] }
                  : { opacity: 1, y: 0 }}
                transition={highlighted ? { duration: 2, ease: "easeOut" } : { duration: 0.2, ease: EASE }}
                className={`flex gap-2.5 rounded-xl p-1 ${own ? "flex-row-reverse" : ""}`}
              >
                <Avatar user={c.author} size={26} />
                <div className={`max-w-[75%] rounded-2xl border px-3 py-2 ${own ? "rounded-tr-sm border-[#8B5CF6]/25 bg-[#8B5CF6]/10" : "rounded-tl-sm border-white/[0.08] bg-white/[0.04]"}`}>
                  <div className="mb-0.5 flex items-baseline gap-2 text-[11px] text-[#9CA3AF]">
                    <b className="text-[#D1D5DB]">{c.author}</b>
                    {new Date(c.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{c.body}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Input de comentario */}
        <div className="flex gap-2 border-t border-white/[0.06] p-4">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t.tasks.commentPlaceholder}
            className="tk-input flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#9CA3AF]/60"
          />
          <button onClick={send} disabled={sending || !comment.trim()}
            className="tk-cta cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            {t.tasks.send}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── Shell de modal glass con scrim ── */
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
        transition={{ duration: 0.22, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d0b1e]/95 shadow-2xl shadow-black/60 backdrop-blur-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        {children}
      </motion.div>
      <style jsx global>{`
        .tk-input {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.03);
          transition: border-color 150ms ease-out, background 150ms ease-out;
        }
        .tk-input:focus, .tk-input:focus-visible {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </motion.div>
  );
}
