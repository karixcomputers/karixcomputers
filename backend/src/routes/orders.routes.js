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
  sendOrderCanceledEmail,
  sendFinalInvoiceEmail,
  sendAdminOrderCanceledEmail,
  sendAssemblyOrderPlaced,
  sendAdminAssemblyAlert,
  sendFanboxInstructionsEmail,
  sendFanboxCheckoutEmail
} from "../services/mail.service.js";

import { createFanAWB, createReverseFanAWB } from "../services/fancourier.service.js";

import { 
  getSmartBillPdf,
  createSmartBillProforma, 
  getSmartBillProformaPdf, 
  createSmartBillInvoice   
} from "../services/smartbill.service.js";

const prisma = new PrismaClient();
const router = express.Router();

const normalizeTxt = (txt) => (txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const serviceKeywordsArray = ['service', 'mentenanta', 'curatare', 'reparatie', 'diagnosticare', 'drift', 'hall', 'stick', 'montaj', 'asamblare'];

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
      data: { 
        status,
        ...(status === "anulat" && {
          items: {
            updateMany: {
              where: {},
              data: { status: "anulat" }
            }
          }
        })
      },
      include: { 
        user: { select: { email: true } },
        items: true 
      }
    });

    if (status === "anulat" && updatedOrder.user?.email) {
      const mailData = {
        customerName: updatedOrder.shippingName || "Client Karix",
        orderId: updatedOrder.id
      };
      await sendAdminOrderCanceledEmail(updatedOrder.user.email, mailData).catch(err => console.error(err));
    }

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

    const cancelableStatuses = ["in_asteptare", "in_procesare", "in_asteptare_ridicare", "in_asteptare_plata"];
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

// 6. PATCH: Status Update Granular (ITEM STATUS) - Generare AWB Livrare
router.patch("/item/:itemId/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { status, awb, weight, packages, insurance, forceFanbox } = req.body; 

    const currentItem = await prisma.orderItem.findUnique({
      where: { id: itemId }, 
      include: { order: { include: { user: true, items: true } } }
    });

    if (!currentItem) return res.status(404).json({ error: "Item negăsit." });

    let generatedAwb = awb || currentItem.awb || null;
    const order = currentItem.order;

    const rawOrderAddress = order.shippingAddress || "";
    const isOradea = normalizeTxt(rawOrderAddress).includes('oradea') && order.pickupType === "KarixPersonal";

    // GENERARE AWB (Dacă e predat curier/fanbox și n-avem deja un AWB emis)
    if (status === 'predat_curier' && !generatedAwb) {
        if (!isOradea) {
            try {
                generatedAwb = await createFanAWB(
                    order, 
                    false, 
                    weight || 1, 
                    packages || 1, 
                    insurance || false,
                    forceFanbox || false 
                );
                
                // Am șters prisma.order.update({ data: { awb: generatedAwb } }) de aici!
                
            } catch (awbError) {
                console.error("❌ Eroare auto-generare AWB (Karix->Client):", awbError);
                return res.status(500).json({ error: awbError.message || "Eroare generare AWB" });
            }
        }
    }

    // AWB-ul se salvează AICI la nivel de OrderItem, unde coloana "awb" chiar există
    let updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status, awb: generatedAwb },
      include: { order: { include: { items: true, user: { select: { email: true } } } } }
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

    const userEmail = updatedItem.order.user.email;
    const itemName = updatedItem.productName || "";
    const isService = serviceKeywordsArray.some(kw => normalizeTxt(itemName).includes(kw));
    
    const emailData = {
      customerName: updatedItem.order.shippingName,
      productName: updatedItem.productName,
      orderId: updatedItem.orderId,
      awb: generatedAwb,
      phone: updatedItem.order.shippingPhone
    };

    // Trimitem email-uri în funcție de status
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
    else if (status === "predat_curier" && !isOradea) {
      if (isService) {
        await sendServiceShippedBackEmail(userEmail, emailData).catch(err => console.error(err));
      } else {
        await sendOrderShippedEmail(userEmail, emailData).catch(err => console.error(err));
      }
    }

    res.json({ success: true, item: updatedItem, orderStatusSynced: finalOrderStatus });
  } catch (e) { next(e); }
});

// 7. POST: Creare comandă (Checkout)
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { client, cartItems, total, userEmail, pickupType, couponCode, paymentMethod, shippingCents } = req.body;
    const randomOrderId = await generateUniqueOrderId();
    
    const hasAssembly = cartItems.some(item => normalizeTxt(item.productName || item.name).includes("asamblare"));

    const containsServices = cartItems.some(item => {
        const isSrvCategory = item.category === 'service';
        const hasSrvKeyword = serviceKeywordsArray.some(kw => normalizeTxt(item.productName || item.name).includes(kw));
        return isSrvCategory || hasSrvKeyword;
    });

    const initialStatus = paymentMethod === 'transfer_bancar' ? 'in_asteptare_plata' : 'in_asteptare';

    let fullShippingAddress = [client.addressDetails, client.city, client.county].filter(Boolean).join(", ");
    
    if (client.serviceDeliveryMethod === "fanbox" && client.fanboxAddressText) {
        fullShippingAddress += ` | Locker: ${client.fanboxAddressText}`;
    }

    const newOrder = await prisma.order.create({
      data: {
        id: randomOrderId,
        userId: req.user.sub,
        totalCents: total,
        shippingCents: shippingCents || 0,
        shippingName: client.isCompany ? client.companyName : client.name,
        shippingPhone: client.phone,
        shippingAddress: fullShippingAddress, 
        
        serviceDeliveryMethod: client.serviceDeliveryMethod || "courier",
        fanboxLocationId: client.fanboxLocationId || null,

        isCompany: client.isCompany || false,
        companyName: client.isCompany ? client.companyName : null,
        cui: client.isCompany ? client.cui : null,
        regCom: client.isCompany ? client.regCom : null,
        paymentMethod: paymentMethod,
        status: initialStatus,

        items: {
          create: cartItems.map(item => {
            const nameFinal = item.productName || item.name;
            const isServiceItem = (item.category === 'service') || 
                                  serviceKeywordsArray.some(kw => normalizeTxt(nameFinal).includes(kw));
            
            return {
              productId: String(item.id),
              productName: nameFinal, 
              qty: item.qty || 1,
              priceCentsAtBuy: item.priceCents || item.priceCentsAtBuy,
              status: isServiceItem ? "in_asteptare_ridicare" : initialStatus,
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

    const uEmail = userEmail || (req.user && req.user.email);
    const adminEmail = process.env.ADMIN_EMAIL || "karixcomputers@gmail.com";

    if (hasAssembly) {
      let proformaPdfBuffer = null;
      if (paymentMethod === 'transfer_bancar') {
        try {
          const proformaData = await createSmartBillProforma(newOrder, client, cartItems);
          if (proformaData && proformaData.series && proformaData.number) {
            proformaPdfBuffer = await getSmartBillProformaPdf(proformaData.series, proformaData.number);
          }
        } catch (err) {
          console.error("⚠️ Eroare proformă SmartBill Asamblare:", err);
        }
      }

      const isOradea = pickupType === "KarixPersonal"; 
      const modPredare = isOradea ? "Predare Personală Oradea (F2F)" : "Prin Curier / Comandă furnizor";
      let cleanAddress = isOradea ? "Predare Personală Oradea (F2F)" : client.addressDetails;
      let pieseText = client.assemblyNotes ? client.assemblyNotes : "Fără detalii suplimentare.";

      if (paymentMethod !== 'online') {
        await sendAssemblyOrderPlaced(uEmail, {
            customerName: client.isCompany ? client.companyName : client.name,
            orderId: newOrder.id,
            deliveryAddress: cleanAddress,
            phone: client.phone,
            method: modPredare,
            issueDescription: pieseText,
            isOradea: isOradea 
        }, proformaPdfBuffer).catch(err => console.error("Eroare Mail Client Asamblare:", err));

        await sendAdminAssemblyAlert({
            productName: "Asamblare PC Premium",
            orderId: newOrder.id,
            customerName: client.isCompany ? client.companyName : client.name,
            customerPhone: client.phone,
            method: modPredare,
            address: cleanAddress,
            issueDescription: pieseText,
            isOradea: isOradea 
        }).catch(err => console.error("Eroare Mail Admin Asamblare:", err));
      }

    } else {
      let proformaPdfBuffer = null;
      if (paymentMethod === 'transfer_bancar') {
        try {
          const proformaData = await createSmartBillProforma(newOrder, client, cartItems);
          if (proformaData && proformaData.series && proformaData.number) {
            proformaPdfBuffer = await getSmartBillProformaPdf(proformaData.series, proformaData.number);
          }
        } catch (err) {
          console.error("⚠️ Eroare generare proformă SmartBill:", err);
        }
      }

      const rawAddress = client.addressDetails || "";
      const isFanbox = client.serviceDeliveryMethod === "fanbox" || normalizeTxt(rawAddress).includes("fanbox");

      const commonMailData = {
        client: client,
        orderId: newOrder.id,
        total: total,
        couponCode: couponCode || null,
        pickupType: isFanbox ? 'curier' : pickupType,
        isServiceOrder: containsServices, 
        paymentMethod: paymentMethod,
        cartItems: cartItems.map(item => {
          const nameFinal = item.productName || item.name;
          const isSrv = (item.category === 'service') || serviceKeywordsArray.some(kw => normalizeTxt(nameFinal).includes(kw));
          return { ...item, name: nameFinal, isServiceItem: isSrv, priceCentsAtBuy: item.priceCents || item.priceCentsAtBuy, qty: item.qty || 1 };
        })
      };

      if (isFanbox) {
          commonMailData.client.city = "FANbox";
          commonMailData.client.county = "FANbox";
      }

      if (paymentMethod !== 'online') {
        if (isFanbox) {
           if (uEmail) {
               await sendFanboxCheckoutEmail(uEmail, {
                   customerName: client.isCompany ? client.companyName : client.name,
                   orderId: newOrder.id,
                   fanboxLocation: client.fanboxAddressText || client.addressDetails,
                   total: total
               }).catch(err => console.error("Eroare Mail Checkout FANbox:", err));
           }
        } else {
           if (uEmail) {
              await sendUnifiedOrderEmail(uEmail, commonMailData, false, proformaPdfBuffer).catch(err => console.error("Eroare Mail Client:", err));
           }
        }
        
        await sendUnifiedOrderEmail(adminEmail, commonMailData, true, proformaPdfBuffer).catch(err => console.error("Eroare Mail Admin:", err));
      }
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

// 8. GET: Descărcare Factură PDF
router.get("/:id/invoice", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.sub;

    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) return res.status(404).json({ error: "Comanda nu a fost găsită." });
    if (order.userId !== userId && req.user.role !== "admin") return res.status(403).json({ error: "Acces interzis." });
    if (!order.smartbillSeries || !order.smartbillNumber) return res.status(404).json({ error: "Factura nu a fost emisă." });

    const pdfBuffer = await getSmartBillPdf(order.smartbillSeries, order.smartbillNumber);
    if (!pdfBuffer) return res.status(500).json({ error: "Eroare la preluarea facturii." });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Factura_Karix_${order.id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Eroare download factură:", error);
    res.status(500).json({ error: "Eroare internă." });
  }
});

// 9. POST: Confirmare Plată OP (Admin) + GENERARE AWB RIDICARE AUTOMATĂ
router.post("/:id/confirm-transfer", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, user: true }
    });

    if (!order) return res.status(404).json({ error: "Comanda nu a fost găsită." });
    if (order.paymentMethod !== "transfer_bancar") return res.status(400).json({ error: "Doar pentru Transfer Bancar." });

    let invoiceData = await createSmartBillInvoice(order);
    let pdfBuffer = null;
    if (invoiceData && invoiceData.series && invoiceData.number) {
        pdfBuffer = await getSmartBillPdf(invoiceData.series, invoiceData.number);
    }

    const hasService = order.items.some(item => 
        serviceKeywordsArray.some(kw => normalizeTxt(item.productName).includes(kw))
    );
    
    const rawOrderAddress = order.shippingAddress || "";
    const isFanbox = order.serviceDeliveryMethod === "fanbox" || normalizeTxt(rawOrderAddress).includes("fanbox");
    const isOradea = !isFanbox && normalizeTxt(rawOrderAddress).includes("oradea");

    let reverseAwb = null;
    if (hasService && !isOradea) {
        try {
            console.log(`🔄 Generare AWB Invers (Ridicare de la client) pentru comanda #${order.id}`);
            reverseAwb = await createReverseFanAWB(order); 
        } catch (e) {
            console.error("⚠️ Eroare generare AWB Invers:", e.message);
        }
    }

    await prisma.order.update({
      where: { id },
      data: {
        status: "in_procesare",
        smartbillSeries: invoiceData.series,
        smartbillNumber: invoiceData.number,
        reverseAwb: reverseAwb, 
        items: {
          updateMany: {
            where: { status: "in_asteptare_plata" },
            data: { status: "in_procesare" }
          }
        }
      }
    });

    if (hasService && isFanbox) {
        const isReturnToLocker = !rawOrderAddress.includes("| Locker:");
        await sendFanboxInstructionsEmail(order.user.email, order, isReturnToLocker, pdfBuffer);
    } else {
        await sendFinalInvoiceEmail(order.user.email, order, pdfBuffer);
    }

    res.json({ success: true, reverseAwb: reverseAwb });

  } catch (error) {
    console.error("Eroare la confirmarea plății OP:", error);
    res.status(500).json({ error: "Eroare internă." });
  }
});

export default router;