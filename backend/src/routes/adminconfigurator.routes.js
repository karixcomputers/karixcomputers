import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer"; 
import path from "path";     

const prisma = new PrismaClient();
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'config-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

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
router.post("/", requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { category, brand, name, spec, price } = req.body;

    let imageName = null;
    if (req.file) {
      imageName = req.file.filename; 
    }

    if (!category || !name) {
      return res.status(400).json({ error: "Categoria și numele sunt obligatorii." });
    }

    const newComp = await prisma.configuratorComponent.create({
      data: { 
        category, 
        brand: brand || null, 
        name, 
        spec: spec || null,
        price: price ? parseInt(price) : 0,
        image: imageName,
        isActive: true
      }
    });
    res.status(201).json(newComp);
  } catch (err) {
    console.error("POST CONFIG ERROR:", err);
    res.status(500).json({ error: "Eroare la creare." });
  }
});

// 👉 RUTA NOUĂ ADĂUGATĂ AICI: UPDATE pentru o componentă existentă (PENTRU POZE)
router.put("/:id", requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { category, brand, name, spec, price } = req.body;
        
        // Căutăm dacă există componenta
        const existingComponent = await prisma.configuratorComponent.findUnique({
            where: { id }
        });

        if (!existingComponent) {
            return res.status(404).json({ error: "Componenta nu a fost găsită." });
        }

        // Pregătim datele pentru update
        const updateData = {};
        if (category !== undefined) updateData.category = category;
        if (brand !== undefined) updateData.brand = brand || null;
        if (name !== undefined) updateData.name = name;
        if (spec !== undefined) updateData.spec = spec || null;
        if (price !== undefined) updateData.price = parseInt(price);
        
        // Dacă s-a încărcat o imagine nouă, o suprascriem pe cea veche
        if (req.file) {
            updateData.image = req.file.filename;
        }

        const updatedComp = await prisma.configuratorComponent.update({
            where: { id },
            data: updateData
        });

        res.json(updatedComp);
    } catch (err) {
        console.error("PUT CONFIG ERROR:", err);
        res.status(500).json({ error: "Eroare la actualizare." });
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

// PATCH: Activează/Dezactivează o componentă
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