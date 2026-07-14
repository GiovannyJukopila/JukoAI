import type { NextRequest } from "next/server";
import { disconnectAccount } from "@/server/services/social/accounts";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** DELETE /api/prospect/social/accounts/:id → desconectar (borra tokens). */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    await disconnectAccount(num);
    return ok({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
