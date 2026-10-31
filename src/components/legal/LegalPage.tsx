import Link from "next/link";
import type { ReactNode } from "react";
import { getDict, type Locale } from "@/lib/i18n";
import { LEGAL, LEGAL_PATH, effectiveDate, getLegalDoc, type LegalBlock, type LegalKind } from "@/lib/legal";
import { Reveal } from "../Reveal";
import { RevealTitle } from "../scroll/RevealTitle";
import { ArrowLeft, ArrowUpRight } from "../icons";
import { WhatsAppLink } from "../WhatsAppLink";
import { LegalToc } from "./LegalToc";

const num = (i: number) => String(i + 1).padStart(2, "0");

// **bold** and [label](href) inside the texts; site paths go through Link
function rich(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const bold = part.match(/^\*\*(.+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[(.+)\]\((.+)\)$/);
    if (link) return link[2].startsWith("/") ? <Link key={i} href={link[2]}>{link[1]}</Link> : <a key={i} href={link[2]}>{link[1]}</a>;
    return part;
  });
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") return <p>{rich(block)}</p>;
  if ("list" in block) return <ul className="legal-list">{block.list.map((li) => <li key={li}>{rich(li)}</li>)}</ul>;
  return (
    <dl className="legal-facts">
      {block.facts.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v.includes("@") ? <a href={`mailto:${v}`}>{v}</a> : v}</dd></div>
      ))}
    </dl>
  );
}

/* The privacy policy and the terms share one reading layout: a calm hero, a sticky index and numbered sections. */
export function LegalPage({ kind, locale }: { kind: LegalKind; locale: Locale }) {
  const dict = getDict(locale);
  const lg = dict.legal;
  const doc = getLegalDoc(kind, locale);
  const tabs: { kind: LegalKind; label: string }[] = [
    { kind: "privacy", label: dict.footer.privacy },
    { kind: "terms", label: dict.footer.terms },
  ];

  return (
    <>
      <header className="legal-hero svc-wrap">
        <Link href={`/${locale}`} className="back-link"><ArrowLeft /> {lg.back}</Link>
        <span className="eyebrow">{lg.eyebrow}</span>
        <nav className="legal-tabs" aria-label={lg.eyebrow}>
          {tabs.map((t) => (
            <Link key={t.kind} href={`/${locale}${LEGAL_PATH[t.kind]}`} aria-current={t.kind === kind ? "page" : undefined}>{t.label}</Link>
          ))}
        </nav>
        <RevealTitle as="h1" className="legal-hero__title" text={doc.title} />
        <Reveal delay={0.2}>
          <p className="legal-hero__lead">{doc.lead}</p>
          <p className="legal-hero__meta">
            <span>{lg.version} {LEGAL.version}</span>
            <span>{lg.effective} {effectiveDate(locale)}</span>
          </p>
        </Reveal>
      </header>

      <div className="legal-body svc-wrap">
        <aside className="legal-body__side">
          <LegalToc items={doc.sections.map(({ id, title }) => ({ id, title }))} label={lg.toc} />
        </aside>

        <article className="legal-doc">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="legal-sec" aria-labelledby={`${s.id}-h`}>
              <span className="legal-sec__num" aria-hidden="true">{num(i)}</span>
              <h2 id={`${s.id}-h`}>{s.title}</h2>
              {s.blocks.map((b, j) => <Block key={j} block={b} />)}
            </section>
          ))}

          <aside className="legal-contact">
            <div>
              <h2>{lg.contactTitle}</h2>
              <p>{lg.contactLead}</p>
            </div>
            <div className="legal-contact__actions">
              <a className="btn" href={`mailto:${LEGAL.email}`}>{lg.contactEmail} <ArrowUpRight /></a>
              <WhatsAppLink className="btn btn--ghost">WhatsApp</WhatsAppLink>
            </div>
          </aside>

          <Link className="legal-other" href={`/${locale}${LEGAL_PATH[kind === "privacy" ? "terms" : "privacy"]}`}>
            <span>{lg.eyebrow}</span>{lg.other[kind]} <ArrowUpRight size={16} />
          </Link>
        </article>
      </div>
    </>
  );
}
