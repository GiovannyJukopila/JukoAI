import { getDict, type Locale } from "@/lib/i18n";
import { BoltIcon } from "../icons";
import { QuoteButton } from "../QuoteButton";
import { WhatsAppLink } from "../WhatsAppLink";
import { Reveal } from "../Reveal";

/* The closing call to action of the service pages: the ask on one side, what happens after it on the other. */
export function ServiceCta({ locale, title, lead, quote, needs }: { locale: Locale; title: string; lead: string; quote?: string; needs?: string[] }) {
  const dict = getDict(locale);
  const c = dict.contact;

  return (
    <Reveal className="svc-cta">
      <div className="svc-cta__ask">
        <span className="eyebrow">{c.eyebrow}</span>
        <h2 className="svc-cta__title">{title}</h2>
        <p className="svc-cta__lead">{lead}</p>
        <div className="svc-cta__actions">
          <QuoteButton className="btn btn--lg" needs={needs}><BoltIcon size={15} />{quote ?? dict.quote.cta}</QuoteButton>
          <WhatsAppLink className="btn btn--ghost btn--lg">{c.wa}</WhatsAppLink>
        </div>
        <p className="cta-promise">{dict.quote.promise}</p>
      </div>
      <div className="svc-cta__next">
        <h3>{c.nextTitle}</h3>
        <ol>
          {c.next.map((step, i) => (
            <li key={step.t}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <div><b>{step.t}</b><small>{step.d}</small></div>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
