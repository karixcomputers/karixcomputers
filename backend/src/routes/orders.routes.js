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
  // 👉 IMPORTĂM FUNCȚIILE NOI DE ASAMBLARE AICI
  sendAssemblyOrderPlaced,
  sendAdminAssemblyAlert
} from "../services/mail.service.js";

// 👉 IMPORTĂM FUNCȚIA DE FAN COURIER
import { createFanAWB } from "../services/fancourier.service.js";

// --- IMPORT NOU PENTRU FACTURI & PROFORME ---
import { 
  getSmartBillPdf,
  createSmartBillProforma, 
  getSmartBillProformaPdf, 
  createSmartBillInvoice   
} from "../services/smartbill.service.js";

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
    
    // Actualizăm statusul comenzii și luăm datele utilizatorului
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        status,
        // Dacă adminul anulează comanda, anulăm automat și toate produsele din ea
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

    // 👉 Dacă adminul trece comanda pe status "anulat", trimitem noul mail!
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

// 6. PATCH: Status Update Granular (ITEM STATUS)
router.patch("/item/:itemId/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    // 👉 NOU: Am extras weight și packages din request
    const { status, awb, weight, packages } = req.body; 

    // Am schimbat in "let" pentru a putea actualiza awb-ul dupa generare
    let updatedItem = await prisma.orderItem.update({
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

    const userEmail = updatedItem.order.user.email;
    const itemName = (updatedItem.productName || "").toLowerCase();
    
    const isService = itemName.includes('service') || 
                      itemName.includes('mentenanta') || 
                      itemName.includes('curatare') || 
                      itemName.includes('drift') || 
                      itemName.includes('hall') || 
                      itemName.includes('reparatie') ||
                      itemName.includes('asamblare'); // Adaugat asamblare la conditia de service
                      
    const isOradea = updatedItem.order.shippingAddress?.toLowerCase().includes('oradea');
    let currentAwb = awb || updatedItem.awb || "";

    const emailData = {
      customerName: updatedItem.order.shippingName,
      productName: updatedItem.productName,
      orderId: updatedItem.orderId,
      awb: currentAwb,
      phone: updatedItem.order.shippingPhone
    };

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
        // La "Ambalat", trimitem DOAR email-ul ca pachetul e pregatit (Fara AWB)
        await sendOrderReadyEmail(userEmail, emailData).catch(err => console.error(err));
      }
    } 
    else if (status === "predat_curier") {
      if (!isOradea) {
        
        // --- LOGICĂ NOUĂ AWB PE STATUS PREDAT CURIER ---
        if (!currentAwb) {
          try {
            // 👉 NOU: Generăm automat cu funcția, pasând isTestMode = false, plus greutatea și numărul de colete
            const newAwb = await createFanAWB(updatedItem.order, false, weight, packages); 
            
            // Salvăm noul awb in baza de date si actualizam currentAwb
            updatedItem = await prisma.orderItem.update({
              where: { id: itemId },
              data: { awb: newAwb },
              include: { order: { include: { items: true, user: { select: { email: true } } } } }
            });

            currentAwb = newAwb;
            emailData.awb = newAwb; // Actualizam si pt trimiterea din mail
            console.log(`🚀 AWB generat automat la predare: ${newAwb} | Greutate: ${weight}kg | Colete: ${packages}`);
          } catch (awbError) {
            console.error("❌ Eroare auto-generare AWB:", awbError);
            // Oprim execuția și returnăm eroarea către Frontend pentru a fi afișată în Toast
            return res.status(500).json({ error: awbError.message || "Eroare la generarea AWB-ului la FAN Courier" });
          }
        }
        
        // Trimitem email-ul cu numarul de AWB
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
    
    const hasAssembly = cartItems.some(item => {
        const name = (item.productName || item.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return name.includes("asamblare");
    });

    const containsServices = cartItems.some(item => {
        const name = (item.productName || item.name || "").toLowerCase();
        return item.category === 'service' || serviceKeywords.some(kw => name.includes(kw));
    });

    const initialStatus = paymentMethod === 'transfer_bancar' ? 'in_asteptare_plata' : 'in_asteptare';

    // 👉 Salvăm baza adresei + Separatorul pentru BAZA DE DATE (ca să-l citească Netopia și Mailurile)
    const baseAddress = `${client.addressDetails}, ${client.city}, ${client.county}`;
    // Aici verificăm variabila pe care o trimite efectiv frontend-ul.
    // Cum ai spus că ai lăsat checkout-ul default, nota clientului vine ca "client.assemblyNotes" 
    // SAU ca parte din client.addressDetails. Le captăm pe amândouă:
    let finalNote = client.assemblyNotes ? client.assemblyNotes : "";
    let cleanAddressDetails = client.addressDetails || "";

    if (cleanAddressDetails.includes("| Note client:")) {
        const parts = cleanAddressDetails.split("| Note client:");
        cleanAddressDetails = parts[0].trim();
        finalNote = parts[1].trim();
    }

    const cleanBaseAddress = `${cleanAddressDetails}, ${client.city}, ${client.county}`;
    const dbShippingAddress = finalNote ? `${cleanBaseAddress} | Note: ${finalNote}` : cleanBaseAddress;

    const newOrder = await prisma.order.create({
      data: {
        id: randomOrderId,
        userId: req.user.sub,
        totalCents: total,
        shippingName: client.isCompany ? client.companyName : client.name,
        shippingPhone: client.phone,
        shippingAddress: dbShippingAddress, // Salvat în DB cu "| Note:"
        isCompany: client.isCompany || false,
        companyName: client.isCompany ? client.companyName : null,
        cui: client.isCompany ? client.cui : null,
        regCom: client.isCompany ? client.regCom : null,
        paymentMethod: paymentMethod,
        status: initialStatus,
        items: {
          create: cartItems.map(item => {
            const nameFinal = item.productName || item.name;
            const nameLower = nameFinal.toLowerCase();
            const isServiceItem = (item.category === 'service') || 
                                  serviceKeywords.some(kw => nameLower.includes(kw)) ||
                                  nameLower.includes("asamblare");
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

    // ------------------------------------------------------------
    // 🚀 BIFURCAȚIE: ASAMBLARE vs STANDARD
    // ------------------------------------------------------------
    if (hasAssembly) {
      let proformaPdfBuffer = null;
      if (paymentMethod === 'transfer_bancar') {
        try {
          const proformaData = await createSmartBillProforma(newOrder, client, cartItems);
          if (proformaData && proformaData.series && proformaData.number) {
            proformaPdfBuffer = await getSmartBillProformaPdf(proformaData.series, proformaData.number);
          }
        } catch (err) {}
      }

      const isOradea = pickupType === "KarixPersonal" || client.city.toLowerCase().includes("oradea");
      const modPredare = isOradea ? "Predare Personală Oradea (F2F)" : "Prin Curier / Comandă furnizor";

      // Adresa finală de preluat pentru EMAIL (fără Note)
      let cleanAddress = isOradea ? modPredare : cleanBaseAddress;
      let pieseText = finalNote ? finalNote : "Nu au fost adăugate detalii suplimentare.";

      if (paymentMethod !== 'online') {
        await sendAssemblyOrderPlaced(uEmail, {
            customerName: client.isCompany ? client.companyName : client.name,
            orderId: newOrder.id,
            deliveryAddress: cleanAddress,
            phone: client.phone,
            method: modPredare,
            issueDescription: pieseText,
            isOradea: isOradea
        }, proformaPdfBuffer).catch(e => console.error(e));

        await sendAdminAssemblyAlert({
            productName: "Asamblare PC Premium",
            orderId: newOrder.id,
            customerName: client.isCompany ? client.companyName : client.name,
            customerPhone: client.phone,
            method: modPredare,
            address: cleanAddress,
            issueDescription: pieseText,
            isOradea: isOradea
        }).catch(e => console.error(e));
      }
    } else {
      let proformaPdfBuffer = null;
      if (paymentMethod === 'transfer_bancar') {
        try {
          const proformaData = await createSmartBillProforma(newOrder, client, cartItems);
          if (proformaData && proformaData.series && proformaData.number) {
            proformaPdfBuffer = await getSmartBillProformaPdf(proformaData.series, proformaData.number);
          }
        } catch (err) {}
      }

      const commonMailData = {
        client: client,
        orderId: newOrder.id,
        total: total,
        couponCode: couponCode || null,
        pickupType: pickupType,
        isServiceOrder: containsServices, 
        paymentMethod: paymentMethod, 
        cartItems: cartItems.map(item => {
          const nameFinal = item.productName || item.name;
          const nameLower = nameFinal.toLowerCase();
          const isSrv = (item.category === 'service') || serviceKeywords.some(kw => nameLower.includes(kw));
          return { ...item, name: nameFinal, isServiceItem: isSrv, priceCentsAtBuy: item.priceCents || item.priceCentsAtBuy, qty: item.qty || 1 };
        })
      };

      if (paymentMethod !== 'online') {
        if (uEmail) await sendUnifiedOrderEmail(uEmail, commonMailData, false, proformaPdfBuffer).catch(e => console.error(e));
        await sendUnifiedOrderEmail(adminEmail, commonMailData, true, proformaPdfBuffer).catch(e => console.error(e));
      }
    }

    res.status(200).json({ success: true, orderId: newOrder.id });

  } catch (error) {
    console.error("Eroare Backend Comandă:", error);
    res.status(500).json({ error: error.message });
  }
});

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
    res.status(200).json({ cod: 500, message: "Conexiune refuzată de ANAF." });
  }
});

router.get("/:id/invoice", requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.sub;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: "Comanda nu a fost găsită." });
    if (order.userId !== userId && req.user.role !== "admin") return res.status(403).json({ error: "Acces interzis." });
    if (!order.smartbillSeries || !order.smartbillNumber) return res.status(404).json({ error: "Factura nu a fost încă emisă pentru această comandă." });
    const pdfBuffer = await getSmartBillPdf(order.smartbillSeries, order.smartbillNumber);
    if (!pdfBuffer) return res.status(500).json({ error: "Eroare la preluarea facturii de la SmartBill." });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Factura_Karix_${order.id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) { res.status(500).json({ error: "Eroare internă la descărcarea facturii." }); }
});

router.post("/:id/confirm-transfer", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true, user: true } });
    if (!order) return res.status(404).json({ error: "Comanda nu a fost găsită." });
    if (order.paymentMethod !== "transfer_bancar") return res.status(400).json({ error: "Această acțiune este doar pentru OP." });

    let invoiceData;
    let pdfBuffer;
    try {
      invoiceData = await createSmartBillInvoice(order);
      if (invoiceData && invoiceData.series && invoiceData.number) {
        pdfBuffer = await getSmartBillPdf(invoiceData.series, invoiceData.number);
      }
    } catch (e) { return res.status(500).json({ error: "Plata nu a fost confirmată deoarece emiterea facturii a eșuat." }); }

    await prisma.order.update({
      where: { id },
      data: {
        status: "in_procesare",
        smartbillSeries: invoiceData.series,
        smartbillNumber: invoiceData.number,
        items: { updateMany: { where: { status: "in_asteptare_plata" }, data: { status: "in_procesare" } } }
      }
    });
    await sendFinalInvoiceEmail(order.user.email, order, pdfBuffer);
    res.json({ success: true, message: "Plata a fost confirmată, iar factura a fost trimisă clientului." });
  } catch (error) { res.status(500).json({ error: "Eroare internă." }); }
});

export default router;