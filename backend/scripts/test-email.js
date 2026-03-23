import "dotenv/config";
import { transporter } from "../src/config/mailer.js";

const to = "raul.cristea.rk@gmail.com"; // adresa ta reală

const info = await transporter.sendMail({
  from: process.env.MAIL_FROM,
  to,
  subject: "Test SMTP KARIX",
  html: "<h2>SMTP merge 🎉</h2><p>Dacă vezi asta, config-ul e corect.</p>",
});

console.log("Sent:", info.messageId);
process.exit(0);
