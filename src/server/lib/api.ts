/** Helpers for Route Handlers: consistent JSON + error envelopes. */
import { NextResponse } from "next/server";
import { ExternalApiError } from "@/server/lib/errors";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

/** Map thrown errors to sensible HTTP responses. */
export function handleError(err: unknown) {
  if (err instanceof ExternalApiError) {
    const status = err.status === 403 ? 502 : err.retryable ? 503 : 502;
    return NextResponse.json(
      { error: err.message, provider: err.provider },
      { status },
    );
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json(
    { error: (err as Error)?.message ?? "Error interno" },
    { status: 500 },
  );
}

/** 403 for endpoints switched off by a feature flag (cost control). */
export function featureDisabled(flag: string) {
  return NextResponse.json(
    {
      error: `Función deshabilitada por control de costos. El flag ${flag} está apagado (src/config/features.ts).`,
      flag,
    },
    { status: 403 },
  );
}

/** Parse and validate an integer route param. */
export function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
