/**
 * Social Studio — cuentas conectadas (Fase 4.2/4.3).
 *
 * Una fila por (platform) — herramienta interna: una cuenta de marca por red.
 * Tokens cifrados en reposo (lib/crypto). `getFreshAccessToken` refresca
 * automáticamente cuando el token está por vencer (LinkedIn refresh_token,
 * Instagram ig_refresh_token).
 */
import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { socialAccounts, type SocialPlatform } from "@/server/db/schema";
import { encryptToken, decryptToken } from "@/server/lib/crypto";
import { env } from "@/server/config/env";

export type ConnectInput = {
  platform: SocialPlatform;
  accountName: string;
  externalId?: string | null;
  handle?: string | null;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  scopes?: string | null;
  meta?: Record<string, unknown> | null;
};

/** Campos seguros para el cliente (nunca tokens). */
export async function listAccounts() {
  const rows = await db.select().from(socialAccounts);
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    accountName: r.accountName,
    handle: r.handle,
    avatarUrl: r.avatarUrl,
    status: r.status,
    lastError: r.lastError,
    connectedAt: r.connectedAt,
    tokenExpiresAt: r.tokenExpiresAt,
  }));
}

export async function upsertConnectedAccount(input: ConnectInput) {
  const values = {
    accountName: input.accountName,
    externalId: input.externalId ?? null,
    handle: input.handle ?? null,
    avatarUrl: input.avatarUrl ?? null,
    accessTokenEnc: encryptToken(input.accessToken),
    refreshTokenEnc: input.refreshToken ? encryptToken(input.refreshToken) : null,
    tokenExpiresAt: input.expiresInSeconds ? new Date(Date.now() + input.expiresInSeconds * 1000) : null,
    scopes: input.scopes ?? null,
    meta: input.meta ?? null,
    status: "connected" as const,
    lastError: null,
    connectedAt: new Date(),
  };
  const [existing] = await db.select({ id: socialAccounts.id }).from(socialAccounts).where(eq(socialAccounts.platform, input.platform)).limit(1);
  if (existing) {
    const [row] = await db.update(socialAccounts).set(values).where(eq(socialAccounts.id, existing.id)).returning();
    return row;
  }
  const [row] = await db.insert(socialAccounts).values({ platform: input.platform, ...values }).returning();
  return row;
}

export async function disconnectAccount(id: number) {
  await db
    .update(socialAccounts)
    .set({ status: "disconnected", accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null, lastError: null })
    .where(eq(socialAccounts.id, id));
}

export async function markAccountError(id: number, message: string) {
  await db.update(socialAccounts).set({ status: "error", lastError: message.slice(0, 500) }).where(eq(socialAccounts.id, id));
}

export type FreshAccount = typeof socialAccounts.$inferSelect & { accessToken: string };

/**
 * Devuelve la cuenta conectada de una plataforma con access token descifrado,
 * refrescándolo si vence en <7 días (LinkedIn e Instagram lo permiten).
 */
export async function getFreshAccessToken(platform: SocialPlatform): Promise<FreshAccount> {
  const [acc] = await db.select().from(socialAccounts).where(eq(socialAccounts.platform, platform)).limit(1);
  if (!acc || acc.status !== "connected" || !acc.accessTokenEnc) {
    throw new Error(`No hay cuenta de ${platform} conectada`);
  }
  let accessToken = decryptToken(acc.accessTokenEnc);

  const expiresSoon = acc.tokenExpiresAt && acc.tokenExpiresAt.getTime() - Date.now() < 7 * 24 * 3600 * 1000;
  if (expiresSoon) {
    try {
      const refreshed = await refreshPlatformToken(platform, accessToken, acc.refreshTokenEnc ? decryptToken(acc.refreshTokenEnc) : null);
      if (refreshed) {
        accessToken = refreshed.accessToken;
        await db
          .update(socialAccounts)
          .set({
            accessTokenEnc: encryptToken(refreshed.accessToken),
            refreshTokenEnc: refreshed.refreshToken ? encryptToken(refreshed.refreshToken) : acc.refreshTokenEnc,
            tokenExpiresAt: refreshed.expiresInSeconds ? new Date(Date.now() + refreshed.expiresInSeconds * 1000) : acc.tokenExpiresAt,
          })
          .where(eq(socialAccounts.id, acc.id));
      }
    } catch (err) {
      // El token actual puede seguir siendo válido; solo registramos el fallo.
      console.warn(`[social] refresh ${platform} falló:`, (err as Error).message);
    }
  }
  return { ...acc, accessToken };
}

type Refreshed = { accessToken: string; refreshToken?: string | null; expiresInSeconds?: number | null } | null;

async function refreshPlatformToken(platform: SocialPlatform, accessToken: string, refreshToken: string | null): Promise<Refreshed> {
  if (platform === "linkedin" && refreshToken && env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: env.LINKEDIN_CLIENT_ID,
        client_secret: env.LINKEDIN_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new Error(`LinkedIn refresh HTTP ${res.status}`);
    const d = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
    return { accessToken: d.access_token, refreshToken: d.refresh_token ?? null, expiresInSeconds: d.expires_in ?? null };
  }
  if (platform === "instagram") {
    // Long-lived IG tokens se refrescan con el propio token (60 días).
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(accessToken)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Instagram refresh HTTP ${res.status}`);
    const d = (await res.json()) as { access_token: string; expires_in?: number };
    return { accessToken: d.access_token, expiresInSeconds: d.expires_in ?? null };
  }
  return null;
}
