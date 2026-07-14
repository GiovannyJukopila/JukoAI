import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listTasks, createTask } from "@/server/services/tasks/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/tasks → board completo (con contador de comentarios). */
export async function GET() {
  try {
    return ok({ tasks: await listTasks() });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/prospect/tasks { title, description?, assignedTo?, column?, priority?, dueDate?, labels? } */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    if (!title) return badRequest("Falta title");
    const task = await createTask({
      title,
      description: body?.description ?? null,
      assignedTo: body?.assignedTo ?? null,
      column: body?.column,
      priority: body?.priority,
      dueDate: body?.dueDate ?? null,
      labels: Array.isArray(body?.labels) ? body.labels.map(String) : null,
      createdBy: user,
    });
    return ok({ task }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
