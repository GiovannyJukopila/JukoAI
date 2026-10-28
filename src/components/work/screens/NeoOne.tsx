import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { Ico, QrCode, StatusBar } from "./kit";

/*
 * NEO ONE, rebuilt in code from the real products and measured on their own
 * screenshots (neo-one-marketingWebsite/public/images/new-landing):
 *  - admin panel  → neo-one-admin DashboardPage (nl-01-dashboard)
 *  - member app   → neo-one-user-mobile home, wheel and QR (nl-02, nl-07, nl-08c)
 *  - scanner app  → neo-one-scanner-mobile home, amount and prizes (nl-04, nl-05)
 * Every measure is the app's own, in points, on a 390×844 canvas. The sample
 * businesses, logos and promo posters are the ones the NEO ONE site uses.
 */

const ASSET = "/projects/neo-one";

/* ---------- chart helpers (monotone curve, as recharts draws it) ---------- */
const PLOT_W = 600;
const PLOT_H = 200;
const h01 = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const dayValue = (d: number) =>
  Math.max(40, 112 + Math.sin((d * Math.PI * 2) / 7 - 1.2) * 34 + Math.sin(d * 0.23) * 9 + (h01(d) - 0.5) * 12);
const SERIES = Array.from({ length: 30 }, (_, i) => dayValue(i));
const MAX = 160;

function monotone(values: number[]) {
  const n = values.length;
  const step = PLOT_W / (n - 1);
  const xs = values.map((_, i) => i * step);
  const ys = values.map((v) => PLOT_H - (v / MAX) * PLOT_H);
  const s: number[] = [];
  for (let i = 0; i < n - 1; i++) s.push((ys[i + 1] - ys[i]) / step);
  const m = [s[0]];
  for (let i = 1; i < n - 1; i++) m.push(s[i - 1] * s[i] <= 0 ? 0 : (s[i - 1] + s[i]) / 2);
  m.push(s[n - 2]);
  const r = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${r(xs[0])} ${r(ys[0])}`;
  for (let i = 0; i < n - 1; i++) {
    d += ` C ${r(xs[i] + step / 3)} ${r(ys[i] + (m[i] * step) / 3)}, ${r(xs[i + 1] - step / 3)} ${r(ys[i + 1] - (m[i + 1] * step) / 3)}, ${r(xs[i + 1])} ${r(ys[i + 1])}`;
  }
  return d;
}
const LINE = monotone(SERIES);
const AREA = `${LINE} L ${PLOT_W} ${PLOT_H} L 0 ${PLOT_H} Z`;

/* =============================== admin panel =============================== */

const NAV: [string, string][] = [
  ["grid", "Dashboard"], ["users2", "Users"], ["briefcase", "Employees"], ["swap", "Transactions"], ["users", "Groups"],
  ["gift2", "Loyalty"], ["megaphone2", "Promos"], ["bell", "Broadcasting"], ["scan", "Readers"],
  ["file", "Templates"], ["palette", "App Branding"], ["file", "Reports"], ["building", "Company"],
];
const NAV_FOOT: [string, string][] = [["package", "Add-ons"], ["help", "Help"], ["settings", "Settings"], ["logout", "Sign out"], ["panel", "Collapse"]];
const KPIS = [
  { label: "Total members", value: "1.840", icon: "users2", accent: "#4274D9", sub: "All active loyalty users" },
  { label: "Txn today", value: "132", icon: "swap", accent: "#95CCDD", sub: "Live · resets at midnight" },
  { label: "Monthly revenue", value: "€18.420,00", icon: "wallet", accent: "#59C3A0", sub: "Live monthly revenue" },
  { label: "Active promos", value: "7", icon: "megaphone2", accent: "#F59E0B", sub: "Live campaigns" },
];
const STATS = [
  { label: "New users / mo", value: "96", sub: "Joined this month", icon: "userplus", accent: "#A78BFA" },
  { label: "Transactions YTD", value: "34.100", sub: "Year to date", icon: "calendar", accent: "#4274D9" },
  { label: "Txn this month", value: "3.840", sub: "Current month", icon: "swap", accent: "#95CCDD" },
  { label: "Cashback / mo", value: "€1.289,40", sub: "Rewarded to members this month", icon: "upright", accent: "#59C3A0" },
  { label: "Debits / mo", value: "€612,00", sub: "Redemptions & spend", icon: "earned", accent: "#F87171" },
];
const TX = [
  { who: "Elena Vella", type: "Credit", amount: "€ 4.80", cb: "+€ 0.34", time: "13:42" },
  { who: "Marco Borg", type: "Credit", amount: "€ 7.20", cb: "+€ 0.50", time: "13:25" },
  { who: "Julia Camilleri", type: "Debit", amount: "€ 3.50", cb: "−€ 3.50", time: "13:08" },
  { who: "Daniel Attard", type: "Credit", amount: "€ 12.40", cb: "+€ 0.87", time: "12:51" },
];

export function NeoPanel() {
  return (
    <div className="sx-panel">
      <aside className="sx-panel__side">
        <div className="sx-panel__brand">
          <Image src={`${ASSET}/cafe-aurora.webp`} alt="" width={34} height={34} className="sx-panel__logo" />
          <div><b>Café Aurora</b><small>Admin Panel</small></div>
        </div>
        <ul>
          {NAV.map(([icon, label], i) => (
            <li key={label} className={i === 0 ? "is-on" : undefined}><Ico name={icon} size={18} /> {label}</li>
          ))}
        </ul>
        <ul className="sx-panel__foot">
          {NAV_FOOT.map(([icon, label]) => <li key={label}><Ico name={icon} size={18} /> {label}</li>)}
        </ul>
      </aside>

      <div className="sx-panel__body">
        <header className="sx-panel__bar">
          <span className="sx-panel__chip">🇬🇧 EN <Ico name="down" size={12} /></span>
          <span className="sx-panel__round"><Ico name="sun" size={16} /></span>
          <span className="sx-panel__round"><Ico name="bell" size={16} /></span>
          <span className="sx-panel__avatar">C</span>
        </header>

        <main className="sx-panel__main">
          <div className="sx-panel__top">
            <div>
              <h3>Dashboard</h3>
              <p>Café Aurora</p>
            </div>
            <span className="sx-panel__live"><i /> <Ico name="pulse" size={13} /> Streaming</span>
          </div>

          <ul className="sx-panel__kpis">
            {KPIS.map((k) => (
              <li key={k.label} style={{ "--k": k.accent } as CSSProperties}>
                <div className="sx-panel__kpi-head"><span className="sx-panel__kpi-ico"><Ico name={k.icon} size={17} /></span><em>{k.label}</em></div>
                <b>{k.value}</b>
                <small>{k.sub}</small>
              </li>
            ))}
          </ul>

          <ul className="sx-panel__stats">
            {STATS.map((s) => (
              <li key={s.label} style={{ "--k": s.accent } as CSSProperties}>
                <em><Ico name={s.icon} size={13} /> {s.label}</em><b>{s.value}</b><small>{s.sub}</small>
              </li>
            ))}
          </ul>

          <div className="sx-panel__row">
            <section className="sx-panel__card sx-panel__chart">
              <header>
                <div><h4>Transaction Activity</h4><small>Last 30 days · day by day · updates live</small></div>
                <div className="sx-panel__toggles">
                  <div className="sx-panel__tabs"><span className="is-on">30 Days</span><span>This Month</span><span>Full Year</span></div>
                  <div className="sx-panel__tabs"><span className="is-on">Txn</span><span>€</span></div>
                </div>
              </header>
              <div className="sx-panel__plot">
                <ul>{[160, 120, 80, 40, 0].map((t) => <li key={t}>{t}</li>)}</ul>
                <svg viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="sx-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6D7CF0" stopOpacity=".28" /><stop offset="1" stopColor="#6D7CF0" stopOpacity="0" /></linearGradient>
                  </defs>
                  {[0, 50, 100, 150, 200].map((y) => <line key={y} x1="0" x2={PLOT_W} y1={y} y2={y} />)}
                  <path d={AREA} fill="url(#sx-area)" />
                  <path d={LINE} className="sx-panel__line" />
                </svg>
              </div>
              <div className="sx-panel__x"><span>26 Aug</span><span>02 Sept</span><span>09 Sept</span><span>16 Sept</span><span>23 Sept</span></div>
            </section>

            <section className="sx-panel__card sx-panel__quota">
              <div className="sx-panel__quota-head"><span><Ico name="bell" size={16} /></span><div><h4>Notifications</h4><small>Annual quota</small></div></div>
              <div className="sx-panel__meter-nums"><span>5.180 used</span><span>20.000 max</span></div>
              <div className="sx-panel__meter"><i style={{ width: "25.9%" }} /></div>
              <b>25,9%</b>
              <small>of annual quota used</small>
              <div className="sx-panel__left"><small>Remaining</small><b className="mono">14.820</b></div>
              <div className="sx-panel__scheme"><small>SCHEME</small><b>Cashback</b></div>
            </section>
          </div>

          <section className="sx-panel__card sx-panel__recent">
            <header><div><h4>Recent Transactions</h4><small>Last 8 entries · live</small></div><span className="sx-panel__btn">View all →</span></header>
            <div className="sx-panel__thead"><span>User</span><span>Type</span><span>Amount</span><span>Cashback</span><span>Time</span></div>
            {TX.map((t) => (
              <div key={t.who} className={`sx-panel__tr${t.type === "Debit" ? " is-debit" : ""}`}>
                <span><i>{t.who[0]}</i>{t.who}</span>
                <span><em>{t.type}</em></span>
                <span className="mono">{t.amount}</span>
                <span className="mono sx-panel__cb">{t.cb}</span>
                <span>24/09 · {t.time}</span>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

/* ================================ member app ================================ */

export type Scheme = "cashback" | "points" | "visits";
type Tile = "games" | "promos" | "how" | "help" | "vendors" | "groups";

const TILES: Record<Tile, { icon: string; label: string }> = {
  games: { icon: "gamepad", label: "Games" },
  promos: { icon: "tag2", label: "Promotions" },
  how: { icon: "percent2", label: "How it works" },
  help: { icon: "help", label: "How it works" },
  vendors: { icon: "store2", label: "Vendors" },
  groups: { icon: "users2", label: "Groups" },
};

const SCHEMES: Record<Scheme, { label: string; value: string; earned: string; redeemed: string; l1: string; l2: string; act: string; spend: string }> = {
  cashback: { label: "Available Cashback", value: "€42.60", earned: "€128.40", redeemed: "€85.80", l1: "Total Earned", l2: "Redeemed", act: "+€2.50", spend: "€50.00" },
  points: { label: "Points Balance", value: "2,480", earned: "4,100", redeemed: "1,620", l1: "Total Earned", l2: "Redeemed", act: "+250", spend: "€25.00" },
  visits: { label: "Visits", value: "7", earned: "2", redeemed: "27", l1: "Game Tokens", l2: "Visits", act: "+1 visit", spend: "€25.00" },
};

export interface MemberBrand {
  vendor: string;
  /** The business logo (a real file), shown on the balance card. */
  logo: string;
  user: string;
  /** The two brand tones: they tint the background, card, avatar and code button. */
  c1: string;
  c2: string;
  scheme: Scheme;
  tiles: Tile[];
  promo: string;
  /** Newer builds show the promo with a footer strip (targeting + details). */
  promoFooter?: boolean;
  offersTab?: string;
  codeTab?: string;
  /** Overrides for the balance figures (e.g. a branded build's own sample values). */
  values?: Partial<(typeof SCHEMES)[Scheme]>;
}

export const BRANDS: Record<"aurora" | "smash" | "blade", MemberBrand> = {
  aurora: {
    vendor: "Café Aurora", logo: `${ASSET}/cafe-aurora.webp`, user: "Sofia", c1: "#DC2626", c2: "#9D174D",
    scheme: "cashback", tiles: ["how", "vendors", "groups"], promo: `${ASSET}/promo-coffee.webp`, offersTab: "Offers",
  },
  smash: {
    vendor: "Smash Lane", logo: `${ASSET}/smash-lane.webp`, user: "Sofia", c1: "#F97316", c2: "#9A3412",
    scheme: "points", tiles: ["promos", "how", "vendors", "groups"], promo: `${ASSET}/promo-late-night.webp`, offersTab: "Rewards",
  },
  blade: {
    vendor: "Blade & Brass", logo: `${ASSET}/blade-brass.webp`, user: "Sofia", c1: "#C9A24A", c2: "#6B5320",
    scheme: "visits", tiles: ["games", "promos", "vendors", "groups"], promo: `${ASSET}/promo-first-cut.webp`, offersTab: "Rewards",
  },
};

const brandVars = (b: MemberBrand) => ({ "--b1": b.c1, "--b2": b.c2 }) as CSSProperties;

function TabBar({ offers = "Offers", code = "My code" }: { offers?: string; code?: string }) {
  return (
    <nav className="sx-tabs">
      <span className="is-on"><Ico name="house" size={22} />Home</span>
      <span><Ico name={offers === "Offers" ? "tag2" : "gift2"} size={22} />{offers}</span>
      <span className="sx-tabs__code"><i><Ico name="qrcode" size={25} stroke={2.2} /></i>{code}</span>
      <span><Ico name="history" size={22} />Activity</span>
      <span><Ico name="user" size={22} />Profile</span>
    </nav>
  );
}

function MemberHome({ brand }: { brand: MemberBrand }) {
  const v = { ...SCHEMES[brand.scheme], ...brand.values };
  return (
    <>
      <StatusBar />
      <div className="sx-home__greet">
        <div><small>Hello,</small><b>{brand.user}</b></div>
        <span className="sx-home__avatar">{brand.user[0]}</span>
      </div>

      <div className="sx-home__card">
        <div className="sx-home__vendor"><Image src={brand.logo} alt="" width={26} height={26} />{brand.vendor}</div>
        <small>{v.label}</small>
        <b className="mono">{v.value}</b>
        <div className="sx-home__split">
          <span><b className="mono">{v.earned}</b><small>{v.l1}</small></span>
          <span><b className="mono">{v.redeemed}</b><small>{v.l2}</small></span>
        </div>
      </div>

      <div className="sx-home__tiles" style={{ gridTemplateColumns: `repeat(${brand.tiles.length},1fr)` }}>
        {brand.tiles.map((t) => (
          <span key={t} className={`sx-tile sx-tile--${t}`}><i><Ico name={TILES[t].icon} size={22} /></i>{TILES[t].label}</span>
        ))}
      </div>

      <p className="sx-home__h">Promotions</p>
      <div className={`sx-promo${brand.promoFooter ? " sx-promo--footer" : ""}`}>
        <div className="sx-promo__art">
          <Image src={brand.promo} alt="" fill sizes="(max-width: 700px) 60vw, 360px" />
          {!brand.promoFooter && <span className="sx-promo__tag"><Ico name="tag2" size={13} /> OFFER</span>}
          {!brand.promoFooter && <em className="sx-promo__more">Details <Ico name="chevron" size={14} stroke={2.4} /></em>}
        </div>
        {brand.promoFooter && (
          <div className="sx-promo__foot">
            <span className="sx-promo__for"><Ico name="sparkle" size={13} /> FOR YOU <b>Members</b></span>
            <em>Details <Ico name="chevron" size={14} stroke={2.4} /></em>
          </div>
        )}
        <i className="sx-promo__notch sx-promo__notch--l" />
        <i className="sx-promo__notch sx-promo__notch--r" />
      </div>

      <p className="sx-home__h">Recent Activity</p>
      <div className="sx-home__row">
        <i><Ico name="earned" size={17} stroke={2.2} /></i>
        <span><b>Earned</b><small className="mono">20 Aug 2026, 14:12</small></span>
        <em><b className="mono">{v.act}</b><small className="mono">{v.spend}</small></em>
      </div>
    </>
  );
}

export function NeoMemberApp({ brand }: { brand: MemberBrand }) {
  return (
    <div className="sx-app" style={brandVars(brand)}>
      <span className="sx-app__tint" />
      <MemberHome brand={brand} />
      <TabBar offers={brand.offersTab} code={brand.codeTab} />
    </div>
  );
}

/* Personal QR: the bottom sheet the code button opens over the home screen. */
export function NeoMemberQr({ brand, code = "kXyg05ZJHY" }: { brand: MemberBrand; code?: string }) {
  return (
    <div className="sx-app" style={brandVars(brand)}>
      <span className="sx-app__tint" />
      <MemberHome brand={brand} />
      <TabBar offers={brand.offersTab} code={brand.codeTab} />
      <span className="sx-sheet__dim" />
      <div className="sx-sheet">
        <span className="sx-sheet__grip" />
        <small>{brand.vendor}</small>
        <h4>My QR</h4>
        <div className="sx-sheet__qr"><QrCode size={206} /></div>
        <p>Show this code at the till to earn and redeem</p>
        <span className="sx-sheet__code mono">{code} <Ico name="copy" size={15} /></span>
        <em><Ico name="sun" size={14} /> Screen brightness raised so the scanner can read it</em>
      </div>
    </div>
  );
}

/* ---------- the wheel (visits & games), as WheelGame paints it ---------- */

const PRIZES = ["Free espresso", "Croissant", "20% off", "Free latte", "Muffin", "Extra shot", "Cookie", "Cappuccino"];
const SEG_COLORS = ["#EF5350", "#FF7043", "#FFA726", "#FFCA28", "#9CCC65", "#66BB6A", "#26A69A", "#29B6F6"];
const inkFor = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#1A1330" : "#FFFFFF";
};
const SLICES = PRIZES.map((label, i) => {
  const r = 139, c = 139, seg = 360 / PRIZES.length;
  const a0 = ((-90 + i * seg) * Math.PI) / 180;
  const a1 = ((-90 + (i + 1) * seg) * Math.PI) / 180;
  const f = (n: number) => n.toFixed(2);
  const d = `M${c},${c} L${f(c + r * Math.cos(a0))},${f(c + r * Math.sin(a0))} A${r},${r} 0 0 1 ${f(c + r * Math.cos(a1))},${f(c + r * Math.sin(a1))} Z`;
  const mid = -90 + i * seg + seg / 2;
  const m = (mid * Math.PI) / 180;
  const norm = ((mid % 360) + 360) % 360;
  return { d, label, fill: SEG_COLORS[i], ink: inkFor(SEG_COLORS[i]), x: f(c + r * 0.62 * Math.cos(m)), y: f(c + r * 0.62 * Math.sin(m)), rot: norm > 90 && norm < 270 ? mid + 180 : mid };
});

export function NeoWheel() {
  return (
    <div className="sx-app sx-app--game">
      <span className="sx-app__tint" />
      <StatusBar />
      <div className="sx-game__bar"><Ico name="back" size={22} /><b>Play the Wheel</b></div>
      <div className="sx-game">
        <span className="sx-game__tokens">3 tokens to play</span>
        <div className="sx-game__wheel">
          <div className="sx-game__bezel">
            <div className="sx-game__disc">
              <svg viewBox="0 0 278 278">
                <circle cx="139" cy="139" r="139" fill="#1E1147" />
                {SLICES.map((s) => (
                  <g key={s.label}>
                    <path d={s.d} fill={s.fill} stroke="rgba(118,125,134,0.55)" strokeWidth="1" />
                    <text x={s.x} y={s.y} fill={s.ink} transform={`rotate(${s.rot} ${s.x} ${s.y})`} textAnchor="middle" dominantBaseline="central">{s.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <span className="sx-game__hub"><span>⭐</span></span>
          <svg className="sx-game__pointer" viewBox="0 0 30 26"><path d="M0 0 H30 L15 26 Z" /></svg>
          <div className="sx-game__win"><i>YOU WON</i><b>Free espresso</b></div>
        </div>
        <span className="sx-game__spin">SPIN</span>
      </div>
    </div>
  );
}

/* ================================ scanner app ================================ */

function ScanHeader({ back, name, scheme, logo }: { back?: boolean; name: string; scheme: string; logo: string }) {
  return (
    <header className="sx-scan__head">
      {back && <span className="sx-scan__btn"><Ico name="back" size={20} /></span>}
      <Image src={logo} alt="" width={34} height={34} className="sx-scan__logo" />
      <div><b>{name}</b><small>{scheme}</small></div>
      <span className="sx-scan__btn sx-scan__more"><Ico name="dots" size={20} stroke={2.6} /></span>
    </header>
  );
}

function ScanFrame({ children, time = "12:28" }: { children: ReactNode; time?: string }) {
  return (
    <div className="sx-scan">
      <span className="sx-scan__orb sx-scan__orb--a" />
      <span className="sx-scan__orb sx-scan__orb--b" />
      <StatusBar tone="dark" time={time} back="Neo One" />
      {children}
      <span className="sx-scan__home" />
    </div>
  );
}

/* Scanner home: find the customer by QR, email or phone, or play as a guest. */
export function NeoScanner() {
  return (
    <ScanFrame>
      <ScanHeader name="Blade & Brass" scheme="Visits & Gamification" logo={`${ASSET}/blade-brass.webp`} />
      <div className="sx-scan__idle">
        <div className="sx-scan__modes">
          <span className="is-on"><Ico name="grid" size={17} /> Scan</span>
          <span><Ico name="mail" size={17} /> Email</span>
          <span><Ico name="phone" size={17} /> Phone</span>
        </div>
        <div className="sx-scan__hero">
          <svg className="sx-scan__hero-qr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 7V4.5A1.5 1.5 0 014.5 3H7M17 3h2.5A1.5 1.5 0 0121 4.5V7M21 17v2.5a1.5 1.5 0 01-1.5 1.5H17M7 21H4.5A1.5 1.5 0 013 19.5V17" />
            <rect x="6.5" y="6.5" width="4" height="4" rx=".5" /><rect x="13.5" y="6.5" width="4" height="4" rx=".5" /><rect x="6.5" y="13.5" width="4" height="4" rx=".5" />
            <path d="M14 14h1.5M16.5 15.5V17M14 17h.01M17 14h.01" />
          </svg>
          <span className="sx-scan__pill"><Ico name="camera" size={15} /> Tap to scan</span>
        </div>
        <p className="sx-scan__title">Tap to scan</p>
        <p className="sx-scan__hint">Point the camera at the customer&apos;s QR code. It&apos;s detected automatically.</p>
        <div className="sx-scan__find"><span className="mono">Or enter the customer code</span><b>Find</b></div>
        <p className="sx-scan__or"><span>OR PLAY WITHOUT AN ACCOUNT</span></p>
        <div className="sx-scan__guest">
          <i><Ico name="gamepad" size={24} /></i>
          <div><b>Play &amp; Earn as guest</b><small>No account needed · prize handed over on the spot</small></div>
          <Ico name="chevron" size={20} stroke={2.4} />
        </div>
      </div>
    </ScanFrame>
  );
}

/* Scanner, cashback business: the purchase amount for a customer. */
export function NeoScannerAmount() {
  return (
    <ScanFrame time="12:31">
      <ScanHeader back name="Café Aurora" scheme="Cashback" logo={`${ASSET}/cafe-aurora.webp`} />
      <div className="sx-scan__body">
        <div className="sx-scan__customer">
          <span className="sx-scan__cav">E</span>
          <div><b>Elena Vella</b><small className="mono">elena.v@gmail.com</small></div>
          <div className="sx-scan__bal"><small>CASHBACK</small><b className="mono">€42.60</b></div>
          <span className="sx-scan__info"><Ico name="info" size={18} /></span>
        </div>
        <div className="sx-scan__ops">
          <span className="is-on"><Ico name="up" size={15} /> Add cashback</span>
          <span><Ico name="downc" size={15} /> Redeem cashback</span>
        </div>
        <div className="sx-scan__display"><small>PURCHASE AMOUNT</small><b className="mono">€50.00</b></div>
        <div className="sx-scan__pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map((k) => <span key={k} className={k === "0" ? "is-down" : undefined}>{k}</span>)}
        </div>
        <div className="sx-scan__ref">Reference number (optional)</div>
      </div>
      <div className="sx-scan__cta"><Ico name="plus" size={18} stroke={2.4} /> Add €2.50 cashback</div>
    </ScanFrame>
  );
}

/* Scanner, visits business: redeem the prizes a customer won in the games. */
export function NeoScannerPrizes() {
  const prizes: [string, boolean][] = [["10% OFF", true], ["Free Cut", false], ["10% OFF", false], ["50% OFF", false]];
  return (
    <ScanFrame time="12:29">
      <ScanHeader back name="Blade & Brass" scheme="Visits & Gamification" logo={`${ASSET}/blade-brass.webp`} />
      <div className="sx-scan__body">
        <div className="sx-scan__customer">
          <span className="sx-scan__cav">V</span>
          <div><b>Visit User</b><small className="mono">visituser@hotmail.com</small></div>
          <div className="sx-scan__bal sx-scan__bal--tokens"><small>TOKENS</small><b className="mono">28</b></div>
          <span className="sx-scan__info"><Ico name="info" size={18} /></span>
        </div>
        <div className="sx-scan__ops sx-scan__ops--3">
          <span><Ico name="up" size={15} /> Record visit</span>
          <span className="is-on is-amber"><Ico name="downc" size={15} /> Redeem prizes</span>
          <span><Ico name="gamepad" size={15} /> Play &amp; Earn</span>
        </div>
        <div className="sx-scan__list-head"><b>Redeem earned prizes</b><span className="mono">1 selected</span></div>
        <div className="sx-scan__prizes">
          {prizes.map(([p, on], i) => (
            <div key={i} className={on ? "is-on" : undefined}>
              <i><Ico name="trophy" size={22} /></i>
              <span><b>{p}</b><em className="mono">Prize</em></span>
              <u>{on && <Ico name="check" size={16} stroke={2.6} />}</u>
            </div>
          ))}
        </div>
        <div className="sx-scan__ref">Reference number (required)</div>
      </div>
      <div className="sx-scan__cta"><Ico name="trophy" size={18} /> Redeem 1 prize</div>
    </ScanFrame>
  );
}
