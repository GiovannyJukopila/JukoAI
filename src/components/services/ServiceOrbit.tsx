import type { CSSProperties } from "react";
import type { ServiceIcon } from "@/lib/content";
import { ServiceGlyph } from "../icons";
import { Orb } from "../Orb";

/*
 * A service's emblem: its glyph in the AI orb of the process console, with the tools it uses riding two slow orbits.
 * Pure CSS: the rings turn and each chip turns back so its label stays upright. Still with reduced motion.
 */
export function ServiceOrbit({ icon, stack, label }: { icon: ServiceIcon; stack: string[]; label: string }) {
  const inner = stack.slice(0, 3);
  const outer = stack.slice(3);
  const ring = (items: string[], offset: number) =>
    items.map((t, i) => (
      <span key={t} className="svc-orbit__chip" style={{ "--a": `${offset + (i * 360) / items.length}deg` } as CSSProperties}>
        <b>{t}</b>
      </span>
    ));

  return (
    <div className="svc-orbit" role="img" aria-label={`${label}: ${stack.join(", ")}`}>
      <div className="svc-orbit__glow" />
      <div className="svc-orbit__ring svc-orbit__ring--outer">{ring(outer, 20)}</div>
      <div className="svc-orbit__ring svc-orbit__ring--inner">{ring(inner, -90)}</div>
      <div className="svc-orbit__core"><Orb><ServiceGlyph name={icon} /></Orb></div>
    </div>
  );
}
