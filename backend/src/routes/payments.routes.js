import express from "express";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { sendUnifiedOrderEmail } from "../services/mail.service.js";
import { createRequire } from "module";

// Importul curat și corect pentru librărie
const require = createRequire(import.meta.url);
const Netopia = require("netopia-card");

const router = express.Router(); // Definit clar la început!
const prisma = new PrismaClient();

const privateKeyPath = path.resolve(process.env.NETOPIA_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.env.NETOPIA_PUBLIC_KEY_PATH);

const createPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: { user: true }
        });

        if (!order) return res.status(404).json({ error: "Comanda nu a fost găsită." });

        const amount = (order.totalCents || order.total || 0) / 100;
        const nameParts = (order.shippingName || "Client Karix").split(' ');

        // Inițializăm corect Netopia
        const netopia = new Netopia({
            signature: process.env.NETOPIA_SIGNATURE,
            publicKey: fs.readFileSync(publicKeyPath).toString(),
            privateKey: fs.readFileSync(privateKeyPath).toString(),
            sandbox: process.env.NETOPIA_SANDBOX === 'true'
        });

        // Setăm datele comenzii
        netopia.setPaymentData({
            orderId: String(order.id),
            amount: amount,
            currency: 'RON',
            details: `Comanda Karix Computers #${order.id}`,
            confirmUrl: process.env.NETOPIA_CONFIRM_URL,
            returnUrl: process.env.NETOPIA_RETURN_URL
        });

        // Setăm datele clientului
        netopia.setClientBillingData({
            firstName: nameParts[0] || 'Client',
            lastName: nameParts.slice(1).join(' ') || 'Karix',
            email: order.user?.email || req.user?.email || 'client@karix.ro',
            phone: order.shippingPhone || '0000000000',
            address: order.shippingAddress || 'Adresa nedefinită'
        });

        // Librăria ne dă direct url-ul, env_key și data
        const request = netopia.buildRequest();

        res.json({
            paymentUrl: request.url,
            env_key: request.env_key,
            data: request.data,
            orderId: order.id
        });

    } catch (error) {
        console.error("Eroare Netopia Create:", error);
        res.status(500).json({ error: "Eroare la procesarea plății: " + error.message });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const { data, env_key } = req.body;

        const netopia = new Netopia({
            signature: process.env.NETOPIA_SIGNATURE,
            publicKey: fs.readFileSync(publicKeyPath).toString(),
            privateKey: fs.readFileSync(privateKeyPath).toString(),
            sandbox: process.env.NETOPIA_SANDBOX === 'true'
        });

        const response = await netopia.validatePayment(env_key, data);

        // Dacă Netopia zice că e eroare, oprim
        if (response.error) {
            res.set(response.res.set.key, response.res.set.value);
            return res.status(200).send(response.res.send);
        }

        const orderId = parseInt(response.orderId);

        // Dacă plata e confirmată, facem acțiunile
        if (response.action === 'confirmed' || response.action === 'confirmed_pending') {
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "in_procesare" },
                include: { items: true, user: true }
            });
            
            console.log(`✅ Plata confirmată pentru comanda ${orderId}`);

            // TRIMITERE DISCORD DIN BACKEND DOAR DUPĂ PLATĂ
            const discordWebhookUrl = "https://discord.com/api/webhooks/1483959911363772491/v08mslfmiPRvt5VXqImwxKD3IABfgcVm5JuoY_vDlPOqqGh1qLgBHxPuNi2E4e3v4oNj";
            const clientInfo = updatedOrder.isCompany ? `🏢 **${updatedOrder.companyName}**\nCUI: ${updatedOrder.cui}` : `👤 **${updatedOrder.shippingName}**`;
            
            const discordMessage = {
                embeds: [{
                    title: "✅ COMANDĂ NOUĂ KARIX (PLĂTITĂ ONLINE)!",
                    color: 0x10b981,
                    fields: [
                        { name: "📋 Tip Client", value: updatedOrder.isCompany ? "Persoană Juridică" : "Persoană Fizică", inline: true },
                        { name: "👤 Identitate", value: clientInfo, inline: true },
                        { name: "💳 Metodă Plată", value: "💳 Plată Online (CONFIRMATĂ)", inline: true },
                        { name: "💰 Total", value: `**${(updatedOrder.totalCents / 100).toFixed(2)} RON**`, inline: true }
                    ]
                }]
            };

            await fetch(discordWebhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(discordMessage)
            }).catch(err => console.error("Eroare Discord Backend:", err));

            // TRIMITERE MAILURI
            const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare', 'drift', 'hall', 'stick'];
            const containsServices = updatedOrder.items.some(item => serviceKeywords.some(kw => (item.productName || "").toLowerCase().includes(kw)));

            const commonMailData = {
                client: {
                    name: updatedOrder.shippingName, phone: updatedOrder.shippingPhone, addressDetails: updatedOrder.shippingAddress,
                    isCompany: updatedOrder.isCompany, companyName: updatedOrder.companyName, cui: updatedOrder.cui, regCom: updatedOrder.regCom
                },
                orderId: updatedOrder.id, total: updatedOrder.totalCents, couponCode: null,
                pickupType: updatedOrder.shippingAddress.toLowerCase().includes('oradea') ? 'ridicare_personala' : 'curier',
                isServiceOrder: containsServices,
                cartItems: updatedOrder.items.map(item => ({
                    ...item, name: item.productName,
                    isServiceItem: serviceKeywords.some(kw => (item.productName || "").toLowerCase().includes(kw)),
                    qty: item.qty || 1, priceCentsAtBuy: item.priceCentsAtBuy || item.priceCents
                }))
            };

            if (updatedOrder.user?.email) await sendUnifiedOrderEmail(updatedOrder.user.email, commonMailData).catch(e => console.error(e));
            const adminEmail = process.env.ADMIN_EMAIL || "karixcomputers@gmail.com";
            await sendUnifiedOrderEmail(adminEmail, commonMailData, true).catch(e => console.error(e));
        }

        res.set(response.res.set.key, response.res.set.value);
        res.status(200).send(response.res.send);

    } catch (error) {
        console.error("Eroare Netopia Confirm:", error);
        res.status(500).send("Error");
    }
};

router.post("/pay/:orderId", requireAuth, createPayment);
router.post("/confirm", confirmPayment);

export default router;