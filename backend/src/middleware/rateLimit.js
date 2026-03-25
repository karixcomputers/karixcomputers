import rateLimit from 'express-rate-limit';

// Scut general pentru tot site-ul (100 cereri la 15 min)
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: "⚠️ Prea multe cereri. Revino peste 15 minute." }
});

// Scut dur pentru Login (doar 10 încercări pe oră)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: "⚠️ Prea multe încercări de login. Cont protejat." }
});