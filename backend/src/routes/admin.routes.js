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
  console.log("🚀 [GIVEAWAY 2025] Cerere nouă primită...");

  try {
    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: "Lipsește linkul." });

    // Extragem codul postării (shortcode)
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link Instagram invalid!" });
    const shortcode = match[1];

    console.log("🔍 [DEBUG] Shortcode extras:", shortcode);

    // Apelăm noul endpoint: /postcomments/ cu parametrul code_or_url
    const response = await fetch(`https://instagram-scraper-20251.p.rapidapi.com/postcomments/?code_or_url=${shortcode}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com',
        'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
      }
    });

    const data = await response.json();

    // Acest API returnează de obicei comentariile în data.comments sau direct în rădăcina obiectului
    // Verificăm mai multe variante ca să fim siguri
    const items = data?.data?.comments || data?.comments || data?.items || [];

    if (!Array.isArray(items) || items.length === 0) {
      console.log("⚠️ [DEBUG] Nu s-au găsit comentarii. Răspuns API:", JSON.stringify(data).substring(0, 300));
      return res.status(400).json({ error: "Nu s-au putut prelua comentariile. Asigură-te că postarea este publică." });
    }

    // Alegem un câștigător aleatoriu
    const winner = items[Math.floor(Math.random() * items.length)];

    res.json({
      success: true,
      winner: {
        // Adaptăm proprietățile în funcție de ce trimite acest API (user/owner și text/comment_text)
        username: winner.user?.username || winner.owner?.username || "Anonim",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || winner.owner?.profile_pic_url || ""
      },
      totalComments: items.length
    });

  } catch (error) {
    console.error("🔥 [API ERROR]:", error.message);
    res.status(500).json({ error: "Eroare la noul API 2025." });
  }
});

export default router;