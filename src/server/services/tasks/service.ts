/**
 * Kanban de tareas (Fase 6) + emisión de notificaciones (6.5):
 *  - asignar → notifica al asignado
 *  - comentar → notifica al resto (deep-link con commentId para highlight)
 *  - mover de columna → notifica al creador (si no fue él quien movió)
 */
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { tasks, taskComments, TASK_COLUMNS, type TaskColumn } from "@/server/db/schema";
import { notify, notifyOthers } from "@/server/services/notifications/service";

const COLUMN_LABEL: Record<string, string> = {
  backlog: "Backlog",
  en_progreso: "En progreso",
  en_revision: "En revisión",
  hecho: "Hecho",
};

export async function listTasks() {
  const [rows, counts] = await Promise.all([
    db.select().from(tasks).orderBy(asc(tasks.column), asc(tasks.sortOrder), desc(tasks.id)),
    db
      .select({ taskId: taskComments.taskId, n: sql<number>`count(*)` })
      .from(taskComments)
      .groupBy(taskComments.taskId),
  ]);
  const byTask = new Map(counts.map((c) => [c.taskId, Number(c.n)]));
  return rows.map((r) => ({ ...r, commentsCount: byTask.get(r.id) ?? 0 }));
}

export async function getTask(id: number) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) return null;
  const comments = await db.select().from(taskComments).where(eq(taskComments.taskId, id)).orderBy(asc(taskComments.createdAt));
  return { ...task, comments };
}

export type CreateTaskInput = {
  title: string;
  description?: string | null;
  assignedTo?: string | null;
  column?: TaskColumn;
  priority?: string;
  dueDate?: string | null;
  labels?: string[] | null;
  goalId?: number | null;
  createdBy: string;
};

export async function createTask(input: CreateTaskInput) {
  const column = input.column && (TASK_COLUMNS as readonly string[]).includes(input.column) ? input.column : "backlog";
  // Al final de su columna.
  const [{ max }] = await db
    .select({ max: sql<number>`coalesce(max(${tasks.sortOrder}), -1)` })
    .from(tasks)
    .where(eq(tasks.column, column));
  const [row] = await db
    .insert(tasks)
    .values({
      title: input.title,
      description: input.description ?? null,
      assignedTo: input.assignedTo ?? null,
      createdBy: input.createdBy,
      column,
      sortOrder: Number(max) + 1,
      priority: input.priority ?? "media",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      labels: input.labels ?? null,
      goalId: input.goalId ?? null,
    })
    .returning();

  if (row.assignedTo && row.assignedTo !== input.createdBy) {
    await notify({
      userTo: row.assignedTo,
      actor: input.createdBy,
      type: "task_assigned",
      title: `Te asignaron: ${row.title.slice(0, 80)}`,
      body: row.description?.slice(0, 140) ?? null,
      entityType: "task",
      entityId: row.id,
    });
  }
  return row;
}

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  assignedTo?: string | null;
  priority?: string;
  dueDate?: string | null;
  labels?: string[] | null;
  goalId?: number | null;
  column?: TaskColumn;
  /** Orden final (ids) de la columna destino tras un drop. */
  orderedIds?: number[];
  actor: string;
};

export async function updateTask(id: number, input: UpdateTaskInput) {
  const [before] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!before) throw new Error("Tarea no existe");

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.assignedTo !== undefined) set.assignedTo = input.assignedTo;
  if (input.priority !== undefined) set.priority = input.priority;
  if (input.dueDate !== undefined) set.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  if (input.labels !== undefined) set.labels = input.labels;
  if (input.goalId !== undefined) set.goalId = input.goalId;
  if (input.column !== undefined) set.column = input.column;

  const [row] = await db.update(tasks).set(set).where(eq(tasks.id, id)).returning();

  // Reordenar la columna destino: sortOrder = índice en orderedIds.
  if (input.orderedIds?.length) {
    await Promise.all(
      input.orderedIds.map((taskId, i) => db.update(tasks).set({ sortOrder: i }).where(eq(tasks.id, taskId))),
    );
  }

  // 6.5 — notificaciones por cambios relevantes.
  if (input.assignedTo !== undefined && input.assignedTo && input.assignedTo !== before.assignedTo && input.assignedTo !== input.actor) {
    await notify({
      userTo: input.assignedTo,
      actor: input.actor,
      type: "task_assigned",
      title: `Te asignaron: ${row.title.slice(0, 80)}`,
      body: row.description?.slice(0, 140) ?? null,
      entityType: "task",
      entityId: row.id,
    });
  }
  if (input.column !== undefined && input.column !== before.column && before.createdBy !== input.actor) {
    await notify({
      userTo: before.createdBy,
      actor: input.actor,
      type: "task_moved",
      title: `"${row.title.slice(0, 60)}" → ${COLUMN_LABEL[row.column] ?? row.column}`,
      body: null,
      entityType: "task",
      entityId: row.id,
    });
  }
  return row;
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function addComment(taskId: number, author: string, body: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw new Error("Tarea no existe");
  const [comment] = await db.insert(taskComments).values({ taskId, author, body }).returning();
  await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId));

  // Notificar al otro usuario con deep-link al comentario (highlight en el modal).
  await notifyOthers(author, {
    type: "task_comment",
    title: `Comentario en: ${task.title.slice(0, 70)}`,
    body: body.slice(0, 140),
    entityType: "task",
    entityId: taskId,
    meta: { commentId: comment.id },
  });
  return comment;
}
