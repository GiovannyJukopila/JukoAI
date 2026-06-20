"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { sendContact, type ContactState } from "@/lib/actions";
import { getDict, type Locale } from "@/lib/i18n";
import { Check } from "./icons";

const initial: ContactState = { status: "idle" };

function SubmitButton({ label, sending }: { label: string; sending: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn--lg" disabled={pending} aria-busy={pending}>
      {pending ? sending : label}
    </button>
  );
}

export function ContactForm({ locale }: { locale: Locale }) {
  const dict = getDict(locale);
  const f = dict.contact.form;
  const [state, formAction] = useActionState(sendContact, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values;

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <div className="form-success" role="status" aria-live="polite">
        <span className="form-success__icon"><Check size={22} /></span>
        <p>{f.success}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="form" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {/* Honeypot (hidden from users) — non-standard name so browser autofill never touches it */}
      <input type="text" name="hp_check" tabIndex={-1} autoComplete="off" aria-hidden="true" className="form-hp" />

      <div className="form-row">
        <div className="field">
          <label htmlFor="cf-name">{f.name}</label>
          <input id="cf-name" name="name" type="text" placeholder={f.namePh} defaultValue={v?.name}
            autoComplete="name" aria-invalid={!!state.fieldErrors?.name}
            aria-describedby={state.fieldErrors?.name ? "cf-name-err" : undefined} required />
          {state.fieldErrors?.name && <span id="cf-name-err" className="field-error" role="alert">{f[state.fieldErrors.name]}</span>}
        </div>
        <div className="field">
          <label htmlFor="cf-email">{f.email}</label>
          <input id="cf-email" name="email" type="email" placeholder={f.emailPh} defaultValue={v?.email}
            autoComplete="email" aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={state.fieldErrors?.email ? "cf-email-err" : undefined} required />
          {state.fieldErrors?.email && <span id="cf-email-err" className="field-error" role="alert">{f[state.fieldErrors.email]}</span>}
        </div>
      </div>

      <div className="field">
        <label htmlFor="cf-company">{f.company} <span className="field-opt">{f.companyOpt}</span></label>
        <input id="cf-company" name="company" type="text" placeholder={f.companyPh} defaultValue={v?.company} autoComplete="organization" />
      </div>

      <div className="field">
        <label htmlFor="cf-message">{f.message}</label>
        <textarea id="cf-message" name="message" rows={5} placeholder={f.messagePh} defaultValue={v?.message}
          aria-invalid={!!state.fieldErrors?.message}
          aria-describedby={state.fieldErrors?.message ? "cf-message-err" : undefined} required />
        {state.fieldErrors?.message && <span id="cf-message-err" className="field-error" role="alert">{f[state.fieldErrors.message]}</span>}
      </div>

      {state.status === "error" && state.errorKey && (
        <p className="form-error" role="alert">{f[state.errorKey]}</p>
      )}

      <div className="form-actions">
        <SubmitButton label={f.send} sending={f.sending} />
      </div>
    </form>
  );
}
