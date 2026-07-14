import { CATEGORIES } from "@/server/config/categories";
import { ok } from "@/server/lib/api";

/** GET /api/prospect/categories → category catalog for dropdowns. */
export async function GET() {
  return ok({ categories: CATEGORIES });
}
