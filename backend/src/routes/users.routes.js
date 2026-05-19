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
    const userId = req.user.sub || req.user.id; 

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        affiliateCoupon: true // Asigură-te că relația e corectă aici
      }
    });

    if (!user) return res.status(404).json({ error: "Utilizator inexistent." });

    const { passwordHash, refreshTokenHash, verificationCode, affiliateCoupon, ...userData } = user;
console.log("DEBUG BACKEND: Ce conține affiliateCoupon:", affiliateCoupon);
const responseData = {
  ...userData,
  // ✅ Păstrează numele exact pe care îl așteaptă frontend-ul!
  affiliateCoupon: affiliateCoupon ? {
    id: affiliateCoupon.id,
    code: affiliateCoupon.code,
    timesUsed: affiliateCoupon.timesUsed,
    isActive: affiliateCoupon.isActive,
    status: affiliateCoupon.status,
    totalDiscounted: affiliateCoupon.totalDiscounted || 0,
    earningsCents: affiliateCoupon.earningsCents || 0 // Trimitem și câștigurile!
  } : null
};

    res.json({ user: responseData });
  } catch (error) {
    console.error("Eroare în ruta /me:", error);
    res.status(500).json({ error: "Eroare server." });
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

/**
 * 👉 GET: Retragerile utilizatorului curent logat
 */
router.get("/my-withdrawals", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    
    const myRequests = await prisma.withdrawalRequest.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" }
    });
    
    res.json(myRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Nu s-a putut încărca istoricul personal." });
  }
});


export default router;