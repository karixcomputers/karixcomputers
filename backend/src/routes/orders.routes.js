import express from "express";
import axios from "axios";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { 
  sendUnifiedOrderEmail, 
  sendOrderPlaced,       
  sendServiceOrderPlaced, 
  sendOrderReadyEmail, 
  sendOrderShippedEmail,
  sendOradeaPickupEmail,
  sendServiceInPossessionEmail,
  sendServiceFinishedEmail,
  sendServiceShippedBackEmail,
  sendServiceUnrepairableEmail,
  sendOrderCanceledEmail 
} from "../services/mail.service.js";

// --- IMPORT NOU PENTRU FACTURI ---
import { getSmartBillPdf } from "../services/smartbill.service.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- FUNCȚIE HELPER: Generare ID de 5 cifre unic ---
async function generateUniqueOrderId() {
  let isUnique = false;
  let newId;
  while (!isUnique) {
    newId = Math.floor(10000 + Math.random() * 90000);
    const existing = await prisma.order.findUnique({ where: { id: newId } });
    if (!existing) isUnique = true;
  }
  return newId;
}

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită drepturi de administrator." });
  }
};

// 1. GET: Toate comenzile utilizatorului logat
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" },
      include: { 
        items: true,
        returnRequests: true 
      },
    });
    res.json(orders);
  } catch (e) { next(e); }
});

// 2. GET: Admin Active
router.get("/admin/all", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const activeOrders = await prisma.order.findMany({
      where: { NOT: { status: { in: ["livrat", "anulat"] } } },
      orderBy: { createdAt: "desc" },
      include: { 
        items: true, 
        returnRequests: true,
        user: { select: { email: true, name: true, phone: true } } 
      },
    });
    res.json(activeOrders);
  } catch (e) { next(e); }
});

// 3. GET: Istoric Admin
router.get("/admin/history", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const historicalOrders = await prisma.order.findMany({
      where: { status: { in: ["livrat", "anulat"] } },
      orderBy: { createdAt: "desc" },
      include: { 
        items: true,
        returnRequests: true,
        user: { select: { email: true, name: true, phone: true } } 
      },
    });
    res.json(historicalOrders);
  } catch (e) { next(e); }
});

// 4. PATCH: Status Update Global
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10); 
    const { status } = req.body; 
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: { user: { select: { email: true } } }
    });
    res.json({ success: true, order: updatedOrder });
  } catch (e) { next(e); }
});

// 5. PATCH: ANULARE COMANDĂ (Client)
router.patch("/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.sub;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, user: true }
    });

    if (!order || order.userId !== userId) {
      return res.status(404).json({ error: "Comanda nu a fost găsită." });
    }

    const cancelableStatuses = ["in_asteptare", "in_procesare", "in_asteptare_ridicare"];
    const canCancel = order.items.every(it => cancelableStatuses.includes(it.status));

    if (!canCancel) {
      return res.status(400).json({ error: "Comanda nu mai poate fi anulată." });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: "anulat",
        items: {
          updateMany: {
            where: {},
            data: { status: "anulat" }
          }
        }
      }
    });

    const mailData = {
      customerName: order.shippingName,
      orderId: order.id,
      total: (order.totalCents / 100).toFixed(2)
    };

    await sendOrderCanceledEmail(order.user.email, mailData).catch(err => console.error(err));
    res.json({ success: true, message: "Comanda a fost anulată." });
  } catch (e) { next(e); }
});

// 6. PATCH: Status Update Granular (ITEM STATUS)
router.patch("/item/:itemId/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { status, awb } = req.body;

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { 
        status, 
        ...(awb && { awb }) 
      },
      include: { 
        order: { 
          include: { 
            items: true, 
            user: { select: { email: true } } 
          } 
        } 
      }
    });

    const allItems = updatedItem.order.items;
    let finalOrderStatus = status; 

    const isAllDelivered = allItems.every(i => i.status === "livrat");
    const isAnyShipped = allItems.some(i => i.status === "predat_curier");
    const isAnyReady = allItems.some(i => i.status === "gata_de_livrare");
    const isAllCanceled = allItems.every(i => i.status === "anulat");

    if (isAllDelivered) finalOrderStatus = "livrat";
    else if (isAllCanceled) finalOrderStatus = "anulat";
    else if (isAnyShipped) finalOrderStatus = "predat_curier";
    else if (isAnyReady) finalOrderStatus = "gata_de_livrare";

    await prisma.order.update({
      where: { id: updatedItem.orderId },
      data: { status: finalOrderStatus }
    });

    const emailData = {
      customerName: updatedItem.order.shippingName,
      productName: updatedItem.productName,
      orderId: updatedItem.orderId,
      awb: awb || updatedItem.awb || "",
      phone: updatedItem.order.shippingPhone
    };

    const userEmail = updatedItem.order.user.email;
    const itemName = (updatedItem.productName || "").toLowerCase();
    
    const isService = itemName.includes('service') || 
                      itemName.includes('mentenanta') || 
                      itemName.includes('curatare') || 
                      itemName.includes('drift') || 
                      itemName.includes('hall') || 
                      itemName.includes('reparatie');
                      
    const isOradea = updatedItem.order.shippingAddress?.toLowerCase().includes('oradea');

    if (status === "posesie") {
      await sendServiceInPossessionEmail(userEmail, emailData).catch(err => console.error(err));
    } 
    else if (status === "reparat") {
      await sendServiceFinishedEmail(userEmail, emailData).catch(err => console.error(err));
    } 
    else if (status === "ireparabil") {
      await sendServiceUnrepairableEmail(userEmail, emailData).catch(err => console.error(err));
    } 
    else if (status === "gata_de_livrare") {
      if (!isOradea && !isService) {
        await sendOrderReadyEmail(userEmail, emailData).catch(err => console.error(err));
      }
    } 
    else if (status === "predat_curier") {
      if (!isOradea) {
        if (isService) {
          await sendServiceShippedBackEmail(userEmail, emailData).catch(err => console.error(err));
        } else {
          await sendOrderShippedEmail(userEmail, emailData).catch(err => console.error(err));
        }
      }
    }

    res.json({ success: true, item: updatedItem, orderStatusSynced: finalOrderStatus });
  } catch (e) { next(e); }
});

// 7. POST: Creare comandă
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { client, cartItems, total, userEmail, pickupType, couponCode, paymentMethod } = req.body;
    const randomOrderId = await generateUniqueOrderId();

    const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare', 'drift', 'hall', 'stick'];
    
    const containsServices = cartItems.some(item => {
        const name = (item.productName || item.name || "").toLowerCase();
        return item.category === 'service' || serviceKeywords.some(kw => name.includes(kw));
    });

    const newOrder = await prisma.order.create({
      data: {
        id: randomOrderId,
        userId: req.user.sub,
        totalCents: total,
        shippingName: client.isCompany ? client.companyName : client.name,
        shippingPhone: client.phone,
        shippingAddress: `${client.addressDetails}, ${client.city}, ${client.county}`,
        
        isCompany: client.isCompany || false,
        companyName: client.isCompany ? client.companyName : null,
        cui: client.isCompany ? client.cui : null,
        regCom: client.isCompany ? client.regCom : null,

        // --- SALVĂM CORECT METODA DE PLATĂ ---
        paymentMethod: paymentMethod === 'online' ? 'online' : 'ramburs',
        status: "in_asteptare",

        items: {
          create: cartItems.map(item => {
            const nameFinal = item.productName || item.name;
            const nameLower = nameFinal.toLowerCase();
            const isServiceItem = (item.category === 'service') || 
                                  serviceKeywords.some(kw => nameLower.includes(kw));
            
            return {
              productId: String(item.id),
              productName: nameFinal, 
              qty: item.qty || 1,
              priceCentsAtBuy: item.priceCents || item.priceCentsAtBuy,
              status: isServiceItem ? "in_asteptare_ridicare" : "in_asteptare",
              warrantyMonths: item.warrantyMonths ? parseInt(item.warrantyMonths) : (isServiceItem ? 0 : 24)
            };
          })
        }
      },
      include: { items: true }
    });

    if (couponCode) {
      await prisma.coupon.update({
        where: { code: couponCode.toUpperCase() },
        data: { timesUsed: { increment: 1 } }
      }).catch(err => console.error("Eroare incrementare cupon:", err));
    }

    const commonMailData = {
      client: client,
      orderId: newOrder.id,
      total: total,
      couponCode: couponCode || null,
      pickupType: pickupType,
      isServiceOrder: containsServices, 
      cartItems: cartItems.map(item => {
        const nameFinal = item.productName || item.name;
        const nameLower = nameFinal.toLowerCase();
        const isSrv = (item.category === 'service') || serviceKeywords.some(kw => nameLower.includes(kw));
        
        return {
          ...item,
          name: nameFinal, 
          isServiceItem: isSrv,
          priceCentsAtBuy: item.priceCents || item.priceCentsAtBuy,
          qty: item.qty || 1
        };
      })
    };

    if (paymentMethod !== 'online') {
      const uEmail = userEmail || (req.user && req.user.email);
      if (uEmail) {
         await sendUnifiedOrderEmail(uEmail, commonMailData).catch(err => console.error("Eroare Mail Client:", err));
      }
      
      const adminEmail = process.env.ADMIN_EMAIL || "karixcomputers@gmail.com";
      await sendUnifiedOrderEmail(adminEmail, commonMailData, true).catch(err => console.error("Eroare Mail Admin:", err));
    }

    res.status(200).json({ success: true, orderId: newOrder.id });

  } catch (error) {
    console.error("Eroare Backend Comandă:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- RUTĂ PROXY PENTRU ANAF ---
router.post("/anaf", async (req, res) => {
  try {
    const { cui } = req.body;
    const numCui = Number(cui);
    if (!numCui || isNaN(numCui)) return res.status(400).json({ error: "CUI invalid." });

    const response = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      body: JSON.stringify([{ cui: numCui, data: new Date().toISOString().split("T")[0] }])
    });

    if (!response.ok) return res.status(200).json({ cod: 500, message: "ANAF indisponibil" }); 
    const anafData = await response.json();
    res.json(anafData);
  } catch (error) {
    console.error("❌ Eroare conexiune ANAF:", error.message);
    res.status(200).json({ cod: 500, message: "Conexiune refuzată de ANAF." });
  }
});

// 8. NOU: GET: Descărcare Factură PDF
router.get("/:id/invoice", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.sub;

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: "Comanda nu a fost găsită." });
    }

    // Doar proprietarul sau adminul poate descărca
    if (order.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Acces interzis." });
    }

    // Verificăm dacă avem factura salvată pe comandă
    if (!order.smartbillSeries || !order.smartbillNumber) {
      return res.status(404).json({ error: "Factura nu a fost încă emisă pentru această comandă." });
    }

    const pdfBuffer = await getSmartBillPdf(order.smartbillSeries, order.smartbillNumber);

    if (!pdfBuffer) {
      return res.status(500).json({ error: "Eroare la preluarea facturii de la SmartBill." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Factura_Karix_${order.id}.pdf`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Eroare download factură:", error);
    res.status(500).json({ error: "Eroare internă la descărcarea facturii." });
  }
});

export default router;