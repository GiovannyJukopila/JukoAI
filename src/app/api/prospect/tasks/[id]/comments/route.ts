import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { addComment } from "@/server/services/tasks/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/prospect/tasks/:id/comments { body } */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => null);
    const text = String(body?.body ?? "").trim();
    if (!text) return badRequest("Falta body");
    return ok({ comment: await addComment(num, user, text) }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
