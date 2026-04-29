import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js"; // verifică dacă calea e corectă (src/middleware/auth.js)

const prisma = new PrismaClient();
const router = express.Router();

// ... rutele tale vechi (profile, update, etc.) ...

// Ruta nouă pentru Admin
router.get("/admin-all", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Acces interzis." });
    }

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

// 👉 LINIA ASTA LIPSEȘTE SAU E GREȘITĂ:
export default router;