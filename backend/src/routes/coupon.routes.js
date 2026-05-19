import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { 
  sendPartnerInvitationEmail, 
  sendPartnerActivationEmail, 
  sendAdminWithdrawalAlert, 
  sendUserWithdrawalConfirmation 
} from "../services/mail.service.js";

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
 * 🚀 NOUĂ & REPARATĂ: 7. GET: Istoric retrageri (Admin)
 * Pusă sus de tot ca să evite erorile de 404 cauzate de rutele dinamice de mai jos
 */
router.get("/withdraw", requireAuth, requireAdmin, async (req, res) => {
  try {
    const requests = await prisma.withdrawalRequest.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(requests);
  } catch (e) {
    console.error("EROARE GET WITHDRAW:", e);
    res.status(500).json({ error: "Nu s-au putut încărca cererile de retragere." });
  }
});

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

    if (!coupon || !coupon.isActive || coupon.status !== "ACTIVE") {
      return res.status(404).json({ error: "Codul de reducere este invalid sau inactiv." });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ error: "Acest cod a expirat." });
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return res.status(400).json({ error: "Acest cod nu mai este disponibil (limită atinsă)." });
    }

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
 * 3. POST: Creare cupon (Admin)
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

    if (linkedUserId && targetUser) {
      try {
        await sendPartnerInvitationEmail(targetUser.email, targetUser.name);
        console.log(`✉️ Email invitație partener trimis către: ${targetUser.email}`);
      } catch (mailErr) {
        console.error("❌ Eroare la trimiterea email-ului de invitație:", mailErr);
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
 * 4. POST: Acceptare termeni parteneriat (Utilizator Logat)
 */
router.post("/accept", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Utilizator neautentificat sau ID lipsă." });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { userId: userId },
      include: { user: true }
    });

    if (!coupon) {
      return res.status(444).json({ error: "Nu a fost găsit niciun cont de partener pre-aprobat." });
    }

    if (coupon.status === "ACTIVE") {
      return res.status(400).json({ error: "Parteneriatul este deja activ." });
    }

    const updatedCoupon = await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date()
      }
    });

    if (coupon.user) {
      try {
        await sendPartnerActivationEmail(coupon.user.email, coupon.user.name, coupon.code);
        console.log(`✉️ Email activare partener trimis către: ${coupon.user.email}`);
      } catch (mailErr) {
        console.error("❌ Eroare la trimiterea email-ului de activare:", mailErr);
      }
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

/**
 * 🛠️ ACTUALIZATĂ: 6. POST: Cerere de retragere câștiguri + Salvare în Baza de date + Trimite Mailuri
 */
router.post("/withdraw", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;
    if (!userId) return res.status(401).json({ error: "Utilizator neautentificat." });

    const coupon = await prisma.coupon.findUnique({
      where: { userId: userId },
      include: { user: true }
    });

    if (!coupon || !coupon.user) {
      return res.status(444).json({ error: "Nu deții un cont de parteneriat valid." });
    }

    const earningsRON = coupon.totalDiscounted / 100;

    if (earningsRON < 100) {
      return res.status(400).json({ 
        error: `Suma minimă pentru retragere este de 100 RON. Momentan ai: ${earningsRON.toFixed(2)} RON.` 
      });
    }

    const { type, fullName, identifier, iban, bankName } = req.body;

    if (!fullName || !identifier || !iban) {
      return res.status(400).json({ error: "Te rugăm să completezi Numele complet, CNP/CUI și contul IBAN." });
    }

    // 🚀 TRANZACȚIE: Salvăm în noul tău model de Prisma (WithdrawalRequest) și resetăm câștigurile cuponului
    await prisma.$transaction([
      prisma.withdrawalRequest.create({
        data: {
          userId,
          amountRon: parseFloat(earningsRON.toFixed(2)), // Salvat ca Float conform noului model
          type: type || "FIZICA",
          fullName,
          identifier,
          iban,
          bankName: bankName || "Nespecificată"
        }
      }),
      prisma.coupon.update({
        where: { id: coupon.id },
        data: { totalDiscounted: 0 } // Îl resetăm la 0 ca să nu mai tragă banii încă o dată
      })
    ]);

    // Trimitem email către Admin
    try {
      await sendAdminWithdrawalAlert({
        userName: coupon.user.name,
        userEmail: coupon.user.email,
        amount: earningsRON,
        type: type || "FIZICA",
        fullName: fullName,
        identifier: identifier,
        iban: iban,
        bankName: bankName || "Nespecificată",
        adminEmail: "karixcomputers@gmail.com"
      });
    } catch (adminMailErr) {
      console.error("❌ Eroare la trimiterea mail-ului către admin:", adminMailErr);
    }

    // Trimitem email către partener
    try {
      await sendUserWithdrawalConfirmation(coupon.user.email, coupon.user.name, earningsRON);
    } catch (userMailErr) {
      console.error("❌ Eroare la trimiterea mail-ului către partener:", userMailErr);
    }

    res.json({ 
      success: true, 
      message: `Cererea de retragere pentru suma de ${earningsRON.toFixed(2)} RON a fost înregistrată cu succes!` 
    });

  } catch (error) {
    console.error("WITHDRAWAL ROUTE ERROR:", error);
    res.status(500).json({ error: "Eroare la procesarea cererii de retragere." });
  }
});

/**
 * 👉 8. PUT: Finalizare retragere (Doar Admin)
 * Schimbă statusul din PENDING în PAID
 */
router.put("/withdraw/:id/finalize", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const updatedRequest = await prisma.withdrawalRequest.update({
      where: { id: id },
      data: { status: "PAID" }
    });

    res.json({ success: true, message: "Retragerea a fost marcată ca finalizată!", updatedRequest });
  } catch (error) {
    console.error("FINALIZE WITHDRAWAL ERROR:", error);
    res.status(500).json({ error: "Nu s-a putut finaliza cererea." });
  }
});

export default router;