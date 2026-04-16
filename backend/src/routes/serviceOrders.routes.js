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
import { createReverseFanAWB } from "../services/fancourier.service.js";

const prisma = new PrismaClient();
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită administrator." });
  }
};

/**
 * 1. POST /api/service-orders
 * Creare cerere service / garanție
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

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const finalName = dbUser?.name || userEmail.split('@')[0];

    // 👉 CĂUTĂM COMANDA ORIGINALĂ ȘI PRODUSUL EXACT
    let purchaseOrderId = orderId;
    let targetItemPriceCents = 0; // Vom stoca aici prețul DOAR pentru PC-ul vizat
    let orderCreatedAt = new Date();

    const realOrder = await prisma.order.findFirst({
      where: {
        userId: userId,
        items: { some: { productName: productName } }
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true } // 👉 INCLUDEM ITEMS PENTRU A PUTEA FILTRA
    });

    if (realOrder) {
      purchaseOrderId = String(realOrder.id);
      orderCreatedAt = realOrder.createdAt;

      // Căutăm exact item-ul pentru care s-a cerut service-ul
      const specificItem = realOrder.items.find(i => i.productName === productName);
      
      if (specificItem && specificItem.priceCentsAtBuy) {
          // Luăm prețul per bucată al produsului (fără restul comenzii)
          targetItemPriceCents = specificItem.priceCentsAtBuy;
      } else {
          // Fallback de siguranță (foarte puțin probabil să ajungă aici)
          targetItemPriceCents = realOrder.totalCents;
      }
    } else {
      if (!purchaseOrderId || purchaseOrderId === "") {
        purchaseOrderId = "S" + Date.now().toString().slice(-6);
      }
    }

    let generatedAwb = null;
    const fullAddress = method === "curier" 
        ? `${address}, ${oras}, ${judet}`
        : `${address}, Oradea, Bihor`;

    if (method === "curier") {
        try {
            // Trimitem comanda către generatorul AWB cu prețul SPECIFIC al PC-ului
            const fakeOrderForAWB = {
                id: purchaseOrderId,
                shippingName: finalName,
                shippingPhone: phoneNumber,
                shippingAddress: fullAddress, 
                user: { email: userEmail },
                fanboxLocationId: null,
                totalCents: targetItemPriceCents, // 👉 AICI ACUM INTRĂ DOAR VALOAREA UNUI SINGUR PC
                createdAt: orderCreatedAt
            };

            // Apelăm funcția cu isInsured = true
            generatedAwb = await createReverseFanAWB(fakeOrderForAWB, false, true);
            console.log(`✅ AWB Retur Generat Automat. Valoare bază pt calcul: ${targetItemPriceCents / 100} RON. AWB: ${generatedAwb}`);
        } catch (awbErr) {
            console.error("⚠️ Eroare la generarea automată a AWB-ului:", awbErr.message);
        }
    }

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
        status: "in_asteptare",
        awb: generatedAwb 
      }
    });

    try {
      await sendServiceOrderPlaced(userEmail, {
        customerName: finalName,
        orderId: newServiceOrder.orderId, 
        serviceList: productName, 
        deliveryAddress: fullAddress,
        phone: phoneNumber,
        method: method,
        issueDescription: issueDescription,
        awb: generatedAwb 
      });
      
      if (method === "curier") {
        await sendAdminServiceCourierAlert({
          productName,
          orderId: newServiceOrder.orderId,
          customerName: finalName,
          customerPhone: phoneNumber,
          judet, oras, address, preferredDate,
          issueDescription: issueDescription,
          awb: generatedAwb
        });
      } else {
        await sendAdminServiceOradeaAlert({
          productName,
          orderId: newServiceOrder.orderId,
          customerName: finalName,
          customerPhone: phoneNumber,
          preferredDate,
          issueDescription: issueDescription,
          address: address 
        });
      }
    } catch (mailErr) {
      console.error("⚠️ Eroare mail:", mailErr);
    }

    res.status(201).json(newServiceOrder);
  } catch (error) {
    console.error("❌ SERVICE ORDER CREATE ERROR:", error);
    res.status(500).json({ error: "Eroare la procesarea solicitării." });
  }
});

/**
 * 2. GET /api/service-orders/my-requests
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
    res.status(500).json({ error: "Eroare la preluarea istoricului." });
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