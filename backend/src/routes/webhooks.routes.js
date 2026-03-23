import express from "express";
import { stripe } from "../config/stripe.js";
import { env } from "../config/env.js";
import { PrismaClient } from "@prisma/client";
import { sendPaymentConfirmed } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router();

// RAW body required:
router.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "paid",
            paymentIntentId: session.payment_intent?.toString() || null,
          },
          include: { user: true, items: true },
        });

        // reduce stock
        for (const it of order.items) {
          await prisma.product.update({
            where: { id: it.productId },
            data: { stock: { decrement: it.qty } },
          });
        }

        await sendPaymentConfirmed(order.user.email, order.id);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({ where: { id: orderId }, data: { status: "failed" } });
      }
    }

    res.json({ received: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Webhook handling failed" });
  }
});

export default router;
