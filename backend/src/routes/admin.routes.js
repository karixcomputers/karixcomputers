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

// Funcție care transformă literele în ID numeric (obligatoriu pentru acest API)
function shortcodeToId(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    id = (id * BigInt(64)) + BigInt(alphabet.indexOf(char));
  }
  return id.toString();
}

router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🚀 [GIVEAWAY 150] Pornire extragere masivă...");

  try {
    const { postUrl } = req.body;
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const shortcode = match[1];
    const numericId = shortcodeToId(shortcode);
    
    let allComments = [];
    let cursor = ""; // Semnul de carte pentru pagina următoare

    // LOOP de 10 ori pentru a strânge ~150 de comentarii
    for (let i = 0; i < 10; i++) {
      console.log(`\n📄 [PAGINA ${i + 1}] Cerem date pentru cursor: ${cursor || 'START'}`);
      
      const url = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${numericId}${cursor ? `&cursor=${cursor}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();
      
      // API-ul ăsta pune datele direct în array-ul principal sau în .data
      const items = data?.data || data?.items || [];
      if (items.length === 0) {
        console.log("🛑 Nu mai sunt comentarii de descărcat.");
        break;
      }

      allComments = [...allComments, ...items];
      console.log(`✅ Adăugate ${items.length} comentarii. Total acum: ${allComments.length}`);

      // Luăm cursorul pentru următoarea pagină (poate fi sub diverse nume în funcție de API)
      cursor = data?.cursor || data?.next_cursor || data?.end_cursor;
      
      if (!cursor) {
        console.log("🏁 Am ajuns la sfârșitul listei de comentarii.");
        break;
      }
    }

    if (allComments.length === 0) {
      return res.status(400).json({ error: "Nu am găsit niciun comentariu." });
    }

    // Alegem câștigătorul din tot ce am strâns (cele ~150)
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
    console.error("🔥 Eroare fatală:", error.message);
    res.status(500).json({ error: "Eroare la procesarea paginilor." });
  }
});

export default router;