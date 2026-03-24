import express from "express";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { sendUnifiedOrderEmail } from "../services/mail.service.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const mobilpay = require("mobilpay-card"); // <--- LIBRĂRIA CORECTĂ

const router = express.Router();
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

        // Construim pachetul exact cum vrea Netopia pentru redirecționare
        const paymentPos = new mobilpay.Request();
        paymentPos.signature = process.env.NETOPIA_SIGNATURE;
        paymentPos.orderId = String(order.id);
        paymentPos.confirmUrl = process.env.NETOPIA_CONFIRM_URL;
        paymentPos.returnUrl = process.env.NETOPIA_RETURN_URL;

        paymentPos.invoice = new mobilpay.Invoice();
        paymentPos.invoice.amount = amount;
        paymentPos.invoice.currency = 'RON';
        paymentPos.invoice.details = `Comanda Karix Computers #${order.id}`;

        paymentPos.invoice.billingAddress = new mobilpay.Address();
        paymentPos.invoice.billingAddress.type = order.isCompany ? 'company' : 'person';
        paymentPos.invoice.billingAddress.firstName = nameParts[0] || 'Client';
        paymentPos.invoice.billingAddress.lastName = nameParts.slice(1).join(' ') || 'Karix';
        paymentPos.invoice.billingAddress.email = order.user?.email || req.user?.email || 'client@karix.ro';
        paymentPos.invoice.billingAddress.mobilePhone = order.shippingPhone || '0000000000';
        paymentPos.invoice.billingAddress.address = order.shippingAddress || 'Adresa nedefinită';

        // Criptăm datele cu fișierul .cer
        paymentPos.encrypt(publicKeyPath);

        res.json({
            paymentUrl: process.env.NETOPIA_SANDBOX === 'true' 
                ? "https://sandboxsecure.mobilpay.ro" 
                : "https://secure.mobilpay.ro",
            env_key: paymentPos.getEnvKey(),
            data: paymentPos.getXml(),
            orderId: order.id
        });

    } catch (error) {
        console.error("Eroare Netopia Create:", error);
        res.status(500).json({ error: "Eroare internă la Netopia: " + error.message });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const { env_key, data } = req.body;
        const paymentRes = new mobilpay.Response();
        
        // Decriptăm răspunsul de la Netopia
        paymentRes.decrypt(privateKeyPath, env_key, data);
        
        const responseObj = paymentRes.getResponseObj();
        const orderId = parseInt(responseObj.orderId);
        const action = responseObj.action;

        if (action === 'confirmed' || action === 'confirmed_pending') {
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "in_procesare" },
                include: { items: true, user: true }
            });
            
            console.log(`✅ Plata confirmată pentru comanda ${orderId}`);

            // Trimitere pe Discord
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

            // Trimitere Email
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

        // Răspunsul OBLIGATORIU pentru Netopia ca să știe că am preluat notificarea
        res.set('Content-Type', 'text/xml');
        res.send(paymentRes.buildXml());

    } catch (error) {
        console.error("Eroare Netopia Confirm:", error);
        res.status(500).send("Error");
    }
};

router.post("/pay/:orderId", requireAuth, createPayment);
router.post("/confirm", confirmPayment);

export default router;