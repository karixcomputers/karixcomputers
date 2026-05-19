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
 * Această rută aduce datele tale, cuponul de afiliat ȘI starea parteneriatului
 */
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        coupons: true, 
        affiliate: true // 🚀 ADAUGĂ ACEASTĂ LINIE (sau 'partner', în funcție de cum ai numit-o în schema.prisma)
      }
    });

    if (!user) {
      return res.status(404).json({ error: "Utilizatorul nu a fost găsit." });
    }

    res.json(user);
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