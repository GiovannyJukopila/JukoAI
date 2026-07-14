"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiSend, fmtDate, taskStatusColor, LEAD_STATUS_OPTIONS } from "../../_lib";
import { Icons, ScoreRing, Meter, FlagPill, AgentCard, type AgentCardData } from "../../_components/viz";
import { useLang, type Messages } from "../../_i18n";
import { ENABLE_BUSINESS_AUDIT } from "@/config/features";

type Detail = {
  business: Record<string, any>;
  audit: Record<string, any> | null;
  notes: { id: number; body: string; createdAt: string }[];
};
type AgentData = {
  research: Record<string, any> | null;
  competitor: Record<string, any> | null;
  messages: Record<string, any>[];
  tasks: Record<string, any>[];
};

const TAB_KEYS = ["audit", "research", "messages", "history", "notes"] as const;
type Tab = (typeof TAB_KEYS)[number];
const AGENT_ORDER: AgentCardData["kind"][] = ["research", "audit_seo", "copywriting"];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLang();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [agents, setAgents] = useState<AgentData | null>(null);
  const [tab, setTab] = useState<Tab>("audit");
  const [auditing, setAuditing] = useState(false);
  const [running, setRunning] = useState(false);
  const [msgLang, setMsgLang] = useState<"en" | "es">("en"); // outreach message language (≠ UI language)
  const [savingStatus, setSavingStatus] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAgents = useCallback(async () => {
    try { setAgents(await apiGet<AgentData>(`/api/prospect/leads/${id}/agents`)); } catch { /* transient */ }
  }, [id]);

  const load = useCallback(async () => {
    try {
      const [d, ag] = await Promise.all([
        apiGet<Detail>(`/api/prospect/leads/${id}`),
        apiGet<AgentData>(`/api/prospect/leads/${id}/agents`),
      ]);
      setDetail(d);
      setAgents(ag);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  async function changeStatus(status: string) {
    setSavingStatus(true);
    try {
      await apiSend(`/api/prospect/leads/${id}`, "PATCH", { leadStatus: status });
      await load();
    } finally {
      setSavingStatus(false);
    }
  }

  async function reAudit() {
    setAuditing(true);
    setError(null);
    try {
      await apiSend(`/api/prospect/leads/${id}/audit`, "POST");
      await load();
      setTab("audit");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAuditing(false);
    }
  }

  async function runPipeline() {
    setRunning(true);
    setError(null);
    pollRef.current = setInterval(loadAgents, 3000);
    try {
      await apiSend(`/api/prospect/leads/${id}/pipeline`, "POST", { language: msgLang });
      setTab("research");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      setRunning(false);
      await load();
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await apiSend(`/api/prospect/leads/${id}/notes`, "POST", { body: noteText });
    setNoteText("");
    await load();
  }

  if (error && !detail) return <p className="text-rose-300">⚠️ {error}</p>;
  if (!detail) return <p className="text-[var(--ink-mute)]">{t.common.loading}</p>;

  const b = detail.business;
  const a = detail.audit;

  // Latest task per agent (for the live team strip).
  const latestByAgent = new Map<string, Record<string, any>>();
  for (const task of agents?.tasks ?? []) {
    if (!latestByAgent.has(task.agent)) latestByAgent.set(task.agent, task);
  }
  const agentCards: AgentCardData[] = AGENT_ORDER.map((kind) => {
    const task = latestByAgent.get(kind);
    return {
      kind,
      title: t.agents[kind],
      status: running && !task ? "pendiente" : (task?.status ?? "pendiente"),
      inputTokens: task?.inputTokens,
      outputTokens: task?.outputTokens,
      finishedAt: task?.finishedAt,
      errorMessage: task?.errorMessage,
    };
  });
  const hasAgentData = !!agents?.research || !!agents?.competitor || (agents?.messages.length ?? 0) > 0;
  const tabLabel: Record<Tab, string> = {
    audit: t.detail.tabAudit, research: t.detail.tabResearch, messages: t.detail.tabMessages, history: t.detail.tabHistory, notes: t.detail.tabNotes,
  };
  const statusLabel = (v: string) => t.leadStatus[v] ?? v;

  return (
    <div className="space-y-5">
      <Link href="/prospect/leads" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-white">
        {t.detail.back}
      </Link>

      {/* ── Hero ── */}
      <div className="grid gap-5 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-5 sm:grid-cols-[auto_1fr]">
        <ScoreRing value={b.opportunityScore} label={t.detail.opportunityLabel} invert caption={scoreCaption(b.opportunityScore, t)} />
        <div className="flex flex-col justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{b.name}</h1>
            <p className="text-sm text-[var(--ink-mute)]">{b.address ?? "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Tag>{(b.category && t.categories[b.category]) ?? b.category ?? "—"}</Tag>
              {b.rating != null && <Tag>★ {b.rating} ({b.reviewsCount ?? 0})</Tag>}
              {b.country && <Tag>{b.country}</Tag>}
              <Tag>{statusLabel(b.leadStatus)}</Tag>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {b.website && (
              <a href={b.website} target="_blank" rel="noreferrer" title={b.website}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--peri)]/30 bg-[var(--peri)]/10 px-3 py-2 text-sm font-medium text-[var(--peri)] transition-colors hover:bg-[var(--peri)]/20">
                {Icons.external(15)} {t.detail.visitWeb}
              </a>
            )}
            <select value={b.leadStatus} onChange={(e) => changeStatus(e.target.value)} disabled={savingStatus}
              className="cursor-pointer rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              {LEAD_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value} className="bg-[#111]">{statusLabel(s.value)}</option>)}
            </select>
            {ENABLE_BUSINESS_AUDIT && <button onClick={reAudit} disabled={auditing}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-50">
              {Icons.refresh(15)} {auditing ? t.detail.auditing : a ? t.detail.reAudit : t.detail.audit}
            </button>}
            <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm" title={t.detail.msgTitle}>
              <span className="text-xs text-[var(--ink-mute)]">{t.detail.msgIn}</span>
              <select value={msgLang} onChange={(e) => setMsgLang(e.target.value as "en" | "es")} className="cursor-pointer bg-transparent text-sm text-white focus:outline-none">
                <option value="en" className="bg-[#111]">English</option>
                <option value="es" className="bg-[#111]">Español</option>
              </select>
            </label>
            <button onClick={runPipeline} disabled={running} title={t.detail.pipelineTitle}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--violet)] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-[var(--violet)]/20 transition-opacity hover:opacity-90 disabled:opacity-50">
              {Icons.bolt(15)} {running ? t.detail.running : hasAgentData ? t.detail.rerun : t.detail.run}
            </button>
          </div>
        </div>
      </div>
      {error && <p className="text-sm text-rose-300">⚠️ {error}</p>}

      {/* ── Agent team strip (live) ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--ink-soft)]">{t.detail.team}</h2>
          {running && <span className="text-xs text-sky-300">{t.detail.working}</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {agentCards.map((c) => <AgentCard key={c.kind} data={c} />)}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {TAB_KEYS.map((k) => (
          <button key={k} onClick={() => setTab(k)}
            className={`cursor-pointer px-3 py-2 text-sm transition-colors ${tab === k ? "border-b-2 border-[var(--violet)] text-white" : "text-[var(--ink-soft)] hover:text-white"}`}>
            {tabLabel[k]}
            {k === "messages" && (agents?.messages.length ?? 0) > 0 && <Count n={agents!.messages.length} />}
            {k === "notes" && detail.notes.length > 0 && <Count n={detail.notes.length} />}
          </button>
        ))}
      </div>

      {/* ── Audit ── */}
      {tab === "audit" && (
        <div className="space-y-5">
          {!a && <p className="text-sm text-[var(--ink-mute)]">{t.detail.notAudited}</p>}
          {a && (
            <>
              <p className="text-xs text-[var(--ink-mute)]">
                {t.detail.auditedOn(fmtDate(a.auditedAt), b.auditStatus)}
                {a.psiError ? ` · PSI: ${a.psiError}` : ""}{a.fetchError ? ` · Web: ${a.fetchError}` : ""}
              </p>

              <Panel title={t.detail.contact} icon={Icons.mail(16)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 text-xs uppercase tracking-wide text-[var(--ink-mute)]">{t.detail.emails}</div>
                    {(a.emails?.length ?? 0) === 0 ? (
                      <p className="text-sm text-[var(--ink-mute)]">{t.detail.noEmails}</p>
                    ) : (
                      <ul className="space-y-1.5">{a.emails.map((e: string) => <ContactRow key={e} type="email" value={e} />)}</ul>
                    )}
                  </div>
                  <div>
                    <div className="mb-1.5 text-xs uppercase tracking-wide text-[var(--ink-mute)]">{t.detail.phones}</div>
                    <ul className="space-y-1.5">
                      {b.phone && <ContactRow type="phone" value={b.phone} source="Google" />}
                      {(a.phones ?? []).filter((p: string) => p !== b.phone).map((p: string) => <ContactRow key={p} type="phone" value={p} source={t.detail.sourceWeb} />)}
                      {!b.phone && (a.phones?.length ?? 0) === 0 && <p className="text-sm text-[var(--ink-mute)]">{t.detail.noPhones}</p>}
                    </ul>
                  </div>
                </div>
              </Panel>

              <div className="grid gap-4 lg:grid-cols-2">
                <Panel title={t.detail.psMobile}>
                  <div className="space-y-3">
                    <Meter label={t.detail.performance} value={a.psiMobilePerformance} />
                    <Meter label={t.detail.seo} value={a.psiMobileSeo} />
                    <Meter label={t.detail.accessibility} value={a.psiMobileAccessibility} />
                    <Meter label={t.detail.bestPractices} value={a.psiMobileBestPractices} />
                  </div>
                </Panel>
                <Panel title={t.detail.psDesktop}>
                  <div className="space-y-3">
                    <Meter label={t.detail.performance} value={a.psiDesktopPerformance} />
                    <Meter label={t.detail.seo} value={a.psiDesktopSeo} />
                    <Meter label={t.detail.accessibility} value={a.psiDesktopAccessibility} />
                    <Meter label={t.detail.bestPractices} value={a.psiDesktopBestPractices} />
                  </div>
                </Panel>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FlagPill label={t.detail.httpsLabel} ok={a.hasHttps} />
                <FlagPill label={t.detail.chatLabel} ok={a.hasChatWidget} extra={a.chatVendor} />
                <FlagPill label={t.detail.ecommerceLabel} ok={a.isEcommerce} extra={a.ecommercePlatform} />
              </div>
              {Array.isArray(a.techSignals) && a.techSignals.length > 0 && (
                <Panel title={t.detail.tech}><Chips items={a.techSignals} /></Panel>
              )}
              {Array.isArray(a.issues) && a.issues.length > 0 && (
                <Panel title={t.detail.problems}><Chips items={a.issues.map((i: string) => t.issues[i] ?? i)} tone="rose" icon /></Panel>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Research ── */}
      {tab === "research" && (
        <div className="space-y-4">
          {!hasAgentData && <EmptyAgents running={running} />}
          {agents?.research && (
            <Panel title={t.detail.research} icon={Icons.research(16)}>
              <p className="text-sm text-white">{agents.research.summary}</p>
              {agents.research.raw?.outreachAngle && (
                <div className="mt-3 rounded-lg border border-[var(--violet)]/30 bg-[var(--violet)]/10 p-3 text-sm text-[var(--peri)]">
                  <span className="text-xs uppercase tracking-wide text-[var(--ink-mute)]">{t.detail.angle}</span>
                  <p className="mt-0.5">{agents.research.raw.outreachAngle}</p>
                </div>
              )}
              <ListBlock title={t.detail.strengths} items={agents.research.strengths ?? []} />
              <ListBlock title={t.detail.opportunities} items={agents.research.opportunities ?? []} tone="amber" />
            </Panel>
          )}
          {agents?.competitor && (
            <Panel title={t.detail.competitors} icon={Icons.seo(16)}>
              <p className="whitespace-pre-line text-sm text-white">{agents.competitor.summary}</p>
              <ListBlock title={t.detail.contentGaps} items={agents.competitor.contentGaps ?? []} />
              <ListBlock title={t.detail.seoGaps} items={agents.competitor.seoGaps ?? []} tone="amber" />
            </Panel>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      {tab === "messages" && (
        <div className="space-y-3">
          {(agents?.messages.length ?? 0) === 0 && <EmptyAgents running={running} />}
          {agents?.messages.map((m) => (
            <Panel key={m.id} title={m.channel === "email" ? "Email" : "WhatsApp"} icon={Icons.copy(16)}>
              <div className="mb-2 flex items-center gap-2 text-xs text-[var(--ink-mute)]">
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 uppercase">{m.status}</span>
                {m.model && <span>{m.model}</span>}
              </div>
              {m.subject && <div className="font-medium text-white">{m.subject}</div>}
              <p className="mt-1 whitespace-pre-line text-sm text-[var(--ink-soft)]">{m.body}</p>
              <button onClick={() => navigator.clipboard?.writeText(`${m.subject ? m.subject + "\n\n" : ""}${m.body}`)}
                className="mt-2 cursor-pointer rounded-md border border-white/15 px-2 py-1 text-xs text-[var(--ink-soft)] hover:bg-white/5">
                {t.common.copy}
              </button>
              {Array.isArray(m.contentIdeas) && m.contentIdeas.length > 0 && <ListBlock title={t.detail.ideas} items={m.contentIdeas} />}
            </Panel>
          ))}
        </div>
      )}

      {/* ── History ── */}
      {tab === "history" && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-[var(--ink-mute)]">
              <tr>
                <th className="px-3 py-2">{t.detail.hAgent}</th><th className="px-3 py-2">{t.detail.hStatus}</th>
                <th className="px-3 py-2">{t.detail.hTokens}</th><th className="px-3 py-2">{t.detail.hCost}</th><th className="px-3 py-2">{t.detail.hWhen}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(agents?.tasks.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-[var(--ink-mute)]">{t.detail.noTasks}</td></tr>
              )}
              {agents?.tasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-3 py-2 text-white">{t.agents[task.agent] ?? task.agent}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] ${taskStatusColor(task.status)}`} title={task.errorMessage ?? undefined}>{t.agentStatus[task.status] ?? task.status}</span>
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--ink-soft)]">{(task.inputTokens ?? 0) + (task.outputTokens ?? 0) || "—"}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--ink-soft)]">${Number(task.costUsd ?? 0).toFixed(4)}</td>
                  <td className="px-3 py-2 text-xs text-[var(--ink-mute)]">{fmtDate(task.finishedAt ?? task.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Notes ── */}
      {tab === "notes" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder={t.detail.addNote}
              className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
            <button onClick={addNote} className="cursor-pointer rounded-lg bg-[var(--violet)] px-4 py-2 text-sm font-medium text-white hover:opacity-90">{t.common.save}</button>
          </div>
          {detail.notes.length === 0 && <p className="text-sm text-[var(--ink-mute)]">{t.detail.noNotes}</p>}
          <ul className="space-y-2">
            {detail.notes.map((n) => (
              <li key={n.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm text-white">{n.body}</p>
                <p className="mt-1 text-xs text-[var(--ink-mute)]">{fmtDate(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── small presentational helpers ── */
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[var(--ink-soft)]">{children}</span>;
}
function Count({ n }: { n: number }) {
  return <span className="ml-1.5 rounded-full bg-white/10 px-1.5 text-[11px] text-[var(--ink-mute)]">{n}</span>;
}
function ContactRow({ type, value, source }: { type: "email" | "phone"; value: string; source?: string }) {
  const { t } = useLang();
  const href = type === "email" ? `mailto:${value}` : `tel:${value.replace(/[^\d+]/g, "")}`;
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <a href={href} className="flex min-w-0 items-center gap-2 text-sm text-[var(--peri)] hover:underline">
        <span className="shrink-0 text-[var(--ink-mute)]">{type === "email" ? Icons.mail(14) : Icons.phone(14)}</span>
        <span className="truncate">{value}</span>
      </a>
      <div className="flex shrink-0 items-center gap-1.5">
        {source && <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[var(--ink-mute)]">{source}</span>}
        <button onClick={() => navigator.clipboard?.writeText(value)}
          className="cursor-pointer rounded-md border border-white/15 px-2 py-0.5 text-[10px] text-[var(--ink-soft)] hover:bg-white/5">
          {t.common.copy}
        </button>
      </div>
    </li>
  );
}
function Panel({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--peri)]">{icon}{title}</div>
      {children}
    </section>
  );
}
function Chips({ items, tone, icon }: { items: string[]; tone?: "rose"; icon?: boolean }) {
  const cls = tone === "rose" ? "border-rose-500/25 bg-rose-500/10 text-rose-200" : "border-white/10 bg-white/5 text-[var(--ink-soft)]";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => (
        <span key={i} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${cls}`}>
          {icon && Icons.alert(12)}{it}
        </span>
      ))}
    </div>
  );
}
function ListBlock({ title, items, tone }: { title: string; items: string[]; tone?: "amber" }) {
  if (!items || items.length === 0) return null;
  const dot = tone === "amber" ? "bg-amber-400" : "bg-[var(--peri)]";
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-xs uppercase tracking-wide text-[var(--ink-mute)]">{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm text-[var(--ink-soft)]">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
function EmptyAgents({ running }: { running: boolean }) {
  const { t } = useLang();
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-[var(--peri)]">{Icons.bolt(20)}</div>
      <p className="text-sm text-[var(--ink-soft)]">{running ? t.detail.working2 : t.detail.noAgents}</p>
      {!running && <p className="mt-1 text-xs text-[var(--ink-mute)]">{t.detail.noAgentsHint}</p>}
    </div>
  );
}
function scoreCaption(score: number | null | undefined, t: Messages): string {
  if (score == null) return t.detail.capUnaudited;
  if (score >= 70) return t.detail.capHot;
  if (score >= 45) return t.detail.capGood;
  if (score >= 20) return t.detail.capMid;
  return t.detail.capCold;
}
