import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { listGoals, createGoal } from "@/server/services/goals/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/goals → goals con progreso efectivo y tareas vinculadas. */
export async function GET() {
  try {
    return ok({ goals: await listGoals() });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/prospect/goals { title, description?, owner?, horizon?, milestones?, targetDate?, progress? } */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const title = String(body?.title ?? "").trim();
    if (!title) return badRequest("Falta title");
    const goal = await createGoal({ ...body, title, createdBy: user });
    return ok({ goal }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
