import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import { sendOrderPlaced } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/create-checkout-session", requireAuth, async (req, res, next) => {
  try {
    const { items, shipping } = req.body;
    // items: [{productId, qty}]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items" });
    }
    if (!shipping?.name || !shipping?.phone || !shipping?.address) {
      return res.status(400).json({ error: "Shipping data missing" });
    }

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    // validate stock
    for (const it of items) {
      const p = products.find(x => x.id === it.productId);
      if (!p) return res.status(400).json({ error: "Invalid product" });
      if (p.stock < it.qty) return res.status(400).json({ error: `Stoc insuficient: ${p.name}` });
    }

    const orderItems = items.map(it => {
      const p = products.find(x => x.id === it.productId);
      return {
        productId: p.id,
        productName: p.name,
        qty: it.qty,
        priceCentsAtBuy: p.priceCents,
      };
    });

    const subtotal = orderItems.reduce((sum, x) => sum + x.qty * x.priceCentsAtBuy, 0);
    const shippingCents = subtotal >= 500000 ? 0 : 2500; // ex: gratis peste 5000 RON
    const totalCents = subtotal + shippingCents;

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });

    // create order in DB as pending
    const order = await prisma.order.create({
      data: {
        userId: req.user.sub,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingAddress: shipping.address,
        totalCents,
        status: "pending",
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/cancel`,
      customer_email: user.email,
      metadata: { orderId: order.id },
      line_items: [
        ...orderItems.map(oi => ({
          quantity: oi.qty,
          price_data: {
            currency: "ron",
            unit_amount: oi.priceCentsAtBuy,
            product_data: { name: oi.productName },
          },
        })),
        ...(shippingCents > 0 ? [{
          quantity: 1,
          price_data: {
            currency: "ron",
            unit_amount: shippingCents,
            product_data: { name: "Transport" },
          },
        }] : []),
      ],
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    // email: order placed (pending)
    await sendOrderPlaced(user.email, order.id);

    res.json({ url: session.url });
  } catch (e) { next(e); }
});

export default router;
