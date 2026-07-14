/**
 * Lightweight website detectors run against the homepage HTML + response headers.
 *
 * Goal is signal, not certainty: pattern-match common vendors. Conservative —
 * we'd rather miss a niche widget than emit false positives that skew the score.
 */
import { fetchText } from "@/server/lib/http";

export type DetectResult = {
  reachable: boolean;
  httpStatus: number | null;
  hasHttps: boolean;
  hasChatWidget: boolean;
  chatVendor: string | null;
  isEcommerce: boolean;
  ecommercePlatform: string | null;
  techSignals: string[];
  emails: string[];
  phones: string[];
  fetchError: string | null;
};

// ── Contact extraction ──
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const MAILTO_RE = /mailto:([^"'?>\s]+)/gi;
const TEL_RE = /tel:([+0-9()\s.\-]{6,})/gi;
const WAME_RE = /wa\.me\/(\d{6,})/gi;
// Domains/fragments that are almost never a real business contact.
const EMAIL_BLOCK = [
  "sentry", "wix.com", "wixpress", "example.com", "example.org", "yourdomain",
  "yourcompany", "domain.com", "email.com", "googleapis", "schema.org", "w3.org",
  "cloudflare", "gstatic", "fonts.google", "placeholder", "sentry.io", ".png", ".jpg",
];

function extractEmails(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(MAILTO_RE)) addEmail(out, decodeURIComponent(m[1].split("?")[0]));
  for (const m of html.matchAll(EMAIL_RE)) addEmail(out, m[0]);
  return [...out].slice(0, 8);
}
function addEmail(set: Set<string>, raw: string) {
  const e = raw.trim().toLowerCase();
  if (!e || e.length > 80) return;
  if (/\.(png|jpe?g|gif|svg|webp|css|js|ico|woff2?)$/i.test(e)) return;
  if (EMAIL_BLOCK.some((b) => e.includes(b))) return;
  set.add(e);
}
function extractPhones(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(TEL_RE)) {
    const p = m[1].replace(/[^\d+]/g, "");
    if (p.replace(/\D/g, "").length >= 6) out.add(p);
  }
  for (const m of html.matchAll(WAME_RE)) out.add(`+${m[1]}`);
  return [...out].slice(0, 8);
}

// Chat / messaging widgets — pattern → vendor label.
const CHAT_PATTERNS: { vendor: string; re: RegExp }[] = [
  { vendor: "whatsapp", re: /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\/|chat\.whatsapp/i },
  { vendor: "messenger", re: /facebook\.com\/v\d+\/plugins\/customerchat|fb-customerchat|messenger\.com/i },
  { vendor: "intercom", re: /widget\.intercom\.io|intercomcdn|intercomSettings/i },
  { vendor: "tawk.to", re: /tawk\.to|embed\.tawk/i },
  { vendor: "crisp", re: /crisp\.chat|client\.crisp/i },
  { vendor: "drift", re: /drift\.com|js\.driftt/i },
  { vendor: "zendesk", re: /zopim|zdassets|zendesk\.com\/embeddable/i },
  { vendor: "livechat", re: /livechatinc\.com|cdn\.livechat/i },
  { vendor: "hubspot", re: /js\.hs-scripts|hubspot.*conversations/i },
  { vendor: "tidio", re: /tidio\.co|code\.tidio/i },
];

// E-commerce platforms / cart signals.
const ECOMMERCE_PATTERNS: { platform: string; re: RegExp }[] = [
  { platform: "shopify", re: /cdn\.shopify\.com|Shopify\.|myshopify\.com|shopify-section/i },
  { platform: "woocommerce", re: /woocommerce|wp-content\/plugins\/woocommerce|wc-ajax|add-to-cart/i },
  // Specific markers only — avoid `mage/` which false-matches "image/".
  { platform: "magento", re: /data-mage-init|Magento_|mage-init|\/static\/version\d+\/frontend\/|mage\/cookies|cdn\.magento/i },
  { platform: "prestashop", re: /prestashop|PrestaShop/i },
  { platform: "bigcommerce", re: /bigcommerce\.com|stencil-utils/i },
  { platform: "wix-stores", re: /wixstores|ecom-platform|wix.*stores/i },
  { platform: "squarespace-commerce", re: /squarespace.*commerce|sqs-commerce/i },
];

// Generic cart/checkout markers when no specific platform matched.
const GENERIC_CART = /add to cart|añadir al carrito|agregar al carrito|\/checkout|view cart|shopping cart|carrito de compra/i;

// General tech stack hints (informational).
const TECH_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "wordpress", re: /wp-content|wp-includes|wordpress/i },
  { name: "wix", re: /wix\.com|static\.wixstatic|_wixCssStates/i },
  { name: "squarespace", re: /squarespace|static1\.squarespace/i },
  { name: "webflow", re: /webflow\.com|wf-/i },
  { name: "react", re: /__NEXT_DATA__|data-reactroot|react-dom/i },
  { name: "google-analytics", re: /gtag\(|google-analytics\.com|googletagmanager/i },
];

function firstMatch<T extends { re: RegExp }>(haystack: string, list: T[]): T | null {
  return list.find((p) => p.re.test(haystack)) ?? null;
}

/**
 * Fetch the homepage and detect signals. Tries https first, falls back to http
 * to determine whether the site actually serves over TLS.
 */
export async function detectWebsite(websiteUrl: string): Promise<DetectResult> {
  const base: DetectResult = {
    reachable: false,
    httpStatus: null,
    hasHttps: false,
    hasChatWidget: false,
    chatVendor: null,
    isEcommerce: false,
    ecommercePlatform: null,
    techSignals: [],
    emails: [],
    phones: [],
    fetchError: null,
  };

  // Normalize to an absolute URL.
  // Normalize to a bare host and test HTTPS directly (a site can serve http
  // without redirecting yet still fully support https — Places often stores the
  // http:// URL). We try https first; only if the TLS/connection fails do we fall
  // back to http (and then it genuinely lacks working https).
  const host = websiteUrl.trim().replace(/^https?:\/\//i, "");
  const httpsUrl = `https://${host}`;
  const httpUrl = `http://${host}`;

  try {
    let res: Awaited<ReturnType<typeof fetchText>>;
    let viaHttps: boolean;
    try {
      res = await fetchText(httpsUrl, { provider: "website", timeoutMs: 15000, retries: 1 });
      viaHttps = true;
    } catch {
      // HTTPS didn't connect (no TLS) → fall back to plain http.
      res = await fetchText(httpUrl, { provider: "website", timeoutMs: 15000, retries: 1 });
      viaHttps = false;
    }
    base.reachable = res.ok || res.status > 0;
    base.httpStatus = res.status;
    // Has working HTTPS if the https request returned a response that didn't
    // downgrade back to http on redirect.
    base.hasHttps = viaHttps && res.finalUrl.startsWith("https://");

    const headerBlob = Object.entries(res.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const hay = `${res.body}\n${headerBlob}`;

    const chat = firstMatch(hay, CHAT_PATTERNS);
    if (chat) {
      base.hasChatWidget = true;
      base.chatVendor = chat.vendor;
    }

    const ecom = firstMatch(hay, ECOMMERCE_PATTERNS);
    if (ecom) {
      base.isEcommerce = true;
      base.ecommercePlatform = ecom.platform;
    } else if (GENERIC_CART.test(hay)) {
      base.isEcommerce = true;
      base.ecommercePlatform = "generic-cart";
    }

    base.techSignals = TECH_PATTERNS.filter((p) => p.re.test(hay)).map((p) => p.name);
    base.emails = extractEmails(res.body);
    base.phones = extractPhones(res.body);
  } catch (err) {
    base.fetchError = (err as Error).message;
    base.reachable = false;
  }

  return base;
}
