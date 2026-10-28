"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendContact, type ContactState } from "@/lib/actions";
import { getDict, type Locale } from "@/lib/i18n";
import { type ServiceIcon } from "@/lib/content";
import { openQuote } from "@/lib/quote";
import { ArrowUpRight, BoltIcon, Check, ServiceGlyph } from "./icons";
import { LogoLoader } from "./LogoLoader";
import { WhatsAppLink } from "./WhatsAppLink";

const initial: ContactState = { status: "idle" };
const NEED_ICONS: ServiceIcon[] = ["mobile", "web", "ai", "integration", "design", "search"];
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// leading icons of the text fields (lucide outlines)
const FIELD_ICONS = {
  name: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  email: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM22 6l-10 7L2 6",
  company: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18ZM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
  phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z",
};
const FieldIcon = ({ d }: { d: string }) => (
  <svg className="qfield__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function SubmitButton({ label, sending, ready }: { label: string; sending: string; ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn--lg qform__send${ready ? " is-ready" : ""}`} disabled={pending} aria-busy={pending}>
      {pending ? <LogoLoader size={26} /> : null}
      {pending ? sending : label}
      {!pending && <ArrowUpRight size={15} />}
    </button>
  );
}

export function ContactForm({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const f = dict.contact.form;
  const [state, formAction] = useActionState(sendContact, initial);

  const [needs, setNeeds] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  const done = [needs.length > 0, message.trim().length >= 5, name.trim().length > 0, emailRe.test(email.trim())];
  const pct = Math.round((done.filter(Boolean).length / done.length) * 100);
  const ready = pct === 100;

  if (state.status === "success") {
    // a concrete promise: the date and time the reply arrives by
    const by = state.replyBy && new Date(state.replyBy).toLocaleString(locale === "en" ? "en-GB" : "es-ES", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });
    return (
      <div className="form-success" role="status" aria-live="polite">
        <span className="form-success__icon"><Check size={26} /></span>
        <h3 className="form-success__title">{f.successTitle}</h3>
        <p>{f.success}</p>
        {by && <p className="form-success__by">{f.successBy} <b>{by}</b>.</p>}
        <WhatsAppLink className="form-success__wa">
          {f.urgent} <ArrowUpRight />
        </WhatsAppLink>
      </div>
    );
  }

  const err = state.fieldErrors;
  return (
    <form action={formAction} className="form qform" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot (hidden from users) — non-standard name so browser autofill never touches it */}
      <input type="text" name="hp_check" tabIndex={-1} autoComplete="off" aria-hidden="true" className="form-hp" />

      <button type="button" className="qform__quiz" onClick={() => openQuote()}>
        <span className="qform__quiz-ico"><BoltIcon size={15} /></span>
        <span>{f.quiz} <b>{f.quizCta}</b></span>
        <ArrowUpRight />
      </button>

      <div className={`qform__progress${ready ? " is-ready" : ""}`} aria-hidden="true">
        <div><span>{f.progress}</span><b>{ready ? f.ready : `${pct}%`}</b></div>
        <i><span style={{ width: `${pct}%` }} /></i>
      </div>

      <fieldset className="qform__sec">
        <legend><span>1</span>{f.sectionProject}</legend>

        <div className="field">
          <span className="qform__label">{f.needs} <span className="field-opt">{f.needsOpt}</span></span>
          <div className="needs-pick__list">
            {f.needOptions.map((opt, i) => (
              <label key={opt} className="needs-pick__chip">
                <input type="checkbox" name="needs" value={opt} checked={needs.includes(opt)}
                  onChange={(e) => setNeeds((v) => (e.target.checked ? [...v, opt] : v.filter((x) => x !== opt)))} />
                <span><ServiceGlyph name={NEED_ICONS[i]} />{opt}<Check size={13} /></span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="qform__label">{f.timeline} <span className="field-opt">{f.timelineOpt}</span></span>
          <div className="needs-pick__list" role="radiogroup" aria-label={f.timeline}>
            {f.timelines.map((opt) => (
              <label key={opt} className="needs-pick__chip needs-pick__chip--radio">
                <input type="radio" name="timeline" value={opt} checked={timeline === opt} onChange={() => setTimeline(opt)}
                  onClick={() => timeline === opt && setTimeline("")} />
                <span>{opt}<Check size={13} /></span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="cf-message" className="qform__label">{f.message}</label>
          <textarea id="cf-message" name="message" rows={4} placeholder={f.messagePh} value={message} onChange={(e) => setMessage(e.target.value)}
            aria-invalid={!!err?.message} aria-describedby={err?.message ? "cf-message-err" : undefined} required />
          {err?.message && <span id="cf-message-err" className="field-error" role="alert">{f[err.message]}</span>}
        </div>
      </fieldset>

      <hr className="qform__divider" />

      <fieldset className="qform__sec">
        <legend><span>2</span>{f.sectionYou}</legend>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cf-name" className="qform__label">{f.name}</label>
            <div className="qfield">
              <FieldIcon d={FIELD_ICONS.name} />
              <input id="cf-name" name="name" type="text" placeholder={f.namePh} value={name} onChange={(e) => setName(e.target.value)}
                autoComplete="name" aria-invalid={!!err?.name} aria-describedby={err?.name ? "cf-name-err" : undefined} required />
            </div>
            {err?.name && <span id="cf-name-err" className="field-error" role="alert">{f[err.name]}</span>}
          </div>
          <div className="field">
            <label htmlFor="cf-email" className="qform__label">{f.email}</label>
            <div className="qfield">
              <FieldIcon d={FIELD_ICONS.email} />
              <input id="cf-email" name="email" type="email" inputMode="email" placeholder={f.emailPh} value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" aria-invalid={!!err?.email} aria-describedby={err?.email ? "cf-email-err" : undefined} required />
            </div>
            {err?.email && <span id="cf-email-err" className="field-error" role="alert">{f[err.email]}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cf-company" className="qform__label">{f.company} <span className="field-opt">{f.companyOpt}</span></label>
            <div className="qfield">
              <FieldIcon d={FIELD_ICONS.company} />
              <input id="cf-company" name="company" type="text" placeholder={f.companyPh} value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cf-phone" className="qform__label">{f.phone} <span className="field-opt">{f.phoneOpt}</span></label>
            <div className="qfield">
              <FieldIcon d={FIELD_ICONS.phone} />
              <input id="cf-phone" name="phone" type="tel" inputMode="tel" placeholder={f.phonePh} value={phone} onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel" aria-invalid={!!err?.phone} aria-describedby={err?.phone ? "cf-phone-err" : undefined} />
            </div>
            {err?.phone ? <span id="cf-phone-err" className="field-error" role="alert">{f[err.phone]}</span> : <span className="qform__hint">{f.phoneHint}</span>}
          </div>
        </div>
      </fieldset>

      {state.status === "error" && state.errorKey && (
        <p className="form-error" role="alert">{f[state.errorKey]}</p>
      )}

      <div className="form-actions">
        <SubmitButton label={f.send} sending={f.sending} ready={ready} />
        <p className="qform__promise"><span className="qform__dot" aria-hidden="true" />{dict.quote.promise}</p>
        <p className="form-privacy">{f.privacy}</p>
      </div>
    </form>
  );
}
