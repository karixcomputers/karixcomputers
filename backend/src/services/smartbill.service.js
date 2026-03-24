import fetch from "node-fetch";

const getAuthHeader = () => {
    const credentials = `${process.env.SMARTBILL_USER}:${process.env.SMARTBILL_TOKEN}`;
    return `Basic ${Buffer.from(credentials).toString("base64")}`;
};

export const createSmartBillInvoice = async (order) => {
    try {
        const authHeader = getAuthHeader();
        
        const products = (order.items || []).map(item => ({
            name: item.productName || "Produs Karix",
            code: item.productId ? String(item.productId) : "SKU",
            isDiscount: false,
            measuringUnitName: "buc",
            currency: "RON",
            quantity: item.qty || 1,
            price: (item.priceCentsAtBuy || item.priceCents || 0) / 100,
            isTaxIncluded: true
        }));

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
            seriesName: process.env.SMARTBILL_SERIA, // Trebuie sa fie KRXCOMP in .env
            isDraft: false,
            dueDate: new Date().toISOString().split("T")[0],
            isCollecting: false,
            observations: "FACTURĂ ACHITATĂ ONLINE CU CARDUL (NETOPIA). NU MAI NECESITĂ PLATĂ.",
            products: products
        };

        console.log("🚀 Trimitere date SmartBill...");

        const response = await fetch("https://ws.smartbill.ro/SBIT/api/invoice", {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) KarixApp/1.0"
            },
            body: JSON.stringify(payload)
        });

        // --- PARTEA DE DETECTIV ÎNCEPE AICI ---
        const rawText = await response.text(); 
        console.log("📡 RAW RESPONSE SMARTBILL:", rawText);

        if (!response.ok) {
            console.error("❌ EROARE HTTP SMARTBILL:", response.status);
            return null; // Oprim aici dacă avem eroare, ca să nu mai crape JSON-ul
        }

        try {
            // Dacă răspunsul e OK (status 200), încercăm să-l transformăm în obiect
            const data = JSON.parse(rawText);
            console.log("✅ FACTURA CREATĂ CU SUCCES:", data.series, data.number);
            return data;
        } catch (parseError) {
            console.error("❌ EROARE PARSARE JSON:", parseError.message);
            return null;
        }

    } catch (error) {
        console.error("❌ CRASH TOTAL SMARTBILL SERVICE:", error.message);
        return null;
    }
};

export const getSmartBillPdf = async (seriesName, number) => {
    try {
        const authHeader = getAuthHeader();
        const cui = process.env.SMARTBILL_CUI;
        
        const url = `https://ws.smartbill.ro/SBIT/api/invoice/pdf?cui=${cui}&series=${seriesName}&number=${number}`;
        
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": authHeader,
                "Accept": "application/octet-stream"
            }
        });

        if (!response.ok) throw new Error("Nu am putut descărca PDF-ul.");

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        console.error("❌ Eroare Descărcare PDF SmartBill:", error.message);
        return null;
    } 
};