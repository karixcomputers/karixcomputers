import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// Middleware pentru Admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită drepturi de administrator." });
  }
};

/**
 * 1. GET: Toate review-urile (pentru Admin)
 */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, id: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(reviews);
  } catch (e) {
    console.error("GET REVIEWS ERROR:", e);
    res.status(500).json({ error: "Eroare la încărcarea recenziilor." });
  }
});

/**
 * 2. DELETE: Soft Delete (Arhivare)
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params; // ID-ul vine ca String (CUID)

    // Verificăm dacă recenzia există folosind ID-ul ca String
    const existing = await prisma.review.findUnique({ where: { id: id } });
    
    if (!existing) {
      return res.status(404).json({ error: "Recenzia nu a fost găsită." });
    }

    await prisma.review.update({
      where: { id: id },
      data: { isDeleted: true }
    });

    res.json({ success: true, message: "Review arhivat cu succes." });
  } catch (e) {
    console.error("SOFT DELETE ERROR:", e);
    res.status(500).json({ error: "Eroare internă la arhivare.", details: e.message });
  }
});

/**
 * 3. PATCH: Restaurare review
 */
router.patch("/:id/restore", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.review.findUnique({ where: { id: id } });
    if (!existing) {
      return res.status(404).json({ error: "Recenzia nu există." });
    }

    await prisma.review.update({
      where: { id: id },
      data: { isDeleted: false }
    });

    res.json({ success: true, message: "Review restaurat pe site." });
  } catch (e) {
    console.error("RESTORE ERROR:", e);
    res.status(500).json({ error: "Eroare la restaurare." });
  }
});

export default router;