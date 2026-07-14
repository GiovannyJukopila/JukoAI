"use client";
/**
 * Lightweight, theme-matched chart primitives (no external deps). Responsive,
 * dark-mode, tabular numbers, hover tooltips via native <title>. Built for the
 * prospect analytics panels.
 */
import type { ReactNode } from "react";

export const PALETTE = ["#7752FE", "#8E8FFA", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#22d3ee"];

export function ChartCard({ title, hint, children, className }: { title: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`pa-card p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-white">
          <span aria-hidden="true" className="h-3.5 w-1 rounded-full bg-gradient-to-b from-[var(--sky)] to-[var(--violet)]" />
          {title}
        </h3>
        {hint && <span className="shrink-0 text-[11px] text-[var(--ink-mute)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

type Item = { label: string; value: number; sub?: string; color?: string };

/**
 * Horizontal bars — ideal for ranked categorical data (countries, categories, zones).
 * When `onBarClick` is provided, each row becomes a keyboard-accessible button
 * (drill-down) with hover/active affordance and a chevron. `activeLabel` marks the
 * currently-selected row.
 */
export function HBar({
  data, color = "var(--violet)", labelW = 112, onBarClick, activeLabel,
}: {
  data: Item[];
  color?: string | ((v: number, i: number) => string);
  labelW?: number;
  onBarClick?: (index: number) => void;
  activeLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const c = d.color ?? (typeof color === "function" ? color(d.value, i) : color);
        const clickable = !!onBarClick;
        const active = activeLabel != null && d.label === activeLabel;
        const inner = (
          <>
            <span
              className={`shrink-0 truncate text-xs ${active ? "text-white" : "text-[var(--ink-soft)]"} ${clickable ? "group-hover:text-white" : ""}`}
              style={{ width: labelW }}
              title={d.label}
            >
              {d.label}
            </span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/[0.06]">
              <div
                className="h-full rounded-md transition-[width] duration-700"
                style={{ width: `${(d.value / max) * 100}%`, background: c }}
                title={`${d.label}: ${d.value}`}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-white">
              {d.value}{d.sub ? <span className="text-[var(--ink-mute)]"> {d.sub}</span> : null}
            </span>
            {clickable && (
              <span className="w-3 shrink-0 text-[var(--ink-mute)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">›</span>
            )}
          </>
        );
        if (clickable) {
          return (
            <button
              key={d.label}
              type="button"
              onClick={() => onBarClick!(i)}
              aria-label={`${d.label}: ${d.value}`}
              aria-pressed={active}
              className={`group -mx-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--peri)]/50 ${active ? "bg-white/[0.05]" : ""}`}
            >
              {inner}
            </button>
          );
        }
        return (
          <div key={d.label} className="flex items-center gap-2">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

/** Vertical bars — distribution / histogram. */
export function VBars({ data, height = 150 }: { data: Item[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <Empty />;
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="font-mono text-[11px] tabular-nums text-white">{d.value}</span>
          <div className="w-full rounded-t-md transition-[height] duration-700" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, background: d.color ?? "var(--violet)" }} title={`${d.label}: ${d.value}`} />
          <span className="text-center text-[10px] leading-tight text-[var(--ink-mute)]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Donut with legend + optional center figure. */
export function Donut({ data, size = 156, centerLabel, centerValue }: { data: Item[]; size?: number; centerLabel?: string; centerValue?: ReactNode }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const stroke = 18, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  // Precompute each slice's length + cumulative start offset (no render-time mutation).
  const slices = data.reduce<{ d: Item; len: number; offset: number }[]>((acc, d) => {
    const len = (d.value / total) * circ;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    acc.push({ d, len, offset });
    return acc;
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke} />
          {slices.map(({ d, len, offset }) => (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color ?? "var(--violet)"} strokeWidth={stroke} strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} strokeLinecap="butt"><title>{`${d.label}: ${d.value}`}</title></circle>
          ))}
        </svg>
        {(centerValue != null || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xl font-semibold tabular-nums text-white">{centerValue}</span>
            {centerLabel && <span className="text-[10px] uppercase tracking-wide text-[var(--ink-mute)]">{centerLabel}</span>}
          </div>
        )}
      </div>
      <ul className="space-y-1.5 text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-[var(--ink-soft)]">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color ?? "var(--violet)" }} />
            {d.label} <span className="font-mono tabular-nums text-[var(--ink-mute)]">{d.value} · {Math.round((d.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Stacked horizontal bars — composition per row (e.g. covered vs pending). */
export function StackedHBar({ data, labelW = 96 }: { data: { label: string; right?: string; segments: { value: number; color: string; label: string }[] }[]; labelW?: number }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="space-y-2">
      {data.map((row) => {
        const total = row.segments.reduce((a, s) => a + s.value, 0) || 1;
        return (
          <div key={row.label} className="flex items-center gap-2">
            <span className="shrink-0 truncate text-xs text-[var(--ink-soft)]" style={{ width: labelW }} title={row.label}>{row.label}</span>
            <div className="flex h-5 flex-1 overflow-hidden rounded-md bg-white/[0.06]">
              {row.segments.map((s, i) => s.value > 0 && (
                <div key={i} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value}`} />
              ))}
            </div>
            {row.right && <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--ink-soft)]">{row.right}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Empty() {
  return <p className="py-6 text-center text-xs text-[var(--ink-mute)]">Sin datos todavía.</p>;
}
