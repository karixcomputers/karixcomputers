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

// Funcție de conversie Shortcode -> ID (obligatoriu pentru acest API)
function shortcodeToId(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    id = (id * BigInt(64)) + BigInt(alphabet.indexOf(char));
  }
  return id.toString();
}

// Funcție pentru a aștepta puțin între cereri
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🚀 [GIVEAWAY 150] Pornire extragere...");

  try {
    const { postUrl } = req.body;
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const shortcode = match[1];
    const numericId = shortcodeToId(shortcode);
    
    let allComments = [];
    let cursor = "";

    // Bucla pentru 10 pagini (aprox. 150 comentarii)
    for (let i = 0; i < 10; i++) {
      console.log(`📄 [PAGINA ${i + 1}] Cerem date...`);
      
      const url = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${numericId}${cursor ? `&cursor=${cursor}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();

      // Căutăm lista de comentarii în orice format posibil (Array direct, .data, .items sau .comments)
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else {
        items = data?.data || data?.items || data?.comments || [];
      }

      if (items.length === 0) {
        console.log("🛑 Nu s-au găsit comentarii pe această pagină. Oprim bucla.");
        break;
      }

      allComments = [...allComments, ...items];
      console.log(`✅ Am strâns ${allComments.length} comentarii până acum.`);

      // Căutăm cursorul pentru pagina următoare
      cursor = data?.next_cursor || data?.cursor || data?.pagination?.next_cursor || "";
      
      if (!cursor) {
        console.log("🏁 Gata! Nu mai există alte pagini.");
        break;
      }

      // Așteptăm 500ms ca să nu fim blocați
      await sleep(500);
    }

    if (allComments.length === 0) {
      return res.status(400).json({ error: "Nu s-au găsit comentarii. Postarea e privată?" });
    }

    const winner = allComments[Math.floor(Math.random() * allComments.length)];

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || winner.author?.username || winner.owner?.username || "Anonim",
        text: winner.text || winner.comment_text || "Fără text",
        profilePic: winner.user?.profile_pic_url || winner.author?.profile_pic_url || ""
      },
      totalComments: allComments.length
    });

  } catch (error) {
    console.error("🔥 [FATAL]:", error.message);
    res.status(500).json({ error: "Eroare la procesarea masivă a paginilor." });
  }
});

export default router;