import fetch from "node-fetch";

const getAuthHeader = () => {
    const credentials = `${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
};

export const createSmartBillInvoice = async (order) => {
    try {
        console.log("➡️ [1] Începem prepararea datelor pentru SmartBill...");
        const authHeader = getAuthHeader();

        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: item.productId ? String(item.productId) : "SKU",
            isTaxIncluded: true,
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            price: (item.priceCentsAtBuy || item.priceCents || 0) / 100,
            isService: false,
            vatRate: 19 // <--- Dacă ești firmă neplătitoare de TVA, pune aici 0 în loc de 19
        }));

        console.log("➡️ [2] Produse mapate. Cantitate primul produs:", products[0]?.quantity);

        const payload = {
            companyVatCode: process.env.SMARTBILL_CUI,
            client: {
                name: order.isCompany ? order.companyName : (order.shippingName || "Client Karix"),
                vatCode: order.isCompany ? order.cui : "",
                regCom: order.isCompany ? order.regCom : "",
                address: order.shippingAddress || "Adresa nespecificata",
                isTaxPayer: !!order.isCompany,
                city: "Oradea", 
                county: "Bihor",
                country: "Romania",
                email: order.user?.email || "client@karix.ro",
                saveToDb: true
            },
            issueDate: new Date().toISOString().split("T")[0],
            seriesName: process.env.SMARTBILL_SERIA, 
            isDraft: false,
            dueDate: new Date().toISOString().split("T")[0],
            isCollecting: false,
            observations: "FACTURĂ ACHITATĂ ONLINE CU CARDUL (NETOPIA). NU MAI NECESITĂ PLATĂ.",
            products: products
        };

        console.log("➡️ [3] Trimitere request către SmartBill pe SBORO...");

        const response = await fetch("https://ws.smartbill.ro/SBORO/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarixApp/1.0"
            },
            body: JSON.stringify(payload)
        });

        console.log("➡️ [4] Am primit răspunsul, verificăm statusul:", response.status);

        const rawText = await response.text(); 
        console.log("➡️ [5] Răspuns RAW de la server:", rawText);
        
        if (!response.ok) {
            console.error("❌ EROARE HTTP SMARTBILL:", response.status);
            return null;
        }

        const data = JSON.parse(rawText);
        console.log("✅ FACTURA CREATĂ CU SUCCES:", data.series, data.number);
        return data;

    } catch (error) {
        console.error("❌ CRASH COMPLET ÎN SMARTBILL SERVICE:", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const authHeader = getAuthHeader();
        const cui = process.env.SMARTBILL_CUI;
        
        const url = `https://ws.smartbill.ro/SBORO/api/invoice/pdf?cif=${cui}&seriesname=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/octet-stream",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarixApp/1.0"
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("❌ EROARE DESCARCARE PDF:", errText);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        console.error("❌ Eroare Descărcare PDF SmartBill:", error.message);
        return null;
    } 
};