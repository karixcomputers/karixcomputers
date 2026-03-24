import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

import { env } from "./config/env.js";
import { rateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/error.js";

// Import rute
import returnsRoutes from "./routes/returns.routes.js";
import authRoutes from "./routes/auth.routes.js";
import productsRoutes from "./routes/products.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ticketRoutes from "./routes/tickets.routes.js";
import serviceOrdersRoutes from "./routes/serviceOrders.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import configuratorRoutes from "./routes/configurator.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import adminConfiguratorRoutes from "./routes/adminconfigurator.routes.js";

export const app = express();

// 1. Webhooks - Trebuie să fie înainte de express.json() pentru raw body
app.use("/api/webhooks", webhooksRoutes);

// 2. CONFIGURARE HELMET (Modificată pentru Google Login)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Dezactivăm complet COOP pentru a opri erorile window.closed
    crossOriginOpenerPolicy: false, 
    // Permitem browserului să încarce scripturile Google
    contentSecurityPolicy: false, 
  })
);

// 3. RATE LIMITER
app.use(rateLimiter);

// 4. CONFIGURARE CORS DINAMICĂ
const allowedOrigins = [
  env.CLIENT_URL,                    // Adresa ta oficială (ex: https://karixcomputers.ro)
  "https://karixcomputers.ro",       // Hardcoded ca siguranță
  "https://www.karixcomputers.ro",
  "http://localhost:5173",           // Vite default
  "http://127.0.0.1:5173",
  "http://192.168.0.162:5173",       // IP-ul tău local de rețea
  "https://claude.ai",               // Permitem testele din Claude
  "https://mirror.claude.ai"
];

app.use(cors({
  origin: function (origin, callback) {
    // 1. Permitem cererile fără origine (Postman, server-to-server)
    if (!origin) return callback(null, true);

    // 2. Dacă originea e în listă, o permitem
    const isAllowed = allowedOrigins.includes(origin);
    
    // 3. Permitem orice în modul 'development' sau dacă e în whitelist
    if (isAllowed || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    } else {
      console.warn(`⚠️ CORS Blocked: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// 5. MIDDLEWARES STANDARD
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 6. HEALTH CHECK
app.get("/health", (req, res) => res.json({ ok: true, timestamp: new Date() }));

// 7. RUTE API
app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/payments/netopia", paymentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/service-orders", serviceOrdersRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/configurator", configuratorRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/adminconfigurator", adminConfiguratorRoutes);

// 8. SERVIRE DOSAR STATIC (Imagini/Uploads)
app.use('/api/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));

// 9. ERROR HANDLER (Întotdeauna ultimul)
app.use(errorHandler);