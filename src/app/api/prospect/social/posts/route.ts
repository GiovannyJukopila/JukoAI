import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createPosts, listPosts, postStats } from "@/server/services/social/posts";
import { currentUser } from "@/server/auth/current-user";
import { ok, badRequest, handleError } from "@/server/lib/api";
import { SOCIAL_PLATFORMS } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/prospect/social/posts?from=&to=&status= → posts + stats. */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const from = sp.get("from") ? new Date(sp.get("from")!) : undefined;
    const to = sp.get("to") ? new Date(sp.get("to")!) : undefined;
    const status = sp.get("status") ?? undefined;
    const [posts, stats] = await Promise.all([listPosts({ from, to, status }), postStats()]);
    return ok({ posts, stats });
  } catch (err) {
    return handleError(err);
  }
}

/** POST /api/prospect/social/posts { platforms[], content, media?, scheduledFor? } */
export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const body = await req.json().catch(() => null);
    const platforms: string[] = Array.isArray(body?.platforms) ? body.platforms : [];
    const content = String(body?.content ?? "").trim();
    if (!platforms.length || platforms.some((p) => !(SOCIAL_PLATFORMS as readonly string[]).includes(p))) {
      return badRequest("platforms inválidas");
    }
    if (!content) return badRequest("Falta content");
    const media = Array.isArray(body?.media) ? body.media.map(String).filter(Boolean) : null;
    const posts = await createPosts({
      platforms,
      content,
      media,
      scheduledFor: body?.scheduledFor ? String(body.scheduledFor) : null,
      createdBy: user,
    });
    return ok({ posts }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
