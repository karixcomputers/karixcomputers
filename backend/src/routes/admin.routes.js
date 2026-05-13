import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

// HELPER: Pauză între cereri să nu fim blocați de Instagram
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- RUTE ADMIN EXISTENTE (PRODUSE / COMENZI) ---
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

// --- RUTA GIVEAWAY REPARATĂ (STABLE API - 4 PAGINI) ---
router.post("/insta-pick", requireAuth, requireAdmin, async (req, res) => {
  console.log("-----------------------------------------");
  console.log("🚀 [GIVEAWAY STABLE] Pornire extragere masivă...");

  try {
    const { postUrl } = req.body;
    // Extragem media_code (DLUWkieNc0u)
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link Instagram invalid!" });
    
    const mediaCode = match[1];
    let allComments = [];
    let nextCursor = "";

    // Forțăm 4 pagini x ~50 comentarii = ~200 total
    for (let i = 0; i < 4; i++) {
      console.log(`📄 [PAGINA ${i + 1}] Cerere la API...`);
      
      // NOTĂ: Am scos 'sort_order=popular' pentru că Instagram limitează paginarea la cele populare.
      // Fără el, API-ul tinde să dea mai multe rezultate.
      const url = `https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php?media_code=${mediaCode}${nextCursor ? `&next_cursor=${encodeURIComponent(nextCursor)}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();

      // Căutăm comentariile oriunde le ascunde API-ul
      const items = data?.data?.items || data?.items || data?.comments || [];
      
      if (items.length === 0) {
        console.log("🛑 API-ul nu a mai returnat comentarii pe această pagină.");
        break;
      }

      allComments = [...allComments, ...items];
      console.log(`✅ Adunate: ${allComments.length} comentarii până acum.`);

      // DETECTARE CURSOR (Cheia pentru pagina următoare)
      // Încercăm toate variantele posibile de nume pentru cursor
      nextCursor = data?.data?.next_cursor || data?.next_cursor || data?.pagination_token || "";
      
      if (!nextCursor) {
        console.log("🏁 Gata! Nu mai există cursor pentru paginare.");
        // Debug: Să vedem ce ne dă API-ul de fapt dacă se oprește
        console.log("Structură API returnată:", Object.keys(data?.data || data || {}));
        break;
      }

      await sleep(1000); // Pauză de o secundă să nu ne blocheze Instagram
    }

    if (allComments.length === 0) {
      return res.status(400).json({ error: "Nu am găsit comentarii. Verifică dacă postarea e publică." });
    }

    // Alegem câștigătorul
    const winner = allComments[Math.floor(Math.random() * allComments.length)];

    res.json({
      success: true,
      winner: {
        // Fix pentru nume: verificăm ambele structuri comune (user.username sau owner.username)
        username: winner.user?.username || winner.owner?.username || "Utilizator",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || winner.owner?.profile_pic_url || ""
      },
      totalComments: allComments.length
    });

  } catch (error) {
    console.error("🔥 [API ERROR]:", error.message);
    res.status(500).json({ error: "Eroare la serverul de giveaway." });
  }
});

export default router;