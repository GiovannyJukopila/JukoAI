import { getDict, type Locale } from "@/lib/i18n";
import { Reveal } from "./Reveal";
import { RevealTitle } from "./scroll/RevealTitle";
import { QuoteButton } from "./QuoteButton";
import { BoltIcon } from "./icons";
import { WhatsAppLink } from "./WhatsAppLink";

/*
 * FAQ: the questions clients ask before starting, as a native accordion (one open at a time).
 * The answers live in the HTML, and the home also publishes them as FAQPage data (lib/seo.ts),
 * so search and answer engines can quote them.
 */
export function Faq({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const t = dict.faq;
  return (
    <section className="section faq" id="faq">
      <div className="faq__grid">
        <Reveal className="faq__head">
          <span className="eyebrow">{t.eyebrow}</span>
          <RevealTitle className="section__title faq__title" text={t.title} />
          <p className="section__sub">{t.sub}</p>
        </Reveal>

        <Reveal className="faq__list" delay={0.05}>
          {t.items.map((it, i) => (
            <details key={it.q} className="faq__item" name="faq" open={i === 0}>
              <summary>
                <span>{it.q}</span>
                <i className="faq__icon" aria-hidden="true" />
              </summary>
              <p className="faq__a">{it.a}</p>
            </details>
          ))}
        </Reveal>

        <Reveal className="faq__ask" delay={0.1}>
          <b>{t.askTitle}</b>
          <p>{t.askText}</p>
          <div className="faq__actions">
            <QuoteButton className="btn"><BoltIcon size={15} />{dict.contact.form.quizCta}</QuoteButton>
            <WhatsAppLink className="btn btn--ghost">{dict.contact.wa}</WhatsAppLink>
          </div>
          <p className="cta-promise">{dict.quote.promise}</p>
        </Reveal>
      </div>
    </section>
  );
}
