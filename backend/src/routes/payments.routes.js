import Netopia from 'netopia-card';
import fs from 'fs';
import path from 'path';
import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
// IMPORTĂM FUNCȚIA DE MAIL AICI:
import { sendUnifiedOrderEmail } from "../services/mail.service.js";

const prisma = new PrismaClient();
const router = express.Router(); 

// 1. CONFIGURARE NETOPIA
const privateKeyPath = path.resolve(process.env.NETOPIA_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.env.NETOPIA_PUBLIC_KEY_PATH);

const netopiaConfig = {
    signature: process.env.NETOPIA_SIGNATURE,
    publicKey: fs.readFileSync(publicKeyPath).toString(),
    privateKey: fs.readFileSync(privateKeyPath).toString(),
    sandbox: process.env.NETOPIA_SANDBOX === 'true'
};

// 2. LOGICA: Creare Plată
const createPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: { user: true }
        });

        if (!order) return res.status(404).json({ error: "Comanda nu există." });

        const Card = Netopia.Card || Netopia; 
        const paymentPos = new Card.Request();
        
        paymentPos.orderId = String(order.id);
        const amount = (order.totalCents || order.total || 0) / 100;
        paymentPos.amount = amount; 
        paymentPos.currency = 'RON';
        paymentPos.description = `Comanda Karix Computers #${order.id}`;

        const nameParts = (order.shippingName || "Client Karix").split(' ');
        paymentPos.billing = {
            firstName: nameParts[0] || 'Client',
            lastName: nameParts.slice(1).join(' ') || 'Karix',
            email: order.user?.email || req.user?.email,
            phone: order.shippingPhone || '',
            address: order.shippingAddress || ''
        };

        paymentPos.confirmUrl = process.env.NETOPIA_CONFIRM_URL;
        paymentPos.returnUrl = process.env.NETOPIA_RETURN_URL;

        const netopiaSession = new Card(netopiaConfig);
        const encrypted = netopiaSession.encrypt(paymentPos);

        res.json({
            paymentUrl: netopiaSession.paymentUrl,
            env_key: encrypted.env_key,
            data: encrypted.data,
            orderId: order.id
        });

    } catch (error) {
        console.error("Eroare Netopia Create:", error);
        res.status(500).json({ error: "Eroare la generarea plății: " + error.message });
    }
};

// 3. LOGICA: Confirmare Plată (AICI PLECĂ MAILUL)
const confirmPayment = async (req, res) => {
    try {
        const Card = Netopia.Card || Netopia;
        const netopiaSession = new Card(netopiaConfig);
        const response = netopiaSession.validateResponse(req.body);

        const orderId = parseInt(response.orderId);

        if (response.status === 'confirmed' || response.status === 'confirmed_pending') {
            // 1. Actualizăm comanda și aducem toate datele necesare pentru mail
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "in_procesare" }, // Setăm statusul dorit după plată
                include: { items: true, user: true }
            });
            
            console.log(`✅ Plata confirmată pentru comanda ${orderId}`);

            // 2. Reconstruim datele pentru template-ul de mail
            const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare', 'drift', 'hall', 'stick'];
            const containsServices = updatedOrder.items.some(item => {
                const nameLower = (item.productName || "").toLowerCase();
                return serviceKeywords.some(kw => nameLower.includes(kw));
            });

            const clientData = {
                name: updatedOrder.shippingName,
                phone: updatedOrder.shippingPhone,
                addressDetails: updatedOrder.shippingAddress,
                isCompany: updatedOrder.isCompany,
                companyName: updatedOrder.companyName,
                cui: updatedOrder.cui,
                regCom: updatedOrder.regCom
            };

            const commonMailData = {
                client: clientData,
                orderId: updatedOrder.id,
                total: updatedOrder.totalCents,
                couponCode: null, // Netopia nu știe de cupon, dar totalul e deja redus
                pickupType: updatedOrder.shippingAddress.toLowerCase().includes('oradea') ? 'ridicare_personala' : 'curier',
                isServiceOrder: containsServices,
                cartItems: updatedOrder.items.map(item => {
                    const nameLower = (item.productName || "").toLowerCase();
                    return {
                        ...item,
                        name: item.productName,
                        isServiceItem: serviceKeywords.some(kw => nameLower.includes(kw)),
                        qty: item.qty || 1,
                        priceCentsAtBuy: item.priceCentsAtBuy || item.priceCents
                    };
                })
            };

            // 3. Trimitem mailurile
            if (updatedOrder.user?.email) {
                await sendUnifiedOrderEmail(updatedOrder.user.email, commonMailData).catch(err => console.error("Eroare Mail Client (Netopia):", err));
            }
            const adminEmail = process.env.ADMIN_EMAIL || "karixcomputers@gmail.com";
            await sendUnifiedOrderEmail(adminEmail, commonMailData, true).catch(err => console.error("Eroare Mail Admin (Netopia):", err));
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