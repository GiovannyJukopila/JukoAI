/**
 * AES-256-GCM helpers for social OAuth tokens at rest.
 * Key = SHA-256(SOCIAL_TOKEN_KEY) so any long string works as the env secret.
 * Format: base64url(iv).base64url(ciphertext).base64url(authTag)
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env, requireKey } from "@/server/config/env";

function key(): Buffer {
  const secret = requireKey(env.SOCIAL_TOKEN_KEY, "SOCIAL_TOKEN_KEY");
  return createHash("sha256").update(secret).digest();
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, enc, tag].map((b) => b.toString("base64url")).join(".");
}

export function decryptToken(stored: string): string {
  const [ivB64, encB64, tagB64] = stored.split(".");
  if (!ivB64 || !encB64 || !tagB64) throw new Error("Token cifrado con formato inválido");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64url")), decipher.final()]).toString("utf8");
}
