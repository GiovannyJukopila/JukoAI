import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { markRead, markAllRead } from "@/server/services/notifications/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, handleError } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/prospect/notifications/read { id } | { all: true } → mark as read. */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (body?.all === true) {
      await markAllRead(user);
      return ok({ ok: true });
    }
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return badRequest("Falta id o all:true");
    await markRead(user, id);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
