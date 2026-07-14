import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateGoal, deleteGoal } from "@/server/services/goals/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** PATCH /api/prospect/goals/:id */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => ({}));
    return ok({ goal: await updateGoal(num, body, user) });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/prospect/goals/:id (las tareas vinculadas quedan sin goal). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    await deleteGoal(num);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
