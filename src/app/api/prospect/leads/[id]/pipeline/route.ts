import type { NextRequest } from "next/server";
import { runPipeline } from "@/server/services/ai/orchestrator";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// The full agent pipeline (3 agents) can take a couple of minutes.
export const maxDuration = 300;

/** POST /api/prospect/leads/:id/pipeline → run Research→Audit/SEO→Copywriting for one lead. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const body = await req.json().catch(() => ({}));
    const result = await runPipeline(num, {
      senderName: body?.senderName,
      agencyName: body?.agencyName,
      language: body?.language === "es" ? "es" : "en",
    });
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
