"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { apiGet, apiSend, taskStatusColor, fmtDate, type LeadRow } from "../_lib";
import { useLang } from "../_i18n";

type OpTask = { runId: number | null; agent: string; status: string; costUsd: string; errorMessage: string | null };
type OpRun = {
  runId: number;
  businessId: number;
  name: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalCostUsd: string;
  tasks: OpTask[];
};

const AGENTS = ["research", "audit_seo", "copywriting"] as const;

export default function OperationsPage() {
  const { t } = useLang();
  const [runs, setRuns] = useState<OpRun[]>([]);
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number; current?: string }>({ running: false, done: 0, total: 0 });
  const [minScore, setMinScore] = useState("40");
  const [msgLang, setMsgLang] = useState<"en" | "es">("en"); // outreach message language (≠ UI language)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setRuns((await apiGet<{ runs: OpRun[] }>("/api/prospect/operations")).runs);
    } catch { /* ignore transient */ }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function runBatch() {
    const score = Number(minScore) || 0;
    const { leads } = await apiGet<{ leads: LeadRow[] }>(`/api/prospect/leads?minScore=${score}&limit=50`);
    if (leads.length === 0) { alert(t.operations.noLeads); return; }
    if (!confirm(t.operations.confirm(leads.length, score))) return;
    setBatch({ running: true, done: 0, total: leads.length });
    for (let i = 0; i < leads.length; i++) {
      setBatch((b) => ({ ...b, done: i, current: leads[i].name }));
      try {
        await apiSend(`/api/prospect/leads/${leads[i].id}/pipeline`, "POST", { language: msgLang });
      } catch { /* keep going */ }
      await load();
    }
    setBatch({ running: false, done: leads.length, total: leads.length });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t.operations.title}</h1>
          <p className="text-sm text-[var(--ink-mute)]">{t.operations.subtitle}</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.operations.minScore}
            <input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)}
              className="w-24 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--ink-mute)]">
            {t.operations.msgLang}
            <select value={msgLang} onChange={(e) => setMsgLang(e.target.value as "en" | "es")}
              className="cursor-pointer rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white">
              <option value="en" className="bg-[#111]">English</option>
              <option value="es" className="bg-[#111]">Español</option>
            </select>
          </label>
          <button onClick={runBatch} disabled={batch.running}
            className="cursor-pointer rounded-lg bg-[var(--violet)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {batch.running ? t.operations.processingN(batch.done, batch.total) : t.operations.batch}
          </button>
        </div>
      </div>

      {batch.running && (
        <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
          {t.operations.batchInfo(batch.done, batch.total, batch.current)}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-[var(--ink-mute)]">
            <tr>
              <th className="px-3 py-2.5">{t.operations.tLead}</th>
              <th className="px-3 py-2.5">{t.operations.tPipeline}</th>
              {AGENTS.map((a) => <th key={a} className="px-3 py-2.5">{t.agents[a]}</th>)}
              <th className="px-3 py-2.5">{t.operations.tCost}</th>
              <th className="px-3 py-2.5">{t.operations.tEnd}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {runs.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--ink-mute)]">{t.operations.empty}</td></tr>
            )}
            {runs.map((r) => {
              const byAgent = new Map(r.tasks.map((task) => [task.agent, task]));
              return (
                <tr key={r.runId} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-2.5">
                    <Link href={`/prospect/leads/${r.businessId}`} className="font-medium text-white hover:text-[var(--peri)]">{r.name}</Link>
                  </td>
                  <td className="px-3 py-2.5"><StatusChip status={r.status} /></td>
                  {AGENTS.map((a) => {
                    const task = byAgent.get(a);
                    return <td key={a} className="px-3 py-2.5"><StatusChip status={task?.status ?? "pendiente"} title={task?.errorMessage ?? undefined} /></td>;
                  })}
                  <td className="px-3 py-2.5 text-[var(--ink-soft)]">${Number(r.totalCostUsd).toFixed(4)}</td>
                  <td className="px-3 py-2.5 text-xs text-[var(--ink-mute)]">{fmtDate(r.finishedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-[var(--ink-mute)]">{t.operations.note}</p>
    </div>
  );
}

function StatusChip({ status, title }: { status: string; title?: string }) {
  const { t } = useLang();
  return (
    <span title={title} className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${taskStatusColor(status)}`}>
      {t.agentStatus[status] ?? status}
    </span>
  );
}
