import nodemailer from "nodemailer";
import { env } from "./env.js";

export const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: String(env.SMTP_SECURE) === "true",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // ajută pe shared hosting
  },
});

export async function sendMailSafe({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("MAIL ERROR:", err?.message || err);
    return { ok: false, error: err?.message || "mail_failed" };
  }
}
