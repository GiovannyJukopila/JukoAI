"use server";

import nodemailer from "nodemailer";

export type ContactState = {
  status: "idle" | "success" | "error";
  errorKey?: "errSend";
  fieldErrors?: Partial<Record<"name" | "email" | "message", "errName" | "errEmail" | "errMessage">>;
  values?: { name: string; email: string; company: string; message: string };
};

const splitEmails = (v: string) =>
  v.split(",").map((s) => s.trim()).filter(Boolean);

const RECIPIENTS = splitEmails(process.env.CONTACT_TO ?? "jukopila.giovanny15@gmail.com");
const CC = splitEmails(process.env.CONTACT_CC ?? "jukopila.yango@gmail.com");

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Gmail SMTP via App Password — sends from your Gmail and lands in your inbox
function getTransporter() {
  if (!process.env.SMTP_FROM_EMAIL || !process.env.SMTP_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_FROM_EMAIL,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
}

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const locale = String(formData.get("locale") ?? "es");
  const values = { name, email, company, message };

  // Honeypot: silently accept bots without sending
  if (String(formData.get("hp_check") ?? "").length > 0) {
    return { status: "success" };
  }

  const fieldErrors: ContactState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "errName";
  if (!emailRe.test(email)) fieldErrors.email = "errEmail";
  if (message.length < 5) fieldErrors.message = "errMessage";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error("[contact] SMTP_FROM_EMAIL / SMTP_APP_PASSWORD are not set; cannot send email.");
    return { status: "error", errorKey: "errSend", values };
  }

  try {
    const subject = `Nuevo contacto · ${name}${company ? ` (${company})` : ""}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;color:#0b0918;line-height:1.6">
        <h2 style="margin:0 0 16px">Nuevo mensaje desde juko.ai</h2>
        <p><strong>Nombre:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        ${company ? `<p><strong>Empresa:</strong> ${esc(company)}</p>` : ""}
        <p><strong>Idioma:</strong> ${esc(locale)}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="white-space:pre-wrap;background:#f4f3fb;padding:14px 16px;border-radius:10px">${esc(message)}</p>
      </div>`;

    await transporter.sendMail({
      from: `Juko AI <${process.env.SMTP_FROM_EMAIL}>`,
      to: RECIPIENTS,
      cc: CC.length ? CC : undefined,
      replyTo: email,
      subject,
      html,
      text: `Nombre: ${name}\nEmail: ${email}\nEmpresa: ${company || "-"}\nIdioma: ${locale}\n\n${message}`,
    });

    return { status: "success" };
  } catch (err) {
    console.error("[contact] Email send error:", err);
    return { status: "error", errorKey: "errSend", values };
  }
}
