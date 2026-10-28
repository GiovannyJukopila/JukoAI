import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Plus_Jakarta_Sans, JetBrains_Mono, Barlow_Condensed, Geist, Geist_Mono, Instrument_Serif, Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import "../work-screens.css";
import "../process-holo.css";
import "../theme-light.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Ambient } from "@/components/Ambient";
import { Cursor } from "@/components/Cursor";
import { WhatsAppFab } from "@/components/WhatsAppFab";
import { QuoteQuiz } from "@/components/QuoteQuiz";
import { SmoothScroll } from "@/components/SmoothScroll";
import { locales, isLocale, getDict, type Locale } from "@/lib/i18n";
import { SITE_URL, organizationLd, websiteLd } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { themeScript } from "@/lib/theme-script";
import { introScript } from "@/lib/intro-script";
import { IntroLoader } from "@/components/IntroLoader";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });

// Typefaces of the client products, used only inside the coded project screens (not preloaded).
const neoDisplay = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-neo", display: "swap", preload: false });
const neoMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-neo-mono", display: "swap", preload: false });
const comeca = Barlow_Condensed({ subsets: ["latin"], weight: ["300", "400", "600", "700"], variable: "--font-comeca", display: "swap", preload: false });
const noir = Geist({ subsets: ["latin"], variable: "--font-noir", display: "swap", preload: false });
const noirMono = Geist_Mono({ subsets: ["latin"], variable: "--font-noir-mono", display: "swap", preload: false });
const noirSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: "italic", variable: "--font-noir-serif", display: "swap", preload: false });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-outfit", display: "swap", preload: false });
const screenFonts = [neoDisplay, neoMono, comeca, noir, noirMono, noirSerif, outfit].map((f) => f.variable).join(" ");

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const lc: Locale = isLocale(locale) ? locale : "es";
  const seo = getDict(lc).seo;
  // pages set their own title, canonical and hreflang (lib/seo.ts); these are the site-wide defaults
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.homeTitle, template: "%s · Juko AI" },
    description: seo.homeDesc,
    applicationName: "Juko AI",
    openGraph: { type: "website", siteName: "Juko AI", title: seo.homeTitle, description: seo.homeDesc, images: [{ url: "/og.png", width: 1200, height: 630, alt: "Juko AI" }] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    // favicon / app icons by file convention: src/app/icon1.svg, icon2.png and apple-icon.png
  };
}

// browser chrome (mobile address bar) follows the device setting
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6fd" },
    { media: "(prefers-color-scheme: dark)", color: "#050410" },
  ],
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const lc = locale as Locale;

  return (
    // data-theme is set before the first paint by the inline script (light / dark / follow the system),
    // so the server's dark default can differ from the DOM at hydration
    <html lang={lc} data-theme="dark" className={`${display.variable} ${body.variable} ${screenFonts}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
      </head>
      <body>
        <JsonLd data={[organizationLd(lc), websiteLd()]} />
        <SmoothScroll />
        <Cursor />
        <Ambient />
        <IntroLoader locale={lc} />
        <Nav locale={lc} />
        <main>{children}</main>
        <WhatsAppFab />
        <QuoteQuiz locale={lc} />
        <Footer locale={lc} />
      </body>
    </html>
  );
}
