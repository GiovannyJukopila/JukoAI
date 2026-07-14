import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTask, updateTask, deleteTask } from "@/server/services/tasks/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, notFound, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/tasks/:id → tarea + comentarios. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const task = await getTask(num);
    if (!task) return notFound();
    return ok({ task });
  } catch (err) {
    return handleError(err);
  }
}

/** PATCH /api/prospect/tasks/:id { …campos, column?, orderedIds? } */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => ({}));
    return ok({ task: await updateTask(num, { ...body, actor: user }) });
  } catch (err) {
    return handleError(err);
  }
}

/** DELETE /api/prospect/tasks/:id */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    await deleteTask(num);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
