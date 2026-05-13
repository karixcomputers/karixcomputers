import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

function shortcodeToId(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    id = (id * BigInt(64)) + BigInt(alphabet.indexOf(shortcode[i]));
  }
  return id.toString();
}

// Rute Admin Standard
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

// --- RUTA GIVEAWAY REPARATĂ ---
router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("🚀 [GIVEAWAY] Start...");
  try {
    const { postUrl } = req.body;
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const numericId = shortcodeToId(match[1]);
    let allComments = [];
    let cursor = "";
    let usedCursors = new Set();

    // Luăm maxim 8 pagini (~120 comentarii) să nu dăm timeout la browser
    for (let i = 0; i < 8; i++) {
      console.log(`📄 Pagina ${i + 1}...`);
      
      const url = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${numericId}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();
      
      // Extragem comentariile - verificăm toate locurile unde pot fi
      const rawItems = data?.comments || data?.data || data?.items || [];
      const items = Array.isArray(rawItems) ? rawItems : (rawItems.items || []);

      if (items.length === 0) break;

      // Adăugăm fără filtrare agresivă de ID-uri (o facem la final)
      allComments = [...allComments, ...items];
      console.log(`✅ Adunate: ${allComments.length}`);

      // Cursorul nou
      const nextCursor = data?.next_min_id || data?.next_max_id || data?.cursor || "";
      
      if (!nextCursor || usedCursors.has(nextCursor)) {
        console.log("🏁 Stop: Nu mai sunt pagini noi.");
        break;
      }
      
      usedCursors.add(nextCursor);
      cursor = nextCursor;
    }

    if (allComments.length === 0) return res.status(400).json({ error: "Nu am găsit comentarii." });

    // Curățăm duplicatele la final (după ID sau text)
    const uniqueComments = Array.from(new Map(allComments.map(c => [c.id || c.pk || c.text, c])).values());

    const winner = uniqueComments[Math.floor(Math.random() * uniqueComments.length)];

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || winner.author?.username || "Anonim",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || winner.author?.profile_pic_url || ""
      },
      totalComments: uniqueComments.length
    });

  } catch (error) {
    console.error("🔥 Eroare:", error.message);
    res.status(500).json({ error: "Eroare server. Încearcă din nou." });
  }
});

export default router;