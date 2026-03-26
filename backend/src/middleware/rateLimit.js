import rateLimit from 'express-rate-limit';

// 1. Scut general (Produse, poze, coș)
export const rateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Scădem la 5 minute (e suficient pentru a opri un atac)
  max: 500, // Urcăm la 500 de cereri (un user normal nu face 500 în 5 min)
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: "⚠️ Prea multe cereri. Revino peste 5 minute." }
});

// 2. Scut pentru sesiune (F5-uri)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 100, // Urcăm la 100 (React uneori face 2-3 cereri de auth la un singur refresh)
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