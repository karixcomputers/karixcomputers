import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();
const router = express.Router();

// --- CONFIGURARE MULTER PENTRU UPLOAD IMAGINI ---

// Ne asigurăm că folderul 'uploads' există pe server
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setăm unde se salvează fișierele și cum se numesc
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generăm un nume unic: produs-timestamp-random.extensie
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'produs-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtru pentru a accepta doar imagini
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Fișierul nu este o imagine!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limită de 5MB pe fișier
});

// --- RUTA NOUĂ: POST UPLOAD (Folosită de Admin Inventory) ---
// Această rută primește fișierul și returnează URL-ul final
router.post("/upload", requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: "Eroare Multer: " + err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Te rugăm să selectezi un fișier." });
    }

    // Returnăm URL-ul complet care va fi salvat în baza de date
    // MODIFICAT: am adăugat /api în link
const imageUrl = `https://karixcomputers.ro/api/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  });
});

// --- FUNCȚIE HELPER: Generare ID de 5 cifre unic ---
async function generateUniqueProductId() {
  let isUnique = false;
  let newId;
  while (!isUnique) {
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
 * 1. GET: Toate produsele (Vizibile în Shop)
 */
router.get("/", async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isVisible: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (e) { next(e); }
});

/**
 * 2. GET: Admin All (Toate, inclusiv cele ascunse)
 */
router.get("/admin-all", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (e) { next(e); }
});

/**
 * 3. GET: Detalii produs
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
 * 4. POST: Adaugă produs nou
 */
router.post("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { 
      name, priceCents, description, longDescription, images, 
      cpuBrand, gpuBrand, ramGb, storageGb, motherboard, 
      case: caseBrand, cooler, psu, stock, category, 
      warrantyMonths, benchmarks, isVisible 
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
        isVisible: isVisible !== undefined ? isVisible : true
      },
    });

    res.status(201).json(newProduct);
  } catch (e) {
    console.error("PRISMA CREATE ERROR:", e);
    res.status(500).json({ error: "Eroare la salvarea produsului." });
  }
});

/**
 * 5. PUT: Actualizează produs
 */
router.put("/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, priceCents, description, longDescription, images, 
      cpuBrand, gpuBrand, ramGb, storageGb, motherboard, 
      case: caseBrand, cooler, psu, stock, category, 
      warrantyMonths, benchmarks, isVisible 
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
        isVisible: isVisible !== undefined ? isVisible : undefined
      },
    });

    res.json(updatedProduct);
  } catch (e) {
    console.error("PRISMA UPDATE ERROR:", e);
    res.status(500).json({ error: "Nu s-a putut actualiza produsul." });
  }
});

/**
 * 6. DELETE: Șterge produs
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
 * 7. POST: Recenzie produs
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
        product: { connect: { id: id } },
        user: { connect: { id: userId } }
      },
      include: { user: { select: { name: true } } }
    });

    res.status(201).json(review);
  } catch (e) {
    console.error("REVIEW CREATE ERROR:", e);
    res.status(500).json({ error: "Eroare la publicarea recenziei." });
  }
});

export default router;