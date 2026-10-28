"use server";

import nodemailer from "nodemailer";
import { headers } from "next/headers";

export type ContactState = {
  status: "idle" | "success" | "error";
  /** when the reply is promised by (epoch ms): 24 h after the request arrived */
  replyBy?: number;
  errorKey?: "errSend" | "errRate";
  fieldErrors?: Partial<Record<"name" | "email" | "message" | "phone", "errName" | "errEmail" | "errMessage" | "errPhone">>;
  values?: { name: string; email: string; company: string; message: string; needs: string[]; timeline: string; phone: string };
};

const splitEmails = (v: string) =>
  v.split(",").map((s) => s.trim()).filter(Boolean);

const RECIPIENTS = splitEmails(process.env.CONTACT_TO ?? "jukopila.giovanny15@gmail.com");
const CC = splitEmails(process.env.CONTACT_CC ?? "jukopila.yango@gmail.com");

// Best-effort throttle: at most 5 requests per IP every 10 minutes (per server instance).
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear(); // keep memory bounded
  return hits.length > MAX_PER_WINDOW;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// optional WhatsApp number: digits with the usual separators and an optional country prefix
const phoneRe = /^\+?[\d\s().-]{7,20}$/;

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
  // what the visitor needs (optional chips); capped so a tampered form can't flood the email
  const needs = formData.getAll("needs").map((n) => String(n).trim().slice(0, 40)).filter(Boolean).slice(0, 8);
  const timeline = String(formData.get("timeline") ?? "").trim().slice(0, 40);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 24);
  const values = { name, email, company, message, needs, timeline, phone };

  // Honeypot: silently accept bots without sending
  if (String(formData.get("hp_check") ?? "").length > 0) {
    return { status: "success" };
  }

  const fieldErrors: ContactState["fieldErrors"] = {};
  if (!name) fieldErrors.name = "errName";
  if (!emailRe.test(email)) fieldErrors.email = "errEmail";
  if (message.length < 5) fieldErrors.message = "errMessage";
  if (phone && !phoneRe.test(phone)) fieldErrors.phone = "errPhone";
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", fieldErrors, values };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  if (tooMany(ip)) return { status: "error", errorKey: "errRate", values };

  const transporter = getTransporter();
  if (!transporter) {
    console.error("[contact] SMTP_FROM_EMAIL / SMTP_APP_PASSWORD are not set; cannot send email.");
    return { status: "error", errorKey: "errSend", values };
  }

  try {
    const subject = `Nuevo contacto · ${name}${company ? ` (${company})` : ""}${needs.length ? ` · ${needs.join(", ")}` : ""}`;
    const html = `
      <div style="font-family:Inter,Arial,sans-serif;color:#0b0918;line-height:1.6">
        <h2 style="margin:0 0 16px">Nuevo mensaje desde juko.ai</h2>
        <p><strong>Nombre:</strong> ${esc(name)}</p>
        <p><strong>Email:</strong> ${esc(email)}</p>
        ${company ? `<p><strong>Empresa:</strong> ${esc(company)}</p>` : ""}
        ${needs.length ? `<p><strong>Necesita:</strong> ${needs.map(esc).join(" · ")}</p>` : ""}
        ${timeline ? `<p><strong>Plazo:</strong> ${esc(timeline)}</p>` : ""}
        ${phone ? `<p><strong>WhatsApp:</strong> <a href="https://wa.me/${phone.replace(/\D/g, "")}">${esc(phone)}</a></p>` : ""}
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
      text: `Nombre: ${name}\nEmail: ${email}\nEmpresa: ${company || "-"}\nNecesita: ${needs.join(", ") || "-"}\nPlazo: ${timeline || "-"}\nWhatsApp: ${phone || "-"}\nIdioma: ${locale}\n\n${message}`,
    });

    return { status: "success", replyBy: Date.now() + 24 * 3600 * 1000 };
  } catch (err) {
    console.error("[contact] Email send error:", err);
    return { status: "error", errorKey: "errSend", values };
  }
}
