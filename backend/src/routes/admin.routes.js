import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

// HELPER: Pauză între cereri să nu ne blocheze
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- RUTE ADMIN EXISTENTE ---
router.post("/products", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = req.body;
    const p = await prisma.product.create({
      data: {
        name: data.name, priceCents: Number(data.priceCents), images: data.images || [],
        description: data.description || "", cpuBrand: data.cpuBrand || "Intel",
        gpuBrand: data.gpuBrand || "NVIDIA", ramGb: Number(data.ramGb || 16),
        storageGb: Number(data.storageGb || 1000), stock: Number(data.stock || 0), tags: data.tags || [],
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
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, include: { items: true, user: true }, take: 200 });
    res.json(orders);
  } catch (e) { next(e); }
});

// --- RUTA GIVEAWAY (API STABLE - 4 PAGINI) ---
router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🚀 [GIVEAWAY STABLE] Extragere ~200 comentarii...");

  try {
    const { postUrl } = req.body;
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const mediaCode = match[1];
    let allComments = [];
    let nextCursor = "";

    // Loop de 4 ori (4 pagini x ~50 comentarii = ~200)
    for (let i = 0; i < 4; i++) {
      console.log(`📄 Pagina ${i + 1} (Cursor: ${nextCursor ? 'DA' : 'START'})`);
      
      const url = `https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php?media_code=${mediaCode}&sort_order=popular${nextCursor ? `&next_cursor=${encodeURIComponent(nextCursor)}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();
      
      // Extragem comentariile (API-ul ăsta le pune în data.items)
      const items = data?.data?.items || data?.items || data?.comments || [];
      
      if (items.length === 0) {
        console.log("🛑 Nu mai sunt comentarii de tras.");
        break;
      }

      allComments = [...allComments, ...items];
      console.log(`✅ Adunate: ${allComments.length} comentarii.`);

      // Luăm cursorul pentru pagina următoare
      nextCursor = data?.data?.next_cursor || data?.next_cursor || "";
      
      if (!nextCursor) {
        console.log("🏁 Final de listă (nu mai există cursor).");
        break;
      }

      await sleep(800); // Pauză să fim „invizibili” pentru Instagram
    }

    if (allComments.length === 0) {
      return res.status(400).json({ error: "Zero comentarii găsite. E publică postarea?" });
    }

    // Curățăm duplicatele la final (dacă există)
    const uniqueList = Array.from(new Map(allComments.map(c => [c.id || c.pk || c.text, c])).values());

    const winner = uniqueList[Math.floor(Math.random() * uniqueList.length)];

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || "Anonim",
        text: winner.text || "",
        profilePic: winner.user?.profile_pic_url || ""
      },
      totalComments: uniqueList.length
    });

  } catch (error) {
    console.error("🔥 Eroare:", error.message);
    res.status(500).json({ error: "Eroare la extragere." });
  }
});

export default router;