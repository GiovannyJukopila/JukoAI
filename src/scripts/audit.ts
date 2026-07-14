/**
 * CLI / cron entrypoint for auditing businesses.
 *
 * Usage:
 *   npm run audit                       # audit all leads with a website and no audit yet
 *   npm run audit -- --limit 5          # audit at most 5 pending
 *   npm run audit -- --id 42            # audit one specific business
 *   npm run audit -- --staleDays 30     # re-audit those audited > 30 days ago
 *
 * Sequential by design: PageSpeed is slow and rate-limited, so we audit one site
 * at a time and let the client-side limiter pace the calls.
 */
import "@/server/config/load-env";
import { auditBusiness } from "@/server/services/audit/runner";
import { businessesNeedingAudit } from "@/server/services/leads/repository";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const idArg = arg("id");
  const limit = arg("limit") ? Number(arg("limit")) : undefined;
  const staleDays = arg("staleDays") ? Number(arg("staleDays")) : undefined;

  let targets: { id: number; name?: string }[];
  if (idArg) {
    targets = [{ id: Number(idArg) }];
  } else {
    const pending = await businessesNeedingAudit(staleDays);
    targets = limit ? pending.slice(0, limit) : pending;
  }

  if (targets.length === 0) {
    console.log("No hay negocios pendientes de auditar.");
    process.exit(0);
  }

  console.log(`Auditando ${targets.length} negocio(s)…`);
  let ok = 0,
    partial = 0,
    error = 0,
    skipped = 0;

  for (const t of targets) {
    const r = await auditBusiness(t.id);
    const tag =
      r.status === "ok"
        ? "✅"
        : r.status === "partial"
          ? "🟡"
          : r.status === "error"
            ? "❌"
            : "⏭";
    console.log(
      `  ${tag} #${t.id}${t.name ? ` ${t.name}` : ""} · ${r.status} · score=${r.opportunityScore ?? "—"} · ${r.issues.join(",") || "sin issues"}` +
        (r.message ? ` · ${r.message}` : ""),
    );
    if (r.status === "ok") ok++;
    else if (r.status === "partial") partial++;
    else if (r.status === "error") error++;
    else skipped++;
  }

  console.log(`\nResumen: ${ok} ok · ${partial} parcial · ${error} error · ${skipped} omitidos`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Audit falló:", e);
  process.exit(1);
});
