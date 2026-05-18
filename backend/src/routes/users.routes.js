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
 * Această rută aduce datele tale ȘI cuponul de afiliat din baza de date
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    console.log("=== DEBUG AFILIERE ===");
    console.log("ID Utilizator logat:", req.user.id);

    // Încercăm să aducem userul simplu
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    console.log("User găsit în DB:", user ? "DA" : "NU", user?.email);

    // Încercăm să căutăm manual cuponul în tabela Coupon după email sau userId
    // Schimbă 'coupon' cu numele tabelei tale din Prisma dacă e diferit (ex: prisma.affiliateCoupon)
    const manualCoupon = await prisma.coupon.findFirst({
      where: {
        OR: [
          { userId: req.user.id },
          { code: "KARIX" } // Căutăm direct după cod ca să vedem dacă există
        ]
      }
    });
    console.log("Cupon găsit la căutare manuală:", manualCoupon);
    console.log("=======================");

    if (!user) {
      return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
    }

    // Îi trimitem frontend-ului obiectul user, dar îi injectăm manual cuponul găsit
    res.json({
      ...user,
      affiliateCoupon: manualCoupon || null
    });

  } catch (error) {
    console.error("EROARE CRITICĂ DEBUG /ME:", error);
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

export default router;