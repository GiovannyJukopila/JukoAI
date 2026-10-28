import Image from "next/image";
import type { ServiceIcon, Platform } from "@/lib/content";

// jukoLogo.png intrinsic ratio (3057 × 5093 ≈ 0.6 w/h)
const LOGO_RATIO = 0.6;

const base = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ServiceGlyph({ name }: { name: ServiceIcon }) {
  switch (name) {
    case "ai":
      return (<svg {...base}><path d="M12 3v18M4 7l8-4 8 4M4 7v10l8 4 8-4V7" /></svg>);
    case "web":
      return (<svg {...base}><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 9h18M8 18v3M16 18v3M5 21h14" /></svg>);
    case "mobile":
      return (<svg {...base}><rect x="7" y="2" width="10" height="20" rx="2.5" /><path d="M11 18h2" /></svg>);
    case "cloud":
      return (<svg {...base}><path d="M20 17.6A5 5 0 0018 8h-1.3A7 7 0 104 15.7" /><path d="M12 13v8M9 18l3 3 3-3" /></svg>);
    case "integration":
      return (<svg {...base}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></svg>);
    case "design":
      return (<svg {...base}><path d="M12 2l2.4 5.6L20 8.5l-4 4 1 6-5-3-5 3 1-6-4-4 5.6-.9z" /></svg>);
    case "search":
      return (<svg {...base}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20.5 20.5l-5.2-5.2M10.5 7.5v1.2M10.5 12.3v1.2M7.5 10.5h1.2M12.3 10.5h1.2" /></svg>);
  }
}

export function ArrowUpRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 12L12 4M6 4h6v6" />
    </svg>
  );
}

export function ArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 8H4M7 4L3 8l4 4" />
    </svg>
  );
}

export function Check({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5L6.5 12 13 4" />
    </svg>
  );
}

export function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.21-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8-1.29-1.82-2.32-4.63-2.32-7.28 0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.87 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z" />
    </svg>
  );
}

export function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.61 1.81 13.79 12 3.61 22.19a2 2 0 0 1-.61-1.45V3.26c0-.57.23-1.08.61-1.45zM14.85 13.06l2.3 2.3-10.9 6.3 8.6-8.6zm3.6-3.6 2.74 1.58c.98.57.98 1.35 0 1.92l-2.74 1.58L15.9 12l2.55-2.54zM6.25 2.34l10.9 6.3-2.3 2.3-8.6-8.6z" />
    </svg>
  );
}

export function GlobeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function PlatformIcon({ platform, size = 14 }: { platform: Platform; size?: number }) {
  if (platform === "iOS") return <AppleIcon size={size} />;
  if (platform === "Android") return <PlayIcon size={size} />;
  return <GlobeIcon size={size} />;
}

export function LogoMark({ size = 28, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/jukoLogo.png"
      alt="Juko AI"
      width={Math.round(size * LOGO_RATIO)}
      height={size}
      priority={priority}
      style={{ width: "auto", height: size, display: "block" }}
    />
  );
}

/* The four promises under the hero call to action (lucide outlines). */
export type PillarName = "advice" | "quality" | "security" | "growth";
export function PillarIcon({ name, size = 16 }: { name: PillarName; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "advice":
      return (<svg {...props}><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" /><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" /></svg>);
    case "quality":
      return (<svg {...props}><path d="M6 3h12l4 6-10 13L2 9Z" /><path d="M11 3 8 9l4 13 4-13-3-6" /><path d="M2 9h20" /></svg>);
    case "security":
      return (<svg {...props}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>);
    case "growth":
      return (<svg {...props}><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></svg>);
  }
}

/* Theme picker: system / light / dark (lucide outlines). */
export type ThemeIconName = "system" | "light" | "dark";
export function ThemeIcon({ name, size = 16 }: { name: ThemeIconName; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "system":
      return (<svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>);
    case "light":
      return (<svg {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>);
    case "dark":
      return (<svg {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>);
  }
}

/* A bolt: the fast quote. */
export function BoltIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.2 2.3a.6.6 0 0 1 1 .6L12.6 10h6.1a.6.6 0 0 1 .5 1l-8.6 10.7a.6.6 0 0 1-1-.6L11.4 14H5.3a.6.6 0 0 1-.5-1z" />
    </svg>
  );
}
