import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- RUTE EXISTENTE (PRODUSE / COMENZI) ---

router.post("/products", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = req.body;
    const p = await prisma.product.create({
      data: {
        name: data.name,
        priceCents: Number(data.priceCents),
        images: data.images || [],
        description: data.description || "",
        cpuBrand: data.cpuBrand || "Intel",
        gpuBrand: data.gpuBrand || "NVIDIA",
        ramGb: Number(data.ramGb || 16),
        storageGb: Number(data.storageGb || 1000),
        stock: Number(data.stock || 0),
        tags: data.tags || [],
      },
    });
    res.json(p);
  } catch (e) { next(e); }
});

router.put("/products/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const p = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json(p);
  } catch (e) { next(e); }
});

router.get("/orders", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true, user: true },
      take: 200,
    });
    res.json(orders);
  } catch (e) { next(e); }
});

// --- RUTA GIVEAWAY FINALĂ ---

router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🚀 [FAST-SCRAPER] Începere extragere...");

  try {
    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: "Lipsește linkul." });

    // Extragem shortcode-ul (ex: DXzkhnKiDCg)
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link Instagram invalid!" });
    const shortcode = match[1];

    console.log("🔍 [DEBUG] Folosim codul:", shortcode);

    // Apelăm noul API: instagram-api-fast-reliable-data-scraper
    // Încercăm să îi dăm shortcode-ul direct la parametrul ?id=
    const response = await fetch(`https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${shortcode}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
        'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
      }
    });

    const data = await response.json();
    
    // Structura tipică pentru acest API este data.items sau data.comments
    const items = data?.data?.items || data?.items || data?.comments || [];

    console.log(`📦 [DEBUG] Am găsit ${items.length} comentarii pe prima pagină.`);

    if (items.length === 0) {
      console.log("⚠️ [DEBUG] Răspuns API gol:", JSON.stringify(data).substring(0, 300));
      return res.status(400).json({ error: "Nu s-au găsit comentarii. Verifică dacă postarea e publică." });
    }

    const winner = items[Math.floor(Math.random() * items.length)];

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || winner.owner?.username || winner.author?.username || "Anonim",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || winner.author?.profile_pic_url || ""
      },
      totalComments: items.length
    });

  } catch (error) {
    console.error("🔥 [API ERROR]:", error.message);
    res.status(500).json({ error: "Eroare la noul API Fast-Scraper." });
  }
});

export default router;