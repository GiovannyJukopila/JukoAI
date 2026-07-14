import { getTrend } from "@/server/services/intel/repository";
import { ok, badRequest, notFound, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/prospect/intel/trends/:id → trend detail with evidence + observations. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const data = await getTrend(num);
    if (!data) return notFound("Trend no encontrado");
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
