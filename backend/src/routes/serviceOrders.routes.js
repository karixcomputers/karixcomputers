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

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis." });
  }
};

/**
 * 1. POST /api/service-orders
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { 
      method, 
      productName, 
      orderId, // ID-ul trimis din frontend (daca exista)
      issueDescription, 
      judet, oras, address, phoneNumber, preferredDate 
    } = req.body;

    const userId = req.user.id || req.user.sub;
    const userEmail = req.user.email;

    // 🔎 LOGICA DE EXTRACȚIE: Căutăm în baza de date numărul real al comenzii (achiziției)
    let purchaseOrderId = orderId;

    // Dacă ID-ul lipsește (de ex. refresh la pagină), îl extragem din tabelul Order
    if (!purchaseOrderId || purchaseOrderId === "") {
      const realOrder = await prisma.order.findFirst({
        where: {
          userId: userId,
          items: {
            some: { productName: productName }
          }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      });
      
      if (realOrder) {
        purchaseOrderId = String(realOrder.id); // Extragem cifrele (ex: 10432)
      } else {
        purchaseOrderId = "Service-" + Math.floor(1000 + Math.random() * 9000); // Fallback minim dacă nu găsim achiziția
      }
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const finalName = dbUser?.name || userEmail.split('@')[0];

    // 2. Salvăm în ServiceOrder folosind ID-ul de achiziție extras (numai cifre)
    const newServiceOrder = await prisma.serviceOrder.create({
      data: {
        orderId: String(purchaseOrderId), 
        productName,
        customerName: finalName,
        phoneNumber,
        method,
        issueDescription,
        judet: method === "curier" ? judet : "Bihor",
        oras: method === "curier" ? oras : "Oradea",
        address: address || "Nespecificat", 
        preferredDate,
        userId: userId,
        status: "in_asteptare"
      }
    });

    try {
      const fullAddress = method === "curier" 
        ? `${address}, ${oras}, ${judet}`
        : `${address}, Oradea, Bihor`;

      // ✉️ Trimitere mail către CLIENT (folosim .orderId care conține cifrele extrase)
      await sendServiceOrderPlaced(userEmail, {
        customerName: finalName,
        orderId: newServiceOrder.orderId, 
        serviceList: productName, 
        deliveryAddress: fullAddress,
        phone: phoneNumber,
        method: method,
        issueDescription: issueDescription 
      });
      
      // ✉️ Trimitere alertă către ADMIN
      if (method === "curier") {
        await sendAdminServiceCourierAlert({
          productName,
          orderId: newServiceOrder.orderId,
          customerName: finalName,
          customerPhone: phoneNumber,
          judet, oras, address, preferredDate
        });
      } else {
        await sendAdminServiceOradeaAlert({
          productName,
          orderId: newServiceOrder.orderId,
          customerName: finalName,
          customerPhone: phoneNumber,
          preferredDate,
          issueDescription,
          address: address
        });
      }
    } catch (mailErr) {
      console.error("⚠️ Eroare mail:", mailErr);
    }

    res.status(201).json(newServiceOrder);
  } catch (error) {
    console.error("❌ CREATE ERROR:", error);
    res.status(500).json({ error: "Eroare la procesare." });
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
      data: { status, awb: awb !== undefined ? awb : undefined },
      include: { user: { select: { email: true, name: true } } }
    });

    const userEmail = updatedOrder.user.email;
    const emailData = {
      customerName: updatedOrder.customerName,
      // 👉 REPARAȚIE: Folosim .orderId (ID-ul numeric extras la creare)
      orderId: updatedOrder.orderId, 
      productName: updatedOrder.productName,
      awb: awb || updatedOrder.awb
    };

    if (status === "in_service") await sendServiceInPossessionEmail(userEmail, emailData).catch(() => {});
    else if (status === "finalizat") await sendServiceFinishedEmail(userEmail, emailData).catch(() => {});
    else if (status === "expediat") await sendServiceShippedWithAwbEmail(userEmail, emailData).catch(() => {});

    res.json(updatedOrder);
  } catch (error) { 
    res.status(500).json({ error: "Eroare la actualizare." }); 
  }
});

export default router;