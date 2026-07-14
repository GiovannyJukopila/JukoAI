import { dispatchDuePosts } from "@/server/services/social/posts";
import { ok, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/prospect/social/dispatch → publica los posts programados vencidos.
 * Lo invoca la UI con un poll ligero mientras Social Studio está abierto
 * (herramienta interna de 2 usuarios: sin cron externo).
 */
export async function POST() {
  try {
    return ok(await dispatchDuePosts());
  } catch (err) {
    return handleError(err);
  }
}
