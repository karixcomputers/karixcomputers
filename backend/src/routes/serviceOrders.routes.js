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

// 👉 IMPORTĂM MULTER PENTRU UPLOAD-URI
import multer from "multer";
import path from "path";

// 👉 IMPORTĂM TOT CE AVEM NEVOIE PENTRU AWB-URI ȘI DEVALORIZARE
import { createReverseFanAWB, createFanAWB, calculateDepreciatedValue } from "../services/fancourier.service.js";

const prisma = new PrismaClient();
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită administrator." });
  }
};

// ==========================================
// CONFIGURARE MULTER PENTRU POZELE DE RESPINGERE
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Salvează pozele în folderul uploads (asigură-te că există)
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "reject-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

/**
 * 1. POST /api/service-orders
 * Creare cerere service / garanție (Aici se face Reverse AWB)
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

    let purchaseOrderId = orderId;
    let targetItemPriceCents = 0;
    let orderCreatedAt = new Date();

    const realOrder = await prisma.order.findFirst({
      where: {
        userId: userId,
        items: { some: { productName: productName } }
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });

    if (realOrder) {
      purchaseOrderId = String(realOrder.id);
      orderCreatedAt = realOrder.createdAt;

      const specificItem = realOrder.items.find(i => i.productName === productName);
      if (specificItem && specificItem.priceCentsAtBuy) {
          targetItemPriceCents = specificItem.priceCentsAtBuy;
      } else {
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
            const fakeOrderForAWB = {
                id: purchaseOrderId,
                shippingName: finalName,
                shippingPhone: phoneNumber,
                shippingAddress: fullAddress, 
                user: { email: userEmail },
                fanboxLocationId: null,
                totalCents: targetItemPriceCents, 
                createdAt: orderCreatedAt
            };

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
        status: "in_drum_laborator", // 👉 Modificat statusul default cum ai cerut
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
 * Aici interceptăm generarea de AWB (Karix -> Client)
 */
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, awb, weight, packages, insurance, declaredValue } = req.body;

    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } }
    });

    if (!serviceOrder) return res.status(404).json({ error: "Comanda de service nu a fost găsită." });

    let generatedAwb = awb || serviceOrder.awb;

    // 👉 LOGICĂ GENERARE AWB (Trimitere înapoi la client)
    if (status === "awb_finalizat" || status === "awb_respins") {
        
        // Preluăm comanda originală pentru a trage detaliile
        const realOrder = await prisma.order.findUnique({
            where: { id: parseInt(serviceOrder.orderId) || 0 },
            include: { items: true }
        });

        // Calculăm prețul produsului și devalorizarea pentru asigurare
        let finalDeclaredValue = 0;
        if (insurance) {
            if (declaredValue) {
                finalDeclaredValue = Number(declaredValue);
            } else if (realOrder) {
                const specificItem = realOrder.items.find(i => i.productName === serviceOrder.productName);
                const targetPriceCents = specificItem ? specificItem.priceCentsAtBuy : realOrder.totalCents;
                
                finalDeclaredValue = calculateDepreciatedValue(targetPriceCents, realOrder.createdAt);
            }
        }

        const fakeOrderForAWB = {
            id: serviceOrder.orderId,
            shippingName: serviceOrder.customerName,
            shippingPhone: serviceOrder.phoneNumber,
            shippingAddress: serviceOrder.judet === "Bihor" && serviceOrder.oras === "Oradea" 
                ? serviceOrder.address 
                : `${serviceOrder.address}, ${serviceOrder.oras}, ${serviceOrder.judet}`, 
            user: { email: serviceOrder.user.email },
            fanboxLocationId: null 
        };

        try {
            // Apelăm generarea AWB Standard (Karix -> Client)
            generatedAwb = await createFanAWB(
                fakeOrderForAWB, 
                false, 
                weight || 5, 
                packages || 1, 
                insurance, 
                false, 
                finalDeclaredValue
            );
            console.log(`✅ AWB Retur către client Generat: ${generatedAwb} (Asigurat: ${finalDeclaredValue} RON)`);
        } catch (awbErr) {
            console.error("⚠️ Eroare generare AWB către client:", awbErr.message);
            return res.status(500).json({ error: "Nu s-a putut genera AWB: " + awbErr.message });
        }
    }

    const updatedOrder = await prisma.serviceOrder.update({
      where: { id },
      data: { 
        status,
        awb: generatedAwb !== undefined ? generatedAwb : undefined 
      },
      include: { user: { select: { email: true, name: true } } }
    });

    const userEmail = updatedOrder.user.email;
    const emailData = {
      customerName: updatedOrder.customerName,
      orderId: updatedOrder.orderId, 
      productName: updatedOrder.productName,
      awb: generatedAwb || updatedOrder.awb
    };

    // 👉 TRIMITERE MAIL-URI PE BAZA STATUSULUI
    if (status === "in_laborator") {
      await sendServiceInPossessionEmail(userEmail, emailData).catch(() => {});
    } 
    else if (status === "finalizat") {
      await sendServiceFinishedEmail(userEmail, emailData).catch(() => {});
    }
    else if (status === "awb_finalizat" || status === "awb_respins" || status === "livrat") {
      // Opțional: dacă vrei să trimiți mail și la awb_respins
      await sendServiceShippedWithAwbEmail(userEmail, emailData).catch(() => {});
    }

    res.json(updatedOrder);
  } catch (error) { 
    console.error("❌ UPDATE STATUS ERROR:", error);
    res.status(500).json({ error: "Eroare la actualizarea statusului." }); 
  }
});

/**
 * 👉 5. POST /api/service-orders/:id/reject-warranty
 * Ruta pe care o caută frontend-ul!
 */
router.post("/:id/reject-warranty", requireAuth, requireAdmin, upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Obținem array-ul cu fișierele uploadate
    const files = req.files || [];
    
    // Construim calea fișierelor pentru a fi trimise în email sau salvate în DB
    // Ex: https://karixcomputers.ro/uploads/reject-12345.jpg
    const imageUrls = files.map(f => `${process.env.CLIENT_URL}/uploads/${f.filename}`);

    const serviceOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      include: { user: { select: { email: true, name: true } } }
    });

    if (!serviceOrder) return res.status(404).json({ error: "Cererea nu a fost găsită." });

    // Actualizăm statusul în "garantie_respinsa"
    const updatedOrder = await prisma.serviceOrder.update({
      where: { id },
      data: { status: "garantie_respinsa" }
    });

    // Pregătim datele pentru mail-ul pe care vrei să îl trimiți clientului
    const emailData = {
      customerName: serviceOrder.customerName,
      orderId: serviceOrder.orderId,
      productName: serviceOrder.productName,
      reason: reason,
      imageUrls: imageUrls
    };

    // Apelăm funcția ta de mail pentru garanție respinsă (trebuie să o ai definită sau să folosești o alternativă)
    // Momentan presupunem că ai o funcție generică sau ai denumit-o `sendServiceUnrepairableEmail`. 
    // Dacă ai creat una dedicată (ex: `sendWarrantyRejectedEmail`), apeleaz-o pe aia!
    const userEmail = serviceOrder.user.email;
    
    // IMPORTĂ ACEASTĂ FUNCȚIE ÎN mail.service.js dacă nu o ai!
    // Dacă momentan nu ai funcție dedicată, poti comenta rândul ăsta ca să nu crăpe, și mă anunți.
    // await sendWarrantyRejectedEmail(userEmail, emailData).catch(err => console.error("Eroare mail:", err));

    res.json({ success: true, message: "Garanție respinsă", order: updatedOrder });
  } catch (error) {
    console.error("❌ EROARE REJECT WARRANTY:", error);
    res.status(500).json({ error: "Eroare la procesarea refuzului." });
  }
});

export default router;