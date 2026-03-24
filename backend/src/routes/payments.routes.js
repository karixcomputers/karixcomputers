import express from "express";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { sendUnifiedOrderEmail } from "../services/mail.service.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const netopiaModule = require("netopia-card");

const router = express.Router();
const prisma = new PrismaClient();

const privateKeyPath = path.resolve(process.env.NETOPIA_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.env.NETOPIA_PUBLIC_KEY_PATH);

const netopiaConfig = {
    signature: process.env.NETOPIA_SIGNATURE,
    publicKey: fs.readFileSync(publicKeyPath).toString(),
    privateKey: fs.readFileSync(privateKeyPath).toString(),
    sandbox: process.env.NETOPIA_SANDBOX === 'true'
};

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
        const billingData = {
            firstName: nameParts[0] || 'Client',
            lastName: nameParts.slice(1).join(' ') || 'Karix',
            email: order.user?.email || req.user?.email || 'client@karix.ro',
            phone: order.shippingPhone || '0000000000',
            address: order.shippingAddress || 'Adresa nedefinită'
        };

        // --- DETECȚIE AUTOMATĂ A VERSIUNII LIBRĂRIEI NETOPIA ---
        if (netopiaModule.Netopia || (typeof netopiaModule === 'function' && netopiaModule.prototype?.setPaymentData)) {
            // Varianta 1: API-ul modern
            const NetopiaClass = netopiaModule.Netopia || netopiaModule.default || netopiaModule;
            const netopia = new NetopiaClass(netopiaConfig);
            
            netopia.setPaymentData({
                orderId: String(order.id),
                amount: amount,
                currency: 'RON',
                details: `Comanda Karix Computers #${order.id}`,
                confirmUrl: process.env.NETOPIA_CONFIRM_URL,
                returnUrl: process.env.NETOPIA_RETURN_URL
            });
            netopia.setClientBillingData(billingData);
            
            const request = netopia.buildRequest();
            return res.json({
                paymentUrl: request.url,
                env_key: request.env_key,
                data: request.data,
                orderId: order.id
            });

        } else {
            // Varianta 2: API-ul clasic (cel mai probabil acesta e pe serverul tău)
            const CardClass = netopiaModule.Card || netopiaModule.default || netopiaModule;
            const RequestClass = CardClass.Request || netopiaModule.Request;

            if (!RequestClass) {
                // Dacă nu e nici varianta 1, nici 2, afișăm exact ce avem ca să o rezolvăm chirurgical.
                throw new Error("Pachet necunoscut. Conținut exportat: " + Object.keys(netopiaModule).join(", "));
            }

            const paymentPos = new RequestClass();
            paymentPos.orderId = String(order.id);
            paymentPos.amount = amount;
            paymentPos.currency = 'RON';
            paymentPos.description = `Comanda Karix Computers #${order.id}`;
            paymentPos.billing = billingData;
            paymentPos.confirmUrl = process.env.NETOPIA_CONFIRM_URL;
            paymentPos.returnUrl = process.env.NETOPIA_RETURN_URL;

            const netopiaSession = new CardClass(netopiaConfig);
            const encrypted = netopiaSession.encrypt(paymentPos);

            return res.json({
                paymentUrl: netopiaSession.paymentUrl || "https://sandboxsecure.mobilpay.ro",
                env_key: encrypted.env_key,
                data: encrypted.data,
                orderId: order.id
            });
        }
    } catch (error) {
        console.error("Eroare Netopia Create:", error);
        res.status(500).json({ error: "Eroare internă la Netopia: " + error.message });
    }
};

const confirmPayment = async (req, res) => {
    try {
        let response, orderId;
        
        // --- DETECȚIE AUTOMATĂ PENTRU CONFIRMARE ---
        if (netopiaModule.Netopia || (typeof netopiaModule === 'function' && netopiaModule.prototype?.validatePayment)) {
            const NetopiaClass = netopiaModule.Netopia || netopiaModule.default || netopiaModule;
            const netopia = new NetopiaClass(netopiaConfig);
            const validation = await netopia.validatePayment(req.body.env_key, req.body.data);
            
            if (validation.error) {
                res.set(validation.res.set.key, validation.res.set.value);
                return res.status(200).send(validation.res.send);
            }
            response = { status: validation.action };
            orderId = parseInt(validation.orderId);
            
            res.set(validation.res.set.key, validation.res.set.value);
            setTimeout(() => res.status(200).send(validation.res.send), 100);

        } else {
            const CardClass = netopiaModule.Card || netopiaModule.default || netopiaModule;
            const netopiaSession = new CardClass(netopiaConfig);
            const decoded = netopiaSession.validateResponse(req.body);
            
            response = { status: decoded.action || decoded.status };
            orderId = parseInt(decoded.orderId);
            
            res.set('Content-Type', 'text/xml');
            setTimeout(() => res.send(decoded.resXml), 100);
        }

        // --- ACȚIUNILE DE DUPĂ PLATĂ (Bază de date + Discord + Mail) ---
        if (response.status === 'confirmed' || response.status === 'confirmed_pending') {
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "in_procesare" },
                include: { items: true, user: true }
            });
            
            console.log(`✅ Plata confirmată pentru comanda ${orderId}`);

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

    } catch (error) {
        console.error("Eroare Netopia Confirm:", error);
        if (!res.headersSent) res.status(500).send("Error");
    }
};

router.post("/pay/:orderId", requireAuth, createPayment);
router.post("/confirm", confirmPayment);

export default router;