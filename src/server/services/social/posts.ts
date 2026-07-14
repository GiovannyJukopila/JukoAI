/**
 * Social Studio — compositor y cola de publicaciones (Fases 4.4 / 4.6 / 4.7).
 * Estados: borrador | programado | publicado | fallido.
 */
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { socialPosts } from "@/server/db/schema";
import { publishToPlatform } from "@/server/services/social/publishers";
import { notify, notifyOthers } from "@/server/services/notifications/service";

const MAX_RETRIES = 3;

export type CreatePostsInput = {
  platforms: string[]; // una fila por plataforma
  content: string;
  media?: string[] | null;
  scheduledFor?: string | null; // ISO → estado "programado"; null → "borrador"
  createdBy: string;
};

export async function createPosts(input: CreatePostsInput) {
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  const rows = await db
    .insert(socialPosts)
    .values(
      input.platforms.map((platform) => ({
        platform,
        content: input.content,
        media: input.media ?? null,
        status: scheduledFor ? "programado" : "borrador",
        scheduledFor,
        createdBy: input.createdBy,
      })),
    )
    .returning();
  return rows;
}

export async function listPosts(opts: { from?: Date; to?: Date; status?: string } = {}) {
  const conds = [];
  if (opts.status) conds.push(eq(socialPosts.status, opts.status));
  if (opts.from) conds.push(gte(socialPosts.scheduledFor, opts.from));
  if (opts.to) conds.push(lte(socialPosts.scheduledFor, opts.to));
  return db
    .select()
    .from(socialPosts)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(socialPosts.createdAt))
    .limit(200);
}

export async function updatePost(
  id: number,
  patch: { content?: string; media?: string[] | null; scheduledFor?: string | null; status?: string },
) {
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.content !== undefined) set.content = patch.content;
  if (patch.media !== undefined) set.media = patch.media;
  if (patch.scheduledFor !== undefined) {
    set.scheduledFor = patch.scheduledFor ? new Date(patch.scheduledFor) : null;
    // Reprogramar un fallido/borrador lo devuelve a la cola.
    set.status = patch.scheduledFor ? "programado" : "borrador";
    set.errorMessage = null;
    set.retries = 0;
  }
  if (patch.status !== undefined) set.status = patch.status;
  const [row] = await db.update(socialPosts).set(set).where(eq(socialPosts.id, id)).returning();
  return row;
}

export async function deletePost(id: number) {
  await db.delete(socialPosts).where(eq(socialPosts.id, id));
}

/** Publica un post concreto ahora (botón "Publicar ya" o cola). */
export async function publishPost(id: number) {
  const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, id)).limit(1);
  if (!post) throw new Error("Post no existe");
  if (post.status === "publicado") return post;
  try {
    const { externalPostId } = await publishToPlatform({
      id: post.id,
      platform: post.platform,
      content: post.content,
      media: post.media ?? null,
    });
    const [row] = await db
      .update(socialPosts)
      .set({ status: "publicado", publishedAt: new Date(), externalPostId, errorMessage: null, updatedAt: new Date() })
      .where(eq(socialPosts.id, id))
      .returning();
    return row;
  } catch (err) {
    const message = (err as Error).message;
    const retries = (post.retries ?? 0) + 1;
    const failed = retries >= MAX_RETRIES;
    const [row] = await db
      .update(socialPosts)
      .set({
        retries,
        errorMessage: message.slice(0, 500),
        // Mantener "programado" para que la cola reintente; "fallido" al agotar.
        status: failed ? "fallido" : post.status,
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, id))
      .returning();
    if (failed) {
      const title = `Publicación en ${post.platform} falló`;
      const body = `${post.content.slice(0, 80)}… — ${message.slice(0, 120)}`;
      if (post.createdBy) {
        await notify({ userTo: post.createdBy, type: "system", title, body, entityType: "social_post", entityId: post.id });
        await notifyOthers(post.createdBy, { type: "system", title, body, entityType: "social_post", entityId: post.id });
      }
    }
    return row;
  }
}

/**
 * Procesa la cola: publica todo lo "programado" cuya hora ya pasó.
 * Invocado por la UI (poll ligero) y tras crear/reprogramar. Los reintentos
 * quedan espaciados por el propio poll (~1 min entre pasadas).
 */
export async function dispatchDuePosts() {
  const due = await db
    .select({ id: socialPosts.id })
    .from(socialPosts)
    .where(and(eq(socialPosts.status, "programado"), lte(socialPosts.scheduledFor, new Date()), sql`${socialPosts.retries} < ${MAX_RETRIES}`))
    .limit(10);
  const results = [];
  for (const { id } of due) results.push(await publishPost(id));
  return { processed: results.length };
}

/** KPIs para la cabecera del Social Studio. */
export async function postStats() {
  const rows = await db
    .select({ status: socialPosts.status, n: sql<number>`count(*)` })
    .from(socialPosts)
    .where(inArray(socialPosts.status, ["borrador", "programado", "publicado", "fallido"]))
    .groupBy(socialPosts.status);
  const m = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
  return {
    borrador: m.borrador ?? 0,
    programado: m.programado ?? 0,
    publicado: m.publicado ?? 0,
    fallido: m.fallido ?? 0,
  };
}
