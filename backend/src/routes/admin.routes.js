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
  try {
    const { postUrl } = req.body;
    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const mediaCode = match[1];
    let allCommentsMap = new Map(); // Folosim Map pentru a preveni duplicatele
    let nextCursor = "";

    for (let i = 0; i < 4; i++) {
      const url = `https://instagram-scraper-stable-api.p.rapidapi.com/get_post_comments.php?media_code=${mediaCode}${nextCursor ? `&next_cursor=${encodeURIComponent(nextCursor)}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();
      const items = data?.data?.items || data?.items || [];
      
      if (items.length === 0) break;

      // Adăugăm în Map folosind ID-ul unic (pk sau id) ca cheie
      items.forEach(c => {
        const uniqueId = c.pk || c.id;
        if (uniqueId) allCommentsMap.set(uniqueId, c);
      });

      const currentCursor = data?.data?.next_cursor || data?.next_cursor || "";
      if (!currentCursor || currentCursor === nextCursor) break; // Oprim dacă cursorul e identic (buclă)
      nextCursor = currentCursor;

      await new Promise(r => setTimeout(r, 800));
    }

    const finalComments = Array.from(allCommentsMap.values());

    if (finalComments.length === 0) return res.status(400).json({ error: "Zero comentarii." });

    const winner = finalComments[Math.floor(Math.random() * finalComments.length)];

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || winner.owner?.username || "Utilizator",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || ""
      },
      totalComments: finalComments.length
    });

  } catch (error) {
    res.status(500).json({ error: "Eroare server." });
  }
});

export default router;