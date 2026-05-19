import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
// 👉 IMPORTĂM SERVICIUL DE MAIL (ajustează calea dacă diferă în proiectul tău)
import { sendPartnerInvitationEmail, sendPartnerActivationEmail } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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
 * OPTIMIZAT: Un cupon cu status PENDING nu poate fi folosit la cumpărături!
 */
router.post("/validate", async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code) return res.status(400).json({ error: "Te rugăm să introduci un cod." });

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    // Verifică dacă e activ și dacă statusul este ACTIVE
    if (!coupon || !coupon.isActive || coupon.status !== "ACTIVE") {
      return res.status(404).json({ error: "Codul de reducere este invalid sau inactiv." });
    }

    // Verifică data expirării
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

    res.json({
      id: coupon.id,
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
 * 3. POST: Creare cupon (Admin) -> IMPLEMENTAT FLUX INVITATIE
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { code, discountType, discountValue, minOrderTotal, usageLimit, expiryDate, userEmail } = req.body;
  
  try {
    let linkedUserId = null;
    let targetUser = null;

    if (userEmail && userEmail.trim() !== "") {
      targetUser = await prisma.user.findUnique({
        where: { email: userEmail.trim().toLowerCase() }
      });

      if (!targetUser) {
        return res.status(404).json({ error: `Nu există niciun cont cu emailul: ${userEmail}` });
      }

      linkedUserId = targetUser.id;
    }

    // Dacă este legat de un user, pornește ca "PENDING", altfel e un cupon simplu direct "ACTIVE"
    const initialStatus = linkedUserId ? "PENDING" : "ACTIVE";

    const newCoupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        discountType,
        discountValue: parseInt(discountValue),
        minOrderTotal: minOrderTotal ? parseInt(minOrderTotal) : 0,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        userId: linkedUserId,
        status: initialStatus
      }
    });

    // Trimitem e-mailul de invitație dacă avem un utilizator asociat
    if (linkedUserId && targetUser) {
      try {
        await sendPartnerInvitationEmail(targetUser.email, targetUser.name);
        console.log(`✉️ Email invitație partener trimis către: ${targetUser.email}`);
      } catch (mailErr) {
        console.error("❌ Eroare la trimiterea email-ului de invitație:", mailErr);
        // Nu blocăm crearea cuponului dacă crapă serviciul de mail
      }
    }

    res.status(201).json(newCoupon);
  } catch (e) {
    console.error("CREATE COUPON ERROR:", e);
    if (e.code === "P2002") {
      return res.status(400).json({ error: "Acest cod de cupon există deja în baza de date." });
    }
    res.status(400).json({ error: "Datele introduse sunt invalide sau incomplete." });
  }
});

/**
 * 👉 RUTA NOUĂ: 4. POST: Acceptare termeni parteneriat (Utilizator Logat)
 * Această rută va fi apelată din frontend când streamerul apasă pe butonul de activare din cont
 */
router.post("/accept", requireAuth, async (req, res) => {
  try {
    // Căutăm cuponul asociat utilizatorului curent logat
    const coupon = await prisma.coupon.findUnique({
      where: { userId: req.user.id }
    });

    if (!coupon) {
      return res.status(444).json({ error: "Nu a fost găsit niciun cont de partener pre-aprobat." });
    }

    if (coupon.status === "ACTIVE") {
      return res.status(400).json({ error: "Parteneriatul este deja activ." });
    }

    // Actualizăm statusul în bază
    const updatedCoupon = await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date()
      }
    });

    // Trimitem E-mailul 2 (Confirmarea activării + Codul primit)
    try {
      await sendPartnerActivationEmail(req.user.email, req.user.name, coupon.code);
      console.log(`✉️ Email activare partener trimis către: ${req.user.email}`);
    } catch (mailErr) {
      console.error("❌ Eroare la trimiterea email-ului de activare:", mailErr);
    }

    res.json({ success: true, message: "Parteneriat activat cu succes!", coupon: updatedCoupon });

  } catch (error) {
    console.error("ACCEPT PARTNERSHIP ERROR:", error);
    res.status(500).json({ error: "Eroare la activarea parteneriatului." });
  }
});

/**
 * 5. DELETE: Șterge cupon (Admin)
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