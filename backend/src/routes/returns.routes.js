import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer"; 
import { 
  sendReturnConfirmation, 
  sendAdminReturnAlert,
  sendReturnReceivedOkEmail,
  sendReturnReceivedIssuesEmail, 
  sendReturnPaidEmail,
  sendReturnRejectedEmail,
  sendReturnRejectedAwbEmail 
} from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

const upload = multer({ dest: "uploads/returns/" });

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită drepturi de administrator." });
  }
};

/**
 * 1. POST /api/returns (Client)
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { 
      orderId, 
      orderNumber, 
      reason, 
      iban, 
      titular, 
      phoneNumber, 
      comments, 
      selectedItems,
      pickupAddress, 
      method 
    } = req.body;

    const userId = req.user.id || req.user.sub;
    const userEmail = req.user.email;

    // --- REPARAȚIE: Preluăm numele real al utilizatorului din baza de date ---
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const finalCustomerName = dbUser?.name || userEmail.split('@')[0];

    const itemsListFormatted = selectedItems && selectedItems.length > 0 
      ? selectedItems.join(", ") 
      : "Toată comanda";
    
    const methodLabel = method === 'personal' ? 'RIDICARE PERSONALĂ (ORADEA)' : 'CURIER STANDARD';
    const finalComments = `[METODĂ: ${methodLabel}] | [PRODUSE: ${itemsListFormatted}] | ${comments || ""}`;

    const returnReq = await prisma.returnRequest.create({
      data: {
        orderId: parseInt(orderId), 
        orderNumber: String(orderNumber),
        reason: reason || "M-am răzgândit",
        iban: iban,
        titular: titular,
        phoneNumber: phoneNumber || "",
        comments: finalComments,
        returnedItems: selectedItems || [],
        status: "pending",
        userId: userId,
      }
    });

    // Folosim finalCustomerName extras din DB
    await sendReturnConfirmation(userEmail, {
      customerName: finalCustomerName,
      orderNumber, 
      iban, 
      titular,
      itemsList: itemsListFormatted,
      pickupAddress: pickupAddress,
      method: method 
    });

    await sendAdminReturnAlert({
      orderNumber,
      customerName: finalCustomerName,
      reason: `${reason} (${methodLabel})`,
      iban, 
      titular, 
      phoneNumber,
      itemsList: itemsListFormatted,
      pickupAddress: pickupAddress
    });

    res.status(201).json({ ok: true, data: returnReq });
  } catch (error) {
    console.error("❌ ERROR IN RETURNS POST:", error);
    res.status(500).json({ error: "Eroare la crearea returului." });
  }
});

/**
 * 2. GET /api/returns/admin/all (Admin)
 */
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const returns = await prisma.returnRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        user: { select: { name: true, email: true } },
        order: { select: { items: true } } 
      }
    });
    res.json(returns);
  } catch (error) {
    res.status(500).json({ error: "Eroare la preluarea datelor." });
  }
});

/**
 * 3. PATCH /api/returns/admin/:id/status (Admin)
 */
router.patch("/admin/:id/status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: { status },
      include: { user: { select: { email: true, name: true } } }
    });

    // REPARAȚIE: Fallback la prima parte a email-ului dacă numele lipsește în DB
    const customerDisplayName = updated.user.name || updated.user.email.split('@')[0];

    const mailData = {
      customerName: customerDisplayName,
      orderNumber: updated.orderNumber,
      iban: updated.iban
    };

    if (status === "received_ok") await sendReturnReceivedOkEmail(updated.user.email, mailData);
    else if (status === "completat") await sendReturnPaidEmail(updated.user.email, mailData);
    else if (status === "respins") await sendReturnRejectedEmail(updated.user.email, mailData);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la actualizarea statusului." });
  }
});

/**
 * 4. PATCH /api/returns/admin/:id/report-issues (Admin)
 */
router.patch("/admin/:id/report-issues", requireAuth, requireAdmin, upload.array("images"), async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const files = req.files;

    const currentReturn = await prisma.returnRequest.findUnique({
      where: { id },
      select: { comments: true }
    });

    const oldComments = currentReturn?.comments || "";
    const newComments = `${oldComments} | [PROBLEME CONSTATATE: ${description}]`;

    const updatedReturn = await prisma.returnRequest.update({
      where: { id },
      data: { 
        status: "received_issues",
        comments: newComments
      },
      include: { user: { select: { email: true, name: true } } }
    });

    const customerDisplayName = updatedReturn.user.name || updatedReturn.user.email.split('@')[0];

    const attachments = files.map(file => ({
      path: file.path,
      filename: file.originalname
    }));

    await sendReturnReceivedIssuesEmail(updatedReturn.user.email, {
      customerName: customerDisplayName,
      orderNumber: updatedReturn.orderNumber,
      description: description,
      date: new Date().toLocaleDateString('ro-RO'),
      attachments: attachments
    });

    res.json(updatedReturn);
  } catch (error) {
    console.error("❌ ERROR REPORTING ISSUES:", error);
    res.status(500).json({ error: "Eroare la raport probleme." });
  }
});

/**
 * 5. PATCH /api/returns/admin/:id/send-awb (Admin)
 */
router.patch("/admin/:id/send-awb", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { awb } = req.body;

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: { returnAwb: awb },
      include: { user: { select: { email: true, name: true } } }
    });

    const customerDisplayName = updated.user.name || updated.user.email.split('@')[0];

    await sendReturnRejectedAwbEmail(updated.user.email, {
      customerName: customerDisplayName,
      orderNumber: updated.orderNumber,
      awb: awb
    });

    res.json(updated);
  } catch (error) {
    console.error("❌ ERROR SENDING AWB:", error);
    res.status(500).json({ error: "Eroare la trimitere AWB." });
  }
});

export default router;