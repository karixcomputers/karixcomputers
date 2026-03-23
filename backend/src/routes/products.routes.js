import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- FUNCȚIE HELPER: Generare ID de 5 cifre unic (format String) ---
async function generateUniqueProductId() {
  let isUnique = false;
  let newId;
  while (!isUnique) {
    // Generăm un număr între 10000 și 99999
    newId = Math.floor(10000 + Math.random() * 90000).toString();
    const existing = await prisma.product.findUnique({ where: { id: newId } });
    if (!existing) isUnique = true;
  }
  return newId;
}

// --- MIDDLEWARE PENTRU ADMIN ---
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces interzis. Necesită drepturi de administrator." });
  }
};

/**
 * 1. GET: Toate produsele (Doar cele marcate ca vizibile)
 */
router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isVisible: true, // <--- ADAUGAT: Filtrăm pentru a nu arăta produsele ascunse în Shop
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (e) { next(e); }
});

// Rută specială pentru Admin - returnează TOT, inclusiv cele ascunse
router.get("/admin-all", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (e) { next(e); }
});

/**
 * 2. GET: Detalii produs (Include Review-uri)
 * Notă: Aici nu filtrăm după isVisible pentru a permite accesul prin link direct
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ 
      where: { id },
      include: {
        reviews: {
          include: {
            user: { select: { name: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    
    if (!product) return res.status(404).json({ error: "Produsul nu a fost găsit." });
    res.json(product);
  } catch (e) { next(e); }
});

/**
 * 3. POST: Adaugă produs/serviciu (Include Benchmarks & Vizibilitate)
 */
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { 
      name, 
      priceCents, 
      description, 
      longDescription, 
      images, 
      cpuBrand, 
      gpuBrand, 
      ramGb, 
      storageGb, 
      motherboard, 
      case: caseBrand, 
      cooler, 
      psu,
      stock,
      category,
      warrantyMonths,
      benchmarks,
      isVisible // <--- ADAUGAT
    } = req.body;

    const randomId = await generateUniqueProductId();

    const newProduct = await prisma.product.create({
      data: {
        id: randomId,
        name,
        priceCents: parseInt(priceCents),
        description: description || "",
        longDescription: longDescription || "", 
        images: images || [],
        category: category || "pc",
        cpuBrand: cpuBrand || null,
        gpuBrand: gpuBrand || null,
        ramGb: ramGb || null,
        storageGb: storageGb || null,
        motherboard: motherboard || null,
        case: caseBrand || null,
        cooler: cooler || null,
        psu: psu || null,
        stock: stock ? parseInt(stock) : 1,
        warrantyMonths: warrantyMonths ? parseInt(warrantyMonths) : 24,
        benchmarks: benchmarks || [],
        isVisible: isVisible !== undefined ? isVisible : true // <--- SALVARE STATUS VIZIBILITATE
      },
    });

    res.status(201).json(newProduct);
  } catch (e) {
    console.error("PRISMA CREATE ERROR:", e);
    res.status(500).json({ error: "Eroare la salvarea produsului." });
  }
});

/**
 * 4. PUT: Actualizează produs existent
 */
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      priceCents, 
      description, 
      longDescription, 
      images, 
      cpuBrand, 
      gpuBrand, 
      ramGb, 
      storageGb, 
      motherboard, 
      case: caseBrand, 
      cooler, 
      psu, 
      stock,
      category,
      warrantyMonths,
      benchmarks,
      isVisible // <--- ADAUGAT
    } = req.body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Produsul nu a fost găsit." });

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        priceCents: priceCents ? parseInt(priceCents) : undefined,
        description: description ?? undefined,
        longDescription: longDescription ?? undefined, 
        images: images ?? undefined,
        category: category ?? undefined,
        cpuBrand: cpuBrand ?? null,
        gpuBrand: gpuBrand ?? null,
        ramGb: ramGb ?? null,
        storageGb: storageGb ?? null,
        motherboard: motherboard ?? null,
        case: caseBrand ?? null,
        cooler: cooler ?? null,
        psu: psu ?? null,
        stock: stock ? parseInt(stock) : undefined,
        warrantyMonths: warrantyMonths !== undefined ? parseInt(warrantyMonths) : undefined,
        benchmarks: benchmarks ?? undefined,
        isVisible: isVisible !== undefined ? isVisible : undefined // <--- ACTUALIZARE STATUS VIZIBILITATE
      },
    });

    res.json(updatedProduct);
  } catch (e) {
    console.error("PRISMA UPDATE ERROR:", e);
    res.status(500).json({ error: "Nu s-a putut actualiza produsul." });
  }
});

/**
 * 5. DELETE: Șterge produs
 */
router.delete("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Produsul nu există." });

    await prisma.product.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) { next(e); }
});

/**
 * 6. POST: Adaugă un review
 */
router.post("/:id/reviews", requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params; 
    const { rating, comment, images } = req.body; 

    const userId = req.user.sub; 

    if (!rating || !comment) {
      return res.status(400).json({ error: "Te rugăm să lași un rating și un comentariu." });
    }

    const review = await prisma.review.create({
      data: {
        rating: parseInt(rating),
        comment,
        images: images || [], 
        product: {
          connect: { id: id }
        },
        user: {
          connect: { id: userId }
        }
      },
      include: {
        user: { select: { name: true } }
      }
    });

    res.status(201).json(review);
  } catch (e) {
    console.error("REVIEW CREATE ERROR:", e);
    res.status(500).json({ error: "Eroare la publicarea recenziei." });
  }
});

export default router;