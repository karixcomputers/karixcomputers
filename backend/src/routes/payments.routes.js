import Netopia from 'netopia-card';
import fs from 'fs';
import path from 'path';
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

// 1. CONFIGURARE NETOPIA
// Încărcăm cheile folosind căile din .env
const privateKeyPath = path.resolve(process.env.NETOPIA_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.env.NETOPIA_PUBLIC_KEY_PATH);

const netopiaConfig = {
    signature: process.env.NETOPIA_SIGNATURE,
    publicKey: fs.readFileSync(publicKeyPath).toString(),
    privateKey: fs.readFileSync(privateKeyPath).toString(),
    sandbox: process.env.NETOPIA_SANDBOX === 'true'
};

// 2. LOGICA: Creare Plată (createPayment)
const createPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: { user: true }
        });

        if (!order) return res.status(404).json({ error: "Comanda nu există." });

        const paymentPos = new Netopia.Card.Request();
        paymentPos.orderId = String(order.id);
        paymentPos.amount = order.totalCents / 100; // RON
        paymentPos.currency = 'RON';
        paymentPos.description = `Comanda Karix Computers #${order.id}`;

        const nameParts = order.shippingName.split(' ');
        paymentPos.billing = {
            firstName: nameParts[0] || 'Client',
            lastName: nameParts.slice(1).join(' ') || 'Karix',
            email: order.user.email,
            phone: order.shippingPhone,
            address: order.shippingAddress
        };

        paymentPos.confirmUrl = process.env.NETOPIA_CONFIRM_URL;
        paymentPos.returnUrl = process.env.NETOPIA_RETURN_URL;

        const netopia = new Netopia.Card(netopiaConfig);
        const encrypted = netopia.encrypt(paymentPos);

        res.json({
            paymentUrl: netopia.paymentUrl,
            env_key: encrypted.env_key,
            data: encrypted.data,
            orderId: order.id
        });

    } catch (error) {
        console.error("Eroare Netopia Create:", error);
        res.status(500).json({ error: "Nu s-a putut genera cererea de plată." });
    }
};

// 3. LOGICA: Confirmare Plată (confirmPayment)
const confirmPayment = async (req, res) => {
    try {
        const netopia = new Netopia.Card(netopiaConfig);
        const response = netopia.validateResponse(req.body);

        const orderId = parseInt(response.orderId);

        if (response.status === 'confirmed' || response.status === 'confirmed_pending') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: "procesare" } 
            });
            console.log(`✅ Plata confirmată pentru comanda ${orderId}`);
        }

        res.set('Content-Type', 'text/xml');
        res.send(response.resXml);

    } catch (error) {
        console.error("Eroare Netopia Confirm:", error);
        res.status(500).send("Error");
    }
};

// 4. DEFINIRE RUTE
router.post("/pay/:orderId", requireAuth, createPayment);
router.post("/confirm", confirmPayment);

export default router;