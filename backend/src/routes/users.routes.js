// Adaugă asta în backend/routes/users.routes.js (sau fișierul tău de rute pt useri)

// GET: Toți utilizatorii (Doar pentru Admin)
router.get("/admin-all", requireAuth, async (req, res) => {
  try {
    // Verificăm dacă cel care cere este admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Acces interzis." });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    console.error("Eroare fetch users:", error);
    res.status(500).json({ error: "Eroare internă server." });
  }
});