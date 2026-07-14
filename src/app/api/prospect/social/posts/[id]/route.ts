import type { NextRequest } from "next/server";
import { updatePost, deletePost, publishPost } from "@/server/services/social/posts";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// Publicar puede descargar y subir videos de hasta 64 MB (YouTube/TikTok) o
// esperar el procesamiento de un reel de IG.
export const maxDuration = 300;

/** PATCH /api/prospect/social/posts/:id { content?, media?, scheduledFor?, status? } */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => ({}));
    return ok(await updatePost(num, body));
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/prospect/social/posts/:id → publicar ahora. */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    return ok(await publishPost(num));
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/prospect/social/posts/:id */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    await deletePost(num);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
