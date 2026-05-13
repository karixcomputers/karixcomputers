import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const prisma = new PrismaClient();
const router = express.Router();

// --- RUTE EXISTENTE (PRODUSE / COMENZI) ---

// Funcție care transformă Shortcode (litere) în Media ID (cifre)
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
  console.log("🚀 [FAST-RELIABLE] Pornire procesare...");

  try {
    const { postUrl } = req.body;
    if (!postUrl) return res.status(400).json({ error: "Lipsește linkul." });

    const match = postUrl.match(/\/(?:p|reel|reels)\/([a-zA-Z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Link invalid!" });
    
    const shortcode = match[1];
    
    // PASUL CRITIC: Convertim DXwbtGAFl50 în ID-ul numeric cerut de API
    const numericId = shortcodeToId(shortcode);
    console.log(`🔍 [DEBUG] Conversie: ${shortcode} -> ${numericId}`);

    const response = await fetch(`https://instagram-api-fast-reliable-data-scraper.p.rapidapi.com/comments?id=${numericId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com',
        'x-rapidapi-key': 'f720f3bf76msh941c7cc2af72c4cp184493jsnba560431b076'
      }
    });

    const data = await response.json();
    
    // Verificăm unde pune acest API lista de comentarii
    const items = data?.data || data?.items || data?.comments || [];

    if (!Array.isArray(items) || items.length === 0) {
      console.log("⚠️ [DEBUG] Zero rezultate. Răspuns brut:", JSON.stringify(data).substring(0, 200));
      return res.status(400).json({ error: "Nu s-au găsit comentarii. Verifică dacă postarea e publică." });
    }

    const winner = items[Math.floor(Math.random() * items.length)];
    console.log(`✅ [DEBUG] Extragere reușită din ${items.length} comentarii!`);

    res.json({
      success: true,
      winner: {
        username: winner.user?.username || winner.author?.username || "Anonim",
        text: winner.text || winner.comment_text || "",
        profilePic: winner.user?.profile_pic_url || winner.author?.profile_pic_url || ""
      },
      totalComments: items.length
    });

  } catch (error) {
    console.error("🔥 [SERVER ERROR]:", error.message);
    res.status(500).json({ error: "Eroare la procesarea ID-ului numeric." });
  }
});
export default router;