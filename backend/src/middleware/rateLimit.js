import rateLimit from 'express-rate-limit';

// 1. Scut general pentru tot site-ul (Aici intră produsele, coșul, etc.)
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute
  max: 200, // Am crescut puțin la 200 pentru refresh-uri rapide
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: "⚠️ Prea multe cereri. Revino peste 15 minute." }
});

// 2. Scut pentru verificarea sesiunii (Când dai F5 pe site)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minut!
  max: 60, // Poți da F5 de 60 de ori pe minut fără să fii banat
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: "⚠️ Prea multe refresh-uri. Așteaptă 1 minut." }
});

// 3. NOU: Scut BRUTE FORCE - Doar pentru rutele de /login și /register
export const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 oră
  max: 10, // Max 10 parole greșite pe oră
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: "⚠️ Prea multe încercări de login. Cont protejat 60 de minute." }
});