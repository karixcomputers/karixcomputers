import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

// 1. Hash-uire parolă (pentru Register)
export function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}

// 2. Verificare parolă (pentru Login)
export function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

/**
 * 3. Semnare Access Token
 * Aici includem ROLE-ul pentru ca middleware-ul requireAdmin să funcționeze.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { 
      sub: user.id, 
      role: user.role || "user", // Luăm rolul din DB, default la "user"
      email: user.email 
    },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES || "15m" }
  );
}

/**
 * 4. Semnare Refresh Token
 * Folosit pentru a menține user-ul logat fără a-i cere parola des.
 */
export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, tokenVersion: 1 },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.JWT_REFRESH_EXPIRES_DAYS || 7}d` }
  );
}

// 5. Hash-uire token pentru stocare sigură în DB (dacă e cazul)
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}