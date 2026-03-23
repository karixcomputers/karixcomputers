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
 * 1. POST: Validare cupon (Public - pentru clienți în coș)
 */
router.post("/validate", async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) return res.status(400).json({ error: "Te rugăm să introduci un cod." });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ error: "Codul de reducere este invalid sau inactiv." });
    }

    // Verifică data expirării (Corectat typo)
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ error: "Acest cod a expirat." });
    }

    // Verifică limita de utilizări
    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return res.status(400).json({ error: "Acest cod nu mai este disponibil (limită atinsă)." });
    }

    // Verifică totalul minim al comenzii
    if (cartTotal < coupon.minOrderTotal) {
      const minRon = (coupon.minOrderTotal / 100).toFixed(0);
      return res.status(400).json({ error: `Comanda minimă pentru acest cod este de ${minRon} RON.` });
    }

    // Trimitem datele esențiale înapoi
    res.json({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue
    });

  } catch (error) {
    console.error("COUPON VALIDATE ERROR:", error);
    res.status(500).json({ error: "Eroare la validarea codului." });
  }
});

/**
 * 2. GET: Toate cupoanele (Admin)
 */
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(coupons);
  } catch (e) {
    res.status(500).json({ error: "Eroare la încărcarea listei de cupoane." });
  }
});

/**
 * 3. POST: Creare cupon (Admin)
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { code, discountType, discountValue, minOrderTotal, usageLimit, expiryDate } = req.body;
  
  try {
    const newCoupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        discountType, // "percentage" sau "fixed"
        discountValue: parseInt(discountValue),
        minOrderTotal: minOrderTotal ? parseInt(minOrderTotal) : 0,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null
      }
    });
    res.status(201).json(newCoupon);
  } catch (e) {
    res.status(400).json({ error: "Codul există deja sau datele introduse sunt invalide." });
  }
});

/**
 * 4. DELETE: Șterge cupon (Admin)
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Nu s-a putut șterge cuponul." });
  }
});

export default router;