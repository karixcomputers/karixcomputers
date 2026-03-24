import Netopia from 'netopia-card';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Încărcăm cheile folosind căile din .env
const privateKeyPath = path.resolve(process.env.NETOPIA_PRIVATE_KEY_PATH);
const publicKeyPath = path.resolve(process.env.NETOPIA_PUBLIC_KEY_PATH);

const netopiaConfig = {
    signature: process.env.NETOPIA_SIGNATURE,
    publicKey: fs.readFileSync(publicKeyPath).toString(),
    privateKey: fs.readFileSync(privateKeyPath).toString(),
    sandbox: process.env.NETOPIA_SANDBOX === 'true'
};

export const createPayment = async (req, res) => {
    try {
        const { orderId } = req.params;

        // 1. Căutăm comanda în baza de date
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            include: { user: true }
        });

        if (!order) return res.status(404).json({ error: "Comanda nu există." });

        // 2. Pregătim datele pentru Netopia
        const paymentPos = new Netopia.Card.Request();
        paymentPos.orderId = String(order.id);
        paymentPos.amount = order.totalCents / 100; // Netopia vrea RON, nu bani/cents
        paymentPos.currency = 'RON';
        paymentPos.description = `Comanda Karix Computers #${order.id}`;

        // Date client (Mapping din shippingName)
        const nameParts = order.shippingName.split(' ');
        paymentPos.billing = {
            firstName: nameParts[0] || 'Client',
            lastName: nameParts.slice(1).join(' ') || 'Karix',
            email: order.user.email,
            phone: order.shippingPhone,
            address: order.shippingAddress
        };

        // URL-urile de întoarcere
        paymentPos.confirmUrl = process.env.NETOPIA_CONFIRM_URL;
        paymentPos.returnUrl = process.env.NETOPIA_RETURN_URL;

        // 3. Criptăm cererea
        const netopia = new Netopia.Card(netopiaConfig);
        const encrypted = netopia.encrypt(paymentPos);

        // 4. Trimitem datele către Frontend
        // Frontend-ul va trebui să facă un POST automat către URL-ul Netopia cu aceste date
        res.json({
            paymentUrl: netopia.paymentUrl,
            env_key: encrypted.env_key,
            data: encrypted.data
        });

    } catch (error) {
        console.error("Eroare Netopia Create:", error);
        res.status(500).json({ error: "Nu s-a putut genera cererea de plată." });
    }
};

// Rută pentru confirmarea plății (IPN) - Aici Netopia ne anunță că s-au primit banii
export const confirmPayment = async (req, res) => {
    try {
        const netopia = new Netopia.Card(netopiaConfig);
        const response = netopia.validateResponse(req.body);

        const orderId = parseInt(response.orderId);

        if (response.status === 'confirmed' || response.status === 'confirmed_pending') {
            // Actualizăm comanda în baza de date
            await prisma.order.update({
                where: { id: orderId },
                data: { status: "procesare" } // Sau ce status folosești tu pentru comenzi achitate
            });
            
            console.log(`✅ Plata confirmată pentru comanda ${orderId}`);
        }

        // Netopia are nevoie de un răspuns XML specific ca să nu mai trimită notificări
        res.set('Content-Type', 'text/xml');
        res.send(response.resXml);

    } catch (error) {
        console.error("Eroare Netopia Confirm:", error);
        res.status(500).send("Error");
    }
};