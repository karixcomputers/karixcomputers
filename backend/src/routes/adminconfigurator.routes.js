import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else res.status(403).json({ error: "Acces interzis." });
};

// --- RUTE PUBLICE (Configurator Clienți) ---

// GET: Ia toate componentele active
router.get("/", async (req, res) => {
  try {
    const components = await prisma.configuratorComponent.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(components);
  } catch (err) {
    console.error("GET CONFIG ERROR:", err);
    res.status(500).json({ error: "Eroare la descărcare." });
  }
});

// --- RUTE ADMIN (Panou Moderare) ---

// GET: Ia TOATE componentele (inclusiv inactive)
router.get("/all", requireAuth, requireAdmin, async (req, res) => {
  try {
    const components = await prisma.configuratorComponent.findMany({
      orderBy: { category: 'asc' }
    });
    res.json(components);
  } catch (err) {
    res.status(500).json({ error: "Eroare la descărcare." });
  }
});

// POST: Adaugă o componentă nouă
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { category, brand, name, spec, price } = req.body;

    // Validare minimală
    if (!category || !name) {
      return res.status(400).json({ error: "Categoria și numele sunt obligatorii." });
    }

    const newComp = await prisma.configuratorComponent.create({
      data: { 
        category, 
        brand: brand || null, 
        name, 
        spec: spec || null,
        // Convertim prețul în număr întreg (cents) pentru siguranță
        price: price ? parseInt(price) : 0,
        isActive: true
      }
    });
    res.status(201).json(newComp);
  } catch (err) {
    console.error("POST CONFIG ERROR:", err);
    res.status(500).json({ error: "Eroare la creare." });
  }
});

// DELETE: Șterge o componentă definitiv
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.configuratorComponent.delete({ 
      where: { id: req.params.id } 
    });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE CONFIG ERROR:", err);
    res.status(500).json({ error: "Eroare la ștergere." });
  }
});

// PATCH: Activează/Dezactivează o componentă (Opțional, dar util)
router.patch("/:id/toggle", requireAuth, requireAdmin, async (req, res) => {
    try {
        const component = await prisma.configuratorComponent.findUnique({
            where: { id: req.params.id }
        });
        const updated = await prisma.configuratorComponent.update({
            where: { id: req.params.id },
            data: { isActive: !component.isActive }
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Eroare la actualizare." });
    }
});

export default router;