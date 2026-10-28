"use client";

import { useId } from "react";
import { J_TOP, J_BOTTOM, DOT } from "@/lib/logo-paths";

/*
 * The Juko mark as a loader. The paths were traced from the original logo artwork
 * (public/juko-mark.svg holds the same mark as a static file); viewBox 305.7 × 509.3.
 * A brand-gradient ring turns around the mark, a sheen runs across the J along its diagonal cut
 * and the dot bounces. With reduced motion it only breathes.
 */

export function LogoLoader({ size = 72, label, ring = true, className }: { size?: number; label?: string; ring?: boolean; className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = (name: string) => `ll-${name}-${id}`;
  return (
    <span className={["logo-loader", ring ? "" : "logo-loader--bare", className].filter(Boolean).join(" ")} role="status" aria-live="polite">
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={g("j")} gradientUnits="userSpaceOnUse" x1="150" y1="110" x2="20" y2="480">
            <stop offset="0" stopColor="#7ffcdb" /><stop offset=".2" stopColor="#5fd9df" /><stop offset=".35" stopColor="#49c2e3" /><stop offset=".5" stopColor="#4ea4dd" />
            <stop offset=".62" stopColor="#5878d3" /><stop offset=".74" stopColor="#6547ca" /><stop offset=".86" stopColor="#5e12a5" /><stop offset="1" stopColor="#530079" />
          </linearGradient>
          <linearGradient id={g("dot")} gradientUnits="userSpaceOnUse" x1="208" y1="470" x2="304" y2="455">
            <stop offset="0" stopColor="#7a14bd" /><stop offset=".45" stopColor="#5a6fd0" /><stop offset=".75" stopColor="#43bfe4" /><stop offset="1" stopColor="#4fdce2" />
          </linearGradient>
          <linearGradient id={g("ring")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#80ffdb" /><stop offset=".5" stopColor="#45bde3" /><stop offset="1" stopColor="#7752fe" />
          </linearGradient>
          <linearGradient id={g("shine")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".75" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={g("clip")}>
            <path d={J_TOP} /><path d={J_BOTTOM} />
          </clipPath>
        </defs>
        {ring && (
          <g className="logo-loader__ring">
            <circle cx="60" cy="60" r="55" fill="none" className="logo-loader__track" strokeWidth="3" />
            <circle cx="60" cy="60" r="55" fill="none" stroke={`url(#${g("ring")})`} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="95 251" className="logo-loader__arc" />
          </g>
        )}
        <g transform={ring ? "translate(38.4 24) scale(0.1414)" : "translate(30 10) scale(0.1963)"}>
          <g className="logo-loader__mark">
            <path fill={`url(#${g("j")})`} d={J_TOP} />
            <path fill={`url(#${g("j")})`} d={J_BOTTOM} />
            <g clipPath={`url(#${g("clip")})`}>
              <rect className="logo-loader__shine" x="-160" y="-60" width="160" height="640" fill={`url(#${g("shine")})`} />
            </g>
          </g>
          <path className="logo-loader__dot" fill={`url(#${g("dot")})`} d={DOT} />
        </g>
      </svg>
      {label && <span className="logo-loader__label">{label}</span>}
      {!label && <span className="sr-only">Loading</span>}
    </span>
  );
}
