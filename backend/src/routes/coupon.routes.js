import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
// 👉 IMPORTĂM SERVICIUL DE MAIL (ajustează calea dacă diferă în proiectul tău)
import { sendPartnerInvitationEmail, sendPartnerActivationEmail } from "../services/mail.service.js";

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
    // 1. Extragere sigură a ID-ului de utilizator (acoperă atât .sub cât și .id)
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Utilizator neautentificat sau ID lipsă." });
    }

    // 2. Căutăm cuponul asociat utilizatorului curent logat + includem datele de User pentru email
    const coupon = await prisma.coupon.findUnique({
      where: { userId: userId },
      include: {
        user: true // 🚀 Includem relația cu user-ul ca să avem acces sigur la email și nume real!
      }
    });

    if (!coupon) {
      return res.status(444).json({ error: "Nu a fost găsit niciun cont de partener pre-aprobat." });
    }

    if (coupon.status === "ACTIVE") {
      return res.status(400).json({ error: "Parteneriatul este deja activ." });
    }

    // 3. Actualizăm statusul în bază
    const updatedCoupon = await prisma.coupon.update({
      where: { id: coupon.id },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date()
      }
    });

    // 4. Trimitem E-mailul folosind datele sigure venite din baza de date (coupon.user)
    if (coupon.user) {
      try {
        await sendPartnerActivationEmail(coupon.user.email, coupon.user.name, coupon.code);
        console.log(`✉️ Email activare partener trimis către: ${coupon.user.email}`);
      } catch (mailErr) {
        console.error("❌ Eroare la trimiterea email-ului de activare:", mailErr);
      }
    } else {
      console.warn("⚠️ Cuponul nu are un utilizator asociat valid pentru trimiterea email-ului.");
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
 * 👉 RUTA REPARATĂ: 6. POST: Cerere de retragere câștiguri (Utilizator Logat)
 * Această rută preia cererea, verifică dacă are pragul minim și oprește abuzurile
 */
router.post("/withdraw", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Utilizator neautentificat." });
    }

    // 1. Căutăm cuponul partenerului
    const coupon = await prisma.coupon.findUnique({
      where: { userId: userId },
      include: { user: true }
    });

    if (!coupon) {
      return res.status(444).json({ error: "Nu deții un cupon de parteneriat." });
    }

    // 2. Calculăm suma disponibilă în RON direct din totalDiscounted (baza de date)
    const earningsRON = coupon.totalDiscounted / 100;

    // 3. Verificăm pragul minim de 100 RON
    if (earningsRON < 100) {
      return res.status(400).json({ 
        error: `Suma minimă pentru retragere este de 100 RON. Momentan ai: ${earningsRON.toFixed(2)} RON.` 
      });
    }

    // TODO: Aici poți adăuga logica ta internă (ex: trimitere email automată către tine la karixcomputers@gmail.com,
    // sau crearea unei înregistrări într-un tabel `WithdrawalRequests` din baza de date).

    console.log(`💰 Cerere de retragere înregistrată pentru ${coupon.user?.name || 'Partener'} - Suma: ${earningsRON.toFixed(2)} RON`);

    res.json({ 
      success: true, 
      message: `Cererea de retragere pentru suma de ${earningsRON.toFixed(2)} RON a fost înregistrată cu succes! Te vom contacta în scurt timp.` 
    });

  } catch (error) {
    console.error("WITHDRAWAL ROUTE ERROR:", error);
    res.status(500).json({ error: "Eroare la procesarea cererii de retragere." });
  }
});

export default router;