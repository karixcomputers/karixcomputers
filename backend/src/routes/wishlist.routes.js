import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// 1. Preia toate produsele din wishlist-ul userului
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.sub;
    
    const items = await prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true }
    });
    
    // Returnăm doar obiectele de tip produs, curățate de metadatele tabelei de wishlist
    res.json(items.map(i => i.product));
  } catch (error) {
    console.error("❌ ERROR FETCH WISHLIST:", error);
    res.status(500).json({ error: "Eroare la preluarea listei de favorite." });
  }
});

// 2. Toggle Wishlist (Adaugă/Șterge dintr-un singur click)
router.post("/toggle", requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id || req.user.sub;

    if (!productId || !userId) {
      return res.status(400).json({ error: "Date insuficiente (userId sau productId lipsă)." });
    }

    // Verificăm dacă există deja combinația unică între acest user și acest produs
    const existing = await prisma.wishlistItem.findUnique({
      where: { 
        userId_productId: { 
          userId, 
          productId 
        } 
      }
    });

    if (existing) {
      // Dacă există, îl ștergem (action toggle: off)
      await prisma.wishlistItem.delete({ 
        where: { id: existing.id } 
      });
      return res.json({ added: false, message: "Eliminat de la favorite" });
    } else {
      // Dacă nu există, îl creăm (action toggle: on)
      await prisma.wishlistItem.create({ 
        data: { 
          userId, 
          productId 
        } 
      });
      return res.json({ added: true, message: "Adăugat la favorite" });
    }
  } catch (error) {
    console.error("❌ ERROR TOGGLE WISHLIST:", error);
    // Dacă eroarea este cauzată de un productId care nu există în baza de date
    if (error.code === 'P2003') {
      return res.status(404).json({ error: "Produsul nu a fost găsit." });
    }
    res.status(500).json({ error: "Eroare la actualizarea listei de favorite." });
  }
});

export default router;