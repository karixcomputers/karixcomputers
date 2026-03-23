import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { 
  sendTicketOpenedEmail, 
  sendTicketResponseEmail, 
  sendTicketResolvedEmail,
  sendAdminTicketAlert // <-- Importăm noua funcție
} from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- CONFIGURARE MULTER PENTRU IMAGINI ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/tickets";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "ticket-" + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Middleware pentru admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis." });
  }
};

async function generateUniqueTicketId() {
  let isUnique = false;
  let newId;
  while (!isUnique) {
    newId = Math.floor(10000 + Math.random() * 90000);
    const existing = await prisma.ticket.findUnique({ where: { id: newId } });
    if (!existing) isUnique = true;
  }
  return newId;
}

/**
 * 1. POST: Creare tichet nou + Imagine opțională
 * ACUM: Trimite notificare și către ADMIN
 */
router.post("/", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const { subject, category, message, priority } = req.body;
    const userId = req.user.sub;
    const imagePath = req.file ? `/uploads/tickets/${req.file.filename}` : null;

    if (!subject || !message) {
      return res.status(400).json({ error: "Subiectul și mesajul sunt obligatorii." });
    }

    const randomTicketId = await generateUniqueTicketId();

    const newTicket = await prisma.ticket.create({
      data: {
        id: randomTicketId,
        subject,
        category,
        priority: priority || "normal",
        userId,
        messages: {
          create: {
            text: message,
            senderRole: "user",
            image: imagePath,
          },
        },
      },
      include: { messages: true, user: true },
    });

    // A. Notificare Email către CLIENT
    await sendTicketOpenedEmail(newTicket.user.email, {
      customerName: newTicket.user.name || "Client Karix",
      subject: newTicket.subject,
      ticketId: newTicket.id
    }).catch(err => console.error("Email Client Error:", err));

    // B. Notificare Email către ADMIN (Template-ul nou HTML)
    await sendAdminTicketAlert({
      ticketId: newTicket.id,
      customerName: newTicket.user.name || "Client Karix",
      customerEmail: newTicket.user.email,
      subject: newTicket.subject,
      messagePreview: message
    }).catch(err => console.error("Email Admin Error:", err));

    res.status(201).json(newTicket);
  } catch (e) { next(e); }
});

/**
 * 2. GET: Toate tichetele mele
 */
router.get("/my-tickets", requireAuth, async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: req.user.sub },
      orderBy: { updatedAt: "desc" },
    });
    res.json(tickets);
  } catch (e) { next(e); }
});

/**
 * 3. GET: Detalii tichet
 */
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const ticketId = parseInt(req.params.id);
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true } },
      },
    });

    if (!ticket) return res.status(404).json({ error: "Inexistent." });
    if (ticket.userId !== req.user.sub && req.user.role !== "admin") {
      return res.status(403).json({ error: "Interzis." });
    }

    res.json(ticket);
  } catch (e) { next(e); }
});

/**
 * 4. POST: Mesaj nou în chat + Imagine opțională
 */
router.post("/:id/messages", requireAuth, upload.single("image"), async (req, res, next) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { text } = req.body;
    const userRole = req.user.role;
    const imagePath = req.file ? `/uploads/tickets/${req.file.filename}` : null;

    const ticket = await prisma.ticket.findUnique({ 
      where: { id: ticketId },
      include: { user: true } 
    });
    
    if (!ticket) return res.status(404).json({ error: "Inexistent." });

    const newMessage = await prisma.ticketMessage.create({
      data: {
        text: text || "",
        senderRole: userRole,
        ticketId,
        image: imagePath,
      },
    });

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    if (userRole === "admin") {
      await sendTicketResponseEmail(ticket.user.email, {
        customerName: ticket.user.name || "Client Karix",
        ticketId: ticket.id,
        messagePreview: text || "Atașament imagine"
      }).catch(err => console.error(err));
    }

    res.status(201).json(newMessage);
  } catch (e) { next(e); }
});

/**
 * 5. GET: Admin all
 */
router.get("/admin/all", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const tickets = await prisma.ticket.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
    });
    res.json(tickets);
  } catch (e) { next(e); }
});

/**
 * 6. PATCH: Status
 */
router.patch("/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status, priority } = req.body;
    const ticketId = parseInt(req.params.id);

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ...(status && { status }), ...(priority && { priority }) },
      include: { user: true }
    });

    if (status === "inchis") {
      await sendTicketResolvedEmail(updated.user.email, {
        customerName: updated.user.name || "Client Karix",
        ticketId: updated.id
      }).catch(err => console.error(err));
    }

    res.json(updated);
  } catch (e) { next(e); }
});

export default router;