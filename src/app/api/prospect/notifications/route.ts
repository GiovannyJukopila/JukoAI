import type { NextRequest } from "next/server";
import { listNotifications } from "@/server/services/notifications/service";
import { currentUser } from "@/server/auth/current-user";
import { ok, handleError } from "@/server/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** GET /api/prospect/notifications?limit=30 → { notifications, unread } for the session user. */
export async function GET(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit")) || 30, 1), 100);
    return ok(await listNotifications(user, limit));
  } catch (err) {
    return handleError(err);
  }
}
