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
  // Verificăm în pm2 logs dacă ajunge cererea
  console.log("-----------------------------------------");
  console.log("🚀 [GIVEAWAY] Începere extragere pentru URL:", req.body.postUrl);

  try {
    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: "Te rog introdu un link." });

    // Extragere media_code din link
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      console.log("❌ [GIVEAWAY] Link invalid:", postUrl);
      return res.status(400).json({ error: "Link Instagram invalid!" });
    }
    
    const mediaCode = match[1];
    console.log("🔍 [GIVEAWAY] Media Code extras:", mediaCode);

    // Apel API
    const response = await fetch(`https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php?media_code=${mediaCode}&sort_order=popular`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
      }
    });

    const data = await response.json();

    // Verificăm structura datelor primite (API-ul poate varia)
    const items = data?.data?.items || data?.comments || data?.data || [];

    if (!Array.isArray(items) || items.length === 0) {
      console.log("⚠️ [GIVEAWAY] Nu s-au găsit comentarii. Răspuns API:", JSON.stringify(data).substring(0, 200));
      // Folosim status 400 (Bad Request) în loc de 404 ca să nu inducem browserul în eroare
      return res.status(400).json({ error: "Nu s-au găsit comentarii la această postare. Verifică dacă este publică." });
    }

    // Extragere câștigător
    const winner = items[Math.floor(Math.random() * items.length)];
    console.log("✅ [GIVEAWAY] Câștigător ales:", winner.user?.username);

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || "Utilizator",
        text: winner.text || "",
        profilePic: winner.user?.profile_pic_url || ""
      },
      totalComments: items.length
    });

  } catch (error) {
    console.error("🔥 [GIVEAWAY ERROR]:", error.message);
    res.status(500).json({ error: "Eroare la serverul de giveaway." });
  }
});

export default router;