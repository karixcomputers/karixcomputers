import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js"; // ajustează calea dacă e nevoie

const prisma = new PrismaClient();
const router = express.Router();

// Middleware pt Admin
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else res.status(403).json({ error: "Acces interzis." });
};

// 1. PUBLIC GET: Ia toate anunțurile active (pentru site)
router.get("/active", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Eroare la preluarea anunțurilor." });
  }
});

// 2. ADMIN GET: Toate anunțurile (active + inactive)
router.get("/admin-all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: "Eroare." });
  }
});

// 3. ADMIN POST: Adaugă anunț nou
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text, link, type, targetPage } = req.body;
    const newAnnouncement = await prisma.announcement.create({
      data: { text, link, type, targetPage, isActive: true }
    });
    res.json(newAnnouncement);
  } catch (error) {
    res.status(500).json({ error: "Eroare la creare." });
  }
});

// 4. ADMIN PATCH: Activează/Dezactivează anunț
router.patch("/:id/toggle", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { isActive } = req.body;
    const updated = await prisma.announcement.update({
      where: { id },
      data: { isActive }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Eroare la update." });
  }
});

// 5. ADMIN DELETE: Șterge anunț
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.announcement.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Eroare la ștergere." });
  }
});

export default router;