import Image from "next/image";

/* Shared pieces of the coded product screens: status bar, icons, QR, brand marks. */

export function StatusBar({ time = "9:41", tone = "light", back }: { time?: string; tone?: "light" | "dark"; back?: string }) {
  return (
    <div className={`sx-status sx-status--${tone}${back ? " sx-status--back" : ""}`}>
      <b>{time}{back && <small>◀ {back}</small>}</b>
      <span>
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="6" width="3" height="6" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.3-1.3A10.6 10.6 0 008 .4 10.6 10.6 0 00.5 3.4l1.3 1.3A8.8 8.8 0 018 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.5L13 6a7.2 7.2 0 00-10 0l1.3 1.3c1-1 2.3-1.5 3.7-1.5zm0 3.6c.5 0 1 .2 1.3.5L8 11.6 6.7 9.9c.3-.3.8-.5 1.3-.5z" /></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="22" height="12" rx="3.5" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="19" height="9" rx="2" fill="currentColor" /><path d="M24.5 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45" /></svg>
      </span>
    </div>
  );
}

const ICONS: Record<string, string> = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  users: "M16 19v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 17.5V19M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 19v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 4.15a3.5 3.5 0 010 6.7",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  swap: "M7 7h13l-4-4M17 17H4l4 4",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  tag: "M3 12V4h8l9 9-8 8-9-9zM7.5 7.5h.01",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7S10.5 3 8 4s1 3 4 3zm0 0s1.5-4 4-3-1 3-4 3z",
  megaphone: "M4 10v4h3l6 4V6L7 10H4zM17 9a4 4 0 010 6",
  scan: "M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6",
  palette: "M12 3a9 9 0 100 18c1 0 1.5-.8 1.5-1.5 0-1.2-1-1.5-1-2.5s.8-1.5 1.8-1.5H17a4 4 0 004-4c0-4.7-4-8.5-9-8.5zM7.5 11h.01M10 7h.01M15 7h.01",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  building: "M5 21V4h10v17M15 9h4v12M9 8h2M9 12h2M9 16h2",
  bell: "M6 16V11a6 6 0 1112 0v5l2 2H4l2-2zM10 21h4",
  percent: "M19 5L5 19M7 9a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z",
  store: "M4 9l1.5-5h13L20 9M4 9h16v11H4zM9 20v-6h6v6",
  home: "M4 11l8-7 8 7v9H4zM10 20v-6h4v6",
  offer: "M3 12V4h8l9 9-8 8-9-9zM7.5 7.5h.01",
  activity: "M6 4h12v16H6zM9 9h6M9 13h6M9 17h3",
  profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2",
  info: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  chevron: "M9 6l6 6-6 6",
  back: "M15 6l-6 6 6 6",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  phone: "M6 3h4l2 5-2.5 1.5a11 11 0 005 5L16 12l5 2v4a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z",
  check: "M5 12.5l4.5 4.5L19 7",
  dots: "M12 6h.01M12 12h.01M12 18h.01",
  game: "M6 9h12a3 3 0 013 3v2a3 3 0 01-5.2 2L14 14h-4l-1.8 2A3 3 0 013 14v-2a3 3 0 013-3zM8 11v3M6.5 12.5h3M16 12h.01M18 13.5h.01",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4",
  down: "M6 9l6 6 6-6",
  menu: "M4 7h16M4 12h16M4 17h16",
  lock: "M6 11h12v10H6zM8 11V8a4 4 0 018 0v3",
  house: "M15 21v-8a1 1 0 00-1-1h-4a1 1 0 00-1 1v8M3 10a2 2 0 01.709-1.528l7-6a2 2 0 012.582 0l7 6A2 2 0 0121 10v9a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  gift2: "M3 8h18v4H3zM12 8v13M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7M7.5 8a2.5 2.5 0 010-5C9.5 3 11 5 12 8c1-3 2.5-5 4.5-5a2.5 2.5 0 010 5",
  history: "M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2",
  user: "M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  tag2: "M12.586 2.586A2 2 0 0011.172 2H4a2 2 0 00-2 2v7.172a2 2 0 00.586 1.414l8.704 8.704a2.426 2.426 0 003.42 0l6.58-6.58a2.426 2.426 0 000-3.42zM7.5 8a.5.5 0 100-1 .5.5 0 000 1z",
  percent2: "M19 5L5 19M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM17.5 20a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  store2: "M15 21v-5a1 1 0 00-1-1h-4a1 1 0 00-1 1v5M17.774 10.31a1.12 1.12 0 00-1.549 0 2.5 2.5 0 01-3.451 0 1.12 1.12 0 00-1.548 0 2.5 2.5 0 01-3.452 0 1.12 1.12 0 00-1.549 0 2.5 2.5 0 01-3.77-3.248l2.889-4.184A2 2 0 017 2h10a2 2 0 011.653.873l2.895 4.192a2.5 2.5 0 01-3.774 3.244M4 10.95V19a2 2 0 002 2h12a2 2 0 002-2v-8.05",
  users2: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  gamepad: "M6 11h4M8 9v4M15 12h.01M18 10h.01M17.32 5H6.68a4 4 0 00-3.978 3.59C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0017.32 5z",
  help: "M12 22a10 10 0 100-20 10 10 0 000 20zM9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01",
  earned: "M7 7l10 10M17 7v10H7",
  qrcode: "M3 3h5v5H3zM16 3h5v5h-5zM3 16h5v5H3zM21 16h-3a2 2 0 00-2 2v3M21 21v.01M12 7v3a2 2 0 01-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1",
  camera: "M14.5 4h-5L7 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2h-3l-2.5-3zM12 16a3 3 0 100-6 3 3 0 000 6z",
  trophy: "M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z",
  up: "M12 22a10 10 0 100-20 10 10 0 000 20zM16 12l-4-4-4 4M12 16V8",
  downc: "M12 22a10 10 0 100-20 10 10 0 000 20zM8 12l4 4 4-4M12 8v8",
  plus: "M5 12h14M12 5v14",
  refresh: "M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5",
  copy: "M10 8h10a2 2 0 012 2v10a2 2 0 01-2 2H10a2 2 0 01-2-2V10a2 2 0 012-2zM4 16a2 2 0 01-2-2V4a2 2 0 012-2h10a2 2 0 012 2",
  package: "M16.5 9.4L7.55 4.24M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  panel: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM9 3v18",
  wallet: "M19 7V4a1 1 0 00-1-1H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2a1 1 0 00-1-1M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-4",
  userplus: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6",
  calendar: "M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18",
  upright: "M7 17L17 7M7 7h10v10",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  megaphone2: "M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
};

export function Ico({ name, size = 18, stroke = 1.8 }: { name: keyof typeof ICONS | string; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name] ?? ICONS.dots} />
    </svg>
  );
}

/* Deterministic QR-looking matrix (decorative): three finder patterns + hashed modules. */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const QR_N = 25;
const QR_CELLS = (() => {
  const cells: [number, number][] = [];
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > QR_N - 9 && y < 8) || (x < 8 && y > QR_N - 9);
  for (let y = 0; y < QR_N; y++)
    for (let x = 0; x < QR_N; x++) if (!inFinder(x, y) && hash(y * QR_N + x) > 0.52) cells.push([x, y]);
  return cells;
})();

export function QrCode({ size = 200, color = "#0B1220" }: { size?: number; color?: string }) {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.6" fill={color} />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="1.1" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx=".7" fill={color} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${QR_N} ${QR_N}`} shapeRendering="geometricPrecision">
      {QR_CELLS.map(([x, y]) => <rect key={`${x}.${y}`} x={x + 0.08} y={y + 0.08} width=".84" height=".84" rx=".22" fill={color} />)}
      {finder(0, 0)}{finder(QR_N - 7, 0)}{finder(0, QR_N - 7)}
    </svg>
  );
}

/* ---------- Brand marks ---------- */

// Coosalud mark, from coosalud-web/src/components/coosalud-mark.tsx (the SVG the Coosalud site itself uses).
export function CoosaludMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="140 140 975 1045" fill="none" strokeLinecap="round">
      <path d="M528.5 634.8A222 222 0 1 1 835.8 377.0" stroke="#FAAD1A" strokeWidth="121" />
      <path d="M707.7 588.7A219 219 0 1 1 773.6 982.9" stroke="#00A3AD" strokeWidth="125" />
      <path d="M652.9 776.4A220 220 0 1 1 285.7 620.6" stroke="#76B843" strokeWidth="123" />
      <path d="M562 1120H690" stroke="#76B843" strokeWidth="113" />
    </svg>
  );
}


/* A real logo file (NEO ONE, its scanner, Digiclub, COMECA…), never a redrawn one. */
export function LogoMark({ src, size = 48, round = true }: { src: string; size?: number; round?: boolean }) {
  return (
    <span className={`logo-mark${round ? " logo-mark--round" : ""}`} style={{ width: size, height: size }}>
      <Image src={src} alt="" fill sizes={`${size * 2}px`} />
    </span>
  );
}
