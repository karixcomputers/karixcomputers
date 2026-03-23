import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { 
  sendAdminServiceCourierAlert, 
  sendAdminServiceOradeaAlert,
  sendServiceInPossessionEmail,
  sendServiceFinishedEmail,
  sendServiceOrderPlaced,
  sendServiceShippedWithAwbEmail 
} from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

/**
 * Middleware pentru verificarea rolului de Admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită administrator." });
  }
};

/**
 * 1. POST /api/service-orders
 * Creare cerere service
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { 
      method, 
      productName, 
      orderId, 
      issueDescription, 
      judet, 
      oras, 
      address, 
      phoneNumber, 
      preferredDate 
    } = req.body;

    const userId = req.user.id || req.user.sub;
    const userEmail = req.user.email;

    // Preluăm numele real din DB pentru a evita "Client Karix"
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const finalName = dbUser?.name || userEmail.split('@')[0];

    const newServiceOrder = await prisma.serviceOrder.create({
      data: {
        orderId: String(orderId || ""),
        productName,
        customerName: finalName,
        phoneNumber,
        method,
        issueDescription,
        judet: method === "curier" ? judet : null,
        oras: method === "curier" ? oras : "Oradea",
        address: method === "curier" ? address : "Predare Sediu",
        preferredDate,
        userId: userId,
        status: "in_asteptare"
      }
    });

    try {
      const fullAddress = method === "curier" 
        ? `${address}, ${oras}, ${judet}`
        : "Predare personală la sediul Karix (Oradea)";

      await sendServiceOrderPlaced(userEmail, {
        customerName: finalName,
        orderId: orderId, 
        serviceList: productName, 
        deliveryAddress: fullAddress,
        phone: phoneNumber
      });
      
      if (method === "curier") {
        await sendAdminServiceCourierAlert({
          productName,
          orderId: orderId,
          customerName: finalName,
          customerPhone: phoneNumber,
          judet, oras, address, preferredDate
        });
      } else {
        await sendAdminServiceOradeaAlert({
          productName,
          customerName: finalName,
          customerPhone: phoneNumber,
          preferredDate,
          issueDescription
        });
      }
    } catch (mailErr) {
      console.error("⚠️ Notificările email au întâmpinat probleme:", mailErr);
    }

    res.status(201).json(newServiceOrder);
  } catch (error) {
    console.error("❌ SERVICE ORDER CREATE ERROR:", error);
    res.status(500).json({ error: "Eroare la procesarea solicitării." });
  }
});

/**
 * 2. GET /api/service-orders/my-requests
 * RUTA NOUĂ: Permite clientului să își vadă istoricul de service
 */
router.get("/my-requests", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.sub;

    const orders = await prisma.serviceOrder.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" }
    });

    res.json(orders);
  } catch (error) {
    console.error("❌ FETCH MY SERVICE ORDERS ERROR:", error);
    res.status(500).json({ error: "Eroare la preluarea istoricului de service." });
  }
});

/**
 * 3. GET /api/service-orders/admin/all
 */
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await prisma.serviceOrder.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  } catch (error) { 
    res.status(500).json({ error: "Eroare la preluarea datelor." }); 
  }
});

/**
 * 4. PATCH /api/service-orders/:id/status
 */
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, awb } = req.body;

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id },
      data: { 
        status,
        awb: awb !== undefined ? awb : undefined 
      },
      include: { user: { select: { email: true, name: true } } }
    });

    const userEmail = updatedOrder.user.email;
    const emailData = {
      customerName: updatedOrder.customerName,
      orderId: updatedOrder.orderId,
      productName: updatedOrder.productName,
      awb: awb || updatedOrder.awb
    };

    if (status === "in_service") {
      await sendServiceInPossessionEmail(userEmail, emailData).catch(() => {});
    } 
    else if (status === "finalizat") {
      await sendServiceFinishedEmail(userEmail, emailData).catch(() => {});
    }
    else if (status === "expediat") {
      await sendServiceShippedWithAwbEmail(userEmail, emailData).catch(() => {});
    }

    res.json(updatedOrder);
  } catch (error) { 
    console.error("❌ UPDATE STATUS ERROR:", error);
    res.status(500).json({ error: "Eroare la actualizarea statusului." }); 
  }
});

export default router;