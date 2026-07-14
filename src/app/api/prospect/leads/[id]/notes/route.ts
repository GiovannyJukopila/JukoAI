import type { NextRequest } from "next/server";
import { addNote } from "@/server/services/leads/repository";
import { ok, badRequest, handleError, parseId } from "@/server/lib/api";

export const dynamic = "force-dynamic";

/** POST /api/prospect/leads/:id/notes  Body: { body } → append a manual note. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const num = parseId(id);
    if (!num) return badRequest("id inválido");
    const payload = await req.json().catch(() => null);
    const text = (payload?.body ?? "").toString().trim();
    if (!text) return badRequest("La nota no puede estar vacía");
    const note = await addNote(num, text);
    return ok(note, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
