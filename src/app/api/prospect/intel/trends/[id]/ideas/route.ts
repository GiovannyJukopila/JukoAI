import { runClaudeIdeas } from "@/server/services/intel/claudeIdeas";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";
// One claude -p call to generate the ideas.
export const maxDuration = 300;

/** POST /api/prospect/intel/trends/:id/ideas → generate "trend × Claude" video/project ideas. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const result = await runClaudeIdeas(num);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
