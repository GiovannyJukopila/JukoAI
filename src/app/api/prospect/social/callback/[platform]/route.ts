import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handleCallback, OAUTH_STATE_COOKIE } from "@/server/services/social/oauth";
import type { SocialPlatform } from "@/server/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/prospect/social/callback/:platform → intercambia code y guarda la cuenta. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ platform: string }> }) {
  const { platform } = await ctx.params;
  const done = (qs: string) => {
    const res = NextResponse.redirect(new URL(`/prospect/social${qs}`, req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  };

  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const state = sp.get("state");
  const providerError = sp.get("error_description") ?? sp.get("error");
  if (providerError) return done(`?error=${encodeURIComponent(providerError)}`);
  if (!code) return done(`?error=sin_code`);

  const expected = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!expected || expected !== `${platform}:${state}`) {
    return done(`?error=state_invalido`);
  }

  try {
    await handleCallback(platform as SocialPlatform, code);
    return done(`?connected=${platform}`);
  } catch (err) {
    return done(`?error=${encodeURIComponent((err as Error).message.slice(0, 200))}`);
  }
}
