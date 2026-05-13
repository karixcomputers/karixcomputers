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
    let previousCursors = new Set(); // Salvăm cursorii folosiți ca să evităm buclele

    for (let i = 0; i < 10; i++) {
      // CURSOR URL ENCODING - Pasul critic!
      const encodedCursor = encodeURIComponent(cursor);
      console.log(`\n📄 [PAGINA ${i + 1}] Se caută...`);
      
      const url = `https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${numericId}${cursor ? `&cursor=${encodedCursor}` : ""}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
          'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
        }
      });

      const data = await response.json();
      const items = data?.comments || data?.data || data?.items || [];
      
      if (items.length === 0) {
        console.log("🛑 API-ul a returnat o listă goală.");
        break;
      }

      // Adăugăm doar comentariile noi (evităm duplicatele după ID)
      items.forEach(newItem => {
        const isDuplicate = allComments.some(existing => (existing.id === newItem.id || existing.pk === newItem.pk));
        if (!isDuplicate) allComments.push(newItem);
      });

      console.log(`✅ Comentarii unice adunate: ${allComments.length}`);

      // Verificăm cursorul nou
      const nextCursor = data?.next_min_id || data?.next_max_id || data?.cursor || "";
      
      if (!nextCursor || previousCursors.has(nextCursor)) {
        console.log("🏁 Gata! Cursorul se repetă sau lipsește.");
        break;
      }

      previousCursors.add(nextCursor);
      cursor = nextCursor;

      await sleep(700); // Pauză puțin mai mare pentru siguranță
    }

    if (allComments.length === 0) {
      return res.status(400).json({ error: "Nu s-au găsit comentarii." });
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
    console.error("🔥 Eroare:", error.message);
    res.status(500).json({ error: "Eroare la procesarea paginilor." });
  }
});
export default router;