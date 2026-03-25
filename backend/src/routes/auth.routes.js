import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios"; 
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  hashToken,
} from "../services/auth.service.js";
import { sendVerifyEmail, sendResetPassword, sendWelcomeEmail } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: false, // Setează pe true în producție cu HTTPS
  path: "/",
  maxAge: Number(env.JWT_REFRESH_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000,
};

const INDICATOR_OPTIONS = {
  httpOnly: false, 
  sameSite: "lax",
  secure: false,
  path: "/",
  maxAge: COOKIE_OPTIONS.maxAge,
};

const getFullUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          orders: true,
          wishlist: true,
          tickets: true,
        },
      },
    },
  });

  if (!user) return null;

  const { passwordHash, refreshTokenHash, verificationCode, ...userData } = user;
  return {
    ...userData,
    ordersCount: user._count.orders || 0,
    wishlistCount: user._count.wishlist || 0,
    ticketsCount: user._count.tickets || 0,
  };
};

// --- 1. RUTA GOOGLE LOGIN (MODIFICATĂ PENTRU CLIENȚI NOI) ---
router.post("/google", async (req, res, next) => {
  try {
    const { token } = req.body; 

    if (!token) return res.status(400).json({ error: "Token Google lipsă" });

    const googleRes = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
    const { email, name, sub: googleId, picture: avatar } = googleRes.data;

    if (!email) return res.status(400).json({ error: "Nu s-au putut obține datele de la Google" });

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // UTILIZATOR EXISTENT: Îl logăm direct
      user = await prisma.user.update({
        where: { email },
        data: { 
          googleId, 
          avatar, 
          isEmailVerified: true,
          name: user.name || name 
        }
      });

      const accessToken = signAccessToken(user);
      const refreshToken = signRefreshToken(user);

      await prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: hashToken(refreshToken) },
      });

      const userWithStats = await getFullUser(user.id);

      res.cookie("refresh_token", refreshToken, COOKIE_OPTIONS);
      res.cookie("is_logged_in", "true", INDICATOR_OPTIONS);
      
      return res.json({ accessToken, user: userWithStats });

    } else {
      // UTILIZATOR NOU: Oprim procesul și cerem date suplimentare
      // Generăm un token temporar (valid 15 minute) ca să fim siguri că doar el își poate crea contul
      const tempToken = jwt.sign({ email, name, googleId, avatar }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });

      return res.status(202).json({ 
        require_profile_completion: true, 
        tempToken, 
        profileData: { email, name, avatar } 
      });
    }
  } catch (e) {
    console.error("Google Auth Error:", e.response?.data || e.message);
    res.status(401).json({ error: "Autentificare Google eșuată" });
  }
});

// --- 2. RUTA NOUĂ: FINALIZARE CONT GOOGLE ---
router.post("/google-complete", async (req, res, next) => {
  try {
    const { tempToken, phone, name } = req.body;

    if (!tempToken || !phone || !name) {
      return res.status(400).json({ error: "Date incomplete. Te rugăm să completezi toate câmpurile." });
    }

    // Decodăm token-ul temporar pentru a lua datele sigure de la Google
    let decoded;
    try {
      decoded = jwt.verify(tempToken, env.JWT_ACCESS_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Sesiunea a expirat. Te rugăm să te loghezi din nou cu Google." });
    }

    const { email, googleId, avatar } = decoded;

    // Creăm utilizatorul cu toate datele
    const user = await prisma.user.create({
      data: {
        email,
        name,      // Numele pe care l-a confirmat/modificat în formular
        phone,     // Telefonul nou introdus
        googleId,
        avatar,
        isEmailVerified: true,
        termsAccepted: true,
        termsAcceptedAt: new Date()
      }
    });
    
    // Trimitem emailul de bun venit
    try { await sendWelcomeEmail(email, name); } catch (e) { console.error("Welcome Email Error:", e); }

    // Generăm token-urile finale pentru logare
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const userWithStats = await getFullUser(user.id);

    res.cookie("refresh_token", refreshToken, COOKIE_OPTIONS);
    res.cookie("is_logged_in", "true", INDICATOR_OPTIONS);
    
    res.json({ accessToken, user: userWithStats });

  } catch (e) {
    next(e);
  }
});

// 1. REGISTER
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name, phone, termsAccepted } = req.body;
    
    if (!email || !password) return res.status(400).json({ error: "Date incomplete" });
    
    if (!termsAccepted) {
       return res.status(400).json({ error: "Trebuie să accepți termenii și condițiile." });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ 
        error: "Email deja folosit. Dacă te-ai logat anterior cu Google, folosește Reset Password pentru a seta o parolă locală." 
      });
    }

    const verificationCode = generateCode();
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { 
        email, 
        passwordHash, 
        name, 
        phone, 
        verificationCode,
        termsAccepted: true 
      },
    });

    await sendVerifyEmail(user.email, verificationCode);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 2. VERIFY EMAIL
router.post("/verify-email", async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || user.verificationCode !== code) return res.status(400).json({ error: "Cod invalid" });

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isEmailVerified: true, verificationCode: null },
    });

    try {
        await sendWelcomeEmail(updatedUser.email, updatedUser.name);
    } catch (mailError) {
        console.error("Eroare la trimiterea email-ului de bun venit:", mailError);
    }

    const accessToken = signAccessToken(updatedUser);
    const refreshToken = signRefreshToken(updatedUser);
    
    await prisma.user.update({
      where: { id: updatedUser.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const userWithStats = await getFullUser(updatedUser.id);

    res.cookie("refresh_token", refreshToken, COOKIE_OPTIONS);
    res.cookie("is_logged_in", "true", INDICATOR_OPTIONS);
    res.json({ accessToken, user: userWithStats });
  } catch (e) { next(e); }
});

// 3. RESEND VERIFICATION
router.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ error: "Utilizator inexistent" });
    if (user.isEmailVerified) return res.status(400).json({ error: "Email deja verificat" });

    const newCode = generateCode();
    await prisma.user.update({
      where: { email },
      data: { verificationCode: newCode }
    });

    await sendVerifyEmail(email, newCode);
    res.json({ ok: true, message: "Un cod nou a fost trimis." });
  } catch (e) { next(e); }
});

// 4. LOGIN
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Credențiale invalide" });
    }
    
    if (!user.isEmailVerified) return res.status(403).json({ error: "EMAIL_NOT_VERIFIED" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    const userWithStats = await getFullUser(user.id);

    res.cookie("refresh_token", refreshToken, COOKIE_OPTIONS);
    res.cookie("is_logged_in", "true", INDICATOR_OPTIONS);
    res.json({ accessToken, user: userWithStats });
  } catch (e) { next(e); }
});

// 5. ME
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userWithStats = await getFullUser(req.user.sub);
    if (!userWithStats) return res.status(404).json({ error: "User not found" });
    res.json({ user: userWithStats });
  } catch (e) { next(e); }
});

// 6. REFRESH TOKEN
router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies.refresh_token;
    if (!token) return res.status(401).json({ error: "No token" });
    
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    
    if (!user || hashToken(token) !== user.refreshTokenHash) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const userWithStats = await getFullUser(user.id);
    res.json({ 
      accessToken: signAccessToken(user), 
      user: userWithStats 
    });
  } catch (e) { 
    res.clearCookie("is_logged_in", INDICATOR_OPTIONS);
    next(e); 
  }
});

// 7. LOGOUT
router.post("/logout", async (req, res) => {
  const { maxAge, ...clearOptions } = COOKIE_OPTIONS;
  res.clearCookie("refresh_token", clearOptions);
  res.clearCookie("is_logged_in", INDICATOR_OPTIONS);
  res.json({ ok: true });
});

// 8. FORGOT PASSWORD
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // 5m = 5 minute de valabilitate. Asta e setarea corectă.
      const resetToken = jwt.sign({ sub: user.id }, env.JWT_ACCESS_SECRET, { expiresIn: "5m" });
      const resetUrl = `${env.CLIENT_URL}/auth/reset?token=${encodeURIComponent(resetToken)}`;
      await sendResetPassword(email, resetUrl);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 9. RESET PASSWORD
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    // Verificăm manual token-ul, fără să aruncăm imediat eroarea în catch-ul mare
    let payload;
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ error: "Link-ul de resetare a expirat (valabilitate 5 minute). Te rugăm să ceri altul." });
      }
      if (err.name === 'JsonWebTokenError') {
         return res.status(400).json({ error: "Link invalid sau corupt." });
      }
      throw err; // Aruncăm mai departe dacă e o eroare necunoscută
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } });
    
    res.json({ ok: true });
  } catch (e) { 
    next(e); 
  }
});

export default router;