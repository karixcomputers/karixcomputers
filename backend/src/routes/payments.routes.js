import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { sendUnifiedOrderEmail } from "../services/mail.service.js";

// --- IMPORT SMARTBILL ---
import { createSmartBillInvoice, getSmartBillPdf } from "../services/smartbill.service.js";

const router = express.Router();
router.use(express.urlencoded({ extended: true }));

const prisma = new PrismaClient();

const privateKeyPath = path.resolve(process.env.NETOPIA_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.env.NETOPIA_PUBLIC_KEY_PATH);

// --- FUNCȚIE RC4 NATIVĂ ---
function rc4(keyBuf, dataBuf) {
    let S = Array.from({length: 256}, (_, i) => i);
    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + S[i] + keyBuf[i % keyBuf.length]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
    }
    let i = 0; j = 0;
    let out = Buffer.alloc(dataBuf.length);
    for (let k = 0; k < dataBuf.length; k++) {
        i = (i + 1) % 256;
        j = (j + S[i]) % 256;
        [S[i], S[j]] = [S[j], S[i]];
        out[k] = dataBuf[k] ^ S[(S[i] + S[j]) % 256];
    }
    return out;
}

function escapeXml(unsafe) {
    return (unsafe || '').toString().replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;'; case '>': return '&gt;';
            case '&': return '&amp;'; case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// --- 1. CREARE PLATĂ ---
const createPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: { user: true }
        });

        if (!order) return res.status(404).json({ error: "Comanda nu a fost găsită." });

        const amount = ((order.totalCents || order.total || 0) / 100).toFixed(2);
        const nameParts = (order.shippingName || "Client").split(' ');
        const ts = new Date().toISOString().replace(/[-:T\.]/g, '').slice(0, 14);

        const xml = `<?xml version="1.0" encoding="utf-8"?>
<order type="card" id="${order.id}" timestamp="${ts}">
    <signature>${process.env.NETOPIA_SIGNATURE}</signature>
    <url>
        <return>${escapeXml(process.env.NETOPIA_RETURN_URL)}</return>
        <confirm>${escapeXml(process.env.NETOPIA_CONFIRM_URL)}</confirm>
    </url>
    <invoice currency="RON" amount="${amount}">
        <details>Comanda Karix #${order.id}</details>
        <contact_info>
            <billing type="${order.isCompany ? 'company' : 'person'}">
                <first_name>${escapeXml(nameParts[0] || 'Client')}</first_name>
                <last_name>${escapeXml(nameParts.slice(1).join(' ') || 'Karix')}</last_name>
                <email>${escapeXml(order.user?.email || req.user?.email || 'client@karix.ro')}</email>
                <mobile_phone>${escapeXml(order.shippingPhone || '0000000000')}</mobile_phone>
                <address>${escapeXml(order.shippingAddress || 'Adresa nedefinită')}</address>
            </billing>
        </contact_info>
    </invoice>
</order>`;

        const rc4Key = crypto.randomBytes(16);
        const xmlBuffer = Buffer.from(xml, 'utf8');
        const encryptedData = rc4(rc4Key, xmlBuffer).toString('base64');

        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        const encryptedEnvKey = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, rc4Key).toString('base64');

        res.json({
            paymentUrl: process.env.NETOPIA_SANDBOX === 'true' 
                ? "https://sandboxsecure.mobilpay.ro" 
                : "https://secure.mobilpay.ro",
            env_key: encryptedEnvKey,
            data: encryptedData,
            orderId: order.id
        });

    } catch (error) {
        console.error("Eroare Netopia Create Nativ:", error);
        res.status(500).json({ error: "Eroare internă la procesarea plății." });
    }
};

// --- 2. CONFIRMARE PLATĂ ---
const confirmPayment = async (req, res) => {
    try {
        const { env_key, data } = req.body;

        if (!env_key || !data) return res.status(400).send("Missing keys");

        const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        const rc4Key = crypto.privateDecrypt({
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, Buffer.from(env_key, 'base64'));

        const encryptedDataBuf = Buffer.from(data, 'base64');
        const xml = rc4(rc4Key, encryptedDataBuf).toString('utf8');

        const actionMatch = xml.match(/<action>\s*(.*?)\s*<\/action>/);
        const orderIdMatch = xml.match(/<order .*?id="([^"]+)".*?>/);

        if (!actionMatch || !orderIdMatch) throw new Error("XML invalid primit de la Netopia");

        const action = actionMatch[1];
        const orderId = parseInt(orderIdMatch[1]);

        if (action === 'confirmed' || action === 'confirmed_pending') {
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: "in_procesare" },
                include: { items: true, user: true }
            });
            
            console.log(`✅ Plata confirmată NATIV pentru comanda ${orderId}`);

            // --- DISCORD ---
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
            await fetch(discordWebhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(discordMessage) }).catch(e => console.error(e));

            // --- LOGICĂ SMARTBILL ---
            let invoicePdfBuffer = null;
            try {
                console.log("⏳ Generare factură SmartBill...");
                const invoiceData = await createSmartBillInvoice(updatedOrder);
                
                if (invoiceData && invoiceData.series && invoiceData.number) {
                    console.log(`✅ Factură creată: ${invoiceData.series} ${invoiceData.number}`);
                    invoicePdfBuffer = await getSmartBillPdf(invoiceData.series, invoiceData.number);
                    if (invoicePdfBuffer) {
                        console.log("✅ PDF-ul facturii a fost preluat cu succes.");
                    }
                }
            } catch (sbError) {
                console.error("❌ Eroare SmartBill Integration:", sbError.message);
            }

            // --- EMAIL-URI ---
            const serviceKeywords = ['service', 'mentenanta', 'curatare', 'reparatie', 'montaj', 'diagnosticare', 'drift', 'hall', 'stick'];
            const containsServices = updatedOrder.items.some(item => serviceKeywords.some(kw => (item.productName || "").toLowerCase().includes(kw)));

            const commonMailData = {
                client: {
                    name: updatedOrder.shippingName, 
                    phone: updatedOrder.shippingPhone, 
                    addressDetails: updatedOrder.shippingAddress,
                    // ADĂUGĂM ASTA ca să nu mai apară undefined:
                    city: updatedOrder.shippingAddress.toLowerCase().includes('oradea') ? 'Oradea' : '',
                    county: updatedOrder.shippingAddress.toLowerCase().includes('oradea') ? 'Bihor' : '',
                    isCompany: updatedOrder.isCompany, 
                    companyName: updatedOrder.companyName, 
                    cui: updatedOrder.cui, 
                    regCom: updatedOrder.regCom
                },
                orderId: updatedOrder.id, 
                total: updatedOrder.totalCents, 
                couponCode: null,
                shippingAddress: updatedOrder.shippingAddress, // Trimitem adresa direct
                // MODIFICĂM VALOAREA să fie identică cu cea din mail service:
                pickupType: updatedOrder.shippingAddress.toLowerCase().includes('oradea') ? 'KarixPersonal' : 'curier',
                isServiceOrder: containsServices,
                cartItems: updatedOrder.items.map(item => ({
                    ...item, 
                    name: item.productName, 
                    isServiceItem: serviceKeywords.some(kw => (item.productName || "").toLowerCase().includes(kw)),
                    qty: item.qty || 1, 
                    priceCentsAtBuy: item.priceCentsAtBuy || item.priceCents
                }))
            };

            // Trimitem mail clientului (cu PDF dacă există)
            if (updatedOrder.user?.email) {
                await sendUnifiedOrderEmail(updatedOrder.user.email, commonMailData, false, invoicePdfBuffer).catch(e => console.error(e));
            }
            
            // Trimitem mail admin-ului (cu PDF dacă există)
            const adminEmail = process.env.ADMIN_EMAIL || "karixcomputers@gmail.com";
            await sendUnifiedOrderEmail(adminEmail, commonMailData, true, null).catch(e => console.error(e));
        }

        res.set('Content-Type', 'text/xml');
        res.send(`<?xml version="1.0" encoding="utf-8"?><crc>Success</crc>`);

    } catch (error) {
        console.error("Eroare Netopia Confirm:", error.message);
        res.status(500).send("Error");
    }
};

router.post("/pay/:orderId", requireAuth, createPayment);
router.post("/confirm", confirmPayment);

export default router;