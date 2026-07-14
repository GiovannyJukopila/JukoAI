/**
 * Goals (Fase 7): tres horizontes con progreso derivado.
 * Prioridad del progreso efectivo (7.3): % de tareas vinculadas hechas →
 * % de milestones completados → campo manual `progress`.
 * Todo cambio emite notificación al otro usuario (7.4).
 */
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { goals, tasks, GOAL_HORIZONS, type GoalHorizon, type GoalMilestone } from "@/server/db/schema";
import { notifyOthers } from "@/server/services/notifications/service";

function effectiveProgress(g: { progress: number; milestones: GoalMilestone[] | null }, tasksTotal: number, tasksDone: number): number {
  if (tasksTotal > 0) return Math.round((tasksDone / tasksTotal) * 100);
  const ms = g.milestones ?? [];
  if (ms.length > 0) return Math.round((ms.filter((m) => m.done).length / ms.length) * 100);
  return Math.min(100, Math.max(0, g.progress));
}

export async function listGoals() {
  const [rows, taskAgg] = await Promise.all([
    db.select().from(goals).orderBy(asc(goals.targetDate), asc(goals.id)),
    db
      .select({
        goalId: tasks.goalId,
        total: sql<number>`count(*)`,
        done: sql<number>`count(*) filter (where ${tasks.column} = 'hecho')`,
      })
      .from(tasks)
      .where(sql`${tasks.goalId} is not null`)
      .groupBy(tasks.goalId),
  ]);
  const agg = new Map(taskAgg.map((a) => [a.goalId, { total: Number(a.total), done: Number(a.done) }]));
  return rows.map((g) => {
    const a = agg.get(g.id) ?? { total: 0, done: 0 };
    return { ...g, tasksTotal: a.total, tasksDone: a.done, effectiveProgress: effectiveProgress(g, a.total, a.done) };
  });
}

export type GoalInput = {
  title?: string;
  description?: string | null;
  owner?: string | null;
  horizon?: GoalHorizon;
  progress?: number;
  milestones?: GoalMilestone[] | null;
  targetDate?: string | null;
};

export async function createGoal(input: GoalInput & { title: string; createdBy: string }) {
  const horizon = input.horizon && (GOAL_HORIZONS as readonly string[]).includes(input.horizon) ? input.horizon : "corto";
  const [row] = await db
    .insert(goals)
    .values({
      title: input.title,
      description: input.description ?? null,
      owner: input.owner ?? input.createdBy,
      createdBy: input.createdBy,
      horizon,
      progress: input.progress ?? 0,
      milestones: input.milestones ?? null,
      targetDate: input.targetDate ? new Date(input.targetDate) : null,
    })
    .returning();
  await notifyOthers(input.createdBy, {
    type: "goal_update",
    title: `Nuevo goal: ${row.title.slice(0, 80)}`,
    body: row.description?.slice(0, 140) ?? null,
    entityType: "goal",
    entityId: row.id,
  });
  return row;
}

export async function updateGoal(id: number, input: GoalInput, actor: string) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = input.title;
  if (input.description !== undefined) set.description = input.description;
  if (input.owner !== undefined) set.owner = input.owner;
  if (input.horizon !== undefined) set.horizon = input.horizon;
  if (input.progress !== undefined) set.progress = Math.min(100, Math.max(0, input.progress));
  if (input.milestones !== undefined) set.milestones = input.milestones;
  if (input.targetDate !== undefined) set.targetDate = input.targetDate ? new Date(input.targetDate) : null;
  const [row] = await db.update(goals).set(set).where(eq(goals.id, id)).returning();
  if (!row) throw new Error("Goal no existe");
  await notifyOthers(actor, {
    type: "goal_update",
    title: `Goal actualizado: ${row.title.slice(0, 80)}`,
    body: null,
    entityType: "goal",
    entityId: row.id,
  });
  return row;
}

export async function deleteGoal(id: number) {
  await db.delete(goals).where(eq(goals.id, id));
}
