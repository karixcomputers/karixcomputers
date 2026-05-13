import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

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

// În src/routes/admin.routes.js (sau routes/admin.js)

router.post("/giveaway-picker", async (req, res) => {
  console.log("🚀 [DEBUG] GIVEAWAY ROUTE HIT! Link primit:", req.body.postUrl);

  try {
    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: "Lipsește linkul!" });

    // Regex mai nesimțit care prinde orice (p, reel, share, etc.)
    const regex = /\/(?:p|reel|reels|tv|share\/p)\/([a-zA-Z0-9_-]+)/;
    const match = postUrl.match(regex);
    
    if (!match) {
      console.log("❌ [DEBUG] Link invalid format:", postUrl);
      return res.status(400).json({ error: "Link Instagram invalid!" });
    }

    const mediaCode = match[1];
    console.log("🔍 [DEBUG] Extras Media Code:", mediaCode);

    const response = await fetch(`https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php?media_code=${mediaCode}&sort_order=popular`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
        'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
      }
    });

    const data = await response.json();
    
    // Verificare agresivă a datelor (API-urile astea schimbă formatul des)
    const items = data?.data?.items || data?.comments || data?.data || [];
    
    if (!Array.isArray(items) || items.length === 0) {
      console.log("⚠️ [DEBUG] Nu s-au extras comentarii. Răspuns API:", JSON.stringify(data).substring(0, 200));
      return res.status(404).json({ error: "Nu s-au găsit comentarii la această postare." });
    }

    const winner = items[Math.floor(Math.random() * items.length)];
    console.log("✅ [DEBUG] Câștigător ales:", winner.user?.username);

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || "Anonim",
        text: winner.text || "",
        profilePic: winner.user?.profile_pic_url || ""
      },
      totalComments: items.length
    });

  } catch (error) {
    console.error("🔥 [DEBUG] EROARE FATALĂ:", error);
    res.status(500).json({ error: "Eroare internă de server." });
  }
});

export default router;
