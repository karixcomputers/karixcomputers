export const requireAdmin = (req, res, next) => {
  // Verificăm dacă user-ul este logat și are rolul de admin
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ error: "Acces refuzat. Nu ești administrator." });
  }
};