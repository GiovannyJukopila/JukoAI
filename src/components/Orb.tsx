import type { ReactNode } from "react";

// An AI orb: a liquid core that swirls and breathes, a scanning ring and a few particles on tilted
// orbits, with its name in the middle. In the process console step 01 thinks the idea over and step 04
// is the AI itself; on a service's page it holds the service's glyph. Styles: .hl-orb in process-holo.css.
export function Orb({ variant, children }: { variant?: "ai"; children: ReactNode }) {
  return (
    <div className={`hl-orb${variant ? ` hl-orb--${variant}` : ""}`}>
      <i className="hl-orb__halo" />
      <svg className="hl-orb__rings" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="96" className="hl-orb__ticks" />
        <circle cx="100" cy="100" r="84" className="hl-orb__track" />
        <circle cx="100" cy="100" r="84" className="hl-orb__scan" />
      </svg>
      <div className="hl-orb__body">
        <i className="hl-orb__swirl" />
        <i className="hl-orb__swirl hl-orb__swirl--2" />
        <i className="hl-orb__light" />
        <i className="hl-orb__gloss" />
      </div>
      {[0, 1, 2].map((k) => (
        <span key={k} className={`hl-orb__orbit hl-orb__orbit--${k}`}><span><i /></span></span>
      ))}
      <div className="hl-orb__center">{children}</div>
    </div>
  );
}
