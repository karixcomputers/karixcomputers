import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    // Aici payload conține deja { sub, role, email }
    req.user = payload; 
    next();
  } catch {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
}