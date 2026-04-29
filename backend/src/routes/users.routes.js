// GET: Toți utilizatorii (Doar pentru Admin)
router.get("/admin-all", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        createdAt: true,
        // Poți adăuga și comenzi ca să vezi câte are fiecare, dacă vrei:
        // _count: { select: { orders: true } }
      }
    });
    res.json(users);
  } catch (error) {
    console.error("Eroare fetch users:", error);
    next(error);
  }
});