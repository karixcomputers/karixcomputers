import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- 1. FUNCȚII HELPER ---
function shortcodeToId(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    id = (id * BigInt(64)) + BigInt(alphabet.indexOf(char));
  }
  return id.toString();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 2. RUTE ADMIN EXISTENTE ---
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

// --- 3. RUTA GIVEAWAY REPARATĂ ---
router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🚀 [GIVEAWAY] Pornire extragere masivă (10 pagini)...");

  try {
    const { postUrl } = req.body;
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const shortcode = match[1];
    const numericId = shortcodeToId(shortcode);
    
    let allComments = [];
    let cursor = "";

    for (let i = 0; i < 10; i++) {
      console.log(`📄 [PAGINA ${i + 1}] Se caută cu cursor: ${cursor || 'START'}`);
      
      // Folosim parametrul corect pentru acest API (cursor)
      const url = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${numericId}${cursor ? `&cursor=${cursor}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();

      // Extragem comentariile (din cheia 'comments' conform log-ului tău)
      const items = data?.comments || data?.data || data?.items || (Array.isArray(data) ? data : []);
      
      if (items.length === 0) {
        console.log("🛑 Nu am mai primit comentarii noi.");
        break;
      }

      allComments = [...allComments, ...items];
      console.log(`✅ Total acumulat: ${allComments.length} comentarii.`);

      // FIX-UL CRITIC: Folosim 'next_min_id' pe care l-am văzut în consolă!
      cursor = data?.next_min_id || data?.next_max_id || data?.cursor || "";
      
      if (!cursor) {
        console.log("🏁 Gata! API-ul nu a mai trimis next_min_id.");
        break;
      }

      await sleep(600); // Pauză să nu ne ia serverul la ochi
    }

    if (allComments.length === 0) {
      return res.status(400).json({ error: "Nu am găsit niciun comentariu." });
    }

    const winner = allComments[Math.floor(Math.random() * allComments.length)];

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || winner.author?.username || "Anonim",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || winner.author?.profile_pic_url || ""
      },
      totalComments: allComments.length
    });

  } catch (error) {
    console.error("🔥 Eroare la extragere:", error.message);
    res.status(500).json({ error: "Eroare la procesarea paginilor." });
  }
});

export default router;