/**
 * Notification center (Fase 3). Storage + emission helpers.
 *
 * Emitters (task assigned/commented/moved, goal updated) call `notify` /
 * `notifyOthers` from their own services; the UI polls the list endpoint.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { notifications, type NotificationType } from "@/server/db/schema";
import { allUsers } from "@/server/auth/current-user";

export type NotifyInput = {
  userTo: string;
  actor?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  meta?: Record<string, unknown> | null;
};

export async function notify(input: NotifyInput) {
  const [row] = await db
    .insert(notifications)
    .values({
      userTo: input.userTo,
      actor: input.actor ?? null,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      meta: input.meta ?? null,
    })
    .returning();
  return row;
}

/** Notify every configured user except the actor (the standard 2-user case). */
export async function notifyOthers(actor: string, input: Omit<NotifyInput, "userTo" | "actor">) {
  const targets = allUsers().filter((u) => u !== actor);
  return Promise.all(targets.map((userTo) => notify({ ...input, userTo, actor })));
}

export async function listNotifications(user: string, limit = 30) {
  const [rows, [unread]] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userTo, user))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit),
    db
      .select({ n: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userTo, user), eq(notifications.read, false))),
  ]);
  return { notifications: rows, unread: Number(unread?.n ?? 0) };
}

export async function markRead(user: string, id: number) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userTo, user)));
}

export async function markAllRead(user: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userTo, user), eq(notifications.read, false)));
}
