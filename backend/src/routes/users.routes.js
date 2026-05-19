import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- MIDDLEWARE PENTRU ADMIN ---
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită drepturi de administrator." });
  }
};

/**
 * 1. GET: Profilul utilizatorului curent (Logat)
 * Reparat conform numelui relației din schema.prisma
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    // req.user.sub sau req.user.id în funcție de cum e configurat middleware-ul tău requireAuth
    const userId = req.user.sub || req.user.id; 

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliateCoupon: true // 🚀 NUMELE CORECT DIN SCHEMA TA!
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
    }

    // Extragem hash-urile sensibile înainte de trimitere
    const { passwordHash, refreshTokenHash, verificationCode, affiliateCoupon, ...userData } = user;

    // Formatăm obiectul exact în stilul pe care îl așteaptă frontend-ul din getFullUser
    const responseData = {
      ...userData,
      affiliate: affiliateCoupon ? {
        code: affiliateCoupon.code,
        timesUsed: affiliateCoupon.timesUsed,
        earnings: (affiliateCoupon.earningsCents || 0) / 100, 
        isActive: affiliateCoupon.isActive,
        status: affiliateCoupon.status // 🚀 TRIMITEM ȘI STATUSUL ("PENDING" / "ACTIVE")
      } : null
    };

    res.json({ user: responseData });
  } catch (error) {
    console.error("EROARE RUTA /ME:", error);
    res.status(500).json({ error: "Eroare la încărcarea datelor utilizatorului." });
  }
});

/**
 * 2. GET: Toți utilizatorii (Admin)
 */
router.get("/admin-all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error("Eroare fetch users:", error);
    res.status(500).json({ error: "Eroare server." });
  }
});

export default router;