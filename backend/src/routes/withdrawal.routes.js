import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { sendAdminWithdrawalAlert, sendUserWithdrawalConfirmation } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/request", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.sub || req.user?.id;

    // 1. Luăm datele utilizatorului și cuponul său de afiliat
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliateCoupon: true }
    });

    if (!user || !user.affiliateCoupon) {
      return res.status(404).json({ error: "Nu ești înregistrat în programul de afiliere." });
    }

    const earningsRon = (user.affiliateCoupon.earningsCents || 0) / 100;

    // 2. Verificăm pragul minim
    if (earningsRon < 100) {
      return res.status(400).json({ error: "Suma minimă pentru retragere este de 100 RON." });
    }

    const { type, fullName, identifier, iban, bankName } = req.body;

    // Validare simplă a formularului
    if (!type || !fullName || !identifier || !iban) {
      return res.status(400).json({ error: "Te rugăm să completezi toate câmpurile obligatorii." });
    }

    // 3. Creăm cererea de retragere în baza de date
    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId,
        amountRon: earningsRon,
        type,
        fullName,
        identifier,
        iban,
        bankName
      }
    });

    // 4. Resetăm earningsCents pe cupon înapoi la 0 (banii intră în procesare)
    await prisma.coupon.update({
      where: { id: user.affiliateCoupon.id },
      data: { earningsCents: 0 }
    });

    // 5. Trimitem email-urile de alertă
    try {
      // Email către tine (Admin) cu toate datele fiscale gata de plată
      await sendAdminWithdrawalAlert({
        adminEmail: "contact@karixcomputers.ro", // Pune emailul tău de admin
        userName: user.name,
        userEmail: user.email,
        amount: earningsRon,
        type,
        fullName,
        identifier,
        iban,
        bankName
      });

      // Email de confirmare către promoter
      await sendUserWithdrawalConfirmation(user.email, user.name, earningsRon);
    } catch (mailErr) {
      console.error("Eroare la trimiterea emailurilor de retragere:", mailErr);
    }

    res.json({ success: true, message: "Cererea de retragere a fost trimisă cu succes!" });

  } catch (error) {
    console.error("WITHDRAWAL REQUEST ERROR:", error);
    res.status(500).json({ error: "Eroare la procesarea cererii de retragere." });
  }
});

export default router;