/**
 * Minimal signed-session auth (no external deps). Runtime-agnostic: uses Web Crypto
 * (HMAC-SHA256), so it works in both the Edge proxy and Node route handlers.
 *
 * A session token is `base64url(payload).base64url(hmac)` where payload = {u, exp}.
 * Users are configured via the AUTH_USERS env var as "user1:pass1,user2:pass2".
 */
const enc = new TextEncoder();

export const SESSION_COOKIE = "prospect_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function b64urlBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlStr(s: string): string {
  return b64urlBytes(enc.encode(s));
}
function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlBytes(new Uint8Array(sig));
}

export async function signSession(username: string, secret: string): Promise<string> {
  const payload = b64urlStr(JSON.stringify({ u: username, exp: Date.now() + TTL_MS }));
  return `${payload}.${await hmac(payload, secret)}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<string | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (sig !== (await hmac(payload, secret))) return null;
  try {
    const { u, exp } = JSON.parse(b64urlDecode(payload)) as { u: string; exp: number };
    if (typeof exp !== "number" || Date.now() > exp) return null;
    return typeof u === "string" ? u : null;
  } catch {
    return null;
  }
}

/** Parse AUTH_USERS ("user:pass,user2:pass2") into a map. Passwords may contain ':'. */
export function parseUsers(raw: string | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (!raw) return m;
  for (const pair of raw.split(",")) {
    const i = pair.indexOf(":");
    if (i === -1) continue;
    const u = pair.slice(0, i).trim();
    if (u) m.set(u, pair.slice(i + 1));
  }
  return m;
}

export function verifyCredentials(username: string, password: string, raw: string | undefined): boolean {
  const stored = parseUsers(raw).get(username);
  return stored != null && stored === password;
}

/** Whether auth is configured (both a user list and a secret). */
export function authEnabled(): boolean {
  return !!process.env.AUTH_USERS && !!process.env.AUTH_SECRET;
}
