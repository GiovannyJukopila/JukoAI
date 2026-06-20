import type { ServiceIcon } from "@/lib/content";

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

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="jukoLg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8E8FFA" />
          <stop offset="1" stopColor="#7752FE" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="28" height="28" rx="9" fill="none" stroke="url(#jukoLg)" strokeWidth="2" />
      <path d="M21 9v9.2c0 2.7-1.9 4.6-4.7 4.6-2.5 0-4.3-1.5-4.7-3.8" fill="none" stroke="url(#jukoLg)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
