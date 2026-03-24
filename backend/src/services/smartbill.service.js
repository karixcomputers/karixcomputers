import fetch from "node-fetch";

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("=== 1. START SMARTBILL ===");
        
        // Curățăm variabilele din .env de orice spațiu invizibil care ar putea da crash la ei
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const SERIA = (process.env.SMARTBILL_SERIA || "").trim();
        const USER = (process.env.SMARTBILL_USER || "").trim();
        const TOKEN = (process.env.SMARTBILL_TOKEN || "").trim();
        const auth = Buffer.from(`${USER}:${TOKEN}`).toString("base64");
        
        // Client minimalist. Doar Nume, Adresă și Țară.
        const clientObj = {
            name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
            address: order.shippingAddress || "România",
            country: "Romania",
            isTaxPayer: !!order.isCompany,
            saveToDb: false
        };

        if (order.isCompany && order.cui) {
            clientObj.vatCode = order.cui;
        }

        // Produs minimalist. Lăsăm SmartBill să aplice setările tale de firmă.
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: String(item.productId || "00"),
            measuringUnitName: "buc",
            currency: "RON",
            quantity: Number(item.qty || 1),
            price: Number(((item.priceCentsAtBuy || item.priceCents || 0) / 100).toFixed(2)), 
            isTaxIncluded: false
        }));

        const payload = {
            companyVatCode: CUI,
            client: clientObj,
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: SERIA,
            isDraft: false,
            products: products
        };

        console.log("=== 2. PAYLOAD TRIMIS ===", JSON.stringify(payload));

        const response = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        console.log("=== 3. STATUS HTTP ===", response.status);

        if (!response.ok) {
            console.log("=== 4. EROARE ===", await response.text());
            return null;
        }

        const data = await response.json();
        console.log("=== 5. FACTURA CREATA ===", data.series, data.number);
        return data;

    } catch (error) {
        console.log("=== CRASH ===", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const CUI = (process.env.SMARTBILL_CUI || "").trim();
        const auth = Buffer.from(`${(process.env.SMARTBILL_USER || "").trim()}:${(process.env.SMARTBILL_TOKEN || "").trim()}`).toString("base64");
        
        const url = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${CUI}&seriesname=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Accept": "application/octet-stream"
            }
        });

        if (!response.ok) return null;

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        return null;
    } 
};